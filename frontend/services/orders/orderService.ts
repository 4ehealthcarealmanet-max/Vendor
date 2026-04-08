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
  const res = await axios.post<VendorOrder>(
    `${API_URLS.VENDOR}/orders/${orderId}/accept-po/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const updateOrderTracking = async (
  orderId: number,
  payload: Partial<Pick<VendorOrder, "status" | "payment_status" | "delivery_status" | "tracking_note">>
) => {
  const res = await axios.post<VendorOrder>(
    `${API_URLS.VENDOR}/orders/${orderId}/update-tracking/`,
    payload,
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const markOrderReceived = async (orderId: number) => {
  const res = await axios.post<VendorOrder>(
    `${API_URLS.VENDOR}/orders/${orderId}/mark-received/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const createSubcontractRfq = async (orderId: number, shortageQuantity: number) => {
  const res = await axios.post<{ order_id: number; subcontract_rfq_id: number; message: string }>(
    `${API_URLS.VENDOR}/orders/${orderId}/subcontract/`,
    {
      shortage_quantity: shortageQuantity,
    },
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const reorderFromOrder = async (orderId: number) => {
  const res = await axios.post<VendorOrder>(
    `${API_URLS.VENDOR}/orders/${orderId}/reorder/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return res.data
}
