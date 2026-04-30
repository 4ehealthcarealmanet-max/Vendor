from rest_framework import serializers
from vendor.models.vendor_profile import VendorProfile
from vendor.models.buyer_profile import BuyerProfile

class VendorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        exclude = ["user", "created_at", "updated_at"]
        read_only_fields = ["verification_status"]

class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        exclude = ["user", "created_at", "updated_at"]
