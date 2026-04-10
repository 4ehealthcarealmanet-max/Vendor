from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from vendor.models.vendor_rfq import VendorRfq
from vendor.models.vendor_order import VendorOrder
from vendor.serializers.vendor_order_serializer import VendorOrderSerializer, VendorOrderTrackingUpdateSerializer
from vendor.utils.account_role import get_or_create_account_role
from vendor.utils.order_events import log_order_event

class VendorOrderViewSet(viewsets.ModelViewSet):

    queryset = VendorOrder.objects.none()
    serializer_class = VendorOrderSerializer
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _require_role(user, role, message):
        if get_or_create_account_role(user) != role:
            raise PermissionDenied(message)

    def _get_buyer_order(self, user):
        order = self.get_object()
        if order.buyer_id != user.id:
            raise PermissionDenied("You can only manage your own order.")
        return order

    def _get_supplier_order(self, user, message="You can only update your own order."):
        order = self.get_object()
        if order.vendor.user_id != user.id:
            raise PermissionDenied(message)
        return order

    def get_queryset(self):
        role = get_or_create_account_role(self.request.user)
        if role == "supplier":
            return VendorOrder.objects.filter(vendor__user=self.request.user).order_by("-id")
        return VendorOrder.objects.filter(buyer=self.request.user).order_by("-id")

    def perform_create(self, serializer):
        self._require_role(self.request.user, "buyer", "Only buyers can place orders.")
        serializer.save(status="po_released")

    @action(detail=True, methods=["post"], url_path="accept-po")
    def accept_po(self, request, pk=None):
        self._require_role(request.user, "supplier", "Only suppliers can accept PO.")
        order = self._get_supplier_order(request.user, "You can only accept your own PO.")
        if order.status == "cancelled":
            raise ValidationError("Cancelled orders cannot be accepted.")

        order.status = "po_accepted"
        order.po_accepted_at = timezone.now()
        order.save(update_fields=["status", "po_accepted_at"])
        log_order_event(
            order,
            message="Supplier accepted the purchase order.",
            event_type="po_accepted",
            user=request.user,
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="update-tracking")
    def update_tracking(self, request, pk=None):
        self._require_role(request.user, "supplier", "Only suppliers can update tracking.")
        order = self._get_supplier_order(request.user)

        serializer = VendorOrderTrackingUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update_serializer = self.get_serializer(order, data=serializer.validated_data, partial=True)
        update_serializer.is_valid(raise_exception=True)
        update_serializer.save()
        return Response(update_serializer.data)

    @action(detail=True, methods=["post"], url_path="mark-received")
    def mark_received(self, request, pk=None):
        self._require_role(request.user, "buyer", "Only buyers can mark goods received.")
        order = self._get_buyer_order(request.user)

        order.status = "goods_received"
        order.delivery_status = "delivered"
        order.goods_received_at = timezone.now()
        if order.payment_status == "paid":
            order.status = "completed"
        order.save(update_fields=["status", "delivery_status", "goods_received_at"])
        log_order_event(
            order,
            message="Buyer confirmed the goods were received.",
            event_type="goods_received",
            user=request.user,
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="make-payment")
    def make_payment(self, request, pk=None):
        self._require_role(request.user, "buyer", "Only buyers can make payments.")
        order = self._get_buyer_order(request.user)

        order.payment_status = "paid"
        if order.status == "goods_received":
            order.status = "completed"
        order.save(update_fields=["payment_status", "status"])
        log_order_event(
            order,
            message="Dummy payment recorded by buyer.",
            event_type="payment_updated",
            user=request.user,
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="mark-payment-overdue")
    def mark_payment_overdue(self, request, pk=None):
        self._require_role(request.user, "supplier", "Only suppliers can flag overdue payments.")
        order = self._get_supplier_order(request.user)

        order.payment_status = "overdue"
        order.save(update_fields=["payment_status"])
        log_order_event(
            order,
            message="Supplier flagged payment as overdue.",
            event_type="payment_updated",
            user=request.user,
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="subcontract")
    def subcontract(self, request, pk=None):
        self._require_role(request.user, "supplier", "Only suppliers can subcontract.")
        order = self._get_supplier_order(request.user, "You can only subcontract your own order.")

        shortage_qty = request.data.get("shortage_quantity")
        if shortage_qty is None:
            raise ValidationError("shortage_quantity is required.")
        try:
            shortage_qty = int(shortage_qty)
        except (TypeError, ValueError):
            raise ValidationError("shortage_quantity must be a positive integer.")
        if shortage_qty <= 0:
            raise ValidationError("shortage_quantity must be a positive integer.")

        rfq = VendorRfq.objects.create(
            buyer=request.user,
            title=f"Subcontract RFQ for PO #{order.id}",
            description=f"Need subcontract support for order #{order.id}.",
            product_type=order.items.first().product.product_type if order.items.exists() else "product",
            quantity=shortage_qty,
            target_budget=0,
            delivery_location="To supplier warehouse",
            expected_delivery_date=timezone.localdate() + timedelta(days=14),
            quote_deadline=timezone.localdate() + timedelta(days=3),
            tender_type="open",
            status="open",
            buyer_company=order.vendor.company_name,
            buyer_type="",
            source_order=order,
            source_type="subcontract",
        )

        order.status = "partially_subcontracted"
        order.tracking_note = f"Subcontract RFQ #{rfq.id} created for shortage quantity {shortage_qty}."
        order.save(update_fields=["status", "tracking_note"])
        log_order_event(
            order,
            message=f"Subcontract RFQ #{rfq.id} created for shortage quantity {shortage_qty}.",
            event_type="subcontract_created",
            user=request.user,
        )

        return Response(
            {
                "order_id": order.id,
                "subcontract_rfq_id": rfq.id,
                "message": "Subcontract RFQ created.",
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="reorder")
    def reorder(self, request, pk=None):
        self._require_role(request.user, "buyer", "Only buyers can reorder.")
        order = self._get_buyer_order(request.user)

        cloned_order = VendorOrder.objects.create(
            buyer=order.buyer,
            vendor=order.vendor,
            status="po_released",
            payment_status="pending",
            delivery_status="not_started",
            tracking_note=f"Reorder from order #{order.id}.",
            total_amount=order.total_amount,
        )
        for item in order.items.all():
            item.pk = None
            item.order = cloned_order
            item.save()

        log_order_event(
            cloned_order,
            message=f"Buyer created a reorder from order #{order.id}.",
            event_type="reorder_created",
            user=request.user,
        )

        return Response(self.get_serializer(cloned_order).data, status=status.HTTP_201_CREATED)
