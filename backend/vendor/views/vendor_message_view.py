from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Max
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from vendor.models.vendor_message import VendorMessage
from vendor.serializers.vendor_message_serializer import VendorMessageSerializer
from vendor.models.account_profile import AccountProfile
from vendor.models.vendor_profile import VendorProfile

class VendorMessageViewSet(viewsets.ModelViewSet):
    serializer_class = VendorMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = VendorMessage.objects.filter(Q(sender=user) | Q(receiver=user))
        
        partner_id = self.request.query_params.get("partner_id")
        if partner_id:
            queryset = queryset.filter(
                Q(sender=user, receiver_id=partner_id) | 
                Q(sender_id=partner_id, receiver=user)
            )
        return queryset

    def perform_create(self, serializer):
        # Auto-set the sender to the current logged in user
        receiver_id = self.request.data.get("receiver")
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=["get"], url_path="conversations")
    def conversations(self, request):
        user = request.user
        # Find all unique user IDs we have messaged with
        messages = VendorMessage.objects.filter(Q(sender=user) | Q(receiver=user))
        
        partner_ids = set()
        for msg in messages:
            if msg.sender_id != user.id:
                partner_ids.add(msg.sender_id)
            if msg.receiver_id != user.id:
                partner_ids.add(msg.receiver_id)
                
        partners = User.objects.filter(id__in=partner_ids)
        
        results = []
        for partner in partners:
            # Get last message
            last_msg = messages.filter(
                Q(sender=user, receiver=partner) | Q(sender=partner, receiver=user)
            ).order_index = ["-created_at"]
            
            last_msg = messages.filter(
                Q(sender=user, receiver=partner) | Q(sender=partner, receiver=user)
            ).order_by("-created_at").first()
            
            # Get role or profile details
            role = "unknown"
            company_name = partner.username
            
            # Check AccountProfile
            try:
                acc_profile = partner.account_profile
                role = acc_profile.role
            except Exception:
                pass
                
            # If partner is supplier, get company name from VendorProfile
            if role == "supplier":
                try:
                    v_profile = partner.vendor_profile
                    if v_profile.company_name:
                        company_name = v_profile.company_name
                except Exception:
                    pass
            
            results.append({
                "partner_id": partner.id,
                "partner_username": partner.username,
                "partner_email": partner.email,
                "partner_role": role,
                "company_name": company_name,
                "last_message": last_msg.content if last_msg else "",
                "last_message_time": last_msg.created_at if last_msg else None,
                "unread_count": messages.filter(sender=partner, receiver=user, is_read=False).count()
            })
            
        # Sort conversations by last message time descending
        results.sort(key=lambda x: x["last_message_time"] or partner.id, reverse=True)
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        partner_id = request.data.get("partner_id")
        if not partner_id:
            return Response({"error": "partner_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark all messages sent by partner to current user as read
        VendorMessage.objects.filter(sender_id=partner_id, receiver=request.user, is_read=False).update(is_read=True)
        return Response({"success": True}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="contacts")
    def contacts(self, request):
        user = request.user
        role = "buyer"
        try:
            role = user.account_profile.role
        except Exception:
            pass

        # If user is buyer, contacts are all verified suppliers (vendors)
        if role == "buyer":
            profiles = VendorProfile.objects.filter(verification_status="verified")
            contacts = []
            for p in profiles:
                contacts.append({
                    "id": p.user.id,
                    "username": p.user.username,
                    "email": p.user.email,
                    "company_name": p.company_name or p.user.username,
                    "role": "supplier"
                })
            return Response(contacts, status=status.HTTP_200_OK)
        else:
            # If user is supplier, they can message buyers they have orders with, or all buyers
            # Let's return all users whose role is buyer
            profiles = AccountProfile.objects.filter(role="buyer")
            contacts = []
            for p in profiles:
                contacts.append({
                    "id": p.user.id,
                    "username": p.user.username,
                    "email": p.user.email,
                    "company_name": p.user.username,
                    "role": "buyer"
                })
            return Response(contacts, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="upload-attachment")
    def upload_attachment(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        file_name = default_storage.save(f"chat_attachments/{file_obj.name}", file_obj)
        file_url = default_storage.url(file_name)
        
        absolute_url = request.build_absolute_uri(file_url) if file_url.startswith("/") else file_url
        content_type = file_obj.content_type or ""
        attachment_type = "image" if content_type.startswith("image/") else "document"
        
        return Response({
            "url": absolute_url,
            "name": file_obj.name,
            "type": attachment_type
        }, status=status.HTTP_200_OK)
