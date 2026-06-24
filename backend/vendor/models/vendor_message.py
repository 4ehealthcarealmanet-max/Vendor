from django.contrib.auth.models import User
from django.db import models
from vendor.models.notification import Notification

class VendorMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    content = models.TextField(blank=True, default="")
    attachment_url = models.URLField(max_length=1000, blank=True, null=True)
    attachment_type = models.CharField(max_length=100, blank=True, null=True)
    attachment_name = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username}: {self.content[:30]}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            # When a message is sent, trigger a notification for the receiver
            role_is_buyer = False
            try:
                role_is_buyer = self.receiver.account_profile.role == "buyer"
            except Exception:
                pass
            
            target_url = f"/buyer/messages?partner_id={self.sender.id}" if role_is_buyer else f"/supplier/messages?partner_id={self.sender.id}"
            
            Notification.create_notification(
                user=self.receiver,
                n_type="info",
                title=f"New Message from {self.sender.username}",
                message=self.content[:100],
                details=f"From: {self.sender.username}\nMessage: {self.content}",
                url=target_url
            )
