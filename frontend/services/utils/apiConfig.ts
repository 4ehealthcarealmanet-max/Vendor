const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

// Optional manual override when you do not want to use env.
// Example: "https://your-backend-service.onrender.com"
const MANUAL_API_BASE_URL = ""

const rawBaseUrl =
  MANUAL_API_BASE_URL.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8000")

if (!rawBaseUrl) {
  throw new Error("Set MANUAL_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL")
}

const BASE_URL = trimTrailingSlash(rawBaseUrl)
const VENDOR_URL = `${BASE_URL}/api/vendor`
const AUTH_URL = `${VENDOR_URL}/auth`

export const API_URLS = {
  BASE: BASE_URL,
  VENDOR: VENDOR_URL,
  AUTH: AUTH_URL,
}
