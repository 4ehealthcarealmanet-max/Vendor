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
