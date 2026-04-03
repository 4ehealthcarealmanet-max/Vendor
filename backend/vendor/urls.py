from django.urls import path, include
from rest_framework.routers import DefaultRouter

from vendor.views.vendor_product_service_view import VendorProductServiceViewSet
from vendor.views.vendor_order_view import VendorOrderViewSet
from vendor.views.vendor_rfq_view import VendorRfqViewSet
from vendor.views.auth_view import login_view, logout_view, me_view, register_view

router = DefaultRouter()

router.register("products", VendorProductServiceViewSet)
router.register("orders", VendorOrderViewSet)
router.register("rfqs", VendorRfqViewSet)

urlpatterns = [
    path("auth/register/", register_view),
    path("auth/login/", login_view),
    path("auth/me/", me_view),
    path("auth/logout/", logout_view),
    path("", include(router.urls)),
]
