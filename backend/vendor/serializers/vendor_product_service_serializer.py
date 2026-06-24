from rest_framework import serializers
from vendor.models.vendor_product_service import VendorProductService
from vendor.models.vendor_product_service_image import VendorProductServiceImage


class VendorProductServiceImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = VendorProductServiceImage
        fields = ("id", "image_url")

    def get_image_url(self, instance):
        if not instance.image:
            return None
        request = self.context.get("request")
        url = instance.image.url
        return request.build_absolute_uri(url) if request else url


class VendorProductServiceSerializer(serializers.ModelSerializer):
    vendor_company_name = serializers.SerializerMethodField()
    vendor_username = serializers.SerializerMethodField()
    images = VendorProductServiceImageSerializer(many=True, read_only=True)

    class Meta:
        model = VendorProductService
        fields = "__all__"
        read_only_fields = ("vendor",)

    def get_vendor_company_name(self, obj):
        return obj.vendor.company_name

    def get_vendor_username(self, obj):
        return obj.vendor.user.username

    def create(self, validated_data):
        request = self.context.get("request")
        images = []
        if request and request.FILES:
            images = request.FILES.getlist("images")

        instance = super().create(validated_data)

        for image_file in images:
            VendorProductServiceImage.objects.create(
                product_service=instance,
                image=image_file
            )
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        if request:
            # Handle new images
            if request.FILES:
                images = request.FILES.getlist("images")
                for image_file in images:
                    VendorProductServiceImage.objects.create(
                        product_service=instance,
                        image=image_file
                    )

            # Handle image deletion if requested
            delete_ids = request.data.getlist("delete_image_ids")
            if not delete_ids:
                val = request.data.get("delete_image_ids")
                if val:
                    if isinstance(val, str):
                        if "," in val:
                            delete_ids = [v.strip() for v in val.split(",") if v.strip()]
                        else:
                            delete_ids = [val]
                    elif isinstance(val, list):
                        delete_ids = val

            if delete_ids:
                VendorProductServiceImage.objects.filter(
                    product_service=instance,
                    id__in=delete_ids
                ).delete()

        return super().update(instance, validated_data)
