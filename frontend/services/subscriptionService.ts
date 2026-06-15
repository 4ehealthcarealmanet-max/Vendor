import axios from "axios"
import { API_URLS } from "./utils/apiConfig"
import { getToken } from "./auth/authService"

export interface SubscriptionPlan {
  id: number
  name: string
  description: string
  price_inr: string
  duration_days: number
  target_role: string
}

export interface PaymentInitializationResponse {
  order_id: string
  amount_paise: number
  currency: string
  key_id: string
  plan_id: number
}

export interface PaymentVerificationInput {
  plan_id: number
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface PaymentVerificationResponse {
  detail: string
  has_active_subscription: boolean
  start_date: string
  end_date: string
}

const getAuthHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const res = await axios.get<SubscriptionPlan[]>(`${API_URLS.VENDOR}/subscriptions/plans/`, {
    headers: getAuthHeaders(),
  })
  return res.data
}

export const initializeSubscriptionPayment = async (planId: number): Promise<PaymentInitializationResponse> => {
  const res = await axios.post<PaymentInitializationResponse>(
    `${API_URLS.VENDOR}/subscriptions/initialize/`,
    { plan_id: planId },
    { headers: getAuthHeaders() }
  )
  return res.data
}

export const verifySubscriptionPayment = async (data: PaymentVerificationInput): Promise<PaymentVerificationResponse> => {
  const res = await axios.post<PaymentVerificationResponse>(
    `${API_URLS.VENDOR}/subscriptions/verify/`,
    data,
    { headers: getAuthHeaders() }
  )
  return res.data
}
