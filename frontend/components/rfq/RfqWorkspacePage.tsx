"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, type ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import BuyerNavbar from "@/components/buyer/BuyerNavbar"
import BuyerFooter from "@/components/buyer/BuyerFooter"
import SupplierNavbar from "@/components/supplier/SupplierNavbar"
import SupplierFooter from "@/components/supplier/SupplierFooter"
import RfqDetailPage from "./RfqDetailPage"
import {
  FileText,
  CheckCircle,
  Calendar,
  MapPin,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileSpreadsheet,
  Plus,
  Search,
  ArrowUpDown,
  UserCheck,
  Inbox,
  Eye,
  Download,
  AlertCircle,
  Trash2,
  Edit,
  Clock,
  Briefcase,
  Users,
  Filter,
  Package,
  Info,
  ArrowLeft
} from "lucide-react"
import {
  awardQuotation,
  clearToken,
  closeRfq,
  createOrder,
  createRfq,
  deleteRfq,
  editQuotation,
  getApiErrorMessage,
  getCurrentUser,
  getPublicRfqs,
  getProducts,
  getRfqs,
  getToken,
  getUniqueVendorsFromProducts,
  isAuthSessionError,
  rejectQuotation,
  reopenRfq,
  submitQuotation,
  updateRfq,
  logoutUser,
  getOrders,
} from "@/services"
import type { VendorProductService, VendorQuotationInput, VendorRfq, VendorRfqInput, VendorOrder } from "@/services"

const emptyRfqForm: VendorRfqInput = {
  title: "",
  description: "",
  product_type: "product",
  quantity: 1,
  target_budget: 0,
  delivery_location: "",
  expected_delivery_date: "",
  quote_deadline: "",
  tender_document: null,
  tender_document_note: "",
  remove_tender_document: false,
  tender_type: "open",
  invited_vendors: [],
}

const emptyQuoteForm: VendorQuotationInput = {
  product_id: 0,
  unit_price: 0,
  lead_time_days: 7,
  validity_days: 15,
  notes: "",
}

const getToday = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

const formatDisplayDate = (value: string) => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatDisplayDateTime = (value?: string | null) => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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

const formatBuyerType = (value: VendorRfq["buyer_type"]) => {
  if (!value) return "Institution"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const formatTenderType = (value: string) => {
  if (value === "open") return "Open Tender"
  if (value === "limited") return "Limited Tender"
  return "Reverse Auction"
}

const formatRfqStatus = (value: VendorRfq["status"]) => {
  if (value === "under_review") return "Under Review"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const getDeadlineLabel = (value: string, status: VendorRfq["status"]) => {
  if (status === "closed") return "Closed by buyer"
  if (status === "awarded") return "Award completed"
  if (!value) return "Deadline not set"
  const today = new Date(getToday())
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return `Closes ${value}`

  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return "Closed"
  if (diffDays === 0) return "Closes today"
  if (diffDays === 1) return "Closes in 1 day"
  return `Closes in ${diffDays} days`
}

const getLowestBid = (quotations: any[]) => {
  if (!quotations || quotations.length === 0) return null
  return quotations.reduce((min, q) => q.unit_price < min.unit_price ? q : min, quotations[0])
}

const orderStatusLabel = (order: any) => {
  if (order.status === "po_released") return "Pending"
  if (order.status === "po_accepted") return "Accepted"
  if (order.status === "partially_subcontracted") return "Processing"
  if (order.status === "ready_to_dispatch") return "Ready"
  if (order.status === "goods_received") return "Completed"
  return order.status.replaceAll("_", " ")
}

const statusChipClass = (order: any) => {
  const status = order.status;
  if (status === "completed" || status === "goods_received" || order.delivery_status === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-100"
  if (status === "shipped" || status === "delivered" || order.delivery_status === "in_transit" || order.delivery_status === "out_for_delivery") return "bg-blue-50 text-blue-700 border-blue-100"
  if (status === "processing" || status === "ready_to_dispatch" || status === "po_accepted" || order.delivery_status === "loaded") return "bg-amber-50 text-amber-700 border-amber-100"
  return "bg-slate-50 text-slate-600 border-slate-100"
}

function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft("Ended")
        return
      }

      const hrs = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${hrs}h ${mins}m ${secs}s`)
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  return (
    <span className="font-mono text-slate-700 font-bold">{timeLeft}</span>
  )
}

export default function RfqPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f9fa]" />}>
      <RfqPageContent />
    </Suspense>
  )
}

function RfqPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [userRole, setUserRole] = useState<"supplier" | "buyer" | "admin" | "">("")
  const [buyerType, setBuyerType] = useState<"hospital" | "pharmacy" | "ngo" | "clinic" | null>(null)
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [rfqs, setRfqs] = useState<VendorRfq[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedUsername = sessionStorage.getItem("rfq_username") || ""
      const cachedUserRole = (sessionStorage.getItem("rfq_user_role") as any) || ""
      const cachedBuyerType = (sessionStorage.getItem("rfq_buyer_type") as any) || null
      
      let cachedProducts: VendorProductService[] = []
      const storedProducts = sessionStorage.getItem("rfq_products")
      if (storedProducts) {
        try { cachedProducts = JSON.parse(storedProducts) } catch {}
      }

      let cachedRfqs: VendorRfq[] = []
      const storedRfqs = sessionStorage.getItem("rfq_rfqs")
      if (storedRfqs) {
        try { cachedRfqs = JSON.parse(storedRfqs) } catch {}
      }

      let cachedOrders: VendorOrder[] = []
      const storedOrders = sessionStorage.getItem("rfq_orders")
      if (storedOrders) {
        try { cachedOrders = JSON.parse(storedOrders) } catch {}
      }

      if (cachedUsername) setUsername(cachedUsername)
      if (cachedUserRole) setUserRole(cachedUserRole)
      if (cachedBuyerType) setBuyerType(cachedBuyerType)
      if (cachedProducts.length > 0) setProducts(cachedProducts)
      if (cachedRfqs.length > 0) setRfqs(cachedRfqs)
      if (cachedOrders.length > 0) setOrders(cachedOrders)
      
      const hasCache = Boolean(storedRfqs && cachedUsername)
      setLoading(!hasCache)
    }
  }, [])
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeQuoteRfqId, setActiveQuoteRfqId] = useState<number | null>(null)
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null)
  const [recentlyPublishedRfqId, setRecentlyPublishedRfqId] = useState<number | null>(null)
  const [expandedRfqIds, setExpandedRfqIds] = useState<number[]>([])
  const [requestFilter, setRequestFilter] = useState<"all" | "my_rfqs" | "my_bids" | "eligible" | "my_orders" | VendorRfq["status"]>("all")
  const [hasActiveSub, setHasActiveSub] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [tenderTypeFilter, setTenderTypeFilter] = useState<"all" | VendorRfq["tender_type"]>("all")
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "budget_high" | "budget_low" | "deadline_nearest">("latest")
  const [rfqForm, setRfqForm] = useState<VendorRfqInput>(emptyRfqForm)
  const [quoteForm, setQuoteForm] = useState<VendorQuotationInput>(emptyQuoteForm)
  const [editingRfqId, setEditingRfqId] = useState<number | null>(null)
  const [editingQuotationContext, setEditingQuotationContext] = useState<{ rfqId: number; quotationId: number } | null>(null)
  const [editingQuoteForm, setEditingQuoteForm] = useState<VendorQuotationInput>(emptyQuoteForm)
  const [rejectModal, setRejectModal] = useState<{
    open: boolean
    rfqId: number | null
    quotationId: number | null
    reason: string
  }>({
    open: false,
    rfqId: null,
    quotationId: null,
    reason: '',
  })

  const lastPrefilledRfqIdRef = useRef<number | null>(null)

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    rfqId: number | null
  }>({
    open: false,
    rfqId: null,
  })
  const hasAuthToken = () => Boolean(getToken())

  const handleTenderDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setRfqForm((prev) => ({ ...prev, tender_document: null }))
      return
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("Only PDF files are allowed for tender documents.")
      event.target.value = ""
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Tender PDF must be 10 MB or smaller.")
      event.target.value = ""
      return
    }

    setMessage("")
    setRfqForm((prev) => ({ ...prev, tender_document: file, remove_tender_document: false }))
  }

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getCurrentUser()
        if (pathname?.startsWith("/buyer") && me.role === "supplier") {
          router.replace("/supplier/rfq")
          return
        }
        if (pathname?.startsWith("/supplier") && me.role === "buyer") {
          router.replace("/buyer/rfq")
          return
        }
        if (!me.has_active_subscription) {
          router.replace(me.role === "supplier" ? "/supplier/subscription" : "/buyer/subscription")
          return
        }
        setUsername(me.username)
        setUserRole(me.role)
        setBuyerType(me.buyer_type)
        setHasActiveSub(me.has_active_subscription ?? true)
        
        sessionStorage.setItem("rfq_username", me.username)
        sessionStorage.setItem("rfq_user_role", me.role)
        if (me.buyer_type) {
          sessionStorage.setItem("rfq_buyer_type", me.buyer_type)
        }
      } catch (error) {
        if (!isAuthSessionError(error)) {
          setMessage("Could not verify your session right now. Check whether the backend API is running.")
          setLoading(false)
          return
        }

        clearToken()
        if (pathname?.startsWith("/buyer")) {
          router.push("/login?next=%2Fbuyer%2Frfq")
          return
        }
        setUsername("")
        setUserRole("")
        setBuyerType(null)
        setProducts([])
        try {
          const rfqData = await getPublicRfqs()
          setRfqs(rfqData)
          sessionStorage.setItem("rfq_rfqs", JSON.stringify(rfqData))
        } catch {
          setRfqs([])
        } finally {
          setLoading(false)
        }
        return
      }

      try {
        const [rfqData, productData, orderData] = await Promise.all([
          getRfqs(),
          getProducts(),
          getOrders().catch(() => []),
        ])
        setRfqs(rfqData)
        setProducts(productData)
        setOrders(orderData)
        
        sessionStorage.setItem("rfq_rfqs", JSON.stringify(rfqData))
        sessionStorage.setItem("rfq_products", JSON.stringify(productData))
        sessionStorage.setItem("rfq_orders", JSON.stringify(orderData))
      } catch (error) {
        setMessage(getApiErrorMessage(error, "Could not load the RFQ workspace. Your login is still active; please refresh or try again."))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [pathname, router])

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const rfqPromise = hasAuthToken() ? getRfqs() : getPublicRfqs()
        const orderPromise = hasAuthToken() ? getOrders().catch(() => []) : Promise.resolve([])
        const [rfqData, orderData] = await Promise.all([rfqPromise, orderPromise])
        setRfqs(rfqData)
        setOrders(orderData)
      } catch {
        // Keep silent during background refresh.
      }
    }, 2000)

    return () => window.clearInterval(interval)
  }, [userRole])

  // Handle highlight/rfqId/id parameters to open detailed view page
  useEffect(() => {
    const targetIdParam = searchParams.get("rfqId") || searchParams.get("id") || searchParams.get("highlight")
    if (targetIdParam && rfqs.length > 0) {
      const id = Number(targetIdParam)
      if (!isNaN(id) && rfqs.some((r) => r.id === id)) {
        setSelectedRfqId(id)
        if (searchParams.get("rfqId")) {
          setActiveQuoteRfqId(id)
        }
      }
    }
  }, [searchParams, rfqs])

  // Prefill RFQ creation form from query parameters
  useEffect(() => {
    const prefillTitle = searchParams.get("prefillTitle")
    const prefillType = searchParams.get("prefillType")
    if (prefillTitle || prefillType) {
      setRfqForm((prev) => ({
        ...prev,
        title: prefillTitle || prev.title,
        product_type: (prefillType === "service" ? "service" : "product") as "product" | "service",
      }))
    }
  }, [searchParams])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const vendorDirectory = useMemo(() => getUniqueVendorsFromProducts(products), [products])

  const supplierListings = useMemo(
    () => products.filter((item) => item.vendor_username === username && item.is_active && item.stock > 0),
    [products, username]
  )

  const supplierVendorProfile = useMemo(() => supplierListings[0]?.vendor ?? null, [supplierListings])

  const supplierCompanyName = useMemo(
    () => supplierListings[0]?.vendor_company_name || undefined,
    [supplierListings]
  )

  const isSupplierQuoteOwner = (quote: VendorRfq["quotations"][number]) => {
    const quoteVendorId = quote.supplier_vendor_id
    if (supplierVendorProfile && quoteVendorId && quoteVendorId === supplierVendorProfile) return true
    if (quote.supplier_name?.trim().toLowerCase() === username.trim().toLowerCase()) return true
    if (supplierCompanyName && quote.supplier_company?.trim().toLowerCase() === supplierCompanyName.trim().toLowerCase()) return true
    return false
  }

  useEffect(() => {
    if (selectedRfqId !== null) {
      if (selectedRfqId !== lastPrefilledRfqIdRef.current) {
        const selectedRfq = rfqs.find((r) => r.id === selectedRfqId)
        if (selectedRfq && userRole === "supplier") {
          lastPrefilledRfqIdRef.current = selectedRfqId
          const supplierQuote = selectedRfq.quotations.find((quote) => {
            const quoteVendorId = quote.supplier_vendor_id
            if (supplierVendorProfile && quoteVendorId && quoteVendorId === supplierVendorProfile) return true
            if (quote.supplier_name?.trim().toLowerCase() === username.trim().toLowerCase()) return true
            if (supplierCompanyName && quote.supplier_company?.trim().toLowerCase() === supplierCompanyName.trim().toLowerCase()) return true
            return false
          })

          if (supplierQuote) {
            // Initialize edit mode automatically
            setEditingQuotationContext({ rfqId: selectedRfq.id, quotationId: supplierQuote.id })
            setEditingQuoteForm({
              product_id: supplierQuote.product_id,
              unit_price: supplierQuote.unit_price,
              lead_time_days: supplierQuote.lead_time_days,
              validity_days: supplierQuote.validity_days,
              notes: supplierQuote.notes || "",
            })
            setActiveQuoteRfqId(null) // Close create form since we are editing
          } else {
            // Initialize create mode automatically
            setActiveQuoteRfqId(selectedRfq.id)
            setEditingQuotationContext(null)
            // Find if there is a matching supplier listing to pre-populate product_id
            const matchingListings = supplierListings.filter((item) => item.product_type === selectedRfq.product_type)
            const fallbackListing = matchingListings[0] || supplierListings[0]
            setQuoteForm({
              product_id: fallbackListing?.id || 0,
              unit_price: selectedRfq.target_budget || 0,
              lead_time_days: 7,
              validity_days: 30,
              notes: "",
            })
          }
        }
      }
    } else {
      // Clear forms when closing detail page
      if (lastPrefilledRfqIdRef.current !== null) {
        lastPrefilledRfqIdRef.current = null
        setActiveQuoteRfqId(null)
        setEditingQuotationContext(null)
      }
    }
  }, [selectedRfqId, userRole, rfqs, username, supplierVendorProfile, supplierCompanyName, supplierListings])

  const supplierInviteKeys = useMemo(() => {
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedCompany = supplierCompanyName?.trim().toLowerCase() || ""

    return {
      username: normalizedUsername,
      company: normalizedCompany,
      vendorId: supplierVendorProfile,
    }
  }, [supplierCompanyName, supplierVendorProfile, username])

  const visibleSupplierRfqs = useMemo(
    () =>
      rfqs.filter((item) => {
        // Always show RFQs created by the supplier (subcontracting)
        if (item.buyer_name === username) return true

        // For other RFQs, show if open or if invited
        if (item.invited_vendors.length === 0) return true
        return item.invited_vendors.some((vendor) => {
          const vendorUsername = vendor.vendor_username?.trim().toLowerCase() || ""
          const vendorName = vendor.vendor_name.trim().toLowerCase()

          if (supplierInviteKeys.vendorId && vendor.vendor_id === supplierInviteKeys.vendorId) {
            return true
          }

          if (supplierInviteKeys.username && vendorUsername === supplierInviteKeys.username) {
            return true
          }

          if (supplierInviteKeys.company && vendorName === supplierInviteKeys.company) {
            return true
          }

          return false
        })
      }),
    [rfqs, username, supplierInviteKeys]
  )

  const matchingSupplierListings = useMemo(() => {
    const activeRfq = visibleSupplierRfqs.find((item) => item.id === activeQuoteRfqId)
    if (!activeRfq) return []
    return supplierListings.filter((item) => item.product_type === activeRfq.product_type)
  }, [activeQuoteRfqId, supplierListings, visibleSupplierRfqs])

  const editingMatchingSupplierListings = useMemo(() => {
    if (!editingQuotationContext) return []
    const editRfq = visibleSupplierRfqs.find((item) => item.id === editingQuotationContext.rfqId)
    if (!editRfq) return []
    return supplierListings.filter((item) => item.product_type === editRfq.product_type)
  }, [editingQuotationContext, supplierListings, visibleSupplierRfqs])

  const activeQuoteRfq = useMemo(
    () => visibleSupplierRfqs.find((item) => item.id === activeQuoteRfqId) ?? null,
    [activeQuoteRfqId, visibleSupplierRfqs]
  )

  const refreshRfqs = async () => {
    try {
      const rfqPromise = hasAuthToken() ? getRfqs() : getPublicRfqs()
      const orderPromise = hasAuthToken() ? getOrders().catch(() => []) : Promise.resolve([])
      const [rfqData, orderData] = await Promise.all([rfqPromise, orderPromise])
      setRfqs(rfqData)
      setOrders(orderData)
    } catch {
      // Ignore background or user action refetch error
    }
  }

  const startEditingRfq = (rfq: VendorRfq) => {
    setEditingRfqId(rfq.id)
    setRfqForm({
      title: rfq.title,
      description: rfq.description,
      product_type: rfq.product_type,
      quantity: rfq.quantity,
      target_budget: rfq.target_budget,
      delivery_location: rfq.delivery_location,
      expected_delivery_date: rfq.expected_delivery_date,
      quote_deadline: rfq.quote_deadline,
      tender_document: null,
      tender_document_note: rfq.tender_document_note || "",
      remove_tender_document: false,
      tender_type: rfq.tender_type,
      invited_vendors: rfq.invited_vendors,
    })
    setMessage("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEditingRfq = () => {
    setEditingRfqId(null)
    setRfqForm(emptyRfqForm)
    setMessage("")
  }

  const clearSelectedTenderDocument = () => {
    setRfqForm((prev) => ({ ...prev, tender_document: null }))
  }

  const removeExistingTenderDocument = () => {
    setRfqForm((prev) => ({
      ...prev,
      tender_document: null,
      tender_document_note: "",
      remove_tender_document: true,
    }))
  }

  const toggleRfqExpansion = (rfqId: number) => {
    setExpandedRfqIds((prev) => (prev.includes(rfqId) ? prev.filter((id) => id !== rfqId) : [...prev, rfqId]))
  }

  const handleVendorToggle = (vendorId: number) => {
    const vendor = vendorDirectory.find((item) => item.vendor_id === vendorId)
    if (!vendor) return

    setRfqForm((prev) => {
      const exists = prev.invited_vendors.some((item) => item.vendor_id === vendorId)
      return {
        ...prev,
        invited_vendors: exists
          ? prev.invited_vendors.filter((item) => item.vendor_id !== vendorId)
          : [...prev.invited_vendors, vendor],
      }
    })
  }

  const setAllVendorsOption = () => {
    setRfqForm((prev) => ({
      ...prev,
      tender_type: "open",
      invited_vendors: [],
    }))
    setMessage("")
  }

  const handleSaveRfq = async () => {
    if (!hasAuthToken() || (userRole !== "buyer" && userRole !== "supplier")) {
      setMessage("Please login to publish an RFQ.")
      const nextParam = encodeURIComponent(pathname)
      router.push(`/login?next=${nextParam}`)
      return
    }

    if (!rfqForm.title.trim() || !rfqForm.description.trim() || !rfqForm.delivery_location.trim()) {
      setMessage("Title, description, and delivery location are required.")
      return
    }

    if (!rfqForm.expected_delivery_date || !rfqForm.quote_deadline) {
      setMessage("Expected delivery date and quote deadline are required.")
      return
    }

    if (rfqForm.quantity < 1) {
      setMessage("Quantity must be at least 1.")
      return
    }

    const today = getToday()
    if (rfqForm.quote_deadline < today) {
      setMessage("Quote deadline cannot be in the past.")
      return
    }

    if (rfqForm.expected_delivery_date < rfqForm.quote_deadline) {
      setMessage("Expected delivery date must be on or after the quote deadline.")
      return
    }

    if (rfqForm.tender_type === "limited" && rfqForm.invited_vendors.length === 0) {
      setMessage("Select at least one vendor for a limited tender.")
      return
    }

    try {
      setSubmitting(true)
      setMessage("")
      if (editingRfqId) {
        const updated = await updateRfq(editingRfqId, rfqForm)
        setRfqs((prev) => prev.map((item) => (item.id === editingRfqId ? updated : item)))
        setEditingRfqId(null)
        setRfqForm(emptyRfqForm)
        setMessage(`RFQ #${updated.id} updated successfully.`)
      } else {
        const created = await createRfq(rfqForm)
        setRfqs((prev) => [created, ...prev])
        setRecentlyPublishedRfqId(created.id)
        setRfqForm(emptyRfqForm)
        setMessage(`RFQ #${created.id} issued to the vendor market.`)
      }
    } catch (error) {
      setMessage(
        getApiErrorMessage(error, editingRfqId ? "Could not update RFQ. Please try again." : "Could not create RFQ. Please try again.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitQuotation = async (rfq: VendorRfq) => {
    const selectedListing = matchingSupplierListings.find((item) => item.id === quoteForm.product_id)

    if (!supplierListings.length) {
      setMessage("Add an active product or service listing before submitting a quotation.")
      return
    }

    if (!selectedListing) {
      setMessage("Select the product or service you want to quote from your listings.")
      return
    }

    if (quoteForm.unit_price <= 0 || quoteForm.lead_time_days <= 0 || quoteForm.validity_days <= 0) {
      setMessage("Enter valid quote price, lead time, and validity period.")
      return
    }

    try {
      setSubmitting(true)
      setMessage("")
      await submitQuotation(rfq.id, quoteForm)
      lastPrefilledRfqIdRef.current = null
      await refreshRfqs()
      setQuoteForm(emptyQuoteForm)
      setActiveQuoteRfqId(null)
      setMessage(`Quotation submitted against RFQ #${rfq.id}.`)
    } catch (error) {
      setMessage(
        getApiErrorMessage(error, "Could not submit quotation. Check RFQ eligibility, deadline, and duplicate quote rules.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const startEditingQuotation = (rfq: VendorRfq, quote: VendorRfq["quotations"][number]) => {
    setEditingQuotationContext({ rfqId: rfq.id, quotationId: quote.id })
    setEditingQuoteForm({
      product_id: quote.product_id,
      unit_price: quote.unit_price,
      lead_time_days: quote.lead_time_days,
      validity_days: quote.validity_days,
      notes: quote.notes || "",
    })
    setMessage("")
  }

  const cancelEditingQuotation = () => {
    setEditingQuotationContext(null)
    setEditingQuoteForm(emptyQuoteForm)
  }

  const handleUpdateQuotation = async (rfq: VendorRfq) => {
    if (!editingQuotationContext || editingQuotationContext.rfqId !== rfq.id) return

    const selectedListing = editingMatchingSupplierListings.find((item) => item.id === editingQuoteForm.product_id)
    if (!selectedListing) {
      setMessage("Select a valid listing for your updated quotation.")
      return
    }
    if (editingQuoteForm.unit_price <= 0 || editingQuoteForm.lead_time_days <= 0 || editingQuoteForm.validity_days <= 0) {
      setMessage("Enter valid quote price, lead time, and validity period.")
      return
    }

    try {
      setSubmitting(true)
      setMessage("")
      await editQuotation(rfq.id, editingQuotationContext.quotationId, editingQuoteForm)
      lastPrefilledRfqIdRef.current = null
      await refreshRfqs()
      cancelEditingQuotation()
      setMessage(`Quotation for RFQ #${rfq.id} updated successfully.`)
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not update quotation."))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAwardQuotation = async (rfq: VendorRfq, quotationId: number) => {
    const selectedQuote = rfq.quotations.find((item) => item.id === quotationId)
    if (!selectedQuote) {
      setMessage("Quotation not found.")
      return
    }

    if (!selectedQuote.supplier_vendor_id) {
      setMessage("This quotation is missing a vendor profile mapping.")
      return
    }

    try {
      setSubmitting(true)
      setMessage("")
      const createdOrder = await createOrder({
        vendor: selectedQuote.supplier_vendor_id,
        total_amount: rfq.quantity * selectedQuote.unit_price,
        items: [
          {
            product: selectedQuote.product_id,
            quantity: rfq.quantity,
            price: selectedQuote.unit_price,
          },
        ],
      })
      await awardQuotation(rfq.id, quotationId, {
        vendorId: selectedQuote.supplier_vendor_id,
        supplierName: selectedQuote.supplier_name,
        supplierCompany: selectedQuote.supplier_company,
        orderId: createdOrder.id,
      })
      await refreshRfqs()
      setMessage(
        `RFQ #${rfq.id} awarded to ${selectedQuote.supplier_company || selectedQuote.supplier_name}. Order #${createdOrder.id} created.`
      )
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not award the quotation or create the order."))
    } finally {
      setSubmitting(false)
    }
  }

  const openRejectQuotationModal = (rfqId: number, quotationId: number) => {
    setRejectModal({
      open: true,
      rfqId,
      quotationId,
      reason: "",
    })
  }

  const closeRejectQuotationModal = () => {
    if (submitting) return
    setRejectModal({
      open: false,
      rfqId: null,
      quotationId: null,
      reason: "",
    })
  }

  const handleRejectQuotation = async () => {
    if (!rejectModal.rfqId || !rejectModal.quotationId) return

    try {
      setSubmitting(true)
      setMessage("")
      await rejectQuotation(rejectModal.rfqId, rejectModal.quotationId, rejectModal.reason)
      await refreshRfqs()
      setMessage(`Quotation #${rejectModal.quotationId} rejected for RFQ #${rejectModal.rfqId}.`)
      closeRejectQuotationModal()
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not reject quotation."))
    } finally {
      setSubmitting(false)
    }
  }
  const handleCloseRfq = async (rfqId: number) => {
    try {
      setSubmitting(true)
      setMessage("")
      await closeRfq(rfqId)
      await refreshRfqs()
      setMessage(`RFQ #${rfqId} closed.`)
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not close RFQ."))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReopenRfq = async (rfqId: number) => {
    try {
      setSubmitting(true)
      setMessage("")
      await reopenRfq(rfqId)
      await refreshRfqs()
      setMessage(`RFQ #${rfqId} reopened.`)
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not reopen RFQ."))
    } finally {
      setSubmitting(false)
    }
  }

  const openDeleteRfqModal = (rfqId: number) => {
    setDeleteModal({
      open: true,
      rfqId,
    })
  }

  const closeDeleteRfqModal = () => {
    if (submitting) return
    setDeleteModal({
      open: false,
      rfqId: null,
    })
  }

  const handleDeleteRfq = async () => {
    if (!deleteModal.rfqId) return

    try {
      setSubmitting(true)
      setMessage("")
      await deleteRfq(deleteModal.rfqId)
      await refreshRfqs()
      setMessage(`RFQ #${deleteModal.rfqId} deleted.`)
      closeDeleteRfqModal()
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not delete RFQ."))
    } finally {
      setSubmitting(false)
    }
  }
  const baseRecords = userRole === "buyer" ? rfqs : userRole === "supplier" ? visibleSupplierRfqs : rfqs

  const findSupplierQuote = (rfq: VendorRfq) => {
    return rfq.quotations.find((quote) => {
      const quoteVendorId = quote.supplier_vendor_id
      if (supplierVendorProfile && quoteVendorId && quoteVendorId === supplierVendorProfile) return true
      if (quote.supplier_name?.trim().toLowerCase() === username.trim().toLowerCase()) return true
      if (supplierCompanyName && quote.supplier_company?.trim().toLowerCase() === supplierCompanyName.trim().toLowerCase()) return true
      return false
    })
  }

  const isMyOrderRfq = (rfq: VendorRfq) => {
    if (!rfq.awarded_order_id) return false
    if (userRole === "buyer") {
      return rfq.buyer_name === username
    }
    if (userRole === "supplier") {
      if (supplierVendorProfile && rfq.awarded_vendor_id === supplierVendorProfile) return true
      const winningQuote = rfq.quotations.find((q) => q.id === rfq.awarded_quote_id)
      return winningQuote ? isSupplierQuoteOwner(winningQuote) : false
    }
    return false
  }

  const records = useMemo(
    () => {
      const filtered = baseRecords.filter((item) => {
        const matchesStatus =
          requestFilter === "all"
            ? true
            : requestFilter === "my_rfqs"
              ? item.buyer_name === username
              : requestFilter === "my_bids"
                ? findSupplierQuote(item) !== undefined
                : requestFilter === "eligible"
                  ? item.status === "open" && supplierListings.some((listing) => listing.product_type === item.product_type)
                  : requestFilter === "my_orders"
                    ? isMyOrderRfq(item)
                    : item.status === requestFilter
        const matchesTenderType = tenderTypeFilter === "all" || item.tender_type === tenderTypeFilter
        const matchesSupplier =
          supplierFilter === "all" ||
          item.quotations.some((q) => q.supplier_vendor_id === Number(supplierFilter)) ||
          item.awarded_vendor_id === Number(supplierFilter)
        const normalizedQuery = searchQuery.trim().toLowerCase()
        const matchesQuery =
          normalizedQuery.length === 0 ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery) ||
          (item.buyer_company || item.buyer_name).toLowerCase().includes(normalizedQuery) ||
          item.delivery_location.toLowerCase().includes(normalizedQuery)

        return matchesStatus && matchesTenderType && matchesSupplier && matchesQuery
      })

      return [...filtered].sort((a, b) => {
        if (sortBy === "oldest") return a.id - b.id
        if (sortBy === "budget_high") return b.target_budget - a.target_budget
        if (sortBy === "budget_low") return a.target_budget - b.target_budget
        if (sortBy === "deadline_nearest") {
          const aTime = new Date(a.quote_deadline).getTime()
          const bTime = new Date(b.quote_deadline).getTime()
          return aTime - bTime
        }
        return b.id - a.id
      })
    },
    [baseRecords, requestFilter, tenderTypeFilter, supplierFilter, searchQuery, sortBy, username, supplierVendorProfile, supplierCompanyName]
  )
  const supplierCanQuote = supplierListings.length > 0
  const latestPublishedRfq =
    recentlyPublishedRfqId !== null ? rfqs.find((item) => item.id === recentlyPublishedRfqId) ?? null : null
  const editingRfq = editingRfqId !== null ? rfqs.find((item) => item.id === editingRfqId) ?? null : null
  const showCreateForm = (userRole === "buyer" || userRole === "supplier") && (searchParams.get("view") === "new" || editingRfqId !== null)
  const isBuyerRoute = pathname?.startsWith("/buyer") || userRole === "buyer"
  const isSupplierRoute = pathname?.startsWith("/supplier") || userRole === "supplier"
  const supplierRfqAuthNext = encodeURIComponent("/supplier/rfq")

  const filterTabs: Array<{ key: "all" | "my_rfqs" | "my_bids" | "eligible" | "my_orders" | VendorRfq["status"]; label: string; count: number }> = [
    { key: "all", label: userRole === "buyer" ? "All RFQs" : "All Requests", count: baseRecords.length },
    ...(userRole === "buyer"
      ? [
          { key: "my_rfqs" as const, label: "My RFQs", count: baseRecords.filter((item) => item.buyer_name === username).length }
        ]
      : []),
    ...(userRole === "supplier"
      ? [
          { key: "my_rfqs" as const, label: "My RFQs (Subcontracted)", count: baseRecords.filter((item) => item.buyer_name === username).length },
          { key: "my_bids" as const, label: "My Bids / Quoted", count: baseRecords.filter((item) => findSupplierQuote(item) !== undefined).length },
          { key: "eligible" as const, label: "Eligible to Bid", count: baseRecords.filter((item) => item.status === "open" && supplierListings.some((listing) => listing.product_type === item.product_type)).length }
        ]
      : []),
    { key: "my_orders" as const, label: "My Orders", count: baseRecords.filter((item) => isMyOrderRfq(item)).length },
    { key: "open", label: "Open", count: baseRecords.filter((item) => item.status === "open").length },
    { key: "under_review", label: "Under Review", count: baseRecords.filter((item) => item.status === "under_review").length },
    { key: "closed", label: "Closed", count: baseRecords.filter((item) => item.status === "closed").length },
    { key: "awarded", label: "Awarded", count: baseRecords.filter((item) => item.status === "awarded").length },
  ]

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      {isBuyerRoute ? (
        <BuyerNavbar
          active="rfqs"
          username={username}
          buyerType={buyerType}
          hasActiveSubscription={hasActiveSub}
          onSignOut={signOut}
        />
      ) : isSupplierRoute ? (
        <SupplierNavbar
          active="rfqs"
          username={username}
          onSignOut={signOut}
        />
      ) : null}
      <main className={`flex-1 rfq-experience-page w-full py-8 md:py-12 ${isSupplierRoute || isBuyerRoute ? "mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 pb-12" : ""}`}>
        <div className={`${isBuyerRoute || isSupplierRoute ? "w-full max-w-full" : "health-container"} space-y-6`}>
          {loading ? (
            <div className="flex-1 flex flex-col justify-center items-center min-h-[50vh] py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                  <div className="absolute h-3 w-3 rounded-full bg-blue-600 animate-ping" />
                </div>
                <span className="text-sm font-bold text-slate-500 tracking-tight">
                  Loading RFQs & bidding activities...
                </span>
              </div>
            </div>
          ) : (
            <>
              <section>
                {showCreateForm ? (
                  <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-fade-in-up">
                    <div className="border-b border-slate-100 pb-4 mb-5">
                      <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {editingRfqId ? `Edit RFQ Reference #${editingRfqId}` : "Publish Procurement RFQ"}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {editingRfqId
                          ? "Modify procurement technical specifications, deadline dates, vendor shortlists, or tender documents."
                          : "Create a formal procurement notice detailing product specification scope, required quantity, deadline, and delivery location."}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-2">
                        <span>Requirement Title</span>
                        <input
                          value={rfqForm.title}
                          onChange={(event) => setRfqForm((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder="e.g. High-performance patient monitoring systems"
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-2">
                        <span>Specification / Technical Scope</span>
                        <textarea
                          value={rfqForm.description}
                          onChange={(event) => setRfqForm((prev) => ({ ...prev, description: event.target.value }))}
                          rows={4}
                          placeholder="Specify detailed technical compliance criteria, warranty expectations, support terms, etc."
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-2">
                        <span>Attach Tender PDF</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={handleTenderDocumentChange}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700 cursor-pointer"
                        />
                        <span className="text-[10px] font-medium text-slate-400">
                          Optional. Upload tech specifications, BOQ spreadsheets, or bidding term sheets (PDF up to 10 MB).
                        </span>
                        {editingRfq?.tender_document_url && !rfqForm.remove_tender_document && !rfqForm.tender_document ? (
                          <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/20 p-3 text-xs">
                            <p className="font-bold text-slate-700 flex items-center gap-1.5">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <span>Current Document: {editingRfq.tender_document_name || "Tender specifications"}</span>
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              Uploaded on: {formatDisplayDateTime(editingRfq.tender_document_uploaded_at)}
                            </p>
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              <a
                                href={editingRfq.tender_document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition"
                              >
                                Open PDF
                              </a>
                              <a
                                href={editingRfq.tender_document_url}
                                download={editingRfq.tender_document_name || `rfq-${editingRfq.id}.pdf`}
                                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition"
                              >
                                Download PDF
                              </a>
                              <button
                                type="button"
                                onClick={removeExistingTenderDocument}
                                className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition cursor-pointer"
                              >
                                Remove Document
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {rfqForm.remove_tender_document ? (
                          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-bold flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                            <span>Existing document will be removed once changes are saved.</span>
                          </div>
                        ) : null}
                        {rfqForm.tender_document ? (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              <span>Selected: {rfqForm.tender_document.name}</span>
                            </span>
                            <button
                              type="button"
                              onClick={clearSelectedTenderDocument}
                              className="rounded-lg border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 transition cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        ) : null}
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-2">
                        <span>Tender Document Note</span>
                        <textarea
                          rows={2}
                          value={rfqForm.tender_document_note}
                          onChange={(event) => setRfqForm((prev) => ({ ...prev, tender_document_note: event.target.value }))}
                          placeholder="e.g. Please refer to Section 4 of document for technical specifications."
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500">
                        <span>Category Type</span>
                        <select
                          value={rfqForm.product_type}
                          onChange={(event) =>
                            setRfqForm((prev) => ({
                              ...prev,
                              product_type: event.target.value as "product" | "service",
                            }))
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        >
                          <option value="product">Product Procurement</option>
                          <option value="service">Service Agreement</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500">
                        <span>Tender Desk Mode</span>
                        <select
                          value={rfqForm.tender_type}
                          onChange={(event) =>
                            setRfqForm((prev) => ({
                              ...prev,
                              tender_type: event.target.value as "open" | "limited",
                              invited_vendors:
                                event.target.value === "limited" ? prev.invited_vendors : [],
                            }))
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        >
                          <option value="open">Open Bidding (All Suppliers)</option>
                          <option value="limited">Limited Bidding (Shortlisted Only)</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500">
                        <span>Quantity Required</span>
                        <input
                          type="number"
                          min={1}
                          value={rfqForm.quantity}
                          onChange={(event) => setRfqForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                        <p className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Tag className="h-4 w-4 text-slate-500" />
                          <span>Commercial Term Bidding</span>
                        </p>
                        <p className="mt-1 leading-relaxed text-slate-500 font-semibold">
                          Prices will be collected from supplier quotations. Budget estimate cap is not required to publish.
                        </p>
                      </div>

                      <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-2">
                        <span>Delivery Location</span>
                        <input
                          value={rfqForm.delivery_location}
                          onChange={(event) =>
                            setRfqForm((prev) => ({ ...prev, delivery_location: event.target.value }))
                          }
                          placeholder="e.g. Central Warehouse, Kolkata"
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500">
                        <span>Quotation Submission Deadline</span>
                        <input
                          type="date"
                          value={rfqForm.quote_deadline}
                          onChange={(event) => setRfqForm((prev) => ({ ...prev, quote_deadline: event.target.value }))}
                          min={getToday()}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-slate-500">
                        <span>Target Delivery Date</span>
                        <input
                          type="date"
                          value={rfqForm.expected_delivery_date}
                          onChange={(event) =>
                            setRfqForm((prev) => ({ ...prev, expected_delivery_date: event.target.value }))
                          }
                          min={rfqForm.quote_deadline || getToday()}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <div className="grid gap-2 text-xs md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="font-bold text-slate-700">Supplier Access & Shortlist</span>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                            {rfqForm.tender_type === "open"
                              ? "Optional for open tender"
                              : "Required for limited tender"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={setAllVendorsOption}
                            className={`rounded-xl border px-4 py-2 text-xs font-bold transition cursor-pointer ${rfqForm.tender_type === "open" && rfqForm.invited_vendors.length === 0
                              ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/5"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                          >
                            All Registered Suppliers
                          </button>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400">
                          Shortlist individual target vendors below. Keep "All Registered Suppliers" selected if you want any eligible supplier on the marketplace to bid.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 mt-1.5">
                          {vendorDirectory.map((vendor) => {
                            const selected = rfqForm.invited_vendors.some((item) => item.vendor_id === vendor.vendor_id)
                            return (
                              <button
                                key={vendor.vendor_id}
                                type="button"
                                onClick={() => handleVendorToggle(vendor.vendor_id)}
                                className={`rounded-xl border p-3 text-left text-xs transition cursor-pointer flex flex-col justify-between ${selected
                                  ? "border-blue-600 bg-blue-50/40 text-blue-700 shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                              >
                                <p className="font-bold text-slate-800">{vendor.vendor_name}</p>
                                <p className="text-[10px] opacity-75 font-semibold mt-0.5">@{vendor.vendor_username || `vendor_${vendor.vendor_id}`}</p>
                              </button>
                            )
                          })}
                        </div>
                        {rfqForm.invited_vendors.length > 0 ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2">
                            <p className="text-[9px] font-extrabold tracking-wider text-slate-455 uppercase">
                              Selected Shortlist ({rfqForm.invited_vendors.length})
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-700">
                              {rfqForm.invited_vendors.map((vendor) => vendor.vendor_name).join(", ")}
                            </p>
                          </div>
                        ) : null}
                        {rfqForm.tender_type === "limited" && vendorDirectory.length === 0 ? (
                          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 mt-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>No supplier listings are available yet. Limited shortlists require active suppliers.</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        onClick={handleSaveRfq}
                        disabled={submitting}
                        className="rounded-xl bg-blue-600 md:hover:bg-blue-700 px-5 py-3 text-xs font-bold text-white shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting
                          ? editingRfqId
                            ? "Saving..."
                            : "Publishing..."
                          : editingRfqId
                            ? "Save RFQ Changes"
                            : rfqForm.tender_type === "limited" && rfqForm.invited_vendors.length > 0
                              ? `Publish to ${rfqForm.invited_vendors.length} Vendor${rfqForm.invited_vendors.length > 1 ? "s" : ""}`
                              : "Publish Procurement Request"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingRfqId) {
                            cancelEditingRfq()
                          } else {
                            router.push(pathname)
                          }
                        }}
                        className="rounded-xl border border-slate-300 bg-white md:hover:bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {latestPublishedRfq ? (
                      <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/40 p-4 text-xs text-emerald-800">
                        <p className="font-bold flex items-center gap-1 text-emerald-900">
                          <CheckCircle className="h-4 w-4 text-emerald-650" />
                          <span>Latest Published RFQ</span>
                        </p>
                        <p className="mt-1 font-semibold">
                          RFQ #{latestPublishedRfq.id} for {latestPublishedRfq.quantity}{" "}
                          {latestPublishedRfq.product_type === "product" ? "units / equipment" : "service contracts"} has been
                          successfully posted.
                        </p>
                        <p className="mt-1 font-semibold">
                          Deadline: {formatDisplayDate(latestPublishedRfq.quote_deadline)} | Delivery target:{" "}
                          {formatDisplayDate(latestPublishedRfq.expected_delivery_date)}
                        </p>
                        {latestPublishedRfq.tender_document_url ? (
                          <div className="mt-2.5 flex flex-wrap gap-3">
                            <a
                              href={latestPublishedRfq.tender_document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-xs font-bold text-emerald-800 hover:underline"
                            >
                              View Tender Document
                            </a>
                            <a
                              href={latestPublishedRfq.tender_document_url}
                              download={latestPublishedRfq.tender_document_name || `rfq-${latestPublishedRfq.id}.pdf`}
                              className="inline-flex text-xs font-bold text-emerald-800 hover:underline"
                            >
                              Download Document
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ) : null}

              </section>

              {message && selectedRfqId === null ? (
                <section className="soft-panel rounded-[20px] p-4">
                  <p className="rounded-lg border border-[#d9e8ea] bg-[#f8fdff] px-3 py-2 text-sm text-[#355860]">
                    {message}
                  </p>
                </section>
              ) : null}

              {(() => {
                if (showCreateForm) {
                  return null
                }
                const selectedRfq = selectedRfqId !== null ? rfqs.find((r) => r.id === selectedRfqId) : null
                if (selectedRfqId !== null && selectedRfq) {
                  return (
                    <RfqDetailPage
                      selectedRfq={selectedRfq}
                      userRole={userRole as "buyer" | "supplier"}
                      username={username}
                      supplierCompanyName={supplierCompanyName || null}
                      supplierVendorProfile={supplierVendorProfile}
                      setSelectedRfqId={setSelectedRfqId}
                      openRejectQuotationModal={openRejectQuotationModal}
                      openDeleteRfqModal={openDeleteRfqModal}
                      handleReopenRfq={handleReopenRfq}
                      handleCloseRfq={handleCloseRfq}
                      startEditingRfq={startEditingRfq}
                      handleAwardQuotation={handleAwardQuotation}
                      submitting={submitting}
                      supplierCanQuote={supplierCanQuote}
                      activeQuoteRfqId={activeQuoteRfqId}
                      setActiveQuoteRfqId={setActiveQuoteRfqId}
                      quoteForm={quoteForm}
                      setQuoteForm={setQuoteForm}
                      emptyQuoteForm={emptyQuoteForm}
                      handleSubmitQuotation={handleSubmitQuotation}
                      matchingSupplierListings={matchingSupplierListings}
                      editingQuotationContext={editingQuotationContext}
                      editingMatchingSupplierListings={editingMatchingSupplierListings}
                      editingQuoteForm={editingQuoteForm}
                      setEditingQuoteForm={setEditingQuoteForm}
                      handleUpdateQuotation={handleUpdateQuotation}
                      cancelEditingQuotation={cancelEditingQuotation}
                      startEditingQuotation={startEditingQuotation}
                      message={message}
                      setMessage={setMessage}
                      orders={orders}
                    />
                  )
                }

                return (
                  <>
                    {/* Clean Header Section outside the card container */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 animate-fade-in-down">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black">
                          {userRole === "supplier" ? (
                            <>Tender Desk & <span className="text-blue-600">Bidding Opportunities</span></>
                          ) : (
                            <>My <span className="text-blue-600">Procurement RFQs</span></>
                          )}
                        </h1>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                          {userRole === "supplier" ? (
                            "Review buyer tender requirements, submit competitive quotes, and track bid awards."
                          ) : (
                            "Track vendor reach, quotation activity, and award decisions across active RFQs."
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
                          {loading ? "Loading..." : `${records.length} RFQs`}
                        </span>
                        {(userRole === "buyer" || userRole === "supplier") && !showCreateForm && (
                          <Link
                            href={userRole === "buyer" ? "/buyer/rfq?view=new" : "/supplier/rfq?view=new"}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 md:hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition duration-150 active:scale-95"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Create New RFQ</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Clean Filter Panel Card outside */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 animate-fade-in-down">
                      <div className="flex flex-col gap-4">
                        {/* Status tabs: Wrapped neatly to two lines/rows on mobile */}
                        <div className="flex flex-wrap gap-1.5">
                          {filterTabs.map((tab) => {
                            const isActive = requestFilter === tab.key
                            return (
                              <button
                                key={tab.key}
                                type="button"
                                onClick={() => setRequestFilter(tab.key)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${isActive
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                                    : "border border-slate-200 bg-white text-slate-500 md:hover:text-slate-800 md:hover:border-slate-300"
                                  }`}
                              >
                                {tab.label} <span className={`text-[10px] ml-0.5 ${isActive ? "text-blue-100" : "text-slate-400"}`}>({tab.count})</span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Segmented Tender Type Tabs, Search, and Sorting Row */}
                        <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr_auto] items-center pt-3.5 border-t border-slate-100">
                          {/* Segmented Tender Mode Selection */}
                          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl w-full lg:w-fit">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1.5">Format:</span>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { key: "all", label: "All" },
                                { key: "open", label: "Open Market" },
                                { key: "limited", label: "Limited" },
                              ].map((type) => {
                                const isActive = tenderTypeFilter === type.key
                                return (
                                  <button
                                    key={type.key}
                                    type="button"
                                    onClick={() => setTenderTypeFilter(type.key as any)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition duration-150 cursor-pointer ${isActive
                                        ? "bg-white text-blue-600 text-xs shadow-sm border border-slate-200/50"
                                        : "text-slate-500 md:hover:text-slate-800"
                                      }`}
                                  >
                                    {type.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Filter by Bidder Dropdown */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl w-full lg:w-fit">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1.5">Bidder:</span>
                            <select
                              value={supplierFilter}
                              onChange={(event) => setSupplierFilter(event.target.value)}
                              className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 transition cursor-pointer text-slate-700 max-w-[160px] truncate"
                            >
                              <option value="all">All Bidders</option>
                              {vendorDirectory.map((vendor) => (
                                <option key={vendor.vendor_id} value={vendor.vendor_id}>
                                  {vendor.vendor_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Search input field */}
                          <div className="relative w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              value={searchQuery}
                              onChange={(event) => setSearchQuery(event.target.value)}
                              placeholder="Search tender title, buyer company, description, delivery location..."
                              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 md:hover:bg-slate-100/50 focus:bg-white text-slate-800 transition duration-150 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          {/* Sorting options & Refresh button */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto justify-end">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <select
                                value={sortBy}
                                onChange={(event) =>
                                  setSortBy(
                                    event.target.value as "latest" | "oldest" | "budget_high" | "budget_low" | "deadline_nearest"
                                  )
                                }
                                className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 transition cursor-pointer text-slate-700 w-full sm:w-auto"
                              >
                                <option value="latest">Sort: Latest</option>
                                <option value="oldest">Sort: Oldest</option>
                                <option value="budget_high">Sort: Budget High to Low</option>
                                <option value="budget_low">Sort: Budget Low to High</option>
                                <option value="deadline_nearest">Sort: Nearest Deadline</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={refreshRfqs}
                              disabled={submitting}
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition duration-150 active:scale-[0.98] cursor-pointer w-full sm:w-auto"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${submitting ? "animate-spin" : ""}`} />
                              <span>Refresh</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cards List directly on the page layout container */}
                    <div className="mt-4 space-y-4">
                      {!loading && records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm text-center">
                          <Inbox className="h-10 w-10 text-slate-400" />
                          <h3 className="text-sm font-bold text-slate-800">No Procurement Requests</h3>
                          <p className="text-xs text-slate-400 max-w-xs leading-normal">We couldn't find any RFQs matching your search query or status filter.</p>
                        </div>
                      ) : null}

                      <div className="grid gap-4">
                        {records.map((rfq) => {
                          const statusTone =
                            rfq.status === "closed"
                              ? "bg-[#fff2f2] text-[#a53c3c]"
                              : rfq.status === "awarded"
                                ? "bg-[#eefaf2] text-[#0f7a54]"
                                : rfq.status === "under_review"
                                  ? "bg-[#edf4ff] text-[#2459c4]"
                                  : "bg-[#edf7f6] text-[#0f766e]"

                          const supplierQuote = findSupplierQuote(rfq)
                          const lowestQuote = getLowestBid(rfq.quotations)
                          const isL1 = lowestQuote && supplierQuote && supplierQuote.id === lowestQuote.id

                          return (
                            <article
                              id={`rfq-${rfq.id}`}
                              key={rfq.id}
                              className="rounded-2xl border bg-white p-4 sm:p-5 relative overflow-hidden transition-all duration-300 animate-fade-in-up border-slate-200 cursor-pointer md:hover:border-blue-300 md:hover:shadow-md flex flex-col md:flex-row justify-between gap-4"
                              onClick={() => setSelectedRfqId(rfq.id)}
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${rfq.product_type === "product"
                                      ? "bg-cyan-50 text-cyan-705 border-cyan-100"
                                      : "bg-purple-50 text-purple-705 border-purple-100"
                                    }`}>
                                    {rfq.product_type}
                                  </span>
                                  <h3 className="text-sm sm:text-base font-bold text-slate-805 tracking-tight truncate max-w-full sm:max-w-md">
                                    {rfq.title}
                                  </h3>
                                  <span className="rounded bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                                    {formatTenderType(rfq.tender_type)}
                                  </span>
                                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${statusTone}`}>
                                    {formatRfqStatus(rfq.status)}
                                  </span>
                                  {rfq.status === "open" && (
                                    <span className="rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-600 uppercase">
                                      {getRemainingTimeText(rfq.quote_deadline)}
                                    </span>
                                  )}
                                  {userRole === "supplier" && rfq.buyer_name !== username && (
                                    <>
                                      {supplierListings.some((item) => item.product_type === rfq.product_type) ? (
                                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-extrabold uppercase text-emerald-700 flex items-center gap-1 shadow-sm">
                                          <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600" />
                                          Eligible to Bid
                                        </span>
                                      ) : (
                                        <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-705 flex items-center gap-1 shadow-sm">
                                          <AlertCircle className="h-3 w-3 shrink-0 text-amber-605" />
                                          No Catalog Match
                                        </span>
                                      )}
                                    </>
                                  )}

                                </div>
                                <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                  {rfq.description}
                                </p>
                                <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="text-[11px]">Deadline: <strong className="text-slate-600">{formatDisplayDate(rfq.quote_deadline)}</strong></span>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="text-[11px]">Location: <strong className="text-slate-600 truncate max-w-[120px] inline-block align-bottom">{rfq.delivery_location}</strong></span>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="text-[11px] flex items-center gap-1">
                                      Buyer: <strong className="text-slate-600 truncate max-w-[100px] inline-block align-bottom">{rfq.buyer_company || rfq.buyer_name}</strong>
                                      {userRole === "supplier" && rfq.buyer_user_id && (
                                        <Link
                                          href={`/supplier/messages?partner_id=${rfq.buyer_user_id}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 md:hover:text-indigo-800 transition ml-1 px-1.5 py-0.2 bg-indigo-50 md:hover:bg-indigo-100 rounded align-middle shrink-0"
                                          title={`Chat with ${rfq.buyer_company || rfq.buyer_name}`}
                                        >
                                          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                          </svg>
                                          <span>Chat</span>
                                        </Link>
                                      )}
                                    </span>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="text-[11px]">Offers: <strong className="text-slate-600">{rfq.quotations.length} received</strong></span>
                                  </span>
                                  {rfq.status === "awarded" && rfq.awarded_order_id && (() => {
                                    const matchingOrder = orders.find(o => o.id === rfq.awarded_order_id);
                                    const orderStatus = matchingOrder ? orderStatusLabel(matchingOrder) : null;
                                    return (
                                      <span className="flex items-center gap-1.5">
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        <Link
                                          href={`/${userRole}/orders/${rfq.awarded_order_id}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:text-emerald-900 transition bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 px-2 py-0.5 rounded shadow-sm"
                                          title="View Linked Order Details"
                                        >
                                          Order: HL-ORD-{String(rfq.awarded_order_id).padStart(4, "0")}
                                          {orderStatus && ` (${orderStatus})`}
                                        </Link>
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t border-slate-100 md:border-none">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] font-mono font-bold text-slate-400">Reference #{rfq.id}</span>
                                  {userRole === "supplier" && rfq.buyer_name !== username && rfq.status === "open" && (
                                    <>
                                      {supplierQuote ? (
                                        isL1 ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-705">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            L1 Bid: ₹{supplierQuote.unit_price.toLocaleString()}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-705">
                                            Outbid: ₹{supplierQuote.unit_price.toLocaleString()}
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5">
                                          Not Quoted Yet
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {userRole === "supplier" && rfq.buyer_name !== username && rfq.status === "open" && !supplierQuote && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedRfqId(rfq.id)
                                        setActiveQuoteRfqId(rfq.id)
                                      }}
                                      className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-sm cursor-pointer"
                                    >
                                      Submit Bid
                                    </button>
                                  )}
                                  <div className="flex items-center justify-center w-full md:w-auto px-4 py-2.5 md:py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 md:hover:bg-blue-100 transition duration-150 text-xs md:text-[10px] font-bold md:font-black uppercase tracking-wider text-center active:scale-95 cursor-pointer">
                                    View Details &rarr;
                                  </div>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )
              })()}            </>
          )}
        </div>
        {deleteModal.open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,20,38,0.55)] px-4">
            <div className="w-full max-w-md rounded-2xl border border-[#f0d3d3] bg-white p-5 shadow-[0_18px_48px_rgba(17,24,39,0.25)]">
              <h3 className="text-lg font-bold text-[#0b1426]">Delete RFQ</h3>
              <p className="mt-2 text-sm text-[#4d6972]">
                This will permanently delete RFQ #{deleteModal.rfqId}. This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteRfqModal}
                  disabled={submitting}
                  className="rounded-xl border border-[#d3e4e7] bg-white px-4 py-2 text-sm font-semibold text-[#3a616b] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRfq}
                  disabled={submitting}
                  className="rounded-xl bg-[#b42318] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Deleting..." : "Delete RFQ"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {rejectModal.open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,20,38,0.55)] px-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#d9e6f2] bg-white p-5 shadow-[0_18px_48px_rgba(17,24,39,0.25)]">
              <h3 className="text-lg font-bold text-[#0b1426]">Reject Quotation</h3>
              <p className="mt-2 text-sm text-[#4d6972]">
                You are rejecting quotation #{rejectModal.quotationId} for RFQ #{rejectModal.rfqId}.
              </p>
              <label className="mt-4 grid gap-1 text-sm">
                <span className="font-semibold text-[#2f5560]">Reason (optional)</span>
                <textarea
                  rows={4}
                  value={rejectModal.reason}
                  onChange={(event) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Add reason for supplier reference."
                  className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 outline-none transition focus:border-[#b42318]"
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRejectQuotationModal}
                  disabled={submitting}
                  className="rounded-xl border border-[#d3e4e7] bg-white px-4 py-2 text-sm font-semibold text-[#3a616b] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectQuotation}
                  disabled={submitting}
                  className="rounded-xl bg-[#b42318] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Rejecting..." : "Reject Quote"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <style jsx>{`
        .rfq-experience-page {
          position: relative;
          overflow: hidden;
        }

        .rfq-experience-page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(15, 79, 182, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 79, 182, 0.035) 1px, transparent 1px),
            radial-gradient(circle at 82% 18%, rgba(15, 79, 182, 0.08), transparent 28%),
            radial-gradient(circle at 8% 82%, rgba(29, 114, 255, 0.06), transparent 30%);
          background-size:
            42px 42px,
            42px 42px,
            auto,
            auto;
          animation: rfq-grid-drift 18s linear infinite;
        }

        .rfq-experience-page :global(.soft-panel) {
          position: relative;
          overflow: hidden;
          transform: translateZ(0);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.07);
          animation: rfq-panel-rise 420ms ease both;
        }

        .rfq-experience-page :global(.soft-panel::before),
        .rfq-record-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(110deg, transparent 0%, rgba(15, 79, 182, 0.045) 45%, transparent 74%);
          opacity: 0;
          transform: translateX(-45%);
          transition:
            opacity 220ms ease,
            transform 760ms ease;
        }

        .rfq-experience-page :global(.soft-panel:hover::before),
        .rfq-record-card:hover::before {
          opacity: 1;
          transform: translateX(45%);
        }

        .rfq-record-card {
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.045);
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease;
          animation: rfq-panel-rise 460ms ease both;
        }

        .rfq-record-card:hover {
          transform: translateY(-3px);
          border-color: rgba(15, 79, 182, 0.24);
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.1);
        }

        .rfq-record-card :global(button:first-child) {
          position: relative;
          z-index: 1;
        }

        .rfq-record-card :global(button:first-child::after) {
          content: "";
          position: absolute;
          right: 0;
          bottom: -10px;
          left: 0;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(15, 79, 182, 0.42), transparent);
          opacity: 0;
          transform: scaleX(0.35);
          transition:
            opacity 220ms ease,
            transform 300ms ease;
        }

        .rfq-record-card:hover :global(button:first-child::after) {
          opacity: 1;
          transform: scaleX(1);
        }

        .rfq-experience-page :global(input),
        .rfq-experience-page :global(select),
        .rfq-experience-page :global(textarea) {
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease,
            background-color 180ms ease;
        }

        .rfq-experience-page :global(input:focus),
        .rfq-experience-page :global(select:focus),
        .rfq-experience-page :global(textarea:focus) {
          transform: translateY(-1px);
          box-shadow: 0 0 0 4px rgba(15, 79, 182, 0.08);
        }

        .rfq-experience-page :global(.blue-btn),
        .rfq-experience-page :global(button),
        .rfq-experience-page :global(a) {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background-color 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
        }

        .rfq-experience-page :global(button:hover),
        .rfq-experience-page :global(a:hover) {
          transform: translateY(-1px);
        }

        .rfq-experience-page :global(table tbody tr) {
          transition:
            background-color 160ms ease,
            transform 160ms ease;
        }

        .rfq-experience-page :global(table tbody tr:hover) {
          transform: translateX(2px);
          background-color: rgba(248, 251, 255, 0.92);
        }

        .rfq-experience-page :global(.rounded-full) {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .rfq-record-card:hover :global(.rounded-full) {
          transform: translateY(-1px);
        }

        @keyframes rfq-grid-drift {
          from {
            background-position:
              0 0,
              0 0,
              0 0,
              0 0;
          }
          to {
            background-position:
              42px 42px,
              42px 42px,
              0 0,
              0 0;
          }
        }

        @keyframes rfq-panel-rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </main>
      {isBuyerRoute ? <BuyerFooter /> : isSupplierRoute ? <SupplierFooter /> : null}
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[#e0e8f8] bg-[#f8faff] px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-[#5b6b85] uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0b1426]">{value}</p>
    </div>
  )
}

function InfoPillIcon({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
      <div className="shrink-0 p-1.5 bg-slate-50 border border-slate-100 rounded-lg">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold text-slate-405 uppercase tracking-wider truncate">{label}</p>
        <p className="mt-0.5 text-xs font-extrabold text-slate-700 truncate">{value}</p>
      </div>
    </div>
  )
}





