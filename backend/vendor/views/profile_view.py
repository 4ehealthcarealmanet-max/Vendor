from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from vendor.models.account_profile import AccountProfile
from vendor.models.vendor_profile import VendorProfile
from vendor.models.buyer_profile import BuyerProfile
from vendor.serializers.profile_serializer import VendorProfileSerializer, BuyerProfileSerializer

def _get_profile_instance(user):
    # Try to get role from AccountProfile
    try:
        account_profile = AccountProfile.objects.get(user=user)
        role = account_profile.role
    except AccountProfile.DoesNotExist:
        # Fallback to AdminSessionUser or other logic if needed
        role = getattr(user, "role", "buyer")

    if role == "supplier":
        profile, _ = VendorProfile.objects.get_or_create(user=user)
        return profile, VendorProfileSerializer, role
    else:
        profile, _ = BuyerProfile.objects.get_or_create(user=user)
        return profile, BuyerProfileSerializer, role

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile_view(request):
    try:
        profile, serializer_class, role = _get_profile_instance(request.user)
        serializer = serializer_class(profile)
        return Response(serializer.data)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    try:
        profile, serializer_class, role = _get_profile_instance(request.user)
        serializer = serializer_class(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Profile updated successfully.", "data": serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
