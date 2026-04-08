import axios from "axios"
import { VendorProductService, VendorProductServiceInput } from "./types"
import { getToken } from "../auth/authService"
import { API_URLS } from "../utils/apiConfig"

const authHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

export const getProducts = async () => {
  const res = await axios.get<VendorProductService[]>(`${API_URLS.VENDOR}/products/`, {
    headers: authHeaders(),
  })
  return res.data
}

export const createProduct = async (data: VendorProductServiceInput) => {
  const res = await axios.post<VendorProductService>(`${API_URLS.VENDOR}/products/`, data, {
    headers: authHeaders(),
  })
  return res.data
}

export const updateProduct = async (id: number, data: VendorProductServiceInput) => {
  const res = await axios.patch<VendorProductService>(`${API_URLS.VENDOR}/products/${id}/`, data, {
    headers: authHeaders(),
  })
  return res.data
}

export const deleteProduct = async (id: number) => {
  await axios.delete(`${API_URLS.VENDOR}/products/${id}/`, {
    headers: authHeaders(),
  })
}
