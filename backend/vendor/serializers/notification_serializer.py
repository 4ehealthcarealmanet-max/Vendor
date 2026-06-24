from rest_framework import serializers
from vendor.models.notification import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "details",
            "url",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
