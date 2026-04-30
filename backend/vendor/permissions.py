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
