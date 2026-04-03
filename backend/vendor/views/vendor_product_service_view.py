from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from vendor.models.vendor_product_service import VendorProductService
from vendor.models.vendor_profile import VendorProfile
from vendor.serializers.vendor_product_service_serializer import VendorProductServiceSerializer
from vendor.utils.account_role import get_or_create_account_role

class VendorProductServiceViewSet(viewsets.ModelViewSet):

    queryset = VendorProductService.objects.none()
    serializer_class = VendorProductServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = get_or_create_account_role(self.request.user)
        if role == "supplier":
            return VendorProductService.objects.filter(vendor__user=self.request.user).order_by("-id")
        return VendorProductService.objects.filter(is_active=True).order_by("-id")

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

    def perform_update(self, serializer):
        role = get_or_create_account_role(self.request.user)
        if role != "supplier":
            raise PermissionDenied("Only suppliers can edit products or services.")
        if serializer.instance.vendor.user_id != self.request.user.id:
            raise PermissionDenied("You can only edit your own products or services.")
        serializer.save()

    def perform_destroy(self, instance):
        role = get_or_create_account_role(self.request.user)
        if role != "supplier":
            raise PermissionDenied("Only suppliers can delete products or services.")
        if instance.vendor.user_id != self.request.user.id:
            raise PermissionDenied("You can only delete your own products or services.")
        instance.delete()
