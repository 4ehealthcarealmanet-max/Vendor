const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000"

const BASE_URL = trimTrailingSlash(rawBaseUrl)
const VENDOR_URL = `${BASE_URL}/api/vendor`
const AUTH_URL = `${VENDOR_URL}/auth`

export const API_URLS = {
  BASE: BASE_URL,
  VENDOR: VENDOR_URL,
  AUTH: AUTH_URL,
}
