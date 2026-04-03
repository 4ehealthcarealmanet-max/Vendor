from django.db import models
from .vendor_profile import VendorProfile

class VendorProductService(models.Model):

    TYPE = [
        ("product", "Product"),
        ("service", "Service"),
    ]

    vendor = models.ForeignKey(
        VendorProfile,
        on_delete=models.CASCADE,
        related_name="products"
    )

    name = models.CharField(max_length=255)
    description = models.TextField()

    product_type = models.CharField(
        max_length=20,
        choices=TYPE
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_vendor_product_services"

    def __str__(self):
        return self.name
