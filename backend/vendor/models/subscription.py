from django.db import models
from django.contrib.auth.models import User

class SubscriptionPlan(models.Model):
    ROLE_CHOICES = [
        ("buyer", "Buyer"),
        ("supplier", "Supplier"),
        ("both", "Both"),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    price_inr = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)
    target_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="both")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medvendor_subscription_plans"

    def __str__(self):
        return f"{self.name} ({self.target_role.capitalize()} - INR {self.price_inr})"

class UserSubscription(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("expired", "Expired"),
        ("pending", "Pending"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="user_subscription")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    
    # Razorpay payment trace fields
    razorpay_order_id = models.CharField(max_length=255, blank=True, default="")
    razorpay_payment_id = models.CharField(max_length=255, blank=True, default="")
    razorpay_signature = models.CharField(max_length=255, blank=True, default="")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medvendor_user_subscriptions"

    def __str__(self):
        plan_name = self.plan.name if self.plan else "No Plan"
        return f"{self.user.username} - {plan_name} ({self.status})"
