"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react"
import SupplierNavbar from "@/components/supplier/SupplierNavbar"
import SupplierFooter from "@/components/supplier/SupplierFooter"
import {
  TrendingUp,
  ShoppingCart,
  FileText,
  Truck,
  ArrowUpRight,
  Award,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  ArrowRight,
  Briefcase,
  ChevronRight,
  Shield,
  MapPin,
  Calendar,
  Percent,
  Clock,
  DollarSign,
  Package,
  Layers,
  Inbox,
  MessageSquare,
  Settings,
  CreditCard
} from "lucide-react"
import {
  acceptPo,
  clearToken,
  getApiErrorMessage,
  getCurrentUser,
  getOrders,
  getProducts,
  getRfqs,
  isAuthSessionError,
  logoutUser,
  submitQuotation,
  updateOrderTracking,
} from "@/services"
import type { AuthUser, VendorOrder, VendorProductService, VendorQuotation, VendorQuotationInput, VendorRfq } from "@/services"

type Opportunity = { rfq: VendorRfq; matches: VendorProductService[] }
type BidRow = { rfq: VendorRfq; quote: VendorQuotation }

const emptyQuoteForm: VendorQuotationInput = {
  product_id: 0,
  unit_price: 0,
  lead_time_days: 7,
  validity_days: 15,
  notes: "",
}


const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const compactMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)

const shortDate = (value?: string | null) => {
  if (!value) return "No date"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", { month: "short", day: "2-digit" })
}

const longDate = (value?: string | null) => {
  if (!value) return "No date"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const getRemainingTimeText = (deadlineStr: string) => {
  if (!deadlineStr) return ""
  const deadline = new Date(deadlineStr)
  const diffTime = deadline.getTime() - Date.now()
  if (diffTime <= 0) return "Ended"
  
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
  if (diffHours < 24) {
    if (diffHours <= 0) {
      const diffMins = Math.max(0, Math.floor(diffTime / (1000 * 60)))
      return `${diffMins}m left`
    }
    return `${diffHours}h left`
  }
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return `${diffDays}d left`
}


const rfqId = (id: number) => `RFQ-${new Date().getFullYear()}-${String(id).padStart(3, "0")}`

const matchesTitle = (rfqTitle: string, listingName: string) => {
  const title = rfqTitle.trim().toLowerCase()
  const listing = listingName.trim().toLowerCase()
  return Boolean(title && listing && (title.includes(listing) || listing.includes(title)))
}


const opportunityMatches = (rfq: VendorRfq, listings: VendorProductService[]) => {
  const live = listings.filter((item) => item.is_active && item.stock > 0 && item.product_type === rfq.product_type)
  const strict = live.filter((item) => matchesTitle(rfq.title, item.name))
  return (strict.length > 0 ? strict : live).slice(0, 2)
}

const bidStatus = (rfq: VendorRfq, quote: VendorQuotation) => {
  if (quote.status === "awarded" || rfq.awarded_quote_id === quote.id) return { label: "Awarded", chip: "bg-[#edf8f2] text-[#177245]", border: "border-l-[#16a34a]" }
  if (quote.status === "rejected") return { label: "Rejected", chip: "bg-[#fff1e8] text-[#a93802]", border: "border-l-[#f97316]" }
  if (rfq.status === "under_review") return { label: "Pending Review", chip: "bg-[#fff7e8] text-[#ad6a08]", border: "border-l-[#f59e0b]" }
  return { label: "Negotiating", chip: "bg-[#eef4ff] text-[#0f4fb6]", border: "border-l-[#0f4fb6]" }
}

const orderStageIndex = (order?: VendorOrder | null) => {
  if (!order) return 0
  if (order.status === "cancelled") return 0
  if (order.status === "completed" || order.status === "goods_received" || order.delivery_status === "delivered") return 3
  if (order.status === "shipped" || order.status === "delivered" || order.delivery_status === "in_transit" || order.delivery_status === "out_for_delivery") return 2
  if (order.status === "processing" || order.status === "ready_to_dispatch" || order.status === "po_accepted" || order.delivery_status === "loaded") return 1
  return 0
}

const readableStatus = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const orderStatusLabel = (order?: VendorOrder | null) => {
  if (!order) return "No active order"
  if (order.status === "cancelled") return "Cancelled"
  if (order.status === "completed") return "Completed"
  if (order.status === "goods_received") return "Goods Received"
  if (order.status === "delivered" || order.delivery_status === "delivered") return "Delivered"
  if (order.status === "shipped") return "Shipped"
  if (order.delivery_status === "out_for_delivery") return "Out For Delivery"
  if (order.delivery_status === "in_transit") return "In Transit"
  if (order.status === "ready_to_dispatch") return "Ready To Dispatch"
  if (order.status === "partially_subcontracted") return "Partially Subcontracted"
  if (order.status === "processing") return "Processing"
  if (order.status === "po_accepted") return "PO Accepted"
  if (order.status === "po_released") return "PO Released"
  return readableStatus(order.status)
}

const getOrderStatusColor = (status: string) => {
  switch (status) {
    case "completed":
    case "goods_received":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100/50"
    case "shipped":
    case "delivered":
      return "bg-blue-50 text-blue-700 border border-blue-100/50"
    case "processing":
    case "po_accepted":
    case "ready_to_dispatch":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100/50"
    case "cancelled":
      return "bg-rose-50 text-rose-700 border border-rose-100/50"
    default:
      return "bg-slate-50 text-slate-700 border border-slate-100/50"
  }
}

const orderStatusDetail = (order?: VendorOrder | null) => {
  if (!order) return "New purchase orders will appear here."
  if (order.tracking_note) return order.tracking_note
  return `Delivery ${readableStatus(order.delivery_status)} | Payment ${readableStatus(order.payment_status)}`
}

const latestOrderActivityTime = (order: VendorOrder) => {
  const latestEvent = order.events.reduce((latest, event) => {
    const eventTime = new Date(event.created_at).getTime()
    return Number.isFinite(eventTime) && eventTime > latest ? eventTime : latest
  }, 0)

  return Math.max(
    latestEvent,
    new Date(order.goods_received_at || "").getTime() || 0,
    new Date(order.delivered_at || "").getTime() || 0,
    new Date(order.shipped_at || "").getTime() || 0,
    new Date(order.po_accepted_at || "").getTime() || 0,
    new Date(order.po_released_at || "").getTime() || 0,
    new Date(order.created_at).getTime() || 0
  )
}

const orderActivityDate = (order: VendorOrder) => {
  const latestEvent = [...order.events]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0]

  return (
    latestEvent?.created_at ||
    order.goods_received_at ||
    order.delivered_at ||
    order.shipped_at ||
    order.po_accepted_at ||
    order.po_released_at ||
    order.created_at
  )
}

const nextOrderAction = (order?: VendorOrder | null) => {
  if (!order) return null
  if (order.status === "po_released") return { label: "Accept PO", payload: null }
  if (order.status === "po_accepted") {
    return {
      label: "Start Processing",
      payload: { status: "processing" as const, delivery_status: "loaded" as const, tracking_note: "Order is being processed by supplier." },
    }
  }
  if (order.status === "processing" || order.status === "partially_subcontracted") {
    return {
      label: "Ready To Dispatch",
      payload: { status: "ready_to_dispatch" as const, delivery_status: "loaded" as const, tracking_note: "Order packed and ready to dispatch." },
    }
  }
  if (order.status === "ready_to_dispatch") {
    return {
      label: "Mark Shipped",
      payload: { status: "shipped" as const, delivery_status: "in_transit" as const, tracking_note: "Shipment is in transit." },
    }
  }
  if (order.status === "shipped" || order.delivery_status === "in_transit" || order.delivery_status === "out_for_delivery") {
    return {
      label: "Mark Delivered",
      payload: { status: "delivered" as const, delivery_status: "delivered" as const, tracking_note: "Shipment delivered to buyer location." },
    }
  }
  return null
}

export default function SupplierDashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7f9fb]" />}>
      <SupplierDashboardPageContent />
    </Suspense>
  )
}

function SupplierDashboardPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("supplier_user")
      if (cached) {
        try { return JSON.parse(cached) } catch { return null }
      }
    }
    return null
  })
  const [products, setProducts] = useState<VendorProductService[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("supplier_products")
      if (cached) {
        try { return JSON.parse(cached) } catch { return [] }
      }
    }
    return []
  })
  const [orders, setOrders] = useState<VendorOrder[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("supplier_orders")
      if (cached) {
        try { return JSON.parse(cached) } catch { return [] }
      }
    }
    return []
  })
  const [rfqs, setRfqs] = useState<VendorRfq[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("supplier_rfqs")
      if (cached) {
        try { return JSON.parse(cached) } catch { return [] }
      }
    }
    return []
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const hasCached = sessionStorage.getItem("supplier_products") &&
                        sessionStorage.getItem("supplier_orders") &&
                        sessionStorage.getItem("supplier_rfqs") &&
                        sessionStorage.getItem("supplier_user")
      return !hasCached
    }
    return true
  })
  const [error, setError] = useState("")
  const [searchText, setSearchText] = useState("")
  const [focusId, setFocusId] = useState<number | null>(null)
  const [activeQuoteRfqId, setActiveQuoteRfqId] = useState<number | null>(null)
  const [quoteForm, setQuoteForm] = useState<VendorQuotationInput>(emptyQuoteForm)
  const [quoteMessage, setQuoteMessage] = useState("")
  const [submittingQuote, setSubmittingQuote] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [orderActionMessage, setOrderActionMessage] = useState("")
  const deferredSearch = useDeferredValue(searchText)

  const getFirstName = (name: string | null | undefined) => {
    if (!name) return "Shivam"
    const firstPart = name.split(/[\s\-\.]+/)[0]
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1)
  }

  // Read URL search params
  useEffect(() => {
    const urlSearch = searchParams.get("search")
    const urlFocusId = searchParams.get("focusId")
    if (urlSearch) {
      setSearchText(decodeURIComponent(urlSearch))
    }
    if (urlFocusId) {
      setFocusId(Number(urlFocusId))
    }
  }, [searchParams])

  // Auto-scroll to focused item
  useEffect(() => {
    if (focusId) {
      setTimeout(() => {
        const element = document.getElementById(`opportunity-${focusId}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
    }
  }, [focusId])

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getCurrentUser()
        if (me.role !== "supplier") {
          router.push("/buyer/dashboard")
          return
        }
        if (me.status === "pending") {
          router.replace("/supplier/profile")
          return
        }
        if (!me.has_active_subscription) {
          router.replace("/supplier/subscription")
          return
        }
        setUser(me)
        const [productData, orderData, rfqData] = await Promise.all([getProducts(), getOrders(), getRfqs()])
        setProducts(productData)
        setOrders(orderData)
        setRfqs(rfqData)

        // Cache for next visit
        sessionStorage.setItem("supplier_user", JSON.stringify(me))
        sessionStorage.setItem("supplier_products", JSON.stringify(productData))
        sessionStorage.setItem("supplier_orders", JSON.stringify(orderData))
        sessionStorage.setItem("supplier_rfqs", JSON.stringify(rfqData))
      } catch (loadError) {
        if (isAuthSessionError(loadError)) {
          clearToken()
          const sessionMessage = "Your supplier session expired. Please login again."
          setError(sessionMessage)
          router.push("/login?next=%2Fsupplier%2Fdashboard")
          return
        }
        const loadMessage = "Could not load your supplier dashboard right now. Check the backend and try again."
        setError(loadMessage)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const supplierProducts = useMemo(
    () => products.filter((item) => item.vendor_username?.trim().toLowerCase() === (user?.username ?? "").trim().toLowerCase()),
    [products, user?.username]
  )

  const activeSupplierListings = useMemo(
    () => supplierProducts.filter((item) => item.is_active && item.stock > 0),
    [supplierProducts]
  )

  const supplierVendorId = supplierProducts[0]?.vendor ?? null
  const supplierCompany = supplierProducts[0]?.vendor_company_name?.trim().toLowerCase() ?? ""

  const visibleRfqs = useMemo(
    () =>
      rfqs.filter((rfq) => {
        if (rfq.invited_vendors.length === 0) return true
        return rfq.invited_vendors.some((vendor) => {
          const vendorUsername = vendor.vendor_username?.trim().toLowerCase() || ""
          const vendorName = vendor.vendor_name.trim().toLowerCase()
          return Boolean(
            (supplierVendorId && vendor.vendor_id === supplierVendorId) ||
              (user?.username && vendorUsername === user.username.trim().toLowerCase()) ||
              (supplierCompany && vendorName === supplierCompany)
          )
        })
      }),
    [rfqs, supplierCompany, supplierVendorId, user?.username]
  )

  const bidRows = useMemo<BidRow[]>(
    () =>
      visibleRfqs
        .flatMap((rfq) =>
          rfq.quotations
            .filter((quote) => {
              if (supplierVendorId && quote.supplier_vendor_id === supplierVendorId) return true
              if (quote.supplier_name?.trim().toLowerCase() === (user?.username ?? "").trim().toLowerCase()) return true
              if (supplierCompany && quote.supplier_company?.trim().toLowerCase() === supplierCompany) return true
              return false
            })
            .map((quote) => ({ rfq, quote }))
        )
        .sort((left, right) => new Date(right.quote.created_at).getTime() - new Date(left.quote.created_at).getTime()),
    [supplierCompany, supplierVendorId, user?.username, visibleRfqs]
  )

  const respondedIds = useMemo(() => new Set(bidRows.map((item) => item.rfq.id)), [bidRows])
  const opportunities = useMemo<Opportunity[]>(
    () =>
      visibleRfqs
        .filter((rfq) => {
          if (rfq.status !== "open") return false
          const deadline = new Date(rfq.quote_deadline)
          if (deadline.getTime() < Date.now()) return false
          return !respondedIds.has(rfq.id)
        })
        .map((rfq) => ({ rfq, matches: opportunityMatches(rfq, supplierProducts) }))
        .filter((item) => item.matches.length > 0)
        .sort((left, right) => new Date(left.rfq.quote_deadline).getTime() - new Date(right.rfq.quote_deadline).getTime()),
    [respondedIds, supplierProducts, visibleRfqs]
  )

  const supplierOrders = useMemo(
    () => orders.filter((order) => order.vendor_user_id === user?.id),
    [orders, user?.id]
  )
  const totalRevenue = useMemo(() => supplierOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0), [supplierOrders])
  const activeBids = useMemo(() => bidRows.filter((item) => item.quote.status !== "rejected"), [bidRows])


  const query = deferredSearch.trim().toLowerCase()
  const shownOpportunities = useMemo(() => (query ? opportunities.filter((item) => [item.rfq.title, item.rfq.buyer_company || item.rfq.buyer_name, item.rfq.delivery_location].join(" ").toLowerCase().includes(query)) : opportunities), [opportunities, query])
  const shownBids = useMemo(() => (query ? activeBids.filter((item) => [item.rfq.title, item.rfq.buyer_company || item.rfq.buyer_name, rfqId(item.rfq.id)].join(" ").toLowerCase().includes(query)) : activeBids), [activeBids, query])
  const pendingShipments = useMemo(
    () => supplierOrders.filter((order) => !["completed", "cancelled", "goods_received"].includes(order.status) && order.delivery_status !== "delivered"),
    [supplierOrders]
  )
  const currentOrder = useMemo(
    () =>
      [...supplierOrders]
        .filter((order) => order.status !== "cancelled")
        .sort((left, right) => {
          const leftOpen = !["completed", "goods_received"].includes(left.status) && left.delivery_status !== "delivered"
          const rightOpen = !["completed", "goods_received"].includes(right.status) && right.delivery_status !== "delivered"
          if (leftOpen !== rightOpen) return leftOpen ? -1 : 1
          return latestOrderActivityTime(right) - latestOrderActivityTime(left)
        })[0] ?? null,
    [supplierOrders]
  )
  const currentOrderStage = orderStageIndex(currentOrder)
  const currentOrderAction = nextOrderAction(currentOrder)
  const activeQuoteRfq = useMemo(
    () => opportunities.find((item) => item.rfq.id === activeQuoteRfqId) ?? null,
    [activeQuoteRfqId, opportunities]
  )
  const quoteListingOptions = useMemo(() => {
    if (!activeQuoteRfq) return []

    const sameType = activeSupplierListings.filter((item) => item.product_type === activeQuoteRfq.rfq.product_type)
    const directMatches = activeQuoteRfq.matches.map((item) => item.id)
    return [...sameType].sort((left, right) => {
      const leftPriority = directMatches.includes(left.id) ? 0 : 1
      const rightPriority = directMatches.includes(right.id) ? 0 : 1
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return left.name.localeCompare(right.name)
    })
  }, [activeQuoteRfq, activeSupplierListings])

  const openQuoteModal = (rfqId: number) => {
    const selectedOpportunity = opportunities.find((item) => item.rfq.id === rfqId)
    const preferredListing = selectedOpportunity?.matches[0]
    const fallbackListing = activeSupplierListings.find((item) => item.product_type === selectedOpportunity?.rfq.product_type)

    setActiveQuoteRfqId(rfqId)
    setQuoteMessage("")
    setQuoteForm({
      ...emptyQuoteForm,
      product_id: preferredListing?.id ?? fallbackListing?.id ?? 0,
      unit_price: preferredListing ? Number(preferredListing.price) : fallbackListing ? Number(fallbackListing.price) : 0,
    })
  }

  const closeQuoteModal = () => {
    setActiveQuoteRfqId(null)
    setQuoteForm(emptyQuoteForm)
    setQuoteMessage("")
  }

  const handleSubmitQuote = async () => {
    if (!activeQuoteRfq) return

    if (!quoteListingOptions.length) {
      const validationMessage = "Add an active listing before submitting a quote for this RFQ."
      setQuoteMessage(validationMessage)
      return
    }

    if (!quoteForm.product_id) {
      const validationMessage = "Select a listing for this quotation."
      setQuoteMessage(validationMessage)
      return
    }

    if (quoteForm.unit_price <= 0 || quoteForm.lead_time_days <= 0 || quoteForm.validity_days <= 0) {
      const validationMessage = "Enter valid quote amount, lead time, and validity days."
      setQuoteMessage(validationMessage)
      return
    }

    try {
      setSubmittingQuote(true)
      setQuoteMessage("")
      await submitQuotation(activeQuoteRfq.rfq.id, quoteForm)
      const refreshedRfqs = await getRfqs()
      setRfqs(refreshedRfqs)
      closeQuoteModal()
    } catch (submitError) {
      const errorMessage = getApiErrorMessage(submitError, "Could not submit quotation right now.")
      setQuoteMessage(errorMessage)
    } finally {
      setSubmittingQuote(false)
    }
  }

  const replaceOrder = (updated: VendorOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)))
  }

  const handleCurrentOrderAction = async () => {
    if (!currentOrder || !currentOrderAction) return

    try {
      setUpdatingOrderId(currentOrder.id)
      setOrderActionMessage("")
      const updatedOrder =
        currentOrder.status === "po_released"
          ? await acceptPo(currentOrder.id)
          : await updateOrderTracking(currentOrder.id, currentOrderAction.payload ?? {})
      replaceOrder(updatedOrder)
      const successMessage = `Order #ORD-${updatedOrder.id} updated to ${orderStatusLabel(updatedOrder)}.`
      setOrderActionMessage(successMessage)
    } catch (actionError) {
      const errorMessage = getApiErrorMessage(actionError, "Could not update this order right now.")
      setOrderActionMessage(errorMessage)
    } finally {
      setUpdatingOrderId(null)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex flex-col">
        <SupplierNavbar active="dashboard" />
        <main className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 py-6 md:py-8 pb-10 md:px-8 lg:py-10 flex-1">
          <div className="animate-pulse space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8">
              <div className="h-4 w-24 bg-slate-100 rounded-full mb-4" />
              <div className="h-7 w-64 bg-slate-100 rounded-lg mb-3" />
              <div className="h-3 w-80 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-60 bg-slate-100 rounded" />
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="h-2.5 w-20 bg-slate-100 rounded-full mb-3" />
                      <div className="h-8 w-14 bg-slate-100 rounded-lg" />
                    </div>
                    <div className="h-11 w-11 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <SupplierFooter />
      </div>
    )
  }

  if (!user) return <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]"><div className="mx-auto max-w-3xl rounded-[2rem] border border-[#ffd7d7] bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)]"><h1 className="font-[family-name:var(--font-display)] text-3xl font-black">Supplier session unavailable</h1><p className="mt-4 text-sm leading-7 text-[#7a8698]">{error || "Your dashboard could not be opened."}</p><Link href="/login?next=%2Fsupplier%2Fdashboard" className="mt-6 inline-flex rounded-2xl bg-[#0f4fb6] px-5 py-3 text-sm font-bold text-white">Return to Login</Link></div></main>

  return (
    <div
      className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col"
      style={{
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(79,70,229,0.03) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(59,130,246,0.04) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(99,102,241,0.03) 0px, transparent 45%)",
      }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes stagePulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(79, 70, 229, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
          }
          .stage-active-pulse {
            animation: stagePulse 2s infinite;
          }
        `
      }} />

      <SupplierNavbar
        active="dashboard"
        username={user.username}
        status={user.status}
        onSignOut={signOut}
        userEmail={user.email}
        userRole={user.role}
        searchText={searchText}
        setSearchText={setSearchText}
        pendingActions={pendingShipments.length}
      />

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-4 sm:px-6 py-6 md:py-8 pb-10 md:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-100/40 bg-gradient-to-br from-indigo-50/30 via-white to-blue-50/20 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-indigo-55/10 blur-2xl pointer-events-none" />
            <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-blue-55/10 blur-2xl pointer-events-none" />
            <div className="relative max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Hello, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-black">{getFirstName(user.username)}</span>! 👋
              </h1>
              <p className="mt-2 text-sm text-slate-500 font-medium">
                Welcome to your command center. You have <span className="text-indigo-650 font-bold">{pendingShipments.length} pending shipment updates</span> and <span className="text-indigo-650 font-bold">{shownOpportunities.length} matching RFQs</span>.
              </p>
            </div>
            <div className="relative shrink-0 flex items-center justify-center">
              <img
                src="/images/supplier_banner.png"
                alt="Supply Chain Overview"
                className="h-28 md:h-32 object-contain rounded-xl border border-slate-100/50 shadow-sm"
              />
            </div>
          </div>
          
          {/* Stats Cards Section */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/supplier/orders"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex items-center justify-between min-h-[90px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300"
            >
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
              <div>
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Total Orders</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight group-hover:scale-105 origin-left transition-transform">{supplierOrders.length}</p>
              </div>
              <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100/50 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-100/70 group-hover:text-indigo-750">
                <ShoppingCart className="h-5 w-5" />
              </span>
            </Link>

            <Link
              href="/supplier/rfq"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex items-center justify-between min-h-[90px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300"
            >
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
              <div>
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Active RFQs</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight group-hover:scale-105 origin-left transition-transform">{shownOpportunities.length}</p>
              </div>
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100/50 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-100/70 group-hover:text-blue-750">
                <FileText className="h-5 w-5" />
              </span>
            </Link>

            <Link
              href="/supplier/orders"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex items-center justify-between min-h-[90px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300"
            >
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
              <div>
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider group-hover:text-amber-600 transition-colors">Pending Shipments</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight group-hover:scale-105 origin-left transition-transform">{pendingShipments.length}</p>
              </div>
              <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-100/50 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-100/70 group-hover:text-amber-750">
                <Truck className="h-5 w-5" />
              </span>
            </Link>

            <Link
              href="/supplier/analytics"
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm flex items-center justify-between min-h-[90px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
            >
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
              <div>
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Total Revenue</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight group-hover:scale-105 origin-left transition-transform">{compactMoney(totalRevenue)}</p>
              </div>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100/50 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-100/70 group-hover:text-emerald-750">
                <TrendingUp className="h-5 w-5" />
              </span>
            </Link>
          </section>

          {/* Quick Actions Grid Section */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/supplier/products/new"
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 flex items-center justify-between min-h-[90px]"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-indigo-750 transition text-sm">Add Product</h3>
                </div>
                <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100/50 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-100/70 group-hover:text-indigo-750 shrink-0">
                  <Plus className="h-5 w-5" />
                </span>
              </Link>

              <Link
                href="/supplier/messages"
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 flex items-center justify-between min-h-[90px]"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-blue-750 transition text-sm">Message Center</h3>
                </div>
                <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100/50 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-100/70 group-hover:text-blue-750 shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </span>
              </Link>

              <Link
                href="/supplier/orders"
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 flex items-center justify-between min-h-[90px]"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-amber-750 transition text-sm">Track Orders</h3>
                </div>
                <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-100/50 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-100/70 group-hover:text-amber-750 shrink-0">
                  <ShoppingCart className="h-5 w-5" />
                </span>
              </Link>

              <Link
                href="/supplier/settings"
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 flex items-center justify-between min-h-[90px]"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-55/10 blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-emerald-750 transition text-sm">Account Settings</h3>
                </div>
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100/50 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-100/70 group-hover:text-emerald-750 shrink-0">
                  <Settings className="h-5 w-5" />
                </span>
              </Link>
            </div>
          </div>

          {/* Core Content Grid */}
          <div className="space-y-6">
              
              {/* Recent Orders Card */}
              <article className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
                    <p className="text-xs text-slate-500">Track active purchase orders, fulfillment status, and customer payments</p>
                  </div>
                  {supplierOrders.length > 0 && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-750">
                      {supplierOrders.length} Total
                    </span>
                  )}
                </div>

                {/* Desktop View Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Buyer (Hospital)</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Order Date</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {supplierOrders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="transition hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            HL-ORD-{String(order.id).padStart(4, "0")}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {order.buyer_username || `Buyer #${order.buyer}`}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {shortDate(order.created_at)}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {money(toNumber(order.total_amount))}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getOrderStatusColor(order.status)}`}>
                              {orderStatusLabel(order)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href="/supplier/orders"
                              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 shadow-sm"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {supplierOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-450">
                            <div className="flex flex-col items-center justify-center space-y-2 py-4">
                              <Inbox className="h-8 w-8 text-slate-300" />
                              <p className="text-sm font-semibold">No recent orders found.</p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="block sm:hidden p-4 space-y-3">
                  {supplierOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          HL-ORD-{String(order.id).padStart(4, "0")}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getOrderStatusColor(order.status)}`}>
                          {orderStatusLabel(order)}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900">{order.buyer_username || `Buyer #${order.buyer}`}</h4>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{money(toNumber(order.total_amount))}</span>
                        <Link
                          href="/supplier/orders"
                          className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-slate-800"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  ))}
                  {supplierOrders.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                      <p className="text-xs font-semibold">No recent orders found.</p>
                    </div>
                  ) : null}
                </div>
              </article>

              {/* Opportunities/Recent RFQs Card */}
              <article className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Recent RFQs for You</h2>
                    <p className="text-xs text-slate-500">Respond to incoming procurement requests matched with your category</p>
                  </div>
                  {shownOpportunities.length > 0 && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-750">
                      {shownOpportunities.length} Inquiries
                    </span>
                  )}
                </div>
                
                {/* Desktop View Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Facility Name</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Requirements</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {shownOpportunities.slice(0, 5).map((item) => (
                        <tr
                          key={item.rfq.id}
                          id={`opportunity-${item.rfq.id}`}
                          className={`transition hover:bg-slate-50/50 ${focusId === item.rfq.id ? "bg-indigo-55/30 ring-1 ring-indigo-500" : ""}`}
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900">{item.rfq.buyer_company || item.rfq.buyer_name}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{item.rfq.title}</p>
                            <p className="mt-0.5 text-xs text-slate-400 max-w-[280px] truncate">
                              {item.matches.length > 0 ? item.matches.map((listing) => listing.name).join(", ") : "No direct catalog match yet"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-semibold">{shortDate(item.rfq.quote_deadline)}</span>
                              </div>
                              <span className="text-[10px] font-bold text-rose-600 pl-5">
                                {getRemainingTimeText(item.rfq.quote_deadline)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Eligible
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => router.push(`/supplier/rfq?rfqId=${item.rfq.id}`)}
                              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 shadow-sm"
                            >
                              Submit Quote
                            </button>
                          </td>
                        </tr>
                      ))}
                      {shownOpportunities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center space-y-2 py-4">
                              <Inbox className="h-8 w-8 text-slate-300" />
                              <p className="text-sm font-semibold">No live RFQs available right now.</p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="block sm:hidden p-4 space-y-3">
                  {shownOpportunities.slice(0, 5).map((item) => (
                    <div
                      key={item.rfq.id}
                      id={`opportunity-mobile-${item.rfq.id}`}
                      className={`rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-sm ${focusId === item.rfq.id ? "ring-2 ring-slate-900 bg-slate-100/50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate max-w-[160px]">
                          {item.rfq.buyer_company || item.rfq.buyer_name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-100">
                          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                          Eligible
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900">{item.rfq.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.matches.length > 0
                           ? `Matches: ${item.matches.map((l) => l.name).join(", ")}`
                           : "No direct catalog match yet"}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex flex-col gap-0.5 text-slate-500">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Due {shortDate(item.rfq.quote_deadline)}</span>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 pl-5">
                            {getRemainingTimeText(item.rfq.quote_deadline)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push(`/supplier/rfq?rfqId=${item.rfq.id}`)}
                          className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                        >
                          Submit Quote
                        </button>
                      </div>
                    </div>
                  ))}
                  {shownOpportunities.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-2">
                      <Inbox className="h-8 w-8 text-slate-350" />
                      <p className="font-semibold">No live RFQs available right now.</p>
                    </div>
                  ) : null}
                </div>
              </article>
          </div>
        </div>
      </main>

      <SupplierFooter />

      {/* Quote Submission Modal */}
      {activeQuoteRfq ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6"
          onClick={closeQuoteModal}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="quote-modal-shell grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Left Column (Details) */}
              <div className="min-h-0 overflow-y-auto bg-white p-6 pb-10 sm:p-8 sm:pb-12 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Selected RFQ Details</p>
                      <h3 className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900">{activeQuoteRfq.rfq.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">{activeQuoteRfq.rfq.description || "No additional RFQ description was provided."}</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeQuoteModal}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 transition hover:bg-slate-50"
                      aria-label="Close quote popup"
                    >
                      <span className="text-xl leading-none">&times;</span>
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <QuoteInfoCard label="Buyer" value={activeQuoteRfq.rfq.buyer_company || activeQuoteRfq.rfq.buyer_name} icon={Briefcase} />
                    <QuoteInfoCard label="RFQ ID" value={rfqId(activeQuoteRfq.rfq.id)} icon={Layers} />
                    <QuoteInfoCard label="Quantity" value={`${activeQuoteRfq.rfq.quantity}`} icon={Percent} />
                    <QuoteInfoCard label="Type" value={activeQuoteRfq.rfq.product_type === "service" ? "Service" : "Product"} icon={Package} />
                    <QuoteInfoCard label="Due Date" value={longDate(activeQuoteRfq.rfq.quote_deadline)} icon={Calendar} />
                    <QuoteInfoCard label="Delivery" value={longDate(activeQuoteRfq.rfq.expected_delivery_date)} icon={Calendar} />
                    <QuoteInfoCard label="Location" value={activeQuoteRfq.rfq.delivery_location} icon={MapPin} />
                    <QuoteInfoCard label="Budget" value={activeQuoteRfq.rfq.target_budget > 0 ? money(activeQuoteRfq.rfq.target_budget) : "Not specified"} icon={DollarSign} />
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Catalog Match Results</p>
                  <div className="mt-3 space-y-2">
                    {activeQuoteRfq.matches.length > 0 ? activeQuoteRfq.matches.map((listing) => (
                      <div key={listing.id} className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{listing.name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Stock: {listing.stock} units available
                          </p>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900">
                          {money(Number(listing.price))}
                        </span>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500 leading-normal">
                        No direct catalog matches found for this item type, but you can still select and quote using any of your active listings.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (Form) */}
              <div className="flex min-h-0 flex-col bg-slate-50 border-l border-slate-200 text-slate-800 relative">
                
                <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-24 sm:p-8 sm:pb-28 relative z-10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quotation Form</p>
                    <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Bid This Tender</h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                      Adjust your pricing, lead time and custom terms. All submitted quotations are legally binding.
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <label className="grid gap-1.5 text-xs">
                      <span className="font-bold text-slate-600">Select Offering Listing</span>
                      <select
                        value={quoteForm.product_id}
                        onChange={(event) => {
                          const selectedId = Number(event.target.value)
                          const selectedListing = quoteListingOptions.find((item) => item.id === selectedId)
                          setQuoteForm((prev) => ({
                            ...prev,
                            product_id: selectedId,
                            unit_price: selectedListing ? Number(selectedListing.price) : prev.unit_price,
                          }))
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-450 transition placeholder:text-slate-400"
                      >
                        <option value={0} className="text-[#0f172a]">Choose active listing</option>
                        {quoteListingOptions.map((listing) => (
                          <option key={listing.id} value={listing.id} className="text-[#0f172a]">
                            {listing.name} | {money(Number(listing.price))} | Stock {listing.stock}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-3 grid-cols-3">
                      <label className="grid gap-1.5 text-xs col-span-3 sm:col-span-1">
                        <span className="font-bold text-slate-600">Unit Price (INR)</span>
                        <input
                          type="number"
                          value={quoteForm.unit_price}
                          onChange={(event) => setQuoteForm((prev) => ({ ...prev, unit_price: Number(event.target.value) }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-450 transition placeholder:text-slate-400"
                          placeholder="0.00"
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs col-span-3 sm:col-span-1">
                        <span className="font-bold text-slate-600">Lead Time (Days)</span>
                        <input
                          type="number"
                          value={quoteForm.lead_time_days}
                          onChange={(event) => setQuoteForm((prev) => ({ ...prev, lead_time_days: Number(event.target.value) }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-450 transition placeholder:text-slate-400"
                          placeholder="7"
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs col-span-3 sm:col-span-1">
                        <span className="font-bold text-slate-600">Validity (Days)</span>
                        <input
                          type="number"
                          value={quoteForm.validity_days}
                          onChange={(event) => setQuoteForm((prev) => ({ ...prev, validity_days: Number(event.target.value) }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-450 transition placeholder:text-slate-400"
                          placeholder="15"
                        />
                      </label>
                    </div>

                    <label className="grid gap-1.5 text-xs">
                      <span className="font-bold text-slate-600">Special Terms & Remarks</span>
                      <textarea
                        value={quoteForm.notes}
                        onChange={(event) => setQuoteForm((prev) => ({ ...prev, notes: event.target.value }))}
                        className="h-28 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-450 transition placeholder:text-slate-400"
                        placeholder="Specify warranty, batch limits, shipping exceptions..."
                      />
                    </label>

                    {quoteMessage && (
                      <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-700">
                        {quoteMessage}
                      </p>
                    )}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSubmitQuote}
                        disabled={submittingQuote}
                        className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submittingQuote ? "Submitting Quotation..." : "Submit Quotation"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function QuoteInfoCard({ label, value, icon: IconComponent }: { label: string; value: string; icon?: React.ComponentType<any> }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center gap-3">
      {IconComponent && (
        <div className="rounded-lg bg-white p-2 border border-slate-100 text-slate-500 shadow-sm shrink-0">
          <IconComponent className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  )
}
