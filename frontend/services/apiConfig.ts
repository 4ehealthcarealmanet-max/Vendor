const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
const rawBaseUrl =
  configuredBaseUrl || (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8000")

if (!rawBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production")
}

export const API_BASE_URL = trimTrailingSlash(rawBaseUrl)
export const VENDOR_API_URL = `${API_BASE_URL}/api/vendor`
export const AUTH_API_URL = `${VENDOR_API_URL}/auth`
