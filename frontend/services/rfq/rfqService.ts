import axios from "axios"
import {
  VendorQuotationInput,
  VendorRfq,
  VendorRfqInput,
} from "./types"
import { getToken } from "../auth/authService"
import { API_URLS } from "../utils/apiConfig"

const authHeaders = () => {
  const token = getToken()
  if (!token) {
    throw new Error("Missing auth token")
  }
  return { Authorization: `Token ${token}` }
}

const normalizeRfq = (rfq: VendorRfq): VendorRfq => ({
  ...rfq,
  target_budget: Number(rfq.target_budget),
  tender_document_url: rfq.tender_document_url
    ? new URL(rfq.tender_document_url, API_URLS.BASE).toString()
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

export const getRfqs = async () => {
  const res = await axios.get<VendorRfq[]>(`${API_URLS.VENDOR}/rfqs/`, {
    headers: authHeaders(),
  })
  return res.data.map(normalizeRfq)
}

export const getPublicRfqs = async () => {
  const res = await axios.get<VendorRfq[]>(`${API_URLS.VENDOR}/rfqs/`)
  return res.data.map(normalizeRfq)
}

export const createRfq = async (data: VendorRfqInput) => {
  const payload = buildRfqPayload(data)

  const res = await axios.post<VendorRfq>(`${API_URLS.VENDOR}/rfqs/`, payload, {
    headers: authHeaders(),
  })
  return normalizeRfq(res.data)
}

export const updateRfq = async (rfqId: number, data: VendorRfqInput) => {
  const payload = buildRfqPayload(data)
  const res = await axios.patch<VendorRfq>(`${API_URLS.VENDOR}/rfqs/${rfqId}/`, payload, {
    headers: authHeaders(),
  })
  return normalizeRfq(res.data)
}

export const submitQuotation = async (
  rfqId: number,
  data: VendorQuotationInput
) => {
  const res = await axios.post(
    `${API_URLS.VENDOR}/rfqs/${rfqId}/submit-quotation/`,
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
    `${API_URLS.VENDOR}/rfqs/${rfqId}/quotations/${quotationId}/edit/`,
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
    `${API_URLS.VENDOR}/rfqs/${rfqId}/award/`,
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
    `${API_URLS.VENDOR}/rfqs/${rfqId}/reject-quotation/`,
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
    `${API_URLS.VENDOR}/rfqs/${rfqId}/close/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return normalizeRfq(res.data)
}

export const reopenRfq = async (rfqId: number) => {
  const res = await axios.post<VendorRfq>(
    `${API_URLS.VENDOR}/rfqs/${rfqId}/reopen/`,
    {},
    {
      headers: authHeaders(),
    }
  )
  return normalizeRfq(res.data)
}

export const deleteRfq = async (rfqId: number) => {
  await axios.delete(`${API_URLS.VENDOR}/rfqs/${rfqId}/`, {
    headers: authHeaders(),
  })
}
