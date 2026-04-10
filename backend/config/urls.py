from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include


def health_check(_request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("health/", health_check),
    path("admin/", admin.site.urls),
    path("api/vendor/", include("vendor.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
