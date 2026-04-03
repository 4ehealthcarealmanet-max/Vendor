from django.db import models
from .vendor_order import VendorOrder
from .vendor_product_service import VendorProductService

class VendorOrderItem(models.Model):

    order = models.ForeignKey(
        VendorOrder,
        related_name="items",
        on_delete=models.CASCADE
    )

    product = models.ForeignKey(
        VendorProductService,
        on_delete=models.CASCADE
    )

    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "medvendor_vendor_order_items"

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
