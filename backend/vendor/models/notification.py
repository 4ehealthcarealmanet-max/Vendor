from django.contrib.auth.models import User
from django.db import models


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("info", "Info"),
        ("success", "Success"),
        ("warning", "Warning"),
        ("error", "Error"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default="info")
    title = models.CharField(max_length=255)
    message = models.TextField()
    details = models.TextField(blank=True, default="")
    url = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.title} - {self.type}"

    @classmethod
    def create_notification(cls, user, n_type, title, message, details="", url=""):
        try:
            return cls.objects.create(
                user=user,
                type=n_type,
                title=title,
                message=message,
                details=details,
                url=url
            )
        except Exception as e:
            print(f"Error creating notification: {e}")
