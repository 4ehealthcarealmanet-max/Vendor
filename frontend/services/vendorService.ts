import axios from "axios"
import {
  VendorOrder,
  VendorOrderInput,
  VendorProductService,
  VendorProductServiceInput,
  VendorQuotationInput,
  VendorRfq,
  VendorRfqInput,
  VendorRfqVendor,
} from "@/types/vendor"
import { getToken } from "@/services/authService"
import { API_BASE_URL, VENDOR_API_URL } from "@/services/apiConfig"

const API = VENDOR_API_URL
const API_ORIGIN = API_BASE_URL

const authHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

export const getProducts = async () => {
  const res = await axios.get<VendorProductService[]>(`${API}/products/`, {
    headers: authHeaders(),
  })
  return res.data
}

export const createProduct = async (data: VendorProductServiceInput) => {
  const res = await axios.post<VendorProductService>(`${API}/products/`, data, {
    headers: authHeaders(),
  })
  return res.data
}

export const updateProduct = async (id: number, data: VendorProductServiceInput) => {
  const res = await axios.patch<VendorProductService>(`${API}/products/${id}/`, data, {
    headers: authHeaders(),
  })
  return res.data
}

export const deleteProduct = async (id: number) => {
  await axios.delete(`${API}/products/${id}/`, {
    headers: authHeaders(),
  })
}

export const getOrders = async () => {
  const res = await axios.get<VendorOrder[]>(`${API}/orders/`, {
    headers: authHeaders(),
  })
  return res.data
}

export const createOrder = async (data: VendorOrderInput) => {
  const res = await axios.post<VendorOrder>(`${API}/orders/`, data, {
    headers: authHeaders(),
  })
  return res.data
}

export const acceptPo = async (orderId: number) => {
  const res = await axios.post<VendorOrder>(
    `${API}/orders/${orderId}/accept-po/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const updateOrderTracking = async (
  orderId: number,
  payload: Partial<Pick<VendorOrder, "status" | "payment_status" | "delivery_status" | "tracking_note">>
) => {
  const res = await axios.post<VendorOrder>(
    `${API}/orders/${orderId}/update-tracking/`,
    payload,
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const markOrderReceived = async (orderId: number) => {
  const res = await axios.post<VendorOrder>(
    `${API}/orders/${orderId}/mark-received/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const createSubcontractRfq = async (orderId: number, shortageQuantity: number) => {
  const res = await axios.post<{ order_id: number; subcontract_rfq_id: number; message: string }>(
    `${API}/orders/${orderId}/subcontract/`,
    {
      shortage_quantity: shortageQuantity,
    },
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const reorderFromOrder = async (orderId: number) => {
  const res = await axios.post<VendorOrder>(
    `${API}/orders/${orderId}/reorder/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

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

const normalizeRfq = (rfq: VendorRfq): VendorRfq => ({
  ...rfq,
  target_budget: Number(rfq.target_budget),
  tender_document_url: rfq.tender_document_url
    ? new URL(rfq.tender_document_url, API_ORIGIN).toString()
    : null,
  tender_document_name: rfq.tender_document_name ?? null,
  tender_document_note: rfq.tender_document_note ?? "",
  tender_document_uploaded_at: rfq.tender_document_uploaded_at ?? null,
  invited_vendors: rfq.invited_vendors ?? [],
  awarded_quote_id: rfq.awarded_quote_id ?? null,
  awarded_vendor_id: rfq.awarded_vendor_id ?? null,
  awarded_supplier_name: rfq.awarded_supplier_name ?? null,
  awarded_supplier_company: rfq.awarded_supplier_company ?? null,
  awarded_order_id: rfq.awarded_order_id ?? null,
  awarded_at: rfq.awarded_at ?? null,
  quotations: (rfq.quotations ?? []).map((quote) => ({
    ...quote,
    supplier_vendor_id: quote.supplier_vendor_id ?? null,
    product_id: quote.product_id ?? 0,
    product_name: quote.product_name ?? "Quoted listing",
    status: quote.status ?? "submitted",
    rejection_reason: quote.rejection_reason ?? "",
    rejected_at: quote.rejected_at ?? null,
    unit_price: Number(quote.unit_price),
  })),
})

export const getRfqs = async () => {
  const res = await axios.get<VendorRfq[]>(`${API}/rfqs/`, {
    headers: authHeaders(),
  })
  return res.data.map(normalizeRfq)
}

export const getPublicRfqs = async () => {
  const res = await axios.get<VendorRfq[]>(`${API}/rfqs/`)
  return res.data.map(normalizeRfq)
}

const buildRfqPayload = (data: VendorRfqInput) => {
  const payload = new FormData()
  payload.append("title", data.title)
  payload.append("description", data.description)
  payload.append("product_type", data.product_type)
  payload.append("quantity", String(data.quantity))
  payload.append("target_budget", String(data.target_budget))
  payload.append("delivery_location", data.delivery_location)
  payload.append("expected_delivery_date", data.expected_delivery_date)
  payload.append("quote_deadline", data.quote_deadline)
  payload.append("tender_document_note", data.tender_document_note || "")
  payload.append("tender_type", data.tender_type)
  data.invited_vendors.forEach((vendor) => {
    payload.append("invited_vendor_ids", String(vendor.vendor_id))
  })
  if (data.tender_document) {
    payload.append("tender_document", data.tender_document)
  }
  if (data.remove_tender_document) {
    payload.append("remove_tender_document", "true")
  }
  return payload
}

export const createRfq = async (data: VendorRfqInput) => {
  const payload = buildRfqPayload(data)

  const res = await axios.post<VendorRfq>(`${API}/rfqs/`, payload, {
    headers: authHeaders(),
  })
  return normalizeRfq(res.data)
}

export const updateRfq = async (rfqId: number, data: VendorRfqInput) => {
  const payload = buildRfqPayload(data)
  const res = await axios.patch<VendorRfq>(`${API}/rfqs/${rfqId}/`, payload, {
    headers: authHeaders(),
  })
  return normalizeRfq(res.data)
}

export const submitQuotation = async (
  rfqId: number,
  data: VendorQuotationInput
) => {
  const res = await axios.post(
    `${API}/rfqs/${rfqId}/submit-quotation/`,
    data,
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const editQuotation = async (
  rfqId: number,
  quotationId: number,
  data: Partial<VendorQuotationInput>
) => {
  const res = await axios.patch(
    `${API}/rfqs/${rfqId}/quotations/${quotationId}/edit/`,
    data,
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const awardQuotation = async (
  rfqId: number,
  quotationId: number,
  payload: {
    vendorId: number | null
    supplierName: string
    supplierCompany?: string
    orderId?: number | null
  }
) => {
  const res = await axios.post<VendorRfq>(
    `${API}/rfqs/${rfqId}/award/`,
    {
      quotation_id: quotationId,
      order_id: payload.orderId ?? null,
    },
    {
      headers: authHeaders(),
    }
  )
  return normalizeRfq(res.data)
}

export const rejectQuotation = async (
  rfqId: number,
  quotationId: number,
  reason = ""
) => {
  const res = await axios.post(
    `${API}/rfqs/${rfqId}/reject-quotation/`,
    {
      quotation_id: quotationId,
      reason,
    },
    {
      headers: authHeaders(),
    }
  )
  return res.data
}

export const closeRfq = async (rfqId: number) => {
  const res = await axios.post<VendorRfq>(
    `${API}/rfqs/${rfqId}/close/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return normalizeRfq(res.data)
}

export const reopenRfq = async (rfqId: number) => {
  const res = await axios.post<VendorRfq>(
    `${API}/rfqs/${rfqId}/reopen/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return normalizeRfq(res.data)
}

export const deleteRfq = async (rfqId: number) => {
  await axios.delete(`${API}/rfqs/${rfqId}/`, {
    headers: authHeaders(),
  })
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
