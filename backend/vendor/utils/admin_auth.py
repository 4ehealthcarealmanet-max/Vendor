from dataclasses import dataclass

from django.core import signing
from rest_framework.authentication import BaseAuthentication


ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin@123"
ADMIN_ROLE = "admin"
ADMIN_STATUS = "approved"
ADMIN_TOKEN_SALT = "medvendor.admin.session"


@dataclass(frozen=True)
class AdminSessionUser:
    id: int
    username: str
    email: str
    role: str
    status: str
    is_admin: bool = True

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_staff(self):
        return True

    @property
    def pk(self):
        return self.id


def is_admin_credentials(username: str, password: str) -> bool:
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD


def create_admin_token() -> str:
    return signing.dumps({"username": ADMIN_USERNAME, "role": ADMIN_ROLE}, salt=ADMIN_TOKEN_SALT)


def get_admin_user_from_token(token: str | None) -> AdminSessionUser | None:
    if not token:
        return None

    try:
        payload = signing.loads(token, salt=ADMIN_TOKEN_SALT, max_age=60 * 60 * 24)
    except signing.BadSignature:
        return None
    except signing.SignatureExpired:
        return None

    if payload.get("username") != ADMIN_USERNAME or payload.get("role") != ADMIN_ROLE:
        return None

    return AdminSessionUser(
        id=0,
        username=ADMIN_USERNAME,
        email="admin@medvendor.local",
        role=ADMIN_ROLE,
        status=ADMIN_STATUS,
    )


def get_bearer_token(request) -> str | None:
    # Handle both DRF Request and standard Django HttpRequest
    header = getattr(request, "headers", {}).get("Authorization")
    if not header:
        header = getattr(request, "META", {}).get("HTTP_AUTHORIZATION", "")

    if not header or not header.startswith("Token "):
        return None

    parts = header.split(" ", 1)
    return parts[1].strip() if len(parts) > 1 else None


class AdminAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = get_bearer_token(request)
        if not token:
            return None

        admin_user = get_admin_user_from_token(token)
        if admin_user:
            return (admin_user, None)

        return None
