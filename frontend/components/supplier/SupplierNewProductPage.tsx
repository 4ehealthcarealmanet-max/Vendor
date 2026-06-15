"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import SupplierSidebar from "@/components/supplier/SupplierSidebar"
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

  const formatCurrency = (val: number | string) => {
    const num = typeof val === "string" ? Number(val) : val
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <>
      <SupplierSidebar active="supplies" username={username} onSignOut={signOut} />
      <main className="min-h-screen px-4 py-8 pb-24 md:px-6 md:py-12 lg:pl-[calc(18rem+2.5rem)] bg-[#f6f8fb]">
        <div className="health-container space-y-8">
          
          {/* Header Card */}
          <header className="glass-card rounded-[22px] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[0_12px_36px_rgba(0,0,0,0.03)] border border-white/80 bg-white/70 backdrop-blur-md">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-[#0f4fb6] uppercase">Supplier Workspace</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl text-[#0f172a] tracking-tight">My Products & Services</h1>
              <p className="mt-2 text-xs font-semibold text-[#64748b]">Signed in as: {username || "..."}</p>
            </div>
            <div>
              {!showForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setCreateMessage("")
                    setShowForm(true)
                  }}
                  className="rounded-xl bg-[#0f4fb6] px-5 py-3.5 text-sm font-bold text-white shadow-[0_18px_30px_rgba(15,79,182,0.18)] hover:shadow-[0_20px_38px_rgba(15,79,182,0.25)] hover:bg-[#0b46a8] transition-all duration-300"
                >
                  + Add Product or Service
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[#dfe7f1] bg-white px-5 py-3.5 text-sm font-bold text-[#64748b] hover:bg-[#f8fafc] transition duration-200"
                >
                  View Product List
                </button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="flex items-center justify-center p-20">
              <svg className="h-10 w-10 animate-spin text-[#0f4fb6]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : showForm ? (
            /* Create/Add Form Section */
            <section className="soft-panel rounded-[22px] border border-white bg-white/90 p-6 md:p-8 shadow-[0_20px_45px_rgba(15,23,42,0.04)] max-w-2xl">
              <h2 className="text-xl font-extrabold text-[#0f172a] mb-6">Create New Catalog Entry</h2>
              
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-[#375a63] md:col-span-2">
                  <span>Name</span>
                  <input
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Enter product or service name..."
                    className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] transition"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-[#375a63] md:col-span-2">
                  <span>Description</span>
                  <textarea
                    value={formData.description}
                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Detailed description of the specifications, certification details..."
                    className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] transition"
                    rows={4}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-[#375a63]">
                  <span>Type</span>
                  <select
                    value={formData.product_type}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        product_type: event.target.value as "product" | "service",
                      }))
                    }
                    className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] transition"
                  >
                    <option value="product">Product (Medical Device, Consumable, etc.)</option>
                    <option value="service">Service (Maintenance, Installation, etc.)</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-[#375a63]">
                  <span>Price (INR)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.price}
                    onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                    placeholder="e.g. 1500"
                    className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] transition"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-[#375a63]">
                  <span>Stock Available</span>
                  <input
                    type="number"
                    min={0}
                    value={formData.stock}
                    onChange={(event) => setFormData((prev) => ({ ...prev, stock: event.target.value }))}
                    className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] transition"
                  />
                </label>
              </div>

              {createMessage && (
                <div className="mt-5 rounded-xl bg-red-50 border border-red-100 p-4">
                  <p className="text-sm font-semibold text-red-700">{createMessage}</p>
                </div>
              )}

              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  disabled={creating}
                  className="rounded-xl bg-[#0f4fb6] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,79,182,0.15)] hover:bg-[#0b46a8] disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {creating ? "Adding to Catalog..." : "Add to Catalog"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[#dfe7f1] bg-white px-6 py-3.5 text-sm font-bold text-[#64748b] hover:bg-[#f8fafc] transition"
                >
                  Cancel
                </button>
              </div>
            </section>
          ) : (
            /* Catalog List View Section */
            <section className="space-y-6">
              
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/80 shadow-sm">
                
                {/* Search Input */}
                <div className="relative w-full sm:max-w-md">
                  <div className="flex items-center gap-3 rounded-xl border border-[#dfe7f1] bg-white px-4 py-3 transition focus-within:border-[#0f4fb6] focus-within:shadow-[0_0_0_3px_rgba(15,79,182,0.08)]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth="2">
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
                          ? "bg-[#0f4fb6] text-white shadow-sm"
                          : "border border-[#dfe7f1] bg-white text-[#64748b] hover:bg-[#f8fafc]"
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
                  <div className="grid gap-5 md:grid-cols-2">
                    {paginatedProducts.map((product) => (
                      <article
                        key={product.id}
                        className="group flex flex-col justify-between rounded-[22px] border border-white bg-white/70 p-6 shadow-[0_10px_35px_-4px_rgba(15,23,42,0.03)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] hover:-translate-y-1"
                      >
                        <div>
                          {/* Type Badge & Info */}
                          <div className="flex items-center justify-between gap-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                                product.product_type === "product"
                                  ? "border-[#dbe8ff] bg-[#f3f7ff] text-[#0f4fb6]"
                                  : "border-[#ede4ff] bg-[#f8f5ff] text-[#6d28d9]"
                              }`}
                            >
                              {product.product_type}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#94a3b8]">
                              ID: #{product.id}
                            </span>
                          </div>

                          {/* Name & Description */}
                          <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-black text-[#0f172a] group-hover:text-[#0f4fb6] transition duration-200">
                            {product.name}
                          </h3>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-[#64748b] line-clamp-3">
                            {product.description}
                          </p>
                        </div>

                        {/* Pricing & Actions */}
                        <div className="mt-6 pt-4 border-t border-[#f1f5f9] flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Unit Price</p>
                            <p className="mt-0.5 text-base font-black text-[#0f172a]">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Stock Available</p>
                            <p className={`mt-0.5 text-sm font-extrabold ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {product.stock > 0 ? `${product.stock} units` : "Out of Stock"}
                            </p>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="rounded-xl p-3 border border-red-100 bg-red-50/20 text-red-600 hover:bg-red-50 hover:border-red-200 transition duration-200"
                              title="Delete item"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
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
                                ? "bg-[#0f4fb6] text-white shadow-sm"
                                : "border border-[#dfe7f1] bg-white text-[#64748b] hover:bg-[#f8fafc]"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          className="rounded-xl border border-[#dfe7f1] bg-white px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f4fb6]/5 text-[#0f4fb6] mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 6v12" />
                      <path d="M6 12h12" />
                      <rect x="4" y="4" width="16" height="16" rx="3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-extrabold text-[#0f172a]">Your Catalog is Empty</h3>
                  <p className="mt-2 text-sm text-[#64748b]">
                    You haven't listed any products or services yet. List items to make them discoverable to buyers in the marketplace.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-6 rounded-xl bg-[#0f4fb6] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#0b46a8] transition"
                  >
                    Add Your First Item
                  </button>
                </div>
              )}
            </section>
          )}

        </div>
      </main>
    </>
  )
}
