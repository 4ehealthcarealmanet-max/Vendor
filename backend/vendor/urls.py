from django.urls import path, include
from rest_framework.routers import DefaultRouter

from vendor.views.vendor_product_service_view import VendorProductServiceViewSet
from vendor.views.vendor_order_view import VendorOrderViewSet
from vendor.views.vendor_rfq_view import VendorRfqViewSet
from vendor.views.auth_view import (
    admin_user_status_view,
    admin_users_view,
    login_view,
    logout_view,
    me_view,
    register_view,
    reset_password_view,
)
from vendor.views.profile_view import get_profile_view, update_profile_view

router = DefaultRouter()

router.register("products", VendorProductServiceViewSet)
router.register("orders", VendorOrderViewSet)
router.register("rfqs", VendorRfqViewSet)

urlpatterns = [
    path("auth/register/", register_view),
    path("auth/login/", login_view),
    path("auth/me/", me_view),
    path("auth/logout/", logout_view),
    path("auth/reset-password/", reset_password_view),
    path("auth/profile/", get_profile_view),
    path("auth/profile/update/", update_profile_view),
    path("auth/admin/users/", admin_users_view),
    path("auth/admin/users/<int:user_id>/status/", admin_user_status_view),
    path("", include(router.urls)),
]
