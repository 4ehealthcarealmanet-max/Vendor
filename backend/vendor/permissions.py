from rest_framework.permissions import BasePermission

from vendor.utils.account_role import get_or_create_account_profile


class IsApprovedUser(BasePermission):
    message = "Waiting for admin approval."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "is_admin", False):
            return True

        account_profile = get_or_create_account_profile(user)
        if account_profile.status == "approved":
            return True

        if account_profile.status == "rejected":
            self.message = "Access denied."
        else:
            self.message = "Waiting for admin approval."
        return False


class HasActiveSubscription(BasePermission):
    message = "Active subscription required."

    def has_permission(self, request, view):
        from django.utils import timezone
        from vendor.models.subscription import UserSubscription

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        # Admin/staff bypass
        if getattr(user, "is_admin", False) or user.is_staff:
            return True

        # Check active subscription
        has_sub = getattr(user, "_has_active_subscription", None)
        if has_sub is None:
            now = timezone.now()
            has_sub = UserSubscription.objects.filter(
                user=user,
                status="active",
                start_date__lte=now,
                end_date__gte=now
            ).exists()
            setattr(user, "_has_active_subscription", has_sub)

        if has_sub:
            return True

        return False

