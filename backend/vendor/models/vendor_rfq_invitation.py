from django.db import models

from .vendor_profile import VendorProfile
from .vendor_rfq import VendorRfq


class VendorRfqInvitation(models.Model):
    rfq = models.ForeignKey(VendorRfq, on_delete=models.CASCADE, related_name="invitations")
    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="rfq_invitations")

    class Meta:
        db_table = "medvendor_vendor_rfq_invitations"
        unique_together = ("rfq", "vendor")

    def __str__(self):
        return f"RFQ {self.rfq_id} -> Vendor {self.vendor_id}"
