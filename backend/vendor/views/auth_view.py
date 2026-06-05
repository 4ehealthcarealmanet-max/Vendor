from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from vendor.models.account_profile import AccountProfile
from vendor.models.buyer_profile import BuyerProfile
from vendor.models.vendor_profile import VendorProfile
from vendor.serializers.auth_serializer import LoginSerializer, RegisterSerializer, ResetPasswordSerializer
from vendor.utils.account_role import get_or_create_account_profile
from vendor.utils.admin_auth import (
    create_admin_token,
    get_admin_user_from_token,
    get_bearer_token,
    is_admin_credentials,
)


def _build_user_payload(user, account_profile):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": account_profile.role,
        "status": account_profile.status,
        "buyer_type": account_profile.buyer_type or None,
    }


def _build_admin_payload(admin_user):
    return {
        "id": admin_user.id,
        "username": admin_user.username,
        "email": admin_user.email,
        "role": admin_user.role,
        "status": admin_user.status,
        "buyer_type": None,
    }


def _get_admin_session(request):
    return get_admin_user_from_token(get_bearer_token(request))


def _admin_guard(request):
    admin_user = _get_admin_session(request)
    if not admin_user:
        return None, Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
    return admin_user, None


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    account_profile = get_or_create_account_profile(user)
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "message": "Registration successful. Please complete your profile.",
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": account_profile.role,
                "status": account_profile.status,
                "buyer_type": account_profile.buyer_type or None,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    username = serializer.validated_data["username"]
    password = serializer.validated_data["password"]

    if is_admin_credentials(username, password):
        admin_token = create_admin_token()
        admin_user = get_admin_user_from_token(admin_token)
        return Response({"token": admin_token, "user": _build_admin_payload(admin_user)})

    user = authenticate(
        username=username,
        password=password,
    )
    if not user:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)

    account_profile = get_or_create_account_profile(user)
    if account_profile.status == "rejected":
        return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "token": token.key,
            "user": _build_user_payload(user, account_profile),
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def me_view(request):
    admin_user = _get_admin_session(request)
    if admin_user:
        return Response(_build_admin_payload(admin_user))

    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

    account_profile = get_or_create_account_profile(request.user)
    if account_profile.status == "rejected":
        return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    return Response(_build_user_payload(request.user, account_profile))


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    if _get_admin_session(request):
        return Response({"detail": "Logged out successfully."})

    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "Logged out successfully."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reset_password_view(request):
    serializer = ResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not user.check_password(serializer.validated_data["current_password"]):
        return Response(
            {"current_password": ["Current password is incorrect."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data["new_password"])
    user.save(update_fields=["password"])
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    return Response({"detail": "Password reset successfully.", "token": token.key})


@api_view(["GET"])
@permission_classes([AllowAny])
def admin_users_view(request):
    _, denial = _admin_guard(request)
    if denial:
        return denial

    users = (
        User.objects.select_related("account_profile")
        .filter(account_profile__role__in=["buyer", "supplier"])
        .order_by("-date_joined", "-id")
    )
    results = []
    for user in users:
        profile = get_or_create_account_profile(user)
        
        # Fetch additional verification info
        verification_info = {}
        if profile.role == "supplier":
            vp = VendorProfile.objects.filter(user=user).first()
            if vp:
                verification_info = {
                    "company_name": vp.company_name,
                    "brand_name": vp.brand_name,
                    "gst_number": vp.gst_number,
                    "license_number": vp.license_number,
                    "business_category": vp.business_category,
                    "years_in_business": vp.years_in_business,
                    "address": vp.address,
                    "city": vp.city,
                    "state": vp.state,
                    "pincode": vp.pincode,
                    "contact_name": vp.contact_name,
                    "designation": vp.designation,
                    "phone": vp.phone,
                    "email": vp.email,
                    "product_categories": vp.product_categories,
                    "supply_regions": vp.supply_regions,
                    "minimum_order_value": vp.minimum_order_value,
                    "average_lead_time": vp.average_lead_time,
                    "warehouse_capacity": vp.warehouse_capacity,
                    "bank_account_name": vp.bank_account_name,
                    "bank_account_number": vp.bank_account_number,
                    "ifsc_code": vp.ifsc_code,
                    "gst_document": vp.gst_document,
                    "license_document": vp.license_document,
                    "iso_certificate": vp.iso_certificate,
                    "latitude": vp.latitude,
                    "longitude": vp.longitude,
                }
        else:
            bp = BuyerProfile.objects.filter(user=user).first()
            if bp:
                verification_info = {
                    "company_name": bp.organization_name,
                    "organization_name": bp.organization_name,
                    "buyer_type": bp.buyer_type,
                    "department": bp.department,
                    "institution_size": bp.institution_size,
                    "gst_number": bp.gst_number,
                    "address": bp.address,
                    "city": bp.city,
                    "state": bp.state,
                    "pincode": bp.pincode,
                    "contact_name": bp.procurement_contact_name,
                    "designation": bp.designation,
                    "phone": bp.phone,
                    "email": bp.email,
                    "monthly_spend": bp.monthly_spend,
                    "payment_terms": bp.payment_terms,
                    "approval_flow": bp.approval_flow,
                    "categories_needed": bp.categories_needed,
                    "delivery_locations": bp.delivery_locations,
                    "urgency_window": bp.urgency_window,
                    "compliance_needs": bp.compliance_needs,
                    "onboarding_documents": bp.onboarding_documents,
                    "latitude": bp.latitude,
                    "longitude": bp.longitude,
                }

        results.append(
            {
                "id": user.id,
                "name": user.username,
                "username": user.username,
                "email": user.email,
                "role": profile.role,
                "status": profile.status,
                "buyer_type": profile.buyer_type or None,
                "created_at": user.date_joined,
                "verification_info": verification_info,
            }
        )
    return Response(results)


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_user_status_view(request, user_id: int):
    _, denial = _admin_guard(request)
    if denial:
        return denial

    next_status = (request.data.get("status") or "").strip().lower()
    if next_status not in {"approved", "rejected"}:
        return Response({"detail": "Status must be approved or rejected."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    profile = get_or_create_account_profile(user)
    profile.status = next_status
    profile.save(update_fields=["status"])
    if next_status != "approved":
        Token.objects.filter(user=user).delete()

    return Response({"detail": f"User {next_status}.", "user": _build_user_payload(user, profile)})
