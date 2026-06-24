from django.db import models
from .vendor_product_service import VendorProductService


class VendorProductServiceImage(models.Model):
    product_service = models.ForeignKey(
        VendorProductService,
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.FileField(upload_to="product_service_images/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "medvendor_vendor_product_service_images"
        ordering = ["id"]

    def __str__(self):
        return f"Image {self.id} for {self.product_service.name}"
