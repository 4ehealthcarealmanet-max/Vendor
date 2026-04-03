from django.utils import timezone
from rest_framework import serializers

from vendor.models import AccountProfile, VendorProductService, VendorProfile, VendorQuotation, VendorRfq, VendorRfqInvitation
from vendor.utils.account_role import get_or_create_account_role


class VendorRfqVendorSerializer(serializers.ModelSerializer):
    vendor_id = serializers.IntegerField(source="vendor.id", read_only=True)
    vendor_name = serializers.CharField(source="vendor.company_name", read_only=True)
    vendor_username = serializers.CharField(source="vendor.user.username", read_only=True)

    class Meta:
        model = VendorRfqInvitation
        fields = ("vendor_id", "vendor_name", "vendor_username")


class VendorQuotationSerializer(serializers.ModelSerializer):
    rfq_id = serializers.IntegerField(source="rfq.id", read_only=True)
    supplier_vendor_id = serializers.IntegerField(source="supplier_vendor.id", read_only=True)
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = VendorQuotation
        fields = (
            "id",
            "rfq_id",
            "supplier_vendor_id",
            "supplier_name",
            "supplier_company",
            "product_id",
            "product_name",
            "unit_price",
            "lead_time_days",
            "validity_days",
            "notes",
            "status",
            "rejection_reason",
            "rejected_at",
            "created_at",
        )


class VendorRfqSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.username", read_only=True)
    invited_vendors = VendorRfqVendorSerializer(source="invitations", many=True, read_only=True)
    quotations = VendorQuotationSerializer(many=True, read_only=True)
    tender_document = serializers.FileField(write_only=True, required=False, allow_null=True)
    remove_tender_document = serializers.BooleanField(write_only=True, required=False, default=False)
    tender_document_url = serializers.SerializerMethodField()
    tender_document_name = serializers.SerializerMethodField()
    tender_document_note = serializers.CharField(required=False, allow_blank=True, default="")
    tender_document_uploaded_at = serializers.DateTimeField(read_only=True)
    invited_vendor_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    awarded_quote_id = serializers.IntegerField(source="awarded_quote.id", read_only=True)
    awarded_vendor_id = serializers.IntegerField(source="awarded_vendor.id", read_only=True)
    awarded_order_id = serializers.IntegerField(source="awarded_order.id", read_only=True)
    source_order_id = serializers.IntegerField(source="source_order.id", read_only=True)

    class Meta:
        model = VendorRfq
        fields = (
            "id",
            "title",
            "description",
            "product_type",
            "quantity",
            "target_budget",
            "delivery_location",
            "expected_delivery_date",
            "quote_deadline",
            "tender_document",
            "remove_tender_document",
            "tender_document_url",
            "tender_document_name",
            "tender_document_note",
            "tender_document_uploaded_at",
            "tender_type",
            "status",
            "buyer_name",
            "buyer_company",
            "buyer_type",
            "created_at",
            "invited_vendors",
            "invited_vendor_ids",
            "awarded_quote_id",
            "awarded_vendor_id",
            "awarded_supplier_name",
            "awarded_supplier_company",
            "awarded_order_id",
            "awarded_at",
            "source_order_id",
            "source_type",
            "quotations",
        )
        read_only_fields = (
            "status",
            "buyer_name",
            "buyer_company",
            "buyer_type",
            "created_at",
            "tender_document_url",
            "tender_document_name",
            "tender_document_uploaded_at",
            "invited_vendors",
            "awarded_quote_id",
            "awarded_vendor_id",
            "awarded_supplier_name",
            "awarded_supplier_company",
            "awarded_order_id",
            "awarded_at",
            "source_order_id",
            "source_type",
            "quotations",
        )

    def get_tender_document_url(self, instance):
        if not instance.tender_document:
            return None
        request = self.context.get("request")
        url = instance.tender_document.url
        return request.build_absolute_uri(url) if request else url

    def get_tender_document_name(self, instance):
        if not instance.tender_document:
            return None
        return instance.tender_document.name.rsplit("/", 1)[-1]

    def validate_tender_document(self, value):
        if value is None:
            return value
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("Tender PDF must be 10 MB or smaller.")
        if not value.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Only PDF tender documents are allowed.")
        return value

    def validate(self, attrs):
        quote_deadline = attrs.get("quote_deadline")
        expected_delivery_date = attrs.get("expected_delivery_date")
        tender_type = attrs.get("tender_type")
        invited_vendor_ids = attrs.get("invited_vendor_ids", [])
        tender_document = attrs.get("tender_document")
        remove_tender_document = attrs.get("remove_tender_document", False)

        if quote_deadline and quote_deadline < timezone.localdate():
            raise serializers.ValidationError("Quote deadline cannot be in the past.")

        if quote_deadline and expected_delivery_date and expected_delivery_date < quote_deadline:
            raise serializers.ValidationError("Expected delivery date must be on or after the quote deadline.")

        if tender_type == "limited" and len(invited_vendor_ids) == 0:
            raise serializers.ValidationError("Select at least one vendor for a limited tender.")

        if tender_document and remove_tender_document:
            raise serializers.ValidationError("Choose either a replacement PDF or remove the current PDF, not both.")

        return attrs

    def create(self, validated_data):
        invited_vendor_ids = validated_data.pop("invited_vendor_ids", [])
        validated_data.pop("remove_tender_document", False)
        buyer = self.context["request"].user
        account_profile = AccountProfile.objects.filter(user=buyer).first()

        rfq = VendorRfq.objects.create(
            buyer=buyer,
            buyer_company=buyer.username,
            buyer_type=account_profile.buyer_type if account_profile else "",
            **validated_data,
        )

        vendors = VendorProfile.objects.filter(id__in=invited_vendor_ids)
        VendorRfqInvitation.objects.bulk_create(
            [VendorRfqInvitation(rfq=rfq, vendor=vendor) for vendor in vendors],
            ignore_conflicts=True,
        )
        return rfq

    def update(self, instance, validated_data):
        invited_vendor_ids = validated_data.pop("invited_vendor_ids", None)
        remove_tender_document = validated_data.pop("remove_tender_document", False)
        new_document = validated_data.get("tender_document")

        if remove_tender_document and instance.tender_document:
            instance.tender_document.delete(save=False)
            validated_data["tender_document"] = None
            validated_data["tender_document_note"] = ""
            instance.tender_document_uploaded_at = None
        elif new_document:
            if instance.tender_document:
                instance.tender_document.delete(save=False)
            instance.tender_document_uploaded_at = timezone.now()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if invited_vendor_ids is not None:
            VendorRfqInvitation.objects.filter(rfq=instance).exclude(vendor_id__in=invited_vendor_ids).delete()
            vendors = VendorProfile.objects.filter(id__in=invited_vendor_ids)
            existing_vendor_ids = set(
                VendorRfqInvitation.objects.filter(rfq=instance).values_list("vendor_id", flat=True)
            )
            VendorRfqInvitation.objects.bulk_create(
                [
                    VendorRfqInvitation(rfq=instance, vendor=vendor)
                    for vendor in vendors
                    if vendor.id not in existing_vendor_ids
                ],
                ignore_conflicts=True,
            )

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and not request.user.is_authenticated:
            data["quotations"] = []
        elif request and request.user.is_authenticated:
            role = get_or_create_account_role(request.user)
            if role == "supplier":
                username = request.user.username.strip().lower()
                data["quotations"] = [
                    quote
                    for quote in data["quotations"]
                    if (quote.get("supplier_name") or "").strip().lower() == username
                ]
        data["target_budget"] = float(data["target_budget"])
        for quote in data["quotations"]:
            quote["unit_price"] = float(quote["unit_price"])
        data["buyer_company"] = data["buyer_company"] or instance.buyer.username
        data["buyer_type"] = data["buyer_type"] or None
        data["awarded_supplier_name"] = data["awarded_supplier_name"] or None
        data["awarded_supplier_company"] = data["awarded_supplier_company"] or None
        data["tender_document_note"] = data["tender_document_note"] or ""
        return data


class VendorQuotationCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    lead_time_days = serializers.IntegerField(min_value=1)
    validity_days = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_product_id(self, value):
        if not VendorProductService.objects.filter(id=value).exists():
            raise serializers.ValidationError("Selected listing does not exist.")
        return value


class VendorQuotationUpdateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1, required=False)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    lead_time_days = serializers.IntegerField(min_value=1, required=False)
    validity_days = serializers.IntegerField(min_value=1, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs

    def validate_product_id(self, value):
        if not VendorProductService.objects.filter(id=value).exists():
            raise serializers.ValidationError("Selected listing does not exist.")
        return value


class VendorAwardQuotationSerializer(serializers.Serializer):
    quotation_id = serializers.IntegerField(min_value=1)
    order_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)


class VendorRejectQuotationSerializer(serializers.Serializer):
    quotation_id = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255, default="")
