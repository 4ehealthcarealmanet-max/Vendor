from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone

from .vendor_order import VendorOrder
from .vendor_profile import VendorProfile


class VendorRfq(models.Model):
    PRODUCT_TYPE_CHOICES = [
        ("product", "Product"),
        ("service", "Service"),
    ]
    TENDER_TYPE_CHOICES = [
        ("open", "Open"),
        ("limited", "Limited"),
        ("reverse", "Reverse"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("under_review", "Under Review"),
        ("awarded", "Awarded"),
        ("closed", "Closed"),
    ]
    BUYER_TYPE_CHOICES = [
        ("hospital", "Hospital"),
        ("pharmacy", "Pharmacy"),
        ("ngo", "NGO"),
        ("clinic", "Clinic"),
    ]

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rfqs")
    title = models.CharField(max_length=255)
    description = models.TextField()
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPE_CHOICES)
    quantity = models.PositiveIntegerField()
    target_budget = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_location = models.CharField(max_length=255)
    expected_delivery_date = models.DateField()
    quote_deadline = models.DateField()
    tender_document = models.FileField(
        upload_to="rfq_documents/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=["pdf"])],
    )
    tender_document_note = models.CharField(max_length=500, blank=True, default="")
    tender_document_uploaded_at = models.DateTimeField(null=True, blank=True)
    tender_type = models.CharField(max_length=20, choices=TENDER_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    buyer_company = models.CharField(max_length=255, blank=True, default="")
    buyer_type = models.CharField(max_length=20, choices=BUYER_TYPE_CHOICES, blank=True, default="")
    awarded_quote = models.ForeignKey(
        "vendor.VendorQuotation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    awarded_vendor = models.ForeignKey(
        VendorProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="awarded_rfqs",
    )
    awarded_supplier_name = models.CharField(max_length=255, blank=True, default="")
    awarded_supplier_company = models.CharField(max_length=255, blank=True, default="")
    awarded_order = models.ForeignKey(
        VendorOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rfqs",
    )
    awarded_at = models.DateTimeField(null=True, blank=True)
    source_order = models.ForeignKey(
        VendorOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="derived_rfqs",
    )
    source_type = models.CharField(max_length=20, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_vendor_rfqs"
        ordering = ["-id"]

    def __str__(self):
        return f"RFQ {self.id} - {self.title}"

    def save(self, *args, **kwargs):
        if self.tender_document and self.tender_document_uploaded_at is None:
            self.tender_document_uploaded_at = timezone.now()
        if not self.tender_document:
            self.tender_document_uploaded_at = None
        super().save(*args, **kwargs)
