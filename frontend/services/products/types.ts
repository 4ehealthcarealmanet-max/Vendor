export interface ProductImage {
  id: number
  image_url: string
}

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
  images?: ProductImage[]
}

export interface VendorProductServiceInput {
  name: string
  description: string
  product_type: "product" | "service"
  price: number
  stock: number
  is_active: boolean
  images?: File[]
  delete_image_ids?: number[]
}
