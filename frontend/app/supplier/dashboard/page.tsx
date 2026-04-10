"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import SupplierSidebar from "@/components/supplier/SupplierSidebar"
import SupplierDashboardHeader from "@/components/supplier/SupplierDashboardHeader"
import {
  clearToken,
  getApiErrorMessage,
  getCurrentUser,
  getOrders,
  getProducts,
  getRfqs,
  isAuthSessionError,
  logoutUser,
  submitQuotation,
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

function Icon({
  type,
  className,
}: {
  type: "search" | "bell" | "history" | "download" | "trend" | "award" | "bid" | "truck" | "invoice" | "rfq" | "alert" | "catalog"
  className: string
}) {
  if (type === "search") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  if (type === "bell") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
  if (type === "history") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>
  if (type === "download") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
  if (type === "trend") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="m7 14 3-3 3 2 5-6" /></svg>
  if (type === "award") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="5" /><path d="m8.21 13.89-1.42 6.11L12 17l5.21 3-1.42-6.12" /></svg>
  if (type === "bid") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 17h10l4-4V3H3v10l4 4Z" /><path d="M8 8h8" /><path d="M8 12h5" /></svg>
  if (type === "truck") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 17h4" /><path d="M3 7h13v10H3z" /><path d="M16 10h3l2 3v4h-5z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></svg>
  if (type === "invoice") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h4" /></svg>
  if (type === "rfq") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z" /><path d="M9 8h6" /><path d="M9 12h6" /></svg>
  if (type === "alert") return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 6v12" /><path d="M6 12h12" /><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
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

const orderStatusLabel = (order?: VendorOrder | null) => {
  if (!order) return "No active order"
  if (order.status === "cancelled") return "Cancelled"
  if (order.status === "completed" || order.status === "goods_received" || order.delivery_status === "delivered") return "Delivered"
  if (order.status === "shipped" || order.status === "delivered" || order.delivery_status === "in_transit" || order.delivery_status === "out_for_delivery") return "Shipped"
  if (order.status === "processing" || order.status === "ready_to_dispatch" || order.status === "po_accepted" || order.delivery_status === "loaded") return "Processing"
  return "Order Placed"
}

const orderStatusDetail = (order?: VendorOrder | null) => {
  if (!order) return "New purchase orders will appear here."
  if (order.tracking_note) return order.tracking_note
  return `Payment ${order.payment_status.replaceAll("_", " ")}`
}

export default function SupplierDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [rfqs, setRfqs] = useState<VendorRfq[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchText, setSearchText] = useState("")
  const [focusId, setFocusId] = useState<number | null>(null)
  const [activeQuoteRfqId, setActiveQuoteRfqId] = useState<number | null>(null)
  const [quoteForm, setQuoteForm] = useState<VendorQuotationInput>(emptyQuoteForm)
  const [quoteMessage, setQuoteMessage] = useState("")
  const [submittingQuote, setSubmittingQuote] = useState(false)
  const deferredSearch = useDeferredValue(searchText)

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
        setUser(me)
        const [productData, orderData, rfqData] = await Promise.all([getProducts(), getOrders(), getRfqs()])
        setProducts(productData)
        setOrders(orderData)
        setRfqs(rfqData)
      } catch (loadError) {
        if (isAuthSessionError(loadError)) {
          clearToken()
          setError("Your supplier session expired. Please login again.")
          router.push("/login?next=%2Fsupplier%2Fdashboard")
          return
        }
        setError("Could not load your supplier dashboard right now. Check the backend and try again.")
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
        .filter((rfq) => (rfq.status === "open" || rfq.status === "under_review") && !respondedIds.has(rfq.id))
        .map((rfq) => ({ rfq, matches: opportunityMatches(rfq, supplierProducts) }))
        .sort((left, right) => new Date(left.rfq.quote_deadline).getTime() - new Date(right.rfq.quote_deadline).getTime()),
    [respondedIds, supplierProducts, visibleRfqs]
  )

  const totalRevenue = useMemo(() => orders.reduce((sum, order) => sum + toNumber(order.total_amount), 0), [orders])
  const activeBids = useMemo(() => bidRows.filter((item) => item.quote.status !== "rejected"), [bidRows])


  const query = deferredSearch.trim().toLowerCase()
  const shownOpportunities = useMemo(() => (query ? opportunities.filter((item) => [item.rfq.title, item.rfq.buyer_company || item.rfq.buyer_name, item.rfq.delivery_location].join(" ").toLowerCase().includes(query)) : opportunities), [opportunities, query])
  const shownBids = useMemo(() => (query ? activeBids.filter((item) => [item.rfq.title, item.rfq.buyer_company || item.rfq.buyer_name, rfqId(item.rfq.id)].join(" ").toLowerCase().includes(query)) : activeBids), [activeBids, query])
  const pendingShipments = useMemo(
    () => orders.filter((order) => !["completed", "cancelled", "goods_received"].includes(order.status) && order.delivery_status !== "delivered"),
    [orders]
  )
  const currentOrder = useMemo(
    () =>
      [...orders]
        .filter((order) => order.status !== "cancelled")
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0] ?? null,
    [orders]
  )
  const currentOrderStage = orderStageIndex(currentOrder)
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
      setQuoteMessage("Add an active listing before submitting a quote for this RFQ.")
      return
    }

    if (!quoteForm.product_id) {
      setQuoteMessage("Select a listing for this quotation.")
      return
    }

    if (quoteForm.unit_price <= 0 || quoteForm.lead_time_days <= 0 || quoteForm.validity_days <= 0) {
      setQuoteMessage("Enter valid quote amount, lead time, and validity days.")
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
      setQuoteMessage(getApiErrorMessage(submitError, "Could not submit quotation right now."))
    } finally {
      setSubmittingQuote(false)
    }
  }


  if (loading) return <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]"><div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/80 p-8 text-sm font-semibold text-[#617084] shadow-[0_25px_60px_rgba(15,23,42,0.08)]">Loading supplier command center...</div></main>

  if (!user) return <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]"><div className="mx-auto max-w-3xl rounded-[2rem] border border-[#ffd7d7] bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)]"><h1 className="font-[family-name:var(--font-display)] text-3xl font-black">Supplier session unavailable</h1><p className="mt-4 text-sm leading-7 text-[#7a8698]">{error || "Your dashboard could not be opened."}</p><Link href="/login?next=%2Fsupplier%2Fdashboard" className="mt-6 inline-flex rounded-2xl bg-[#0f4fb6] px-5 py-3 text-sm font-bold text-white">Return to Login</Link></div></main>

  return (
    <div
      className="supplier-dashboard-root min-h-screen bg-[#f7f9fb] text-[#191c1e]"
      style={{
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(0,86,210,0.04) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(213,227,252,0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(178,197,255,0.08) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(242,244,246,0.08) 0px, transparent 45%)",
      }}
    >
      <SupplierDashboardHeader user={user} rfqs={rfqs} products={products} />
      <SupplierSidebar active="dashboard" username={user.username} onSignOut={signOut} />

      <main className="px-4 py-8 pb-24 sm:px-6 lg:pl-[calc(18rem+2.5rem)] lg:pr-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[1.15rem] border border-[#e5e9f0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-[#eef4ff] p-3 text-[#0f4fb6]"><Icon type="invoice" className="h-6 w-6" /></span>
                <div>
                  <p className="text-sm font-bold text-[#475569]">Total Orders</p>
                  <p className="mt-1 text-3xl font-black text-[#0f172a]">{orders.length}</p>
                </div>
              </div>
            </article>
            <article className="rounded-[1.15rem] border border-[#e5e9f0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-[#eef4ff] p-3 text-[#0f4fb6]"><Icon type="search" className="h-6 w-6" /></span>
                <div>
                  <p className="text-sm font-bold text-[#475569]">Active RFQs</p>
                  <p className="mt-1 text-3xl font-black text-[#0f172a]">{shownOpportunities.length}</p>
                </div>
              </div>
            </article>
            <article className="rounded-[1.15rem] border border-[#e5e9f0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-[#eef4ff] p-3 text-[#0f4fb6]"><Icon type="truck" className="h-6 w-6" /></span>
                <div>
                  <p className="text-sm font-bold text-[#475569]">Pending Shipments</p>
                  <p className="mt-1 text-3xl font-black text-[#0f172a]">{pendingShipments.length}</p>
                </div>
              </div>
            </article>
            <article className="rounded-[1.15rem] border border-[#e5e9f0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-[#eef4ff] p-3 text-[#0f4fb6]"><Icon type="trend" className="h-6 w-6" /></span>
                <div>
                  <p className="text-sm font-bold text-[#475569]">Revenue</p>
                  <p className="mt-1 text-3xl font-black text-[#0f172a]">{compactMoney(totalRevenue)}</p>
                </div>
              </div>
            </article>
          </section>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
              <article className="overflow-hidden rounded-[1.15rem] border border-[#e5e9f0] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="px-5 py-5">
                  <h2 className="text-xl font-black text-[#0f172a]">Recent RFQs for You</h2>
                </div>
                <div className="overflow-x-auto px-5 pb-5">
                  <table className="min-w-full overflow-hidden rounded-xl text-left">
                    <thead className="bg-[#f6f8fb]">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-[#94a3b8]">Facility Name</th>
                        <th className="px-4 py-3 text-xs font-black text-[#94a3b8]">Requirements</th>
                        <th className="px-4 py-3 text-xs font-black text-[#94a3b8]">Due Date</th>
                        <th className="px-4 py-3 text-xs font-black text-[#94a3b8]">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-black text-[#94a3b8]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2f2] text-sm">
                      {shownOpportunities.slice(0, 5).map((item) => (
                        <tr
                          key={item.rfq.id}
                          id={`opportunity-${item.rfq.id}`}
                          className={`transition hover:bg-[#fbfcff] ${focusId === item.rfq.id ? "bg-[#eef4ff] ring-2 ring-[#0f4fb6]" : ""}`}
                        >
                          <td className="px-4 py-3 font-bold text-[#0f172a]">{item.rfq.buyer_company || item.rfq.buyer_name}</td>
                          <td className="px-4 py-3 text-[#0f172a]">
                            <p className="font-semibold">{item.rfq.title}</p>
                            <p className="mt-1 text-xs text-[#64748b]">
                              {item.matches.length > 0 ? item.matches.map((listing) => listing.name).join(", ") : "No direct catalog match yet"}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#0f172a]">{shortDate(item.rfq.quote_deadline)}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-[#dbe8ff] px-3 py-1 text-xs font-black text-[#0f4fb6]">Live</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openQuoteModal(item.rfq.id)}
                              className="rounded-lg bg-[#0f4fb6] px-4 py-2 text-xs font-black text-[#ffffff] transition hover:bg-[#0d4299]"
                            >
                              Submit Quote
                            </button>
                          </td>
                        </tr>
                      ))}
                      {shownOpportunities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#64748b]">No live RFQs available right now.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-[1.15rem] border border-[#e5e9f0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <h2 className="text-xl font-black text-[#0f172a]">Current Order Status</h2>
                <div className="mt-5 rounded-xl bg-[#f6f8fb] px-4 py-3">
                  <p className="text-xs font-black text-[#475569]">Order #{currentOrder ? `ORD-${currentOrder.id}` : "None"}</p>
                </div>
                <div className="mt-7">
                  <div className="relative px-1 pt-14">
                    <div
                      className="order-truck absolute top-0 z-20 flex items-center justify-center rounded-xl border border-[#c9d9ff] bg-[#dbe8ff] px-2 py-1 text-[#0f4fb6] shadow-[0_12px_28px_rgba(15,79,182,0.22)] transition-[left,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        left: `${currentOrderStage * 33.333}%`,
                        transform:
                          currentOrderStage === 0
                            ? "translateX(0)"
                            : currentOrderStage === 3
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                      }}
                      aria-label={`Current stage: ${orderStatusLabel(currentOrder)}`}
                    >
                      <Icon type="truck" className="h-7 w-7" />
                    </div>
                    <div className="relative flex items-start justify-between">
                      <div className="order-road-track absolute left-4 right-4 top-4 h-2 rounded-full" />
                      <div className="order-road-progress absolute left-4 top-4 h-2 rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${currentOrderStage * 33}%` }} />
                      {["Order Placed", "Processing", "Shipped", "Delivered"].map((label, index) => (
                        <div key={label} className="relative z-10 flex w-16 flex-col items-center text-center">
                          <span className={`order-stage-dot flex h-8 w-8 items-center justify-center rounded-full border-4 border-white ${index <= currentOrderStage ? "is-active bg-[#0f4fb6] text-white" : "bg-[#e5e9f0] text-[#94a3b8]"}`}>
                            {index === currentOrderStage ? (
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="m6 12 4 4 8-8" />
                              </svg>
                            ) : null}
                          </span>
                          <span className="mt-2 text-xs font-semibold leading-4 text-[#0f172a]">{label}</span>
                          {index === currentOrderStage ? (
                            <span className="mt-1 text-xs font-bold leading-4 text-[#0f4fb6]">{orderStatusLabel(currentOrder)}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 rounded-xl border border-[#e5e9f0] bg-[#fbfcff] p-4 text-center">
                    <p className="font-black text-[#0f4fb6]">{orderStatusLabel(currentOrder)}</p>
                    <p className="mt-1 text-sm leading-6 text-[#64748b]">{orderStatusDetail(currentOrder)}</p>
                    {currentOrder ? <p className="mt-2 text-xs font-semibold text-[#64748b]">Updated {shortDate(currentOrder.goods_received_at || currentOrder.delivered_at || currentOrder.shipped_at || currentOrder.created_at)}</p> : null}
                  </div>
                </div>
              </article>

          </section>

          <section className="mt-5">
              <article id="bid-tracker" className="rounded-[1.15rem] border border-[#e5e9f0] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-[#eef4ff] p-2 text-[#0f4fb6]"><Icon type="bid" className="h-4 w-4" /></div>
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-black text-[#0f172a]">Active Bid Tracker</h2>
                    <p className="text-xs font-medium text-[#94a3b8]">Monitor submitted quotations, buyer review stage, and award readiness.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {shownBids.slice(0, 3).map((item) => {
                    const state = bidStatus(item.rfq, item.quote)
                    return (
                      <div key={`${item.rfq.id}-${item.quote.id}`} className={`flex flex-col gap-4 rounded-xl border-l-4 bg-[#fbfcff] p-4 md:flex-row md:items-center md:justify-between ${state.border}`}>
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-[#0f4fb6] shadow-sm">Q-{String(item.quote.id).padStart(2, "0")}</div>
                          <div>
                            <p className="text-sm font-bold text-[#0f172a]">{rfqId(item.rfq.id)} | {item.rfq.title}</p>
                            <p className="text-xs text-[#94a3b8]">Buyer: {item.rfq.buyer_company || item.rfq.buyer_name}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-5 md:gap-8">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Bid Amount</p>
                            <p className="font-bold text-[#0f172a]">{money(item.quote.unit_price)}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${state.chip}`}>{state.label}</span>
                          <Link href="/supplier/rfq" className="text-sm font-bold text-[#0f4fb6] hover:underline">View Details</Link>
                        </div>
                      </div>
                    )
                  })}
                  {shownBids.length === 0 ? <div className="rounded-[1.25rem] border border-dashed border-[#dbe4ef] bg-[#f8fafc] px-5 py-8 text-sm text-[#64748b]">No active bids matched your current search. Open the RFQ desk to respond to new opportunities.</div> : null}
                </div>
              </article>
          </section>
        </div>
      </main>
      {activeQuoteRfq ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(8,24,56,0.58)] px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6"
          onClick={closeQuoteModal}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="quote-modal-shell grid h-[min(92vh,920px)] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] lg:grid-cols-[1.08fr_0.92fr]"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="min-h-0 overflow-y-auto bg-white p-6 pb-10 sm:p-8 sm:pb-12">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0f4fb6]">Selected RFQ</p>
                  <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#0f172a]">{activeQuoteRfq.rfq.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#64748b]">{activeQuoteRfq.rfq.description || "No additional RFQ description was provided."}</p>
                </div>
                <button
                  type="button"
                  onClick={closeQuoteModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe4ef] text-[#475569] transition hover:bg-[#f8fafc]"
                  aria-label="Close quote popup"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <QuoteInfoCard label="Buyer" value={activeQuoteRfq.rfq.buyer_company || activeQuoteRfq.rfq.buyer_name} />
                <QuoteInfoCard label="RFQ ID" value={rfqId(activeQuoteRfq.rfq.id)} />
                <QuoteInfoCard label="Quantity" value={`${activeQuoteRfq.rfq.quantity}`} />
                <QuoteInfoCard label="Type" value={activeQuoteRfq.rfq.product_type === "service" ? "Service" : "Product"} />
                <QuoteInfoCard label="Due Date" value={longDate(activeQuoteRfq.rfq.quote_deadline)} />
                <QuoteInfoCard label="Delivery" value={longDate(activeQuoteRfq.rfq.expected_delivery_date)} />
                <QuoteInfoCard label="Location" value={activeQuoteRfq.rfq.delivery_location} />
                <QuoteInfoCard label="Budget" value={activeQuoteRfq.rfq.target_budget > 0 ? money(activeQuoteRfq.rfq.target_budget) : "Not specified"} />
              </div>

              <div className="mt-6 rounded-[1.4rem] border border-[#e6edf7] bg-[#f8fbff] p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7b8798]">Catalog Match</p>
                <div className="mt-3 space-y-3">
                  {activeQuoteRfq.matches.length > 0 ? activeQuoteRfq.matches.map((listing) => (
                    <div key={listing.id} className="rounded-[1rem] border border-[#dbe8ff] bg-white px-4 py-3">
                      <p className="font-bold text-[#0f172a]">{listing.name}</p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        INR {Number(listing.price).toLocaleString("en-IN")} | Stock {listing.stock}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-[#64748b]">No direct catalog match yet, but you can still quote using any active listing of the same type.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#0f4fb6_0%,#0b3d8a_100%)] text-white">
              <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-28 sm:p-8 sm:pb-32">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/72">Submit Quote</p>
                <h3 className="mt-3 text-3xl font-black tracking-[-0.04em]">Quote This RFQ</h3>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Review the request on the left and submit your commercial response here.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <label className="grid gap-2 text-sm">
                  <span className="font-bold text-white">Your Listing</span>
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
                    className="rounded-[1rem] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none backdrop-blur placeholder:text-white/50"
                  >
                    <option value={0} className="text-[#0f172a]">Choose active listing</option>
                    {quoteListingOptions.map((listing) => (
                      <option key={listing.id} value={listing.id} className="text-[#0f172a]">
                        {listing.name} | INR {Number(listing.price).toLocaleString("en-IN")} | Stock {listing.stock}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-bold text-white">Unit Price</span>
                    <input
                      type="number"
                      min={0}
                      value={quoteForm.unit_price}
                      onChange={(event) => setQuoteForm((prev) => ({ ...prev, unit_price: Number(event.target.value) }))}
                      className="rounded-[1rem] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/50"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-bold text-white">Lead Time (days)</span>
                    <input
                      type="number"
                      min={1}
                      value={quoteForm.lead_time_days}
                      onChange={(event) => setQuoteForm((prev) => ({ ...prev, lead_time_days: Number(event.target.value) }))}
                      className="rounded-[1rem] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/50"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="font-bold text-white">Validity (days)</span>
                  <input
                    type="number"
                    min={1}
                    value={quoteForm.validity_days}
                    onChange={(event) => setQuoteForm((prev) => ({ ...prev, validity_days: Number(event.target.value) }))}
                    className="rounded-[1rem] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/50"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-bold text-white">Commercial Notes</span>
                  <textarea
                    rows={5}
                    value={quoteForm.notes}
                    onChange={(event) => setQuoteForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Warranty, delivery notes, installation support, payment terms."
                    className="rounded-[1rem] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/50"
                  />
                </label>

                {quoteMessage ? (
                  <p className="rounded-[1rem] border border-white/18 bg-white/12 px-4 py-3 text-sm text-white">{quoteMessage}</p>
                ) : null}

                {!quoteListingOptions.length ? (
                  <p className="rounded-[1rem] border border-white/18 bg-white/12 px-4 py-3 text-sm text-white/88">
                    You need at least one active {activeQuoteRfq.rfq.product_type} listing before sending a quotation.
                  </p>
                ) : null}
              </div>
              </div>
              <div className="sticky bottom-0 border-t border-white/14 bg-[rgba(7,30,76,0.72)] px-6 py-4 backdrop-blur sm:px-8">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitQuote}
                    disabled={submittingQuote || !quoteListingOptions.length}
                    className="rounded-[1rem] bg-white px-5 py-3 text-sm font-black text-[#0f4fb6] shadow-[0_16px_36px_rgba(10,23,55,0.16)] transition hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingQuote ? "Submitting..." : "Submit Final Quote"}
                  </button>
                  <button
                    type="button"
                    onClick={closeQuoteModal}
                    disabled={submittingQuote}
                    className="rounded-[1rem] border border-white/24 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/14 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        .quote-modal-shell {
          animation: quote-modal-rise 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .supplier-dashboard-root :global(main article) {
          position: relative;
          overflow: hidden;
          transition:
            transform 240ms ease,
            box-shadow 240ms ease,
            border-color 240ms ease;
        }

        .supplier-dashboard-root :global(main article::before) {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(120deg, transparent 0%, rgba(15, 79, 182, 0.05) 45%, transparent 72%);
          opacity: 0;
          transform: translateX(-35%);
          transition:
            opacity 240ms ease,
            transform 700ms ease;
        }

        .supplier-dashboard-root :global(main article:hover) {
          transform: translateY(-2px);
          border-color: rgba(15, 79, 182, 0.18);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .supplier-dashboard-root :global(main article:hover::before) {
          opacity: 1;
          transform: translateX(35%);
        }

        .supplier-dashboard-root :global(tbody tr) {
          transition:
            background-color 180ms ease,
            transform 180ms ease;
        }

        .supplier-dashboard-root :global(tbody tr:hover) {
          transform: translateX(2px);
        }

        .order-road-track {
          background:
            repeating-linear-gradient(
              90deg,
              #d9e2f1 0 18px,
              transparent 18px 28px
            ),
            linear-gradient(90deg, #e8eef7, #dbe4ef);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
          animation: road-flow 900ms linear infinite;
        }

        .order-road-progress {
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.35) 0 14px,
              transparent 14px 24px
            ),
            linear-gradient(90deg, #0f4fb6, #1d72ff);
          box-shadow: 0 0 18px rgba(15, 79, 182, 0.26);
          animation: road-flow 720ms linear infinite;
        }

        .order-truck {
          animation: truck-bob 720ms ease-in-out infinite;
        }

        .order-truck::after {
          content: "";
          position: absolute;
          left: -10px;
          top: 50%;
          width: 7px;
          height: 4px;
          border-radius: 999px;
          background: rgba(15, 79, 182, 0.18);
          transform: translateY(-50%);
          animation: exhaust-puff 850ms ease-out infinite;
        }

        .order-stage-dot.is-active {
          animation: checkpoint-pulse 1.6s ease-in-out infinite;
          box-shadow: 0 0 0 6px rgba(15, 79, 182, 0.08);
        }

        @keyframes road-flow {
          from {
            background-position: 0 0, 0 0;
          }
          to {
            background-position: 28px 0, 0 0;
          }
        }

        @keyframes truck-bob {
          0%,
          100% {
            margin-top: 0;
          }
          50% {
            margin-top: -2px;
          }
        }

        @keyframes exhaust-puff {
          0% {
            opacity: 0.6;
            transform: translate(0, -50%) scale(0.7);
          }
          100% {
            opacity: 0;
            transform: translate(-14px, -50%) scale(1.5);
          }
        }

        @keyframes checkpoint-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 5px rgba(15, 79, 182, 0.08);
          }
          50% {
            box-shadow: 0 0 0 9px rgba(15, 79, 182, 0.14);
          }
        }

        @keyframes quote-modal-rise {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

function QuoteInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[#e5ebf3] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a97aa]">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#0f172a]">{value}</p>
    </div>
  )
}

