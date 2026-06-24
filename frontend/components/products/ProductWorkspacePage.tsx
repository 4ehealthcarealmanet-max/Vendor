"use client"

import { Suspense, type ReactNode, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import BuyerNavbar from "@/components/buyer/BuyerNavbar"
import BuyerFooter from "@/components/buyer/BuyerFooter"
import SupplierNavbar from "@/components/supplier/SupplierNavbar"
import SupplierFooter from "@/components/supplier/SupplierFooter"
import {
  clearToken,
  getCurrentUser,
  isAuthSessionError,
  logoutUser,
  createProduct,
  deleteProduct,
  getApiErrorMessage,
  getProducts,
  updateProduct,
} from "@/services"
import type { VendorProductService } from "@/services"
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Activity,
  IndianRupee,
  ShoppingBag,
  FileSpreadsheet,
  Check,
  UserCheck,
  Info,
  AlertCircle,
  HelpCircle,
  Inbox,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from "lucide-react"

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductsPageContent />
    </Suspense>
  )
}

function ProductsPageFallback() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : ""
  const isBuyerRoute = pathname.includes("/buyer")
  const isSupplierRoute = pathname.includes("/supplier")

  if (isBuyerRoute || isSupplierRoute) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        {isBuyerRoute ? (
          <BuyerNavbar active="marketplace" />
        ) : (
          <SupplierNavbar active="supplies" />
        )}
        <main className="mx-auto max-w-[1600px] w-full px-6 py-8 pb-24 md:px-8 lg:py-10 flex-1 flex flex-col justify-center items-center min-h-[75vh]">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            </div>
            <span className="text-xs font-semibold text-slate-400 tracking-tight">
              Loading marketplace catalog...
            </span>
          </div>
        </main>
        {isBuyerRoute ? <BuyerFooter /> : <SupplierFooter />}
      </div>
    )
  }

  return <main className="min-h-screen bg-[#F8FAFC]" />
}

function ProductsPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState<string>("")
  const [userRole, setUserRole] = useState<"supplier" | "buyer" | "admin" | "">("")
  const [buyerType, setBuyerType] = useState<string>("")
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VendorProductService | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionMessage, setActionMessage] = useState<string>("")
  const [createMessage, setCreateMessage] = useState<string>("")
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    product_type: "product" as "product" | "service",
    price: "",
    stock: "0",
  })
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    product_type: "product" as "product" | "service",
    price: "",
    stock: "0",
  })
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<"all" | "product" | "service">("all")
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc" | "stock-desc">("name")
  const [inStockOnly, setInStockOnly] = useState(false)
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null)
  const [hasActiveSub, setHasActiveSub] = useState(true)

  // Pagination states
  const ITEMS_PER_PAGE = 8
  const [currentPage, setCurrentPage] = useState(1)

  // Image Upload and Edit States
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [editSelectedImages, setEditSelectedImages] = useState<File[]>([])
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([])

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

  const clearCreatePreviews = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImagePreviews([])
    setSelectedImages([])
  }

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    setEditSelectedImages((prev) => [...prev, ...files])
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setEditImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const removeEditSelectedImage = (index: number) => {
    setEditSelectedImages((prev) => prev.filter((_, idx) => idx !== index))
    setEditImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const toggleDeleteExistingImage = (id: number) => {
    setDeleteImageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const clearEditPreviews = () => {
    editImagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setEditImagePreviews([])
    setEditSelectedImages([])
    setDeleteImageIds([])
  }

  useEffect(() => {
    let active = true
    const fetchProducts = async (isPoll = false) => {
      if (!isPoll) {
        setIsLoading(true)
      }
      setError(null)
      try {
        const me = await getCurrentUser()
        if (pathname?.startsWith("/buyer") && me.role === "supplier") {
          router.replace("/supplier/products")
          return
        }
        if (pathname?.startsWith("/supplier") && me.role === "buyer") {
          router.replace("/buyer/products")
          return
        }
        if (!me.has_active_subscription) {
          router.replace(me.role === "supplier" ? "/supplier/subscription" : "/buyer/subscription")
          return
        }
        if (active) {
          setUsername(me.username)
          setUserRole(me.role)
          setBuyerType(me.buyer_type || "")
          setHasActiveSub(me.has_active_subscription ?? true)
        }
        const data = await getProducts()
        if (active) {
          setProducts(data)
        }
      } catch (error) {
        if (isAuthSessionError(error)) {
          clearToken()
          setError("You are not authenticated. Redirecting to login...")
          router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login")
          return
        }
        setError("Could not load the marketplace right now. Check the backend API and try again.")
      } finally {
        if (active && !isPoll) {
          setIsLoading(false)
        }
      }
    }
    fetchProducts()
    const timer = setInterval(() => {
      fetchProducts(true)
    }, 5000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [pathname, router])

  // Handle highlight parameter from search
  useEffect(() => {
    const highlightId = searchParams.get("highlight")
    if (highlightId && products.length > 0) {
      const id = Number(highlightId)
      if (!isNaN(id) && products.some((p) => p.id === id)) {
        setHighlightedProductId(id)
        // Scroll to the item
        setTimeout(() => {
          const element = document.getElementById(`product-${id}`)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        }, 100)
      }
    }
  }, [searchParams, products])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const isBuyerRoute = pathname?.startsWith("/buyer") || userRole === "buyer"
  const isSupplierRoute = pathname?.startsWith("/supplier") || userRole === "supplier"

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      description: "",
      product_type: "product",
      price: "",
      stock: "0",
    })
  }

  const openCreateModal = () => {
    setActionMessage("")
    setCreateMessage("")
    resetCreateForm()
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    if (creating) return
    setShowCreateModal(false)
    setCreateMessage("")
    resetCreateForm()
    clearCreatePreviews()
  }

  const handleCreateProduct = async () => {
    if (!createForm.name.trim() || !createForm.description.trim()) {
      setCreateMessage("Name and description are required.")
      return
    }

    const price = Number(createForm.price)
    const stock = Number(createForm.stock)

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
      const created = await createProduct({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        product_type: createForm.product_type,
        price,
        stock,
        is_active: true,
        images: selectedImages,
      })
      setProducts((prev) => [created, ...prev])
      setShowCreateModal(false)
      resetCreateForm()
      clearCreatePreviews()
      setActionMessage("Product added to catalog.")
    } catch (error) {
      setCreateMessage(getApiErrorMessage(error, "Could not add product/service. Check inputs and try again."))
    } finally {
      setCreating(false)
    }
  }

  const startEditing = (product: VendorProductService) => {
    setActionMessage("")
    setEditingProductId(product.id)
    setEditForm({
      name: product.name,
      description: product.description,
      product_type: product.product_type,
      price: String(Number(product.price)),
      stock: String(product.stock),
    })
  }

  const cancelEditing = () => {
    setEditingProductId(null)
    setActionMessage("")
    clearEditPreviews()
  }

  const saveProductEdits = async (productId: number) => {
    const price = Number(editForm.price)
    const stock = Number(editForm.stock)

    if (!editForm.name.trim() || !editForm.description.trim()) {
      setActionMessage("Name and description are required.")
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setActionMessage("Enter a valid price greater than 0.")
      return
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setActionMessage("Stock must be a non-negative integer.")
      return
    }

    try {
      setUpdating(true)
      const updated = await updateProduct(productId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        product_type: editForm.product_type,
        price,
        stock,
        is_active: true,
        images: editSelectedImages,
        delete_image_ids: deleteImageIds,
      })
      setProducts((prev) => prev.map((item) => (item.id === productId ? updated : item)))
      setEditingProductId(null)
      clearEditPreviews()
      setActionMessage("Product updated successfully.")
    } catch {
      setActionMessage("Could not update product. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  const requestDeleteProduct = (product: VendorProductService) => {
    setDeleteTarget(product)
    setActionMessage("")
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setDeleteTarget(null)
  }

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await deleteProduct(deleteTarget.id)
      setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setActionMessage("Product deleted.")
      setDeleteTarget(null)
    } catch {
      setActionMessage("Could not delete product. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    let result = products.filter((product) => {
      const matchType = category === "all" || product.product_type === category
      const matchQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery)
      const matchStock = !inStockOnly || product.stock > 0
      const matchActive = !isBuyerRoute || product.is_active
      return matchType && matchQuery && matchStock && matchActive
    })

    // Apply Sorting
    return [...result].sort((a, b) => {
      if (sortBy === "price-asc") return Number(a.price) - Number(b.price)
      if (sortBy === "price-desc") return Number(b.price) - Number(a.price)
      if (sortBy === "stock-desc") return b.stock - a.stock
      return a.name.localeCompare(b.name)
    })
  }, [products, query, category, sortBy, inStockOnly, isBuyerRoute])

  // Reset page index on search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [query, category, sortBy, inStockOnly])

  // Paginated Sliced Datasets
  const totalPages = useMemo(() => {
    const totalCount = filteredProducts.length
    return Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))
  }, [filteredProducts])

  const paginatedBuyerProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  const paginatedSupplierProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => !isBuyerRoute || p.is_active)
    return {
      total: activeProducts.length,
      active: activeProducts.filter((p) => p.is_active).length,
      inStock: activeProducts.filter((p) => p.stock > 0).length,
    }
  }, [isBuyerRoute, products])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Dynamic Keyframes Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hover-card-premium {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hover-card-premium:hover {
          transform: translateY(-5px);
          border-color: #3B82F6;
          box-shadow: 0 16px 32px -12px rgba(59, 130, 246, 0.12), 0 4px 16px -8px rgba(0, 0, 0, 0.04);
        }
        .hover-card-premium-supplier {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hover-card-premium-supplier:hover {
          transform: translateY(-5px);
          border-color: #6366F1;
          box-shadow: 0 16px 32px -12px rgba(99, 102, 241, 0.12), 0 4px 16px -8px rgba(0, 0, 0, 0.04);
        }
      `}} />

      {isBuyerRoute ? (
        <BuyerNavbar
          active="marketplace"
          username={username}
          buyerType={buyerType || null}
          hasActiveSubscription={hasActiveSub}
          onSignOut={signOut}
        />
      ) : isSupplierRoute ? (
        <SupplierNavbar
          active="supplies"
          username={username}
          onSignOut={signOut}
        />
      ) : null}

      <main className={`flex-1 w-full py-6 md:py-8 min-h-[75vh] ${isSupplierRoute || isBuyerRoute ? "mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 pb-24" : ""}`}>
        <div className="space-y-6">

          {/* Page Heading & Stats (Outside Card/Box) */}
          {/* Page Heading (Outside Card/Box) */}
          <div className="animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900">
              {userRole === "supplier" ? (
                <>
                  My <span className="text-blue-600">Product Catalog</span>
                </>
              ) : (
                <>
                  Clinical <span className="text-blue-600">Marketplace</span>
                </>
              )}
            </h1>
            <p className="text-xs mt-1 text-slate-500 font-medium">
              {userRole === "supplier"
                ? "Manage your listed medical equipment and catalog items."
                : "Source clinical instruments, medicine, and healthcare solutions from audited suppliers."}
            </p>
          </div>

          {/* Filter toolbar card */}
          <div className="rounded-2xl p-4 shadow-sm border border-slate-200 bg-white flex flex-col lg:flex-row gap-4 items-stretch lg:items-center animate-fade-in-up">
            {/* Search */}
            <div className="relative flex-1 w-full min-w-0 sm:min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, services, or equipment..."
                className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 outline-none transition ${
                  userRole === "supplier"
                    ? "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    : "focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                }`}
              />
            </div>

            {/* Segmented Filter Control */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 p-1 w-full sm:w-auto justify-between sm:justify-start">
              {(["all", "product", "service"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${
                    category === item
                      ? userRole === "supplier"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40"
                        : "bg-white text-blue-600 shadow-sm border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item}s
                </button>
              ))}
            </div>

            {/* Sort and Boolean Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Sort Select */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`w-full text-xs font-bold border border-slate-200 bg-white text-slate-800 rounded-xl pl-9 pr-8 py-2.5 outline-none transition cursor-pointer appearance-none ${
                    userRole === "supplier"
                      ? "focus:border-indigo-500"
                      : "focus:border-blue-500"
                  }`}
                >
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="price-asc">Sort: Price (Low to High)</option>
                  <option value="price-desc">Sort: Price (High to Low)</option>
                  <option value="stock-desc">Sort: Stock Availability</option>
                </select>
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Boolean Checkbox as a Pill Toggle */}
              <label className="flex items-center justify-center gap-2.5 cursor-pointer select-none py-2.5 px-4 border border-slate-200 hover:border-slate-300 bg-slate-50/20 rounded-xl transition duration-150 flex-1 sm:flex-initial text-center">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className={`h-4 w-4 rounded cursor-pointer ${
                    userRole === "supplier"
                      ? "border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      : "border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  }`}
                />
                <span className="text-xs font-bold text-slate-600">In Stock Only</span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 lg:ml-auto w-full lg:w-auto">
              {userRole === "supplier" ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-extrabold text-white shadow-md active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Catalog Item</span>
                </button>
              ) : (
                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                  <Link
                    href="/buyer/orders"
                    className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl bg-blue-600 md:hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
                  >
                    <ShoppingBag className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">B2C Buy Now</span>
                  </Link>
                  <Link
                    href="/buyer/rfq?view=new"
                    className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition active:scale-95"
                  >
                    <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="whitespace-nowrap">Create RFQ</span>
                  </Link>
                  <Link
                    href="/buyer/rfq?view=my"
                    className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition active:scale-95"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="whitespace-nowrap">My RFQs</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Results Grid */}
          <section className="space-y-4">
            {actionMessage && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold border ${actionMessage.toLowerCase().includes("could not") || actionMessage.toLowerCase().includes("required") || actionMessage.toLowerCase().includes("valid")
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}>
                <Info className="h-4 w-4" />
                <span>{actionMessage}</span>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-8 w-8 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-400">Loading catalog listings...</p>
              </div>
            )}

            {!isLoading && error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-4 text-xs font-semibold border border-red-200 bg-red-50 text-red-700">
                <AlertCircle className="h-4.5 w-4.5" />
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !error && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm text-center">
                <Inbox className="h-10 w-10 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-700">No Matching Listings</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-normal">We couldn't find any products or services matching your filter.</p>
              </div>
            )}

            {/* Buyer Product View */}
            {!isLoading && !error && userRole === "buyer" && paginatedBuyerProducts.length > 0 ? (
              <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {paginatedBuyerProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover-card-premium flex flex-col justify-between overflow-hidden h-[350px] sm:h-[360px] group animate-fade-in-up"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {/* Top Image Thumbnail */}
                    <div className="w-full h-24 sm:h-28 relative overflow-hidden bg-slate-50 border-b border-slate-100">
                      <ProductCardImages images={product.images} />
                    </div>

                    {/* Content Details */}
                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2 sm:gap-2.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${product.product_type === "service"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}>
                            {product.product_type}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 truncate max-w-[120px] sm:max-w-[150px]" title={product.vendor_company_name || `@${product.vendor_username || `vendor_${product.vendor}`}`}>
                            <UserCheck className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{product.vendor_company_name || `@${product.vendor_username || `vendor_${product.vendor}`}`}</span>
                          </span>
                        </div>

                        <h3 className="mt-2 text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 md:group-hover:text-blue-600 transition-colors" title={product.name}>
                          {product.name}
                        </h3>

                        <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed" title={product.description}>
                          {product.description}
                        </p>
                      </div>

                      <div>
                        {/* Price & Stock info */}
                        <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-2 sm:pt-2.5 mt-auto">
                          <div>
                            <p className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">Price</p>
                            <p className="text-xs sm:text-sm font-black text-blue-600 mt-1 flex items-center">
                              <IndianRupee className="h-3.5 w-3.5" />
                              <span>{Number(product.price).toLocaleString("en-IN")}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">Stock</p>
                            <p className={`text-[9px] sm:text-[10px] font-bold mt-1 ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {product.stock > 0 ? `${product.stock} units` : "Out of stock"}
                            </p>
                          </div>
                        </div>

                        {/* Action Link: Initiate RFQ */}
                        <Link
                          href={`/buyer/rfq?view=new&prefillTitle=${encodeURIComponent(product.name)}&prefillType=${encodeURIComponent(product.product_type)}`}
                          className="mt-2.5 sm:mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 md:hover:bg-blue-50 border border-slate-200 md:hover:border-blue-200 text-[10px] sm:text-[11px] font-bold text-slate-700 md:hover:text-blue-700 py-1.5 sm:py-2 transition duration-200 active:scale-95"
                        >
                          <span>Initiate Sourcing RFQ</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {/* Supplier / Non-buyer catalog cards view */}
            {!isLoading && !error && userRole !== "buyer" && paginatedSupplierProducts.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {paginatedSupplierProducts.map((product, index) => (
                  <article
                    id={`product-${product.id}`}
                    key={product.id}
                    className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden h-[295px] group animate-fade-in-up hover-card-premium-supplier ${highlightedProductId === product.id
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                        : "border-slate-200/80 shadow-sm"
                      }`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {/* Top Image Preview */}
                    {editingProductId !== product.id ? (
                      <div className="w-full h-28 relative overflow-hidden bg-slate-50 border-b border-slate-100">
                        <ProductCardImages images={product.images} />
                      </div>
                    ) : null}

                    {/* Card Content details */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${product.product_type === "service"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}>
                            {product.product_type}
                          </span>
                          {!product.is_active && (
                            <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-150">Draft</span>
                          )}
                        </div>

                        {editingProductId === product.id ? (
                          <div className="space-y-2 pt-1">
                            <input
                              value={editForm.name}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                              placeholder="Name"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500"
                            />
                            <textarea
                              value={editForm.description}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                              placeholder="Description"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs leading-normal outline-none focus:border-blue-500"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-xs font-bold text-slate-800 line-clamp-1" title={product.name}>
                              {product.name}
                            </h3>
                            <p className="text-[10px] text-slate-400 line-clamp-1 leading-relaxed" title={product.description}>
                              {product.description}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Image edit block if editing */}
                      {editingProductId === product.id ? (
                        <div className="space-y-1.5 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-150">
                          <span className="font-bold text-slate-700 block">Photos</span>
                          {product.images && product.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-1">
                              {product.images.map((img) => {
                                const isDeleted = deleteImageIds.includes(img.id)
                                return (
                                  <div key={img.id} className="relative aspect-square rounded overflow-hidden border border-slate-250 bg-white">
                                    <img src={img.image_url} alt="existing" className={`w-full h-full object-cover ${isDeleted ? "opacity-35 grayscale" : ""}`} />
                                    <button
                                      type="button"
                                      onClick={() => toggleDeleteExistingImage(img.id)}
                                      className={`absolute top-0.5 right-0.5 rounded-full p-0.5 text-white ${isDeleted ? "bg-emerald-600" : "bg-rose-600"
                                        }`}
                                    >
                                      {isDeleted ? <Check className="h-2 w-2" /> : <Trash2 className="h-2 w-2" />}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleEditImageChange}
                            className="w-full text-[9px]"
                          />
                        </div>
                      ) : null}

                      {/* Pricing and CTAs */}
                      <div>
                        {editingProductId === product.id ? (
                          <div className="grid gap-2 grid-cols-2 mt-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Price</label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editForm.price}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Stock</label>
                              <input
                                type="number"
                                min={0}
                                value={editForm.stock}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, stock: event.target.value }))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-2.5">
                            <div>
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">Catalog Price</p>
                              <p className={`text-sm font-black mt-1 flex items-center ${
                                userRole === "supplier" ? "text-indigo-650" : "text-blue-600"
                              }`}>
                                <IndianRupee className="h-3.5 w-3.5" />
                                <span>{Number(product.price).toLocaleString("en-IN")}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">Stock</p>
                              <p className={`text-[10px] font-bold mt-1 ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {product.stock > 0 ? `${product.stock} units` : "Out of stock"}
                              </p>
                            </div>
                          </div>
                        )}

                        {userRole === "supplier" && (
                          <div className="mt-2.5 flex gap-2 border-t border-slate-100 pt-2">
                            {editingProductId === product.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveProductEdits(product.id)}
                                  disabled={updating}
                                  className="flex-1 rounded-xl bg-indigo-650 hover:bg-indigo-700 py-1.5 text-[10px] font-extrabold text-white shadow-md active:scale-95 transition disabled:opacity-60"
                                >
                                  {updating ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="flex-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-1.5 text-[10px] font-extrabold text-slate-600 active:scale-95 transition"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditing(product)}
                                  className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 py-1.5 text-[10px] font-extrabold text-indigo-755 transition active:scale-95 shadow-sm"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestDeleteProduct(product)}
                                  className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 py-1.5 text-[10px] font-extrabold text-rose-705 transition active:scale-95 shadow-sm"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8 animate-fade-in-up">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isActive = currentPage === page
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 min-w-9 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-650"
                        }`}
                    >
                      {page}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <h2 className="text-base font-black text-slate-800">Delete Catalog Item</h2>
              <p className="mt-2 text-xs text-slate-500 leading-normal">
                Are you sure you want to delete <span className="font-bold text-slate-700">{deleteTarget.name}</span> from the marketplace? This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 font-bold text-slate-650"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  disabled={deleting}
                  className="rounded-xl bg-red-650 hover:bg-red-750 px-4 py-2 font-bold text-white shadow-sm"
                >
                  {deleting ? "Deleting..." : "Delete Item"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] overflow-y-auto">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl my-8">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Supplier Catalog</p>
                  <h2 className="text-lg font-black text-slate-800">Add Product or Service</h2>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3.5 sm:grid-cols-2 text-xs">
                <label className="grid gap-1 sm:col-span-2">
                  <span className="font-bold text-slate-700">Item Name</span>
                  <input
                    value={createForm.name}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Oxygen cylinder, clinical monitor..."
                  />
                </label>

                <label className="grid gap-1 sm:col-span-2">
                  <span className="font-bold text-slate-700">Description</span>
                  <textarea
                    value={createForm.description}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-16 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 leading-normal"
                    placeholder="Describe technical specs, certifications, and shipping conditions..."
                    rows={2}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="font-bold text-slate-700">Category Type</span>
                  <select
                    value={createForm.product_type}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        product_type: event.target.value as "product" | "service",
                      }))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="product">Product (Physical Item)</option>
                    <option value="service">Service (Healthcare Support)</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="font-bold text-slate-700">Unit Price (INR)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={createForm.price}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. 1500"
                  />
                </label>

                <label className="grid gap-1 sm:col-span-2">
                  <span className="font-bold text-slate-700">Initial Stock Units</span>
                  <input
                    type="number"
                    min={0}
                    value={createForm.stock}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, stock: event.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                  />
                </label>

                <div className="grid gap-1 sm:col-span-2">
                  <span className="font-bold text-slate-700">Product Images</span>
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="text-center space-y-1">
                        <Plus className="h-6 w-6 text-slate-400 mx-auto" />
                        <span className="text-[11px] font-bold text-slate-600 block">Click to Upload Images</span>
                        <span className="text-[9px] text-slate-400 block">Supports PNG, JPG, JPEG (Multiple files allowed)</span>
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

              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  disabled={creating}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 font-bold text-white shadow-sm transition disabled:opacity-60"
                >
                  {creating ? "Saving..." : "Add to Catalog"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 font-bold text-slate-650 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {isBuyerRoute ? <BuyerFooter /> : isSupplierRoute ? <SupplierFooter /> : null}
    </div>
  )
}

function StatCard({ label, value, icon, isDark = false }: { label: string; value: number; icon: ReactNode; isDark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 shadow-sm animate-fade-in-up ${
      isDark
        ? "border-slate-800 bg-slate-900/50 backdrop-blur-sm text-white"
        : "border-slate-200 bg-white text-slate-800"
    }`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
        isDark
          ? "bg-slate-800/80 text-indigo-400"
          : "bg-blue-50 text-blue-600"
      }`}>
        {icon}
      </span>
      <div>
        <p className={`text-[9px] font-bold uppercase tracking-wider leading-none ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}>{label}</p>
        <p className={`text-base font-black leading-none mt-1 ${
          isDark ? "text-white" : "text-slate-800"
        }`}>{value}</p>
      </div>
    </div>
  )
}

function ProductCardImages({ images }: { images?: { id: number; image_url: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center relative overflow-hidden group/placeholder">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-60"></div>
        <Package className="h-6 w-6 text-slate-300 group-hover/placeholder:scale-110 transition duration-300 relative z-10" />
      </div>
    )
  }

  return (
    <div className="w-full h-full relative overflow-hidden group bg-slate-50">
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
            className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-black/60 transition duration-200"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-black/60 transition duration-200"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 bg-black/25 px-1.5 py-0.5 rounded-full">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.2 w-1.2 rounded-full transition-all duration-300 ${currentIndex === idx ? "bg-white scale-125" : "bg-white/50"
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
