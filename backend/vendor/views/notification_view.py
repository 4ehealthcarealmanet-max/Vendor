from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from vendor.models.notification import Notification
from vendor.serializers.notification_serializer import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="clear-all")
    def clear_all(self, request):
        self.get_queryset().delete()
        return Response({"detail": "All notifications cleared."}, status=status.HTTP_200_OK)
