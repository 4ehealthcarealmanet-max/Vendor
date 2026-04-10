from rest_framework import serializers
from django.utils import timezone
from vendor.models.vendor_order import VendorOrder
from vendor.models.vendor_order_event import VendorOrderEvent
from vendor.models.vendor_order_item import VendorOrderItem
from vendor.utils.account_role import get_or_create_account_profile
from vendor.utils.order_events import log_order_event


class VendorOrderEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorOrderEvent
        fields = ("id", "event_type", "actor_role", "actor_name", "message", "created_at")


class VendorOrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = VendorOrderItem
        fields = ("id", "product", "quantity", "price")
        read_only_fields = ("id",)

class VendorOrderSerializer(serializers.ModelSerializer):

    items = VendorOrderItemSerializer(many=True)
    buyer_type = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()

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

        log_order_event(
            order,
            message=f"Order created with status {order.status.replace('_', ' ')}.",
            event_type="created",
            user=self.context["request"].user,
        )
        return order

    def get_buyer_type(self, obj):
        account_profile = get_or_create_account_profile(obj.buyer)
        return account_profile.buyer_type or None

    def get_events(self, obj):
        return VendorOrderEventSerializer(obj.events.all(), many=True).data

    @staticmethod
    def _log_authenticated_event(order, event_type, message, user):
        log_order_event(
            order,
            message=message,
            event_type=event_type,
            user=user if getattr(user, "is_authenticated", False) else None,
        )

    def update(self, instance, validated_data):
        old_status = instance.status
        old_delivery_status = instance.delivery_status
        old_payment_status = instance.payment_status
        old_tracking_note = instance.tracking_note

        instance = super().update(instance, validated_data)

        now = timezone.now()
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if old_status != instance.status:
            if instance.status == "po_accepted" and not instance.po_accepted_at:
                instance.po_accepted_at = now
            if instance.status == "shipped" and not instance.shipped_at:
                instance.shipped_at = now
            if instance.status == "delivered" and not instance.delivered_at:
                instance.delivered_at = now
            if instance.status == "goods_received" and not instance.goods_received_at:
                instance.goods_received_at = now
            event_type = "po_accepted" if instance.status == "po_accepted" else "status_updated"
            self._log_authenticated_event(
                instance,
                event_type,
                f"Order status changed from {old_status.replace('_', ' ')} to {instance.status.replace('_', ' ')}.",
                user,
            )

        if old_delivery_status != instance.delivery_status:
            if instance.delivery_status == "in_transit" and not instance.shipped_at:
                instance.shipped_at = now
            if instance.delivery_status == "delivered" and not instance.delivered_at:
                instance.delivered_at = now
            self._log_authenticated_event(
                instance,
                "delivery_updated",
                (
                    f"Delivery status changed from {old_delivery_status.replace('_', ' ')} "
                    f"to {instance.delivery_status.replace('_', ' ')}."
                ),
                user,
            )

        if old_payment_status != instance.payment_status:
            self._log_authenticated_event(
                instance,
                "payment_updated",
                (
                    f"Payment status changed from {old_payment_status.replace('_', ' ')} "
                    f"to {instance.payment_status.replace('_', ' ')}."
                ),
                user,
            )

        if old_tracking_note != instance.tracking_note and instance.tracking_note:
            self._log_authenticated_event(
                instance,
                "tracking_note",
                f"Tracking note updated: {instance.tracking_note}",
                user,
            )

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
