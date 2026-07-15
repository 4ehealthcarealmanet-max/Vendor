# Backend API Reference

All requests must include the header `Authorization: Token <your_token>` unless specified as **Public** or **AllowAny**.

---

## 1. Authentication & Account Management

### Register Account
*   **Endpoint**: `POST /api/vendor/auth/register/`
*   **Access**: Public (AllowAny)
*   **Request Payload**:
    ```json
    {
      "username": "supplier_john",
      "password": "SecurePassword123",
      "email": "john@example.com",
      "role": "supplier"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "message": "Registration successful. Please complete your profile.",
      "token": "a1b2c3d4e5f6g7h8i9j0...",
      "user": {
        "id": 12,
        "username": "supplier_john",
        "email": "john@example.com",
        "role": "supplier",
        "status": "pending"
      }
    }
    ```

### Login
*   **Endpoint**: `POST /api/vendor/auth/login/`
*   **Access**: Public (AllowAny)
*   **Request Payload**:
    ```json
    {
      "username": "supplier_john",
      "password": "SecurePassword123"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "token": "a1b2c3d4e5f6g7h8i9j0...",
      "user": {
        "id": 12,
        "username": "supplier_john",
        "email": "john@example.com",
        "role": "supplier",
        "status": "approved",
        "has_active_subscription": true,
        "active_subscription_plan_id": 2
      }
    }
    ```

### Get My Info
*   **Endpoint**: `GET /api/vendor/auth/me/`
*   **Access**: Authenticated / Admin Token
*   **Response (200 OK)**:
    ```json
    {
      "id": 12,
      "username": "supplier_john",
      "email": "john@example.com",
      "role": "supplier",
      "status": "approved",
      "buyer_type": null,
      "has_active_subscription": true,
      "active_subscription_plan_id": 2
    }
    ```

### Update User Profile
*   **Endpoint**: `POST /api/vendor/auth/profile/update/`
*   **Access**: Authenticated (Supplier or Buyer)
*   **Request Payload (Supplier Profile example)**:
    ```json
    {
      "company_name": "Acme Pharma",
      "brand_name": "Acme Care",
      "gst_number": "22AAAAA0000A1Z5",
      "license_number": "DL-12345",
      "business_category": "Pharmaceuticals",
      "address": "123 Health Ave, Mumbai",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "contact_name": "John Doe",
      "phone": "+919876543210"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "detail": "Profile updated successfully.",
      "profile": { ... }
    }
    ```

---

## 2. Admin Management

### List Platform Users
*   **Endpoint**: `GET /api/vendor/auth/admin/users/`
*   **Access**: Admin Access (Header: `Authorization: Bearer <admin_session_token>`)
*   **Response (200 OK)**:
    ```json
    [
      {
        "id": 12,
        "username": "supplier_john",
        "email": "john@example.com",
        "role": "supplier",
        "status": "pending",
        "verification_info": {
          "company_name": "Acme Pharma",
          "gst_number": "22AAAAA0000A1Z5"
        }
      }
    ]
    ```

### Update User Status
*   **Endpoint**: `POST /api/vendor/auth/admin/users/<int:user_id>/status/`
*   **Access**: Admin Access
*   **Request Payload**:
    ```json
    {
      "status": "approved"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "detail": "User approved.",
      "user": {
        "id": 12,
        "status": "approved"
      }
    }
    ```

---

## 3. Product & Service Catalog

### List Listings
*   **Endpoint**: `GET /api/vendor/products/`
*   **Access**: Public / Authenticated
*   **Query Parameters**: `search` (filter by name/description), `vendor` (filter by supplier ID)

### Create Listing
*   **Endpoint**: `POST /api/vendor/products/`
*   **Access**: Authenticated (Supplier role + Active Subscription)
*   **Request Payload**:
    ```json
    {
      "name": "N95 Surgical Mask",
      "description": "Premium 5-ply filter masks.",
      "product_type": "product",
      "price": "45.00",
      "stock": 10000,
      "is_active": true
    }
    ```

---

## 4. Requests For Quotation (RFQ) & Bidding

### Create RFQ
*   **Endpoint**: `POST /api/vendor/rfqs/`
*   **Access**: Authenticated (Buyer or Supplier for subcontracting)
*   **Request Payload**:
    ```json
    {
      "title": "Need 5000 units of Surgical Masks",
      "description": "Urgent requirement for general clinic use.",
      "product_type": "product",
      "quantity": 5000,
      "target_budget": "200000.00",
      "delivery_location": "Vikas Clinic, Pune",
      "expected_delivery_date": "2026-08-15",
      "quote_deadline": "2026-07-25",
      "tender_type": "open"
    }
    ```

### Submit Bid/Quotation
*   **Endpoint**: `POST /api/vendor/rfqs/<int:rfq_id>/submit-quotation/`
*   **Access**: Authenticated (Supplier)
*   **Request Payload**:
    ```json
    {
      "product_id": 4,
      "unit_price": "38.50",
      "lead_time_days": 5,
      "validity_days": 15,
      "notes": "Can deliver via air express."
    }
    ```

### Award RFQ
*   **Endpoint**: `POST /api/vendor/rfqs/<int:rfq_id>/award/`
*   **Access**: Authenticated (Buyer)
*   **Request Payload**:
    ```json
    {
      "quotation_id": 7
    }
    ```
*   **Response (200 OK)**:
    - Awards the quote.
    - Locks the RFQ status to `awarded`.
    - Automatically generates a new Order with status `po_released`.

---

## 5. Order Orchestration & Logistics

### Accept Purchase Order (PO)
*   **Endpoint**: `POST /api/vendor/orders/<int:order_id>/accept-po/`
*   **Access**: Authenticated (Supplier linked to the order)
*   **Response (200 OK)**: Sets status to `po_accepted`.

### Update Tracking (Supplier)
*   **Endpoint**: `POST /api/vendor/orders/<int:order_id>/update-tracking/`
*   **Access**: Authenticated (Supplier)
*   **Request Payload**:
    ```json
    {
      "status": "shipped",
      "delivery_status": "in_transit",
      "tracking_note": "Dispatched via DHL. Tracking ID: DHL98341"
    }
    ```

### Confirm Goods Received (Buyer)
*   **Endpoint**: `POST /api/vendor/orders/<int:order_id>/mark-received/`
*   **Access**: Authenticated (Buyer)
*   **Response (200 OK)**: Sets status to `goods_received` and delivery status to `delivered`.

### Trigger Payment (Buyer)
*   **Endpoint**: `POST /api/vendor/orders/<int:order_id>/make-payment/`
*   **Access**: Authenticated (Buyer)
*   **Response (200 OK)**: Sets payment status to `payment_requested`.

### Confirm Payment Received (Supplier)
*   **Endpoint**: `POST /api/vendor/orders/<int:order_id>/confirm-payment/`
*   **Access**: Authenticated (Supplier)
*   **Response (200 OK)**: Sets payment status to `paid`. If goods were already received, sets order status to `completed`.

### Initiate Subcontracting (Supplier)
*   **Endpoint**: `POST /api/vendor/orders/<int:order_id>/subcontract/`
*   **Access**: Authenticated (Supplier)
*   **Request Payload**:
    ```json
    {
      "shortage_quantity": 1200
    }
    ```
*   **Response (201 Created)**: 
    *   Creates a derived Subcontract RFQ for `1200` units.
    *   Sets original order status to `partially_subcontracted`.

---

## 6. Subscription & Payments

### List Subscription Plans
*   **Endpoint**: `GET /api/vendor/subscriptions/plans/`
*   **Access**: Authenticated
*   **Response (200 OK)**: Lists active plans targeted for the caller's role.

### Initialize Razorpay Payment
*   **Endpoint**: `POST /api/vendor/subscriptions/initialize/`
*   **Access**: Authenticated
*   **Request Payload**:
    ```json
    {
      "plan_id": 2
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "order_id": "order_Hj2389djk0S2d",
      "amount_paise": 49900,
      "currency": "INR",
      "key_id": "rzp_test_...",
      "plan_id": 2
    }
    ```

### Verify Razorpay Payment Signature
*   **Endpoint**: `POST /api/vendor/subscriptions/verify/`
*   **Access**: Authenticated
*   **Request Payload**:
    ```json
    {
      "plan_id": 2,
      "razorpay_order_id": "order_Hj2389djk0S2d",
      "razorpay_payment_id": "pay_Kk8345jsdK",
      "razorpay_signature": "signature_hash_value"
    }
    ```
*   **Response (200 OK)**: Activates subscription for the user.
