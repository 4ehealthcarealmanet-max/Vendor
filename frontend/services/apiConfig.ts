const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000"

export const API_BASE_URL = trimTrailingSlash(rawBaseUrl)
export const VENDOR_API_URL = `${API_BASE_URL}/api/vendor`
export const AUTH_API_URL = `${VENDOR_API_URL}/auth`
