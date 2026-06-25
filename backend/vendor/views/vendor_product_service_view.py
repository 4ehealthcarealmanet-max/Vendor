from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from vendor.models.vendor_product_service import VendorProductService
from vendor.models.vendor_profile import VendorProfile
from vendor.serializers.vendor_product_service_serializer import VendorProductServiceSerializer
from vendor.utils.account_role import get_or_create_account_role
from vendor.permissions import HasActiveSubscription
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from vendor.models.vendor_product_service_image import VendorProductServiceImage

def _clear_product_cache():
    try:
        cache.incr("products_version")
    except ValueError:
        cache.set("products_version", 2)

@receiver(post_save, sender=VendorProductService)
@receiver(post_delete, sender=VendorProductService)
@receiver(post_save, sender=VendorProductServiceImage)
@receiver(post_delete, sender=VendorProductServiceImage)
def on_product_change(sender, **kwargs):
    _clear_product_cache()

class VendorProductServiceViewSet(viewsets.ModelViewSet):

    queryset = VendorProductService.objects.none()
    serializer_class = VendorProductServiceSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_queryset(self):
        role = get_or_create_account_role(self.request.user)
        base_qs = VendorProductService.objects.select_related("vendor", "vendor__user").prefetch_related("images")
        if role == "supplier":
            return base_qs.filter(vendor__user=self.request.user).order_by("-id")
        return base_qs.filter(is_active=True).order_by("-id")

    def list(self, request, *args, **kwargs):
        role = get_or_create_account_role(request.user)
        version = cache.get("products_version", 1)
        cache_key = f"products_list_{role}_{request.user.id}_v{version}" if role == "supplier" else f"products_list_public_v{version}"
        
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
            
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 3600)
        return response

    def perform_create(self, serializer):
        role = get_or_create_account_role(self.request.user)
        if role != "supplier":
            raise PermissionDenied("Only suppliers can add products or services.")

        vendor_profile, _ = VendorProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "company_name": f"{self.request.user.username} Vendor",
                "gst_number": "",
                "license_number": "",
                "address": "",
            },
        )
        serializer.save(vendor=vendor_profile)
        _clear_product_cache()

    def perform_update(self, serializer):
        role = get_or_create_account_role(self.request.user)
        if role != "supplier":
            raise PermissionDenied("Only suppliers can edit products or services.")
        if serializer.instance.vendor.user_id != self.request.user.id:
            raise PermissionDenied("You can only edit your own products or services.")
        serializer.save()
        _clear_product_cache()

    def perform_destroy(self, instance):
        role = get_or_create_account_role(self.request.user)
        if role != "supplier":
            raise PermissionDenied("Only suppliers can delete products or services.")
        if instance.vendor.user_id != self.request.user.id:
            raise PermissionDenied("You can only delete your own products or services.")
        instance.delete()
        _clear_product_cache()
