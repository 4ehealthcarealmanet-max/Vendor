from django.db import models
from django.contrib.auth.models import User

class BuyerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="buyer_profile")
    organization_name = models.CharField(max_length=255, blank=True, default="")
    buyer_type = models.CharField(max_length=50, blank=True, default="")
    department = models.CharField(max_length=100, blank=True, default="")
    institution_size = models.CharField(max_length=100, blank=True, default="")
    gst_number = models.CharField(max_length=50, blank=True, default="")
    address = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    pincode = models.CharField(max_length=20, blank=True, default="")
    procurement_contact_name = models.CharField(max_length=255, blank=True, default="")
    designation = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    monthly_spend = models.CharField(max_length=100, blank=True, default="")
    payment_terms = models.CharField(max_length=255, blank=True, default="")
    approval_flow = models.TextField(blank=True, default="")
    categories_needed = models.TextField(blank=True, default="")
    delivery_locations = models.TextField(blank=True, default="")
    urgency_window = models.CharField(max_length=100, blank=True, default="")
    compliance_needs = models.TextField(blank=True, default="")
    onboarding_documents = models.TextField(blank=True, default="")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medvendor_buyer_profiles"

    def __str__(self):
        return self.organization_name or self.user.username
