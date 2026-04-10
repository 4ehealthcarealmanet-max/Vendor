import axios from "axios"
import { VendorOrder, VendorOrderInput } from "./types"
import { getToken } from "../auth/authService"
import { API_URLS } from "../utils/apiConfig"

const authHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

const postOrderAction = async <T>(orderId: number, path: string, data: object = {}) => {
  const res = await axios.post<T>(`${API_URLS.VENDOR}/orders/${orderId}/${path}/`, data, {
    headers: authHeaders(),
  })
  return res.data
}

export const getOrders = async () => {
  const res = await axios.get<VendorOrder[]>(`${API_URLS.VENDOR}/orders/`, {
    headers: authHeaders(),
  })
  return res.data
}

export const createOrder = async (data: VendorOrderInput) => {
  const res = await axios.post<VendorOrder>(`${API_URLS.VENDOR}/orders/`, data, {
    headers: authHeaders(),
  })
  return res.data
}

export const acceptPo = async (orderId: number) => {
  return postOrderAction<VendorOrder>(orderId, "accept-po")
}

export const updateOrderTracking = async (
  orderId: number,
  payload: Partial<Pick<VendorOrder, "status" | "payment_status" | "delivery_status" | "tracking_note">>
) => {
  return postOrderAction<VendorOrder>(orderId, "update-tracking", payload)
}

export const markOrderReceived = async (orderId: number) => {
  return postOrderAction<VendorOrder>(orderId, "mark-received")
}

export const makeDummyPayment = async (orderId: number) => {
  return postOrderAction<VendorOrder>(orderId, "make-payment")
}

export const markPaymentOverdue = async (orderId: number) => {
  return postOrderAction<VendorOrder>(orderId, "mark-payment-overdue")
}

export const createSubcontractRfq = async (orderId: number, shortageQuantity: number) => {
  return postOrderAction<{ order_id: number; subcontract_rfq_id: number; message: string }>(
    orderId,
    "subcontract",
    { shortage_quantity: shortageQuantity }
  )
}

export const reorderFromOrder = async (orderId: number) => {
  return postOrderAction<VendorOrder>(orderId, "reorder")
}
