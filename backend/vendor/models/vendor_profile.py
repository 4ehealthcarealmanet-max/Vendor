from django.db import models
from django.contrib.auth.models import User

class VendorProfile(models.Model):

    STATUS = [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=255)
    gst_number = models.CharField(max_length=50)
    license_number = models.CharField(max_length=100)
    address = models.TextField()

    verification_status = models.CharField(
        max_length=20,
        choices=STATUS,
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_vendor_profiles"

    def __str__(self):
        return self.company_name
