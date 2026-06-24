import axios from "axios"
import { API_URLS } from "./apiConfig"
import { getToken } from "../auth/authService"

export type AppNotificationType = "success" | "error" | "info" | "warning"

export type AppNotification = {
  id?: number
  type?: AppNotificationType
  title?: string
  message: string
  details?: string
  url?: string
  is_read?: boolean
  created_at?: string
}

const getAuthHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

export const notifyUser = ({ type = "info", title, message, details, url }: AppNotification) => {
  if (typeof window === "undefined" || !message.trim()) return

  window.dispatchEvent(
    new CustomEvent<AppNotification>("app:notification", {
      detail: { type, title, message, details, url },
    })
  )
}

export const getNotifications = async (): Promise<AppNotification[]> => {
  const res = await axios.get(`${API_URLS.VENDOR}/notifications/`, {
    headers: getAuthHeaders(),
  })
  return res.data
}

export const markAllNotificationsRead = async (): Promise<{ detail: string }> => {
  const res = await axios.post(`${API_URLS.VENDOR}/notifications/mark-all-read/`, {}, {
    headers: getAuthHeaders(),
  })
  return res.data
}

export const clearAllNotifications = async (): Promise<{ detail: string }> => {
  const res = await axios.post(`${API_URLS.VENDOR}/notifications/clear-all/`, {}, {
    headers: getAuthHeaders(),
  })
  return res.data
}
