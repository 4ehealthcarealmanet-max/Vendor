from vendor.models.account_profile import AccountProfile
from vendor.models.vendor_profile import VendorProfile


def get_or_create_account_role(user):
    return get_or_create_account_profile(user).role


def get_or_create_account_profile(user):
    account_profile = AccountProfile.objects.filter(user=user).first()
    if account_profile:
        return account_profile

    inferred_role = "supplier" if VendorProfile.objects.filter(user=user).exists() else "buyer"
    inferred_buyer_type = "hospital" if inferred_role == "buyer" else ""
    return AccountProfile.objects.create(
        user=user,
        role=inferred_role,
        status="approved",
        buyer_type=inferred_buyer_type,
    )
