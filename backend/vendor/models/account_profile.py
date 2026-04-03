from django.contrib.auth.models import User
from django.db import models


class AccountProfile(models.Model):
    ROLE_CHOICES = [
        ("supplier", "Supplier"),
        ("buyer", "Buyer"),
    ]
    BUYER_TYPE_CHOICES = [
        ("hospital", "Hospital"),
        ("pharmacy", "Pharmacy"),
        ("ngo", "NGO"),
        ("clinic", "Clinic"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="account_profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="buyer")
    buyer_type = models.CharField(max_length=20, choices=BUYER_TYPE_CHOICES, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_account_profiles"

    def __str__(self):
        return f"{self.user.username} ({self.role})"
