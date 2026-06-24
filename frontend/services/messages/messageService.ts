import axios from "axios"
import { getToken } from "../auth/authService"
import { API_URLS } from "../utils/apiConfig"

export interface Conversation {
  partner_id: number
  partner_username: string
  partner_email?: string
  partner_role: string
  company_name: string
  last_message: string
  last_message_time: string | null
  unread_count: number
}

export interface ChatMessage {
  id: number
  sender: number
  sender_username: string
  receiver: number
  receiver_username: string
  content: string
  attachment_url?: string
  attachment_type?: string
  attachment_name?: string
  is_read: boolean
  created_at: string
}

export interface Contact {
  id: number
  username: string
  email?: string
  company_name: string
  role: string
}

const authHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await axios.get<Conversation[]>(`${API_URLS.VENDOR}/messages/conversations/`, {
    headers: authHeaders(),
  })
  return res.data
}

export const getMessages = async (partnerId: number): Promise<ChatMessage[]> => {
  const res = await axios.get<ChatMessage[]>(`${API_URLS.VENDOR}/messages/?partner_id=${partnerId}`, {
    headers: authHeaders(),
  })
  return res.data
}

export const sendMessage = async (
  receiverId: number,
  content: string,
  attachmentUrl?: string,
  attachmentType?: string,
  attachmentName?: string
): Promise<ChatMessage> => {
  const res = await axios.post<ChatMessage>(
    `${API_URLS.VENDOR}/messages/`,
    {
      receiver: receiverId,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName
    },
    { headers: authHeaders() }
  )
  return res.data
}

export const uploadAttachment = async (
  file: File
): Promise<{ url: string; name: string; type: string }> => {
  const formData = new FormData()
  formData.append("file", file)
  const res = await axios.post<{ url: string; name: string; type: string }>(
    `${API_URLS.VENDOR}/messages/upload-attachment/`,
    formData,
    {
      headers: {
        ...authHeaders(),
        "Content-Type": "multipart/form-data"
      }
    }
  )
  return res.data
}

export const markMessagesRead = async (partnerId: number): Promise<{ success: boolean }> => {
  const res = await axios.post<{ success: boolean }>(
    `${API_URLS.VENDOR}/messages/mark-read/`,
    { partner_id: partnerId },
    { headers: authHeaders() }
  )
  return res.data
}

export const getContacts = async (): Promise<Contact[]> => {
  const res = await axios.get<Contact[]>(`${API_URLS.VENDOR}/messages/contacts/`, {
    headers: authHeaders(),
  })
  return res.data
}
