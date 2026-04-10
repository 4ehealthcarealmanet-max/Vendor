from vendor.models.vendor_order_event import VendorOrderEvent

from .account_role import get_or_create_account_role


def log_order_event(order, message, event_type, user=None, actor_role="", actor_name=""):
    if user is not None:
        actor_role = actor_role or get_or_create_account_role(user)
        actor_name = actor_name or user.username

    return VendorOrderEvent.objects.create(
        order=order,
        event_type=event_type,
        actor_role=actor_role,
        actor_name=actor_name,
        message=message,
    )
