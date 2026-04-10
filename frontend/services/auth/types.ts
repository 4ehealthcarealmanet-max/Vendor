export interface AuthUser {
  id: number
  username: string
  email: string
  role: "supplier" | "buyer"
  buyer_type: "hospital" | "pharmacy" | "ngo" | "clinic" | null
}

export interface AuthResponse {
  token: string
  user: AuthUser
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
