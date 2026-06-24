from rest_framework import serializers
from django.contrib.auth.models import User
from vendor.models.vendor_message import VendorMessage

class VendorMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source="sender.username")
    receiver_username = serializers.ReadOnlyField(source="receiver.username")

    class Meta:
        model = VendorMessage
        fields = (
            "id",
            "sender",
            "sender_username",
            "receiver",
            "receiver_username",
            "content",
            "attachment_url",
            "attachment_type",
            "attachment_name",
            "is_read",
            "created_at",
        )
        read_only_fields = ("sender", "is_read", "created_at")
