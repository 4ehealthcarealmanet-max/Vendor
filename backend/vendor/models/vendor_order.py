from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .vendor_profile import VendorProfile

class VendorOrder(models.Model):

    STATUS = [
        ("po_released", "PO Released"),
        ("po_accepted", "PO Accepted"),
        ("processing", "Processing"),
        ("partially_subcontracted", "Partially Subcontracted"),
        ("ready_to_dispatch", "Ready To Dispatch"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("goods_received", "Goods Received"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled")
    ]
    PAYMENT_STATUS = [
        ("pending", "Pending"),
        ("partially_paid", "Partially Paid"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
    ]
    DELIVERY_STATUS = [
        ("not_started", "Not Started"),
        ("loaded", "Loaded"),
        ("in_transit", "In Transit"),
        ("out_for_delivery", "Out For Delivery"),
        ("delivered", "Delivered"),
    ]

    buyer = models.ForeignKey(User, on_delete=models.CASCADE)
    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE)

    status = models.CharField(
        max_length=30,
        choices=STATUS,
        default="po_released"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default="pending",
    )
    delivery_status = models.CharField(
        max_length=20,
        choices=DELIVERY_STATUS,
        default="not_started",
    )
    tracking_note = models.CharField(max_length=255, blank=True, default="")
    po_released_at = models.DateTimeField(default=timezone.now)
    po_accepted_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    goods_received_at = models.DateTimeField(null=True, blank=True)

    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_vendor_orders"

    def __str__(self):
        return f"Order {self.id}"
