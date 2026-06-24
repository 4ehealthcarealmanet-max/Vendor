"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import SupplierNavbar from "@/components/supplier/SupplierNavbar"
import SupplierFooter from "@/components/supplier/SupplierFooter"
import { Package, Activity, Check, Plus } from "lucide-react"
import {
  clearToken,
  createProduct,
  getProducts,
  deleteProduct,
  getCurrentUser,
  isAuthSessionError,
  logoutUser,
  notifyUser,
} from "@/services"
import type { VendorProductService } from "@/services"

export default function NewProductPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [createMessage, setCreateMessage] = useState("")
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "product" | "service">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6

  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    setSelectedImages((prev) => [...prev, ...files])
    
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index))
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const clearPreviews = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImagePreviews([])
    setSelectedImages([])
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterType])
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    product_type: "product" as "product" | "service",
    price: "",
    stock: "0",
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const me = await getCurrentUser()
      setUsername(me.username)
      if (me.role !== "supplier") {
        router.replace(me.role === "buyer" ? "/buyer/products" : "/login")
        return
      }

      const catalog = await getProducts()
      setProducts(catalog)
    } catch (error) {
      if (isAuthSessionError(error)) {
        clearToken()
        router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login")
        return
      }
      notifyUser({
        type: "error",
        title: "Load Error",
        message: "Could not load products. Please check connection."
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pathname, router])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from your catalog?`)) {
      return
    }

    try {
      await deleteProduct(id)
      notifyUser({
        type: "success",
        title: "Product Deleted",
        message: `"${name}" was successfully removed from your catalog.`
      })
      // Update local state
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      notifyUser({
        type: "error",
        title: "Delete Failed",
        message: `Could not delete "${name}". Please try again.`
      })
    }
  }

  const handleCreateProduct = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      setCreateMessage("Name and description are required.")
      return
    }

    const price = Number(formData.price)
    const stock = Number(formData.stock)

    if (!Number.isFinite(price) || price <= 0) {
      setCreateMessage("Enter a valid price greater than 0.")
      return
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setCreateMessage("Stock must be a non-negative integer.")
      return
    }

    try {
      setCreating(true)
      setCreateMessage("")
      await createProduct({
        name: formData.name.trim(),
        description: formData.description.trim(),
        product_type: formData.product_type,
        price,
        stock,
        is_active: true,
        images: selectedImages,
      })
      
      notifyUser({
        type: "success",
        title: "Success",
        message: `"${formData.name.trim()}" has been added to your catalog.`
      })

      // Reset form and return to catalog list
      setFormData({
        name: "",
        description: "",
        product_type: "product",
        price: "",
        stock: "0",
      })
      clearPreviews()
      setShowForm(false)
      // Reload products
      const catalog = await getProducts()
      setProducts(catalog)
    } catch {
      setCreateMessage("Could not add product/service. Check inputs and try again.")
    } finally {
      setCreating(false)
    }
  }

  // Filter & Search local filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesType = filterType === "all" || p.product_type === filterType
      return matchesSearch && matchesType
    })
  }, [products, searchQuery, filterType])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((p) => p.is_active).length,
      inStock: products.filter((p) => p.stock > 0).length,
    }
  }, [products])

  const formatCurrency = (val: number | string) => {
    const num = typeof val === "string" ? Number(val) : val
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] flex flex-col">
      <SupplierNavbar active="supplies" username={username} onSignOut={signOut} />
      <main className="min-h-screen flex-1 w-full py-8 md:py-12 mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 pb-12 bg-[#f6f8fb]">
        <div className="w-full max-w-full space-y-8">
          
          {/* Page Heading & Stats (Outside Card/Box) */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 animate-fade-in-up">
            <div className="space-y-1">
              <h1 className="text-3xl font-black md:text-4xl text-slate-900 tracking-tight leading-none">
                My <span className="text-blue-600">Products & Services</span>
              </h1>
              <p className="text-xs font-semibold text-slate-500">Manage your listed medical equipment and catalog items.</p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setCreateMessage("")
                  setShowForm(true)
                }}
                className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs font-bold text-white shadow-md active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Product or Service</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-20">
              <svg className="h-10 w-10 animate-spin text-[#0f4fb6]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            /* Catalog List View Section */
            <section className="space-y-6">
              
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                
                {/* Search Input */}
                <div className="relative w-full sm:max-w-md">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search my products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border-0 bg-transparent text-sm font-semibold text-[#1f2937] placeholder:text-[#a0aab8] outline-none"
                    />
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2 w-full sm:w-auto">
                  {(["all", "product", "service"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`flex-1 sm:flex-initial rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                        filterType === t
                          ? "bg-indigo-650 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-650 hover:bg-slate-50"
                      }`}
                    >
                      {t === "all" ? "All" : t === "product" ? "Products" : "Services"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catalog List */}
              {paginatedProducts.length > 0 ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {paginatedProducts.map((product) => (
                      <article
                        key={product.id}
                        className="group flex flex-col justify-between overflow-hidden rounded-[22px] border border-slate-200 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-indigo-300 hover:-translate-y-1 h-[295px]"
                      >
                        {/* Product Images - Flush at Top */}
                        <div className="w-full">
                          <ProductCardImages images={product.images} />
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Type Badge & Info */}
                            <div className="flex items-center justify-between gap-4">
                              <span
                                className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                  product.product_type === "product"
                                    ? "border-indigo-100 bg-indigo-50 text-indigo-755"
                                    : "border-purple-100 bg-purple-50 text-purple-755"
                                }`}
                              >
                                {product.product_type}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-[#94a3b8]">
                                ID: #{product.id}
                              </span>
                            </div>

                            {/* Name & Description */}
                            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xs font-bold text-slate-800 group-hover:text-indigo-650 transition duration-200 line-clamp-1">
                              {product.name}
                            </h3>
                            <p className="mt-1 text-[10px] leading-relaxed text-[#64748b] line-clamp-1">
                              {product.description}
                            </p>
                          </div>

                          {/* Pricing & Actions */}
                          <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">Unit Price</p>
                              <p className="mt-0.5 text-xs font-black text-indigo-650">
                                {formatCurrency(product.price)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">Stock</p>
                              <p className={`mt-0.5 text-[10px] font-bold ${product.stock > 0 ? "text-emerald-650" : "text-rose-650"}`}>
                                {product.stock > 0 ? `${product.stock} units` : "Out of stock"}
                              </p>
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="rounded-xl p-2 border border-rose-100 bg-rose-50/40 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition duration-200"
                                title="Delete item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#f1f5f9]">
                      <p className="text-xs font-semibold text-[#64748b]">
                        Showing <span className="text-[#0f172a] font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                        <span className="text-[#0f172a] font-bold">
                          {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}
                        </span>{" "}
                        of <span className="text-[#0f172a] font-bold">{filteredProducts.length}</span> items
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          className="rounded-xl border border-[#dfe7f1] bg-white px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Previous
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition ${
                              currentPage === page
                                ? "bg-indigo-650 text-white shadow-md shadow-indigo-500/20"
                                : "border border-slate-205 bg-white text-slate-650 hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          className="rounded-xl border border-slate-205 bg-white px-4 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Empty Catalog State */
                <div className="rounded-[22px] border border-dashed border-[#d3e4e7] bg-white/60 p-12 text-center max-w-xl">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 6v12" />
                      <path d="M6 12h12" />
                      <rect x="4" y="4" width="16" height="16" rx="3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800">Your Catalog is Empty</h3>
                  <p className="mt-2 text-sm text-slate-550">
                    You haven't listed any products or services yet. List items to make them discoverable to buyers in the marketplace.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
                  >
                    Add Your First Item
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Modal Popup Overlay */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-200">
              <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100/50 animate-scale-in relative">
                <button
                  type="button"
                  onClick={() => {
                    clearPreviews()
                    setShowForm(false)
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-100 transition"
                >
                  <Plus className="h-5 w-5 rotate-45" />
                </button>

                <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Package className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Add Product or Service</h2>
                    <p className="text-[10px] text-slate-500 font-semibold">List a new item to make it discoverable to buyers.</p>
                  </div>
                </div>

                <div className="grid gap-4 text-xs">
                  <label className="grid gap-1">
                    <span className="font-bold text-slate-700">Item Name</span>
                    <input
                      value={formData.name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 font-medium"
                      placeholder="Oxygen cylinder, clinical monitor..."
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="font-bold text-slate-700">Description</span>
                    <textarea
                      value={formData.description}
                      onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                      className="min-h-16 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 leading-normal font-medium"
                      placeholder="Describe specifications, certifications, and shipping conditions..."
                      rows={2}
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1">
                      <span className="font-bold text-slate-700">Type</span>
                      <select
                        value={formData.product_type}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            product_type: event.target.value as "product" | "service",
                          }))
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 font-medium"
                      >
                        <option value="product">Product (Device)</option>
                        <option value="service">Service (Support)</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="font-bold text-slate-700">Price (INR)</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={formData.price}
                        onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 font-medium"
                        placeholder="e.g. 1500"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="font-bold text-slate-700">Stock Units</span>
                      <input
                        type="number"
                        min={0}
                        value={formData.stock}
                        onChange={(event) => setFormData((prev) => ({ ...prev, stock: event.target.value }))}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 font-medium"
                      />
                    </label>
                  </div>

                  <div className="grid gap-1">
                    <span className="font-bold text-slate-700">Photos</span>
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                        <div className="text-center space-y-1">
                          <Plus className="h-5 w-5 text-slate-400 mx-auto" />
                          <span className="text-[11px] font-bold text-slate-600 block">Click to Upload Images</span>
                          <span className="text-[9px] text-slate-400 block">PNG, JPG, JPEG (Multiple files allowed)</span>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>

                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-5 gap-2 mt-1">
                          {imagePreviews.map((preview, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                              <img src={preview} alt="preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeSelectedImage(idx)}
                                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/85"
                              >
                                <Plus className="h-3 w-3 rotate-45" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {createMessage && (
                  <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
                    {createMessage}
                  </p>
                )}

                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3.5 text-xs">
                  <button
                    type="button"
                    onClick={handleCreateProduct}
                    disabled={creating}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 font-bold text-white shadow-sm transition disabled:opacity-60"
                  >
                    {creating ? "Adding to Catalog..." : "Add to Catalog"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearPreviews()
                      setShowForm(false)
                    }}
                    disabled={creating}
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 font-bold text-slate-650 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <SupplierFooter />
    </div>
  )
}

function ProductCardImages({ images }: { images?: { id: number; image_url: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-28 bg-gradient-to-br from-[#f8fafc] to-[#edf2f7] flex items-center justify-center border-b border-[#e2e8f0] relative overflow-hidden group/placeholder">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#94a3b8] group-hover/placeholder:scale-110 transition duration-300 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="w-full h-28 relative overflow-hidden border-b border-[#e2e8f0] group bg-black/5">
      <img
        src={images[currentIndex].image_url}
        alt="Product"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-black/75 transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-black/75 transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/35 px-2 py-0.5 rounded-full backdrop-blur-[2px]">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? "bg-white scale-125" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
