from django.db import models

from .vendor_product_service import VendorProductService
from .vendor_profile import VendorProfile
from .vendor_rfq import VendorRfq


class VendorQuotation(models.Model):
    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("rejected", "Rejected"),
        ("awarded", "Awarded"),
    ]

    rfq = models.ForeignKey(VendorRfq, on_delete=models.CASCADE, related_name="quotations")
    supplier_vendor = models.ForeignKey(
        VendorProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotations",
    )
    supplier_name = models.CharField(max_length=255)
    supplier_company = models.CharField(max_length=255, blank=True, default="")
    product = models.ForeignKey(VendorProductService, on_delete=models.CASCADE, related_name="rfq_quotations")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    lead_time_days = models.PositiveIntegerField()
    validity_days = models.PositiveIntegerField()
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    rejection_reason = models.CharField(max_length=255, blank=True, default="")
    rejected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_vendor_quotations"
        ordering = ["-id"]
        unique_together = ("rfq", "supplier_name", "product")

    def __str__(self):
        return f"Quote {self.id} for RFQ {self.rfq_id}"
