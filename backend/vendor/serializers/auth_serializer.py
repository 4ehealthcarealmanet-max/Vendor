from django.contrib.auth.models import User
from rest_framework import serializers

from vendor.models.account_profile import AccountProfile
from vendor.models.vendor_profile import VendorProfile


class RegisterSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["supplier", "buyer"], default="buyer")
    buyer_type = serializers.ChoiceField(
        choices=["hospital", "pharmacy", "ngo", "clinic"],
        required=False,
        allow_null=True,
    )
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    gst_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate(self, attrs):
        role = attrs.get("role", "buyer")
        buyer_type = attrs.get("buyer_type")
        if role == "buyer" and not buyer_type:
            raise serializers.ValidationError({"buyer_type": "Buyer type is required for buyer accounts."})
        if role == "supplier":
            attrs["buyer_type"] = None
        return attrs

    def create(self, validated_data):
        role = validated_data.pop("role", "buyer")
        buyer_type = validated_data.pop("buyer_type", None)
        company_name = validated_data.pop("company_name", "").strip()
        gst_number = validated_data.pop("gst_number", "").strip()
        license_number = validated_data.pop("license_number", "").strip()
        address = validated_data.pop("address", "").strip()

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        AccountProfile.objects.create(
            user=user,
            role=role,
            buyer_type=buyer_type or "",
        )
        if role == "supplier":
            VendorProfile.objects.create(
                user=user,
                company_name=company_name or f"{user.username} Vendor",
                gst_number=gst_number,
                license_number=license_number,
                address=address,
            )

        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class ResetPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "New password and confirm password do not match."})
        return attrs
