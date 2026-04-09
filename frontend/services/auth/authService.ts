import axios from "axios"
import { AuthResponse, AuthUser, LoginInput, RegisterInput, ResetPasswordInput, ResetPasswordResponse } from "./types"
import { API_URLS } from "../utils/apiConfig"

const TOKEN_KEY = "vendor_auth_token"

export const getToken = () => {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
}

export const isAuthSessionError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    return status === 401 || status === 403
  }

  return error instanceof Error && error.message === "Missing auth token"
}

export const registerUser = async (data: RegisterInput) => {
  const res = await axios.post<AuthResponse>(`${API_URLS.AUTH}/register/`, data)
  return res.data
}

export const loginUser = async (data: LoginInput) => {
  const res = await axios.post<AuthResponse>(`${API_URLS.AUTH}/login/`, data)
  return res.data
}

export const getCurrentUser = async () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  const res = await axios.get<AuthUser>(`${API_URLS.AUTH}/me/`, {
    headers: { Authorization: `Token ${token}` },
  })
  return res.data
}

export const logoutUser = async () => {
  const token = getToken()
  if (!token) return
  await axios.post(
    `${API_URLS.AUTH}/logout/`,
    {},
    {
      headers: { Authorization: `Token ${token}` },
    }
  )
}

export const resetPassword = async (data: ResetPasswordInput) => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  const res = await axios.post<ResetPasswordResponse>(`${API_URLS.AUTH}/reset-password/`, data, {
    headers: { Authorization: `Token ${token}` },
  })
  setToken(res.data.token)
  return res.data
}
