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
    company_name?: string
    gst_number?: string
    license_number?: string
    address?: string
    brand_name?: string
    buyer_type?: string
    department?: string
  }
}
