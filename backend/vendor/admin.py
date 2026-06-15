from django.contrib import admin
from .models import (
    AccountProfile,
    BuyerProfile,
    VendorProfile,
    VendorProductService,
    VendorRfq,
    VendorRfqInvitation,
    VendorQuotation,
    VendorOrder,
    VendorOrderItem,
    VendorOrderEvent,
    SubscriptionPlan,
    UserSubscription,
)


@admin.register(AccountProfile)
class AccountProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "status", "buyer_type", "created_at")
    list_filter = ("role", "status", "buyer_type")
    search_fields = ("user__username", "user__email")
    ordering = ("-id",)


@admin.register(BuyerProfile)
class BuyerProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "organization_name", "buyer_type", "city", "state", "phone", "email")
    list_filter = ("buyer_type", "state")
    search_fields = ("user__username", "organization_name", "gst_number", "phone", "email")
    ordering = ("-id",)


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "company_name", "brand_name", "verification_status", "city", "state", "phone", "email")
    list_filter = ("verification_status", "state")
    search_fields = ("user__username", "company_name", "brand_name", "gst_number", "phone", "email")
    ordering = ("-id",)


@admin.register(VendorProductService)
class VendorProductServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "vendor", "product_type", "price", "stock", "is_active", "created_at")
    list_filter = ("product_type", "is_active")
    search_fields = ("name", "description", "vendor__company_name")
    ordering = ("-id",)


@admin.register(VendorRfq)
class VendorRfqAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "buyer", "product_type", "quantity", "target_budget", "tender_type", "status", "created_at")
    list_filter = ("product_type", "tender_type", "status", "buyer_type")
    search_fields = ("title", "description", "buyer__username", "buyer_company")
    ordering = ("-id",)


@admin.register(VendorRfqInvitation)
class VendorRfqInvitationAdmin(admin.ModelAdmin):
    list_display = ("id", "rfq", "vendor")
    list_filter = ("rfq", "vendor")
    search_fields = ("rfq__title", "vendor__company_name")
    ordering = ("-id",)


@admin.register(VendorQuotation)
class VendorQuotationAdmin(admin.ModelAdmin):
    list_display = ("id", "rfq", "supplier_name", "supplier_company", "product", "unit_price", "lead_time_days", "status", "created_at")
    list_filter = ("status", "rfq")
    search_fields = ("supplier_name", "supplier_company", "product__name", "notes")
    ordering = ("-id",)


@admin.register(VendorOrder)
class VendorOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "buyer", "vendor", "status", "payment_status", "delivery_status", "total_amount", "created_at")
    list_filter = ("status", "payment_status", "delivery_status")
    search_fields = ("buyer__username", "vendor__company_name", "tracking_note")
    ordering = ("-id",)


@admin.register(VendorOrderItem)
class VendorOrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "quantity", "price")
    list_filter = ("order", "product")
    search_fields = ("product__name", "order__id")
    ordering = ("-id",)


@admin.register(VendorOrderEvent)
class VendorOrderEventAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "event_type", "actor_role", "actor_name", "message", "created_at")
    list_filter = ("event_type", "actor_role")
    search_fields = ("order__id", "actor_name", "message")
    ordering = ("-id",)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price_inr", "duration_days", "target_role", "is_active", "created_at")
    list_filter = ("target_role", "is_active")
    search_fields = ("name", "description")
    ordering = ("-id",)


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "plan", "start_date", "end_date", "status", "razorpay_order_id")
    list_filter = ("status", "plan")
    search_fields = ("user__username", "razorpay_order_id", "razorpay_payment_id")
    ordering = ("-id",)

