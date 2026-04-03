from rest_framework import serializers
from vendor.models.vendor_product_service import VendorProductService

class VendorProductServiceSerializer(serializers.ModelSerializer):
    vendor_company_name = serializers.SerializerMethodField()
    vendor_username = serializers.SerializerMethodField()

    class Meta:
        model = VendorProductService
        fields = "__all__"
        read_only_fields = ("vendor",)

    def get_vendor_company_name(self, obj):
        return obj.vendor.company_name

    def get_vendor_username(self, obj):
        return obj.vendor.user.username
