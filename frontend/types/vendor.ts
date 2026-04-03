export interface VendorProductService {
  id: number
  vendor: number
  vendor_company_name?: string
  vendor_username?: string
  name: string
  description: string
  product_type: "product" | "service"
  price: string
  stock: number
  is_active: boolean
}

export interface VendorOrderItem {
  id?: number
  order?: number
  product: number
  quantity: number
  price: number
}

export interface VendorOrder {
  id: number
  buyer: number
  buyer_type?: "hospital" | "pharmacy" | "ngo" | "clinic" | null
  vendor: number
  status:
    | "po_released"
    | "po_accepted"
    | "processing"
    | "partially_subcontracted"
    | "ready_to_dispatch"
    | "shipped"
    | "delivered"
    | "goods_received"
    | "completed"
    | "cancelled"
  payment_status: "pending" | "partially_paid" | "paid" | "overdue"
  delivery_status: "not_started" | "loaded" | "in_transit" | "out_for_delivery" | "delivered"
  tracking_note: string
  po_released_at?: string | null
  po_accepted_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  goods_received_at?: string | null
  total_amount: string
  created_at: string
  items: VendorOrderItem[]
}

export interface VendorOrderInput {
  vendor: number
  total_amount: number
  items: VendorOrderItem[]
}

export interface VendorProductServiceInput {
  name: string
  description: string
  product_type: "product" | "service"
  price: number
  stock: number
  is_active: boolean
}

export interface VendorQuotation {
  id: number
  rfq_id: number
  supplier_vendor_id: number | null
  supplier_name: string
  supplier_company?: string
  product_id: number
  product_name: string
  unit_price: number
  lead_time_days: number
  validity_days: number
  notes: string
  status: "submitted" | "rejected" | "awarded"
  rejection_reason?: string
  rejected_at?: string | null
  created_at: string
}

export interface VendorQuotationInput {
  product_id: number
  unit_price: number
  lead_time_days: number
  validity_days: number
  notes: string
}

export interface VendorRfqVendor {
  vendor_id: number
  vendor_name: string
  vendor_username?: string
}

export interface VendorRfq {
  id: number
  title: string
  description: string
  product_type: "product" | "service"
  quantity: number
  target_budget: number
  delivery_location: string
  expected_delivery_date: string
  quote_deadline: string
  tender_document_url?: string | null
  tender_document_name?: string | null
  tender_document_note?: string
  tender_document_uploaded_at?: string | null
  tender_type: "open" | "limited" | "reverse"
  status: "open" | "under_review" | "awarded" | "closed"
  buyer_name: string
  buyer_company?: string
  buyer_type?: "hospital" | "pharmacy" | "ngo" | "clinic" | null
  created_at: string
  invited_vendors: VendorRfqVendor[]
  awarded_quote_id?: number | null
  awarded_vendor_id?: number | null
  awarded_supplier_name?: string | null
  awarded_supplier_company?: string | null
  awarded_order_id?: number | null
  awarded_at?: string | null
  source_order_id?: number | null
  source_type?: string
  quotations: VendorQuotation[]
}

export interface VendorRfqInput {
  title: string
  description: string
  product_type: "product" | "service"
  quantity: number
  target_budget: number
  delivery_location: string
  expected_delivery_date: string
  quote_deadline: string
  tender_document?: File | null
  tender_document_note: string
  remove_tender_document?: boolean
  tender_type: "open" | "limited" | "reverse"
  invited_vendors: VendorRfqVendor[]
}
