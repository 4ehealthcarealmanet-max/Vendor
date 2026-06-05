export interface AuthUser {
  id: number
  username: string
  email: string
  role: "supplier" | "buyer" | "admin"
  status: "pending" | "approved" | "rejected"
  buyer_type: "hospital" | "pharmacy" | "ngo" | "clinic" | null
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface RegisterResponse {
  message: string
  user: AuthUser
  token?: string
}

export interface LoginInput {
  username: string
  password: string
}

export interface RegisterInput extends LoginInput {
  email: string
  role: "supplier" | "buyer"
  buyer_type?: "hospital" | "pharmacy" | "ngo" | "clinic"
}

export interface ResetPasswordInput {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface ResetPasswordResponse {
  detail: string
  token: string
}

export interface AdminUser {
  id: number
  name: string
  username: string
  email: string
  role: "supplier" | "buyer"
  status: "pending" | "approved" | "rejected"
  buyer_type: "hospital" | "pharmacy" | "ngo" | "clinic" | null
  created_at: string
  verification_info?: {
    // Common
    company_name?: string
    organization_name?: string
    gst_number?: string
    address?: string
    city?: string
    state?: string
    pincode?: string
    contact_name?: string
    designation?: string
    phone?: string
    email?: string
    procurement_contact_name?: string
    latitude?: string
    longitude?: string
    // Supplier only
    brand_name?: string
    license_number?: string
    business_category?: string
    years_in_business?: string
    product_categories?: string
    supply_regions?: string
    minimum_order_value?: string
    average_lead_time?: string
    warehouse_capacity?: string
    bank_account_name?: string
    bank_account_number?: string
    ifsc_code?: string
    gst_document?: string
    license_document?: string
    iso_certificate?: string
    // Buyer only
    buyer_type?: string
    department?: string
    institution_size?: string
    monthly_spend?: string
    payment_terms?: string
    approval_flow?: string
    categories_needed?: string
    delivery_locations?: string
    urgency_window?: string
    compliance_needs?: string
    onboarding_documents?: string
  }
}
