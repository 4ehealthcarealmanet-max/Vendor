from django.db import models

from .vendor_order import VendorOrder


class VendorOrderEvent(models.Model):
    EVENT_TYPE_CHOICES = (
        ("created", "Created"),
        ("rfq_awarded", "RFQ Awarded"),
        ("po_accepted", "PO Accepted"),
        ("status_updated", "Status Updated"),
        ("delivery_updated", "Delivery Updated"),
        ("payment_updated", "Payment Updated"),
        ("goods_received", "Goods Received"),
        ("subcontract_created", "Subcontract Created"),
        ("reorder_created", "Reorder Created"),
        ("tracking_note", "Tracking Note"),
    )

    order = models.ForeignKey(
        VendorOrder,
        related_name="events",
        on_delete=models.CASCADE,
    )
    event_type = models.CharField(max_length=40, choices=EVENT_TYPE_CHOICES)
    actor_role = models.CharField(max_length=20, blank=True, default="")
    actor_name = models.CharField(max_length=255, blank=True, default="")
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_vendor_order_events"
        ordering = ["created_at", "id"]
