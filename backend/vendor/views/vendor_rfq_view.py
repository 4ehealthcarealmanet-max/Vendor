from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from vendor.models import VendorOrder, VendorProductService, VendorQuotation, VendorRfq, Notification
from vendor.serializers.vendor_rfq_serializer import (
    VendorAwardQuotationSerializer,
    VendorQuotationCreateSerializer,
    VendorRejectQuotationSerializer,
    VendorQuotationUpdateSerializer,
    VendorQuotationSerializer,
    VendorRfqSerializer,
)
from vendor.utils.account_role import get_or_create_account_role
from vendor.utils.order_events import log_order_event
from vendor.permissions import HasActiveSubscription


class VendorRfqViewSet(viewsets.ModelViewSet):
    queryset = VendorRfq.objects.none()
    serializer_class = VendorRfqSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_permissions(self):
        if self.action in ["list", "retrieve"] and not self.request.user.is_authenticated:
            return [AllowAny()]
        return [IsAuthenticated(), HasActiveSubscription()]

    def get_queryset(self):
        queryset = (
            VendorRfq.objects.select_related(
                "buyer",
                "awarded_quote",
                "awarded_vendor",
                "awarded_order",
            )
            .prefetch_related(
                "invitations__vendor__user",
                "quotations__product",
                "quotations__supplier_vendor__user",
            )
            .order_by("-id")
        )

        if not self.request.user.is_authenticated:
            # Public homepage should show only live RFQs.
            return queryset.filter(status__in=["open", "under_review"])

        role = get_or_create_account_role(self.request.user)

        if role == "buyer":
            return queryset.filter(buyer=self.request.user)

        # Suppliers can see:
        # 1) Open tenders (no invitation list)
        # 2) Limited tenders where they are invited
        # 3) RFQs they created themselves (subcontracting)
        return queryset.filter(
            Q(invitations__isnull=True) |
            Q(invitations__vendor__user=self.request.user) |
            Q(buyer=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        # Both buyers and suppliers can create RFQs (suppliers for subcontracting).
        rfq = serializer.save()
        
        # Notify all suppliers about the new RFQ
        from django.contrib.auth.models import User
        suppliers = User.objects.filter(account_profile__role="supplier")
        for supplier in suppliers:
            Notification.create_notification(
                user=supplier,
                n_type="info",
                title="New Procurement Request",
                message=f"RFQ #{rfq.id} for \"{rfq.title}\" has been published.",
                details=f"Qty: {rfq.quantity} units | Budget: ₹{rfq.target_budget} | Delivery: {rfq.delivery_location}",
                url=f"/supplier/rfq?rfqId={rfq.id}"
            )

    def perform_update(self, serializer):
        rfq = self.get_object()
        if rfq.buyer_id != self.request.user.id:
            raise PermissionDenied("You can only update your own RFQs.")
        if rfq.status == "awarded":
            raise ValidationError("Awarded RFQs cannot be edited.")

        serializer.save()

    def perform_destroy(self, instance):
        if instance.buyer_id != self.request.user.id:
            raise PermissionDenied("You can only delete your own RFQs.")
        if instance.status == "awarded":
            raise ValidationError("Awarded RFQs cannot be deleted.")
        instance.delete()


    @action(detail=True, methods=["post"], url_path="submit-quotation")
    def submit_quotation(self, request, pk=None):
        role = get_or_create_account_role(request.user)
        if role != "supplier":
            raise PermissionDenied("Only suppliers can submit quotations.")

        rfq = self.get_object()
        serializer = VendorQuotationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if rfq.status in ["closed", "awarded"]:
            raise ValidationError("RFQ is no longer accepting quotations.")
        if rfq.quote_deadline < timezone.localdate():
            raise ValidationError("Quotation deadline has passed.")

        product = VendorProductService.objects.select_related("vendor", "vendor__user").filter(
            id=serializer.validated_data["product_id"]
        ).first()
        if not product:
            raise ValidationError("Selected listing does not exist.")
        if product.vendor.user_id != request.user.id:
            raise ValidationError("You can only quote using your own listing.")
        if not product.is_active or product.stock <= 0:
            raise ValidationError("Selected listing is not active or in stock.")
        if product.product_type != rfq.product_type:
            raise ValidationError("Listing type does not match the RFQ requirement.")

        supplier_vendor = product.vendor
        if rfq.invitations.exists() and not rfq.invitations.filter(vendor=supplier_vendor).exists():
            raise ValidationError("Supplier is not invited to this RFQ.")

        if VendorQuotation.objects.filter(
            rfq=rfq,
            supplier_name=request.user.username,
            product=product,
        ).exists():
            raise ValidationError("You already submitted a quotation for this listing.")

        quotation = VendorQuotation.objects.create(
            rfq=rfq,
            supplier_vendor=supplier_vendor,
            supplier_name=request.user.username,
            supplier_company=supplier_vendor.company_name,
            product=product,
            unit_price=serializer.validated_data["unit_price"],
            lead_time_days=serializer.validated_data["lead_time_days"],
            validity_days=serializer.validated_data["validity_days"],
            notes=serializer.validated_data["notes"],
        )

        if rfq.status == "open":
            rfq.status = "under_review"
            rfq.save(update_fields=["status"])

        # Notify the buyer that a new bid/quotation has been received
        Notification.create_notification(
            user=rfq.buyer,
            n_type="success",
            title="New Bid Received",
            message=f"Supplier {quotation.supplier_company or quotation.supplier_name} submitted a quote for RFQ #{rfq.id}.",
            details=f"Bid: ₹{quotation.unit_price}/unit | Lead Time: {quotation.lead_time_days} days | Note: {quotation.notes or 'None'}",
            url=f"/buyer/rfq?highlight={rfq.id}"
        )

        return Response(VendorQuotationSerializer(quotation).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch"],
        url_path=r"quotations/(?P<quotation_id>[^/.]+)/edit",
    )
    def edit_quotation(self, request, pk=None, quotation_id=None):
        role = get_or_create_account_role(request.user)
        if role != "supplier":
            raise PermissionDenied("Only suppliers can edit quotations.")

        rfq = self.get_object()
        if rfq.status in ["closed", "awarded"]:
            raise ValidationError("RFQ is locked. Quotations cannot be edited.")

        quotation = rfq.quotations.select_related("supplier_vendor", "product").filter(id=quotation_id).first()
        if not quotation:
            raise ValidationError("Quotation not found for this RFQ.")
        if quotation.status == "rejected":
            raise ValidationError("Rejected quotation cannot be edited.")

        if not quotation.supplier_vendor or quotation.supplier_vendor.user_id != request.user.id:
            raise PermissionDenied("You can only edit your own quotation.")

        serializer = VendorQuotationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data.get("product_id")
        if product_id:
            product = VendorProductService.objects.select_related("vendor").filter(id=product_id).first()
            if not product:
                raise ValidationError("Selected listing does not exist.")
            if product.vendor.user_id != request.user.id:
                raise ValidationError("You can only quote using your own listing.")
            if not product.is_active or product.stock <= 0:
                raise ValidationError("Selected listing is not active or in stock.")
            if product.product_type != rfq.product_type:
                raise ValidationError("Listing type does not match the RFQ requirement.")
            quotation.product = product

        for field in ["unit_price", "lead_time_days", "validity_days", "notes"]:
            if field in serializer.validated_data:
                setattr(quotation, field, serializer.validated_data[field])

        quotation.save()
        return Response(VendorQuotationSerializer(quotation).data)

    @action(detail=True, methods=["post"], url_path="award")
    def award(self, request, pk=None):

        rfq = self.get_object()
        if rfq.buyer_id != request.user.id:
            raise PermissionDenied("You can only award your own RFQs.")
        if rfq.status in ["closed", "awarded"]:
            raise ValidationError("RFQ is already locked.")

        serializer = VendorAwardQuotationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quotation = rfq.quotations.select_related("supplier_vendor").filter(
            id=serializer.validated_data["quotation_id"]
        ).first()
        if not quotation:
            raise ValidationError("Quotation not found.")
        if quotation.status == "rejected":
            raise ValidationError("Rejected quotation cannot be awarded.")

        awarded_order = None
        order_id = serializer.validated_data.get("order_id")
        if order_id:
            awarded_order = VendorOrder.objects.filter(id=order_id, buyer=request.user).first()
            if not awarded_order:
                raise ValidationError("Linked order not found for this buyer.")
        else:
            if not quotation.supplier_vendor:
                raise ValidationError("Selected quotation does not have a supplier account linked.")
            from vendor.models.vendor_order_item import VendorOrderItem
            awarded_order = VendorOrder.objects.create(
                buyer=request.user,
                vendor=quotation.supplier_vendor,
                status="po_released",
                delivery_status="not_started",
                payment_status="pending",
                tracking_note="PO released from RFQ award.",
                total_amount=quotation.unit_price * rfq.quantity,
            )
            VendorOrderItem.objects.create(
                order=awarded_order,
                product=quotation.product,
                quantity=rfq.quantity,
                price=quotation.unit_price
            )

        rfq.status = "awarded"
        quotation.status = "awarded"
        quotation.rejection_reason = ""
        quotation.rejected_at = None
        quotation.save(update_fields=["status", "rejection_reason", "rejected_at"])
        rfq.awarded_quote = quotation
        rfq.awarded_vendor = quotation.supplier_vendor
        rfq.awarded_supplier_name = quotation.supplier_name
        rfq.awarded_supplier_company = quotation.supplier_company
        rfq.awarded_order = awarded_order
        rfq.awarded_at = timezone.now()
        rfq.save()

        vendor_user = getattr(quotation.supplier_vendor, "user", None)
        if vendor_user and vendor_user.email:
            send_mail(
                subject=f"PO Released for RFQ #{rfq.id}",
                message=(
                    f"A purchase order (#{awarded_order.id}) has been released to you.\n"
                    f"RFQ: {rfq.title}\n"
                    f"Quantity: {rfq.quantity}\n"
                    f"Please review and accept the PO in the vendor portal."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@vendor.local"),
                recipient_list=[vendor_user.email],
                fail_silently=True,
            )

        log_order_event(
            awarded_order,
            message=f"RFQ #{rfq.id} awarded to {quotation.supplier_company or quotation.supplier_name}.",
            event_type="rfq_awarded",
            user=request.user,
        )

        # Notify the winning supplier
        if vendor_user:
            Notification.create_notification(
                user=vendor_user,
                n_type="success",
                title="Quotation Updated (Awarded)",
                message=f"Your quote for RFQ #{rfq.id} was awarded.",
                details=f"Order HL-ORD-{str(awarded_order.id).zfill(4)} has been generated. Unit Price: ₹{quotation.unit_price}",
                url=f"/supplier/rfq?rfqId={rfq.id}"
            )

        # Notify other suppliers who submitted quotations for this RFQ
        for other_quote in rfq.quotations.exclude(id=quotation.id):
            if other_quote.supplier_vendor and other_quote.supplier_vendor.user:
                Notification.create_notification(
                    user=other_quote.supplier_vendor.user,
                    n_type="info",
                    title="Quotation Updated (Closed)",
                    message=f"Your quote for RFQ #{rfq.id} was not selected. RFQ has been awarded to another supplier.",
                    details=f"RFQ title: {rfq.title}",
                    url=f"/supplier/rfq?rfqId={rfq.id}"
                )

        return Response(self.get_serializer(rfq).data)

    @action(detail=True, methods=["post"], url_path="reject-quotation")
    def reject_quotation(self, request, pk=None):

        rfq = self.get_object()
        if rfq.buyer_id != request.user.id:
            raise PermissionDenied("You can only manage quotations for your own RFQs.")
        if rfq.status in ["closed", "awarded"]:
            raise ValidationError("RFQ is locked.")

        serializer = VendorRejectQuotationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quotation = rfq.quotations.filter(id=serializer.validated_data["quotation_id"]).first()
        if not quotation:
            raise ValidationError("Quotation not found.")
        if quotation.status == "awarded":
            raise ValidationError("Awarded quotation cannot be rejected.")

        quotation.status = "rejected"
        quotation.rejection_reason = serializer.validated_data.get("reason", "")
        quotation.rejected_at = timezone.now()
        quotation.save(update_fields=["status", "rejection_reason", "rejected_at"])

        # Notify the supplier of the rejection
        if quotation.supplier_vendor and quotation.supplier_vendor.user:
            Notification.create_notification(
                user=quotation.supplier_vendor.user,
                n_type="error",
                title="Quotation Updated (Rejected)",
                message=f"Your quote for RFQ #{rfq.id} was rejected.",
                details=f"Reason: {quotation.rejection_reason}",
                url=f"/supplier/rfq?rfqId={rfq.id}"
            )

        return Response(VendorQuotationSerializer(quotation).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):

        rfq = self.get_object()
        if rfq.buyer_id != request.user.id:
            raise PermissionDenied("You can only close your own RFQs.")
        if rfq.status == "awarded":
            raise ValidationError("Awarded RFQs cannot be closed.")

        rfq.status = "closed"
        rfq.save(update_fields=["status"])

        # Notify all suppliers who submitted a quotation for this RFQ
        for quote in rfq.quotations.all():
            if quote.supplier_vendor and quote.supplier_vendor.user:
                Notification.create_notification(
                    user=quote.supplier_vendor.user,
                    n_type="info",
                    title="RFQ Status Updated",
                    message=f"RFQ #{rfq.id} (\"{rfq.title}\") is now closed.",
                    details="The buyer has closed this procurement request.",
                    url=f"/supplier/rfq?rfqId={rfq.id}"
                )

        return Response(self.get_serializer(rfq).data)

    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen(self, request, pk=None):

        rfq = self.get_object()
        if rfq.buyer_id != request.user.id:
            raise PermissionDenied("You can only reopen your own RFQs.")
        if rfq.status == "awarded":
            raise ValidationError("Awarded RFQs cannot be reopened.")

        updated_fields = ["status"]
        if rfq.quote_deadline < timezone.localdate():
            requested_deadline = request.data.get("quote_deadline")
            if requested_deadline:
                parsed_date = parse_date(str(requested_deadline))
                if not parsed_date:
                    raise ValidationError("quote_deadline must be a valid date in YYYY-MM-DD format.")
                if parsed_date <= timezone.localdate():
                    raise ValidationError("quote_deadline must be a future date.")
                rfq.quote_deadline = parsed_date
            else:
                # Default extension so previously closed RFQs can be reopened quickly.
                rfq.quote_deadline = timezone.localdate() + timedelta(days=3)
            updated_fields.append("quote_deadline")

        rfq.status = "under_review" if rfq.quotations.exists() else "open"
        rfq.save(update_fields=updated_fields)

        # Notify all suppliers who submitted a quotation for this RFQ
        for quote in rfq.quotations.all():
            if quote.supplier_vendor and quote.supplier_vendor.user:
                Notification.create_notification(
                    user=quote.supplier_vendor.user,
                    n_type="info",
                    title="RFQ Status Updated",
                    message=f"RFQ #{rfq.id} (\"{rfq.title}\") has been reopened.",
                    details=f"New deadline: {rfq.quote_deadline}",
                    url=f"/supplier/rfq?rfqId={rfq.id}"
                )

        return Response(self.get_serializer(rfq).data)
