from rest_framework import serializers
from django.utils import timezone
from vendor.models.vendor_order import VendorOrder
from vendor.models.vendor_order_item import VendorOrderItem
from vendor.utils.account_role import get_or_create_account_profile

class VendorOrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = VendorOrderItem
        fields = ("id", "product", "quantity", "price")
        read_only_fields = ("id",)

class VendorOrderSerializer(serializers.ModelSerializer):

    items = VendorOrderItemSerializer(many=True)
    buyer_type = serializers.SerializerMethodField()

    class Meta:
        model = VendorOrder
        fields = "__all__"
        read_only_fields = ("buyer", "po_released_at", "po_accepted_at", "shipped_at", "delivered_at", "goods_received_at")

    def create(self, validated_data):

        items_data = validated_data.pop("items")
        vendor = validated_data["vendor"]
        for item in items_data:
            if item["product"].vendor_id != vendor.id:
                raise serializers.ValidationError("Order items must belong to the selected vendor.")

        order = VendorOrder.objects.create(
            buyer=self.context["request"].user,
            **validated_data,
        )

        for item in items_data:
            VendorOrderItem.objects.create(order=order, **item)

        return order

    def get_buyer_type(self, obj):
        account_profile = get_or_create_account_profile(obj.buyer)
        return account_profile.buyer_type or None

    def update(self, instance, validated_data):
        old_status = instance.status
        old_delivery_status = instance.delivery_status

        instance = super().update(instance, validated_data)

        now = timezone.now()
        if old_status != instance.status:
            if instance.status == "po_accepted" and not instance.po_accepted_at:
                instance.po_accepted_at = now
            if instance.status == "shipped" and not instance.shipped_at:
                instance.shipped_at = now
            if instance.status == "delivered" and not instance.delivered_at:
                instance.delivered_at = now
            if instance.status == "goods_received" and not instance.goods_received_at:
                instance.goods_received_at = now

        if old_delivery_status != instance.delivery_status:
            if instance.delivery_status == "in_transit" and not instance.shipped_at:
                instance.shipped_at = now
            if instance.delivery_status == "delivered" and not instance.delivered_at:
                instance.delivered_at = now

        instance.save()
        return instance


class VendorOrderTrackingUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[choice[0] for choice in VendorOrder.STATUS], required=False)
    payment_status = serializers.ChoiceField(choices=[choice[0] for choice in VendorOrder.PAYMENT_STATUS], required=False)
    delivery_status = serializers.ChoiceField(choices=[choice[0] for choice in VendorOrder.DELIVERY_STATUS], required=False)
    tracking_note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs
