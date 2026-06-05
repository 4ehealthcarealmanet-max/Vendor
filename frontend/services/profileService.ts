import axios from "axios"
import { API_URLS } from "./utils/apiConfig"
import { getToken } from "./auth/authService"

const getAuthHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

export const getUserProfile = async () => {
  const res = await axios.get(`${API_URLS.AUTH}/profile/`, {
    headers: getAuthHeaders(),
  })
  return res.data
}

export const updateUserProfile = async (data: any) => {
  const res = await axios.post(`${API_URLS.AUTH}/profile/update/`, data, {
    headers: getAuthHeaders(),
  })
  return res.data
}
