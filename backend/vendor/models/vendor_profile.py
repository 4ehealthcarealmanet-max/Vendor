from django.db import models
from django.contrib.auth.models import User

class VendorProfile(models.Model):

    STATUS = [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="vendor_profile")
    company_name = models.CharField(max_length=255, blank=True, default="")
    brand_name = models.CharField(max_length=255, blank=True, default="")
    gst_number = models.CharField(max_length=50, blank=True, default="")
    license_number = models.CharField(max_length=100, blank=True, default="")
    business_category = models.CharField(max_length=255, blank=True, default="")
    years_in_business = models.CharField(max_length=50, blank=True, default="")
    address = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    pincode = models.CharField(max_length=20, blank=True, default="")
    contact_name = models.CharField(max_length=255, blank=True, default="")
    designation = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    product_categories = models.TextField(blank=True, default="")
    supply_regions = models.TextField(blank=True, default="")
    minimum_order_value = models.CharField(max_length=100, blank=True, default="")
    average_lead_time = models.CharField(max_length=100, blank=True, default="")
    warehouse_capacity = models.CharField(max_length=255, blank=True, default="")
    bank_account_name = models.CharField(max_length=255, blank=True, default="")
    bank_account_number = models.CharField(max_length=100, blank=True, default="")
    ifsc_code = models.CharField(max_length=20, blank=True, default="")
    gst_document = models.TextField(blank=True, default="")
    license_document = models.TextField(blank=True, default="")
    iso_certificate = models.TextField(blank=True, default="")
    latitude = models.CharField(max_length=50, blank=True, default="")
    longitude = models.CharField(max_length=50, blank=True, default="")

    verification_status = models.CharField(
        max_length=20,
        choices=STATUS,
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medvendor_vendor_profiles"

    def __str__(self):
        return self.company_name
