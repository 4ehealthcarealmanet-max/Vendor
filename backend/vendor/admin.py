from django.contrib import admin
from .models import AccountProfile, VendorProfile, VendorOrder, VendorQuotation

admin.site.register(AccountProfile)
admin.site.register(VendorProfile)
admin.site.register(VendorOrder)
admin.site.register(VendorQuotation)
