import axios from "axios"
import { VendorProductService } from "../products/types"
import { VendorRfqVendor } from "../rfq/types"

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (typeof data === "string" && data.trim()) {
      return data
    }

    if (data && typeof data === "object") {
      const messages = Object.entries(data).flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${field}: ${String(item)}`)
        }
        return [`${field}: ${String(value)}`]
      })

      if (messages.length > 0) {
        return messages.join(" | ")
      }
    }

    if (error.message) {
      return error.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export const getUniqueVendorsFromProducts = (products: VendorProductService[]): VendorRfqVendor[] => {
  const vendorMap = new Map<number, VendorRfqVendor>()

  products.forEach((product) => {
    if (!vendorMap.has(product.vendor)) {
      vendorMap.set(product.vendor, {
        vendor_id: product.vendor,
        vendor_name: product.vendor_company_name || product.vendor_username || `Vendor ${product.vendor}`,
        vendor_username: product.vendor_username,
      })
    }
  })

  return Array.from(vendorMap.values()).sort((a, b) => a.vendor_name.localeCompare(b.vendor_name))
}
