import razorpay
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from vendor.models.subscription import SubscriptionPlan, UserSubscription
from vendor.utils.account_role import get_or_create_account_profile

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_plans(request):
    profile = get_or_create_account_profile(request.user)
    role = profile.role  # 'buyer', 'supplier', or 'admin'
    
    plans = SubscriptionPlan.objects.filter(is_active=True)
    if role in ["buyer", "supplier"]:
        plans = plans.filter(target_role__in=[role, "both"])
    
    data = []
    for plan in plans:
        data.append({
            "id": plan.id,
            "name": plan.name,
            "description": plan.description,
            "price_inr": str(plan.price_inr),
            "duration_days": plan.duration_days,
            "target_role": plan.target_role,
        })
    return Response(data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initialize_payment(request):
    plan_id = request.data.get("plan_id")
    if not plan_id:
        return Response({"detail": "plan_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({"detail": "Subscription plan not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

    # Initialize Razorpay client
    client = razorpay.Client(auth=(settings.PLATFORM_RAZORPAY_KEY_ID, settings.PLATFORM_RAZORPAY_KEY_SECRET))
    
    # Amount in paise (price_inr * 100)
    amount_paise = int(plan.price_inr * 100)
    
    order_data = {
        "amount": amount_paise,
        "currency": "INR",
        "payment_capture": 1 # Auto capture
    }
    
    try:
        razorpay_order = client.order.create(data=order_data)
    except Exception as e:
        return Response({"detail": f"Razorpay order creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        "order_id": razorpay_order["id"],
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": settings.PLATFORM_RAZORPAY_KEY_ID,
        "plan_id": plan.id
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    plan_id = request.data.get("plan_id")
    order_id = request.data.get("razorpay_order_id")
    payment_id = request.data.get("razorpay_payment_id")
    signature = request.data.get("razorpay_signature")
    
    if not all([plan_id, order_id, payment_id, signature]):
        return Response({"detail": "Missing required signature fields."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({"detail": "Subscription plan not found."}, status=status.HTTP_404_NOT_FOUND)

    # Verify payment signature
    client = razorpay.Client(auth=(settings.PLATFORM_RAZORPAY_KEY_ID, settings.PLATFORM_RAZORPAY_KEY_SECRET))
    
    verify_data = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature
    }
    
    try:
        client.utility.verify_payment_signature(verify_data)
    except razorpay.errors.SignatureVerificationError:
        return Response({"detail": "Payment verification failed. Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

    # Update or create subscription
    now = timezone.now()
    end_date = now + timedelta(days=plan.duration_days)
    
    sub, created = UserSubscription.objects.update_or_create(
        user=request.user,
        defaults={
            "plan": plan,
            "start_date": now,
            "end_date": end_date,
            "status": "active",
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature
        }
    )
    
    return Response({
        "detail": "Subscription activated successfully.",
        "has_active_subscription": True,
        "start_date": sub.start_date.isoformat(),
        "end_date": sub.end_date.isoformat()
    })
