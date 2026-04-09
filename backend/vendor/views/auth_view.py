from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from vendor.serializers.auth_serializer import LoginSerializer, RegisterSerializer, ResetPasswordSerializer
from vendor.utils.account_role import get_or_create_account_profile


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    account_profile = get_or_create_account_profile(user)
    return Response(
        {
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": account_profile.role,
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

    user = authenticate(
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )
    if not user:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)

    token, _ = Token.objects.get_or_create(user=user)
    account_profile = get_or_create_account_profile(user)
    return Response(
        {
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": account_profile.role,
                "buyer_type": account_profile.buyer_type or None,
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    account_profile = get_or_create_account_profile(request.user)
    return Response(
        {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "role": account_profile.role,
            "buyer_type": account_profile.buyer_type or None,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
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
