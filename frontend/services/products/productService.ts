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

const buildProductPayload = (data: VendorProductServiceInput) => {
  const payload = new FormData()
  payload.append("name", data.name)
  payload.append("description", data.description)
  payload.append("product_type", data.product_type)
  payload.append("price", String(data.price))
  payload.append("stock", String(data.stock))
  payload.append("is_active", String(data.is_active))

  if (data.images && data.images.length > 0) {
    data.images.forEach((img) => {
      payload.append("images", img)
    })
  }

  if (data.delete_image_ids && data.delete_image_ids.length > 0) {
    data.delete_image_ids.forEach((id) => {
      payload.append("delete_image_ids", String(id))
    })
  }

  return payload
}

export const getProducts = async () => {
  const res = await axios.get<VendorProductService[]>(`${API_URLS.VENDOR}/products/`, {
    headers: authHeaders(),
  })
  return res.data
}

export const createProduct = async (data: VendorProductServiceInput) => {
  const payload = buildProductPayload(data)
  const res = await axios.post<VendorProductService>(`${API_URLS.VENDOR}/products/`, payload, {
    headers: authHeaders(),
  })
  return res.data
}

export const updateProduct = async (id: number, data: VendorProductServiceInput) => {
  const payload = buildProductPayload(data)
  const res = await axios.patch<VendorProductService>(`${API_URLS.VENDOR}/products/${id}/`, payload, {
    headers: authHeaders(),
  })
  return res.data
}

export const deleteProduct = async (id: number) => {
  await axios.delete(`${API_URLS.VENDOR}/products/${id}/`, {
    headers: authHeaders(),
  })
}
