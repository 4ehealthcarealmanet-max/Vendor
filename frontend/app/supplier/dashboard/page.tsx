"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import SupplierSidebar from "@/components/supplier/SupplierSidebar"
import SupplierDashboardHeader from "@/components/supplier/SupplierDashboardHeader"
import {
  clearToken,
  getCurrentUser,
  getOrders,
  getProducts,
  getRfqs,
  isAuthSessionError,
  logoutUser,
} from "@/services"
import type { AuthUser, VendorOrder, VendorProductService, VendorQuotation, VendorRfq } from "@/services"

type Opportunity = { rfq: VendorRfq; matches: VendorProductService[] }
type BidRow = { rfq: VendorRfq; quote: VendorQuotation }
type FeedItem = {
  id: string
  title: string
  detail: string
  timestamp: string
  tone: "blue" | "amber" | "slate"
  icon: "rfq" | "bid" | "award" | "alert" | "catalog"
}

function KpiCard({
  label,
  value,
  hint,
  trend,
  tone,
  icon,
}: {
  label: string
  value: string
  hint: string
  trend: number[]
  tone: "blue" | "amber" | "slate"
  icon: "trend" | "award" | "bid" | "truck" | "invoice"
}) {
  return (
    <article className="group rounded-[1.6rem] border border-white/80 bg-white/90 p-5 shadow-[0_15px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#98a2b3]">{label}</p>
        <span className={`rounded-xl p-2 ${tone === "blue" ? "bg-[#eef4ff] text-[#0f4fb6]" : tone === "amber" ? "bg-[#fff1e8] text-[#a93802]" : "bg-[#edf1f6] text-[#475569]"}`}>
          <Icon type={icon} className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4">
        <h3 className="font-[family-name:var(--font-display)] text-3xl font-black tracking-[-0.04em] text-[#0f172a]">{value}</h3>
        <p className="mt-1 text-xs font-semibold text-[#64748b]">{hint}</p>
      </div>
      <div className="mt-4 flex h-9 items-end gap-1">
        {trend.map((height, index) => (
          <span key={`${label}-${index}-${height}`} className={`block w-full rounded-t-sm ${tone === "blue" ? "bg-[#0f4fb6]/18 group-hover:bg-[#0f4fb6]/30" : tone === "amber" ? "bg-[#f59e0b]/18 group-hover:bg-[#f59e0b]/30" : "bg-[#475569]/18 group-hover:bg-[#475569]/30"}`} style={{ height: `${height}%` }} />
        ))}
      </div>
    </article>
  )
}

function SignalRow({ item }: { item: FeedItem }) {
  const bg = item.tone === "blue" ? "bg-[#eef4ff] text-[#0f4fb6]" : item.tone === "amber" ? "bg-[#fff1e8] text-[#a93802]" : "bg-[#edf1f6] text-[#475569]"
  return (
    <div className="flex gap-4">
      <span className={`shrink-0 rounded-xl p-2 ${bg}`}>
        <Icon type={item.icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#0f172a]">{item.title}</p>
        <p className="mt-1 text-xs text-[#94a3b8]">{relativeTime(item.timestamp)} | {item.detail}</p>
      </div>
    </div>
  )
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

const relativeTime = (value?: string | null) => {
  if (!value) return "Just now"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const minutes = Math.round((parsed.getTime() - Date.now()) / 60_000)
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour")
  return formatter.format(Math.round(hours / 24), "day")
}

const initials = (value?: string | null) => {
  const cleaned = (value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase()
  return cleaned || "SP"
}

const rfqId = (id: number) => `RFQ-${new Date().getFullYear()}-${String(id).padStart(3, "0")}`

const matchesTitle = (rfqTitle: string, listingName: string) => {
  const title = rfqTitle.trim().toLowerCase()
  const listing = listingName.trim().toLowerCase()
  return Boolean(title && listing && (title.includes(listing) || listing.includes(title)))
}

const deadlineLabel = (value: string) => {
  if (!value) return "Not set"
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return value
  const diff = deadline.getTime() - Date.now()
  if (diff <= 0) return "Closed"
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const days = Math.floor(diff / 86_400_000)
  if (hours < 24) return `${hours}h ${minutes}m`
  if (days < 7) return `${days} days`
  return shortDate(value)
}

const spark = (values: number[], fallback: number[]) => {
  const source = values.length > 0 ? values : fallback
  const max = Math.max(...source, 1)
  return source.map((value) => Math.min(100, Math.max(18, Math.round((value / max) * 68) + 24)))
}

const monthlyRevenue = (orders: VendorOrder[]) =>
  Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    const key = `${date.getFullYear()}-${date.getMonth()}`
    return {
      key,
      label: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
      total: orders.reduce((sum, order) => {
        const created = new Date(order.created_at)
        return `${created.getFullYear()}-${created.getMonth()}` === key ? sum + toNumber(order.total_amount) : sum
      }, 0),
    }
  })

const fulfillmentDays = (order: VendorOrder) => {
  const endAt = order.goods_received_at || order.delivered_at
  if (!endAt) return null
  const start = new Date(order.created_at).getTime()
  const end = new Date(endAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return (end - start) / 86_400_000
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
      router.push("/login")
    }
  }

  const supplierProducts = useMemo(
    () => products.filter((item) => item.vendor_username?.trim().toLowerCase() === (user?.username ?? "").trim().toLowerCase()),
    [products, user?.username]
  )

  const stockReady = useMemo(() => supplierProducts.filter((item) => item.is_active && item.stock > 0), [supplierProducts])
  const lowStock = useMemo(() => stockReady.filter((item) => item.stock <= 10), [stockReady])
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
        .filter((item) => item.matches.length > 0)
        .sort((left, right) => new Date(left.rfq.quote_deadline).getTime() - new Date(right.rfq.quote_deadline).getTime()),
    [respondedIds, supplierProducts, visibleRfqs]
  )

  const totalRevenue = useMemo(() => orders.reduce((sum, order) => sum + toNumber(order.total_amount), 0), [orders])
  const wonBids = useMemo(() => bidRows.filter((item) => item.quote.status === "awarded" || item.rfq.awarded_quote_id === item.quote.id), [bidRows])
  const activeBids = useMemo(() => bidRows.filter((item) => item.quote.status !== "rejected"), [bidRows])
  const pendingReview = useMemo(() => activeBids.filter((item) => item.rfq.status === "under_review").length, [activeBids])
  const outstandingOrders = useMemo(() => orders.filter((order) => order.payment_status !== "paid"), [orders])
  const outstandingAmount = useMemo(() => outstandingOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0), [outstandingOrders])
  const completedDurations = useMemo(() => orders.map((order) => fulfillmentDays(order)).filter((value): value is number => value !== null), [orders])
  const avgFulfillment = useMemo(() => (completedDurations.length > 0 ? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length : 0), [completedDurations])
  const winRate = bidRows.length === 0 ? 0 : Math.round((wonBids.length / bidRows.length) * 1000) / 10
  const alerts = pendingReview + lowStock.length + outstandingOrders.length
  const periods = useMemo(() => monthlyRevenue(orders), [orders])
  const periodBars = useMemo(() => spark(periods.map((period) => period.total), [24000, 42000, 36000, 76000, 98000, 88000]), [periods])

  const insight = useMemo(() => {
    if (opportunities.length > 0) {
      const name = opportunities[0].matches[0]?.name || "your catalog"
      const urgent = opportunities.filter((item) => {
        const deadline = new Date(item.rfq.quote_deadline).getTime()
        return Number.isFinite(deadline) && deadline - Date.now() <= 7 * 86_400_000
      }).length
      return `High demand for ${name} across ${opportunities.length} live opportunities. ${urgent} close within the next seven days.`
    }
    if (stockReady.length > 0) {
      return `Your ${stockReady.length} live listings are visible. Keep prices and stock updated to stay competitive when the next RFQ opens.`
    }
    return "Add active product or service listings to unlock supplier-side opportunity matching and smarter bid suggestions."
  }, [opportunities, stockReady])

  const feed = useMemo<FeedItem[]>(() => {
    const nextItems: FeedItem[] = []
    opportunities.slice(0, 2).forEach((item) => {
      nextItems.push({ id: `opp-${item.rfq.id}`, title: `New RFQ from ${item.rfq.buyer_company || item.rfq.buyer_name}`, detail: `${rfqId(item.rfq.id)} | ${item.rfq.title}`, timestamp: item.rfq.created_at, tone: "blue", icon: "rfq" })
    })
    bidRows.slice(0, 2).forEach((item) => {
      nextItems.push({ id: `bid-${item.rfq.id}-${item.quote.id}`, title: item.quote.status === "awarded" ? `Awarded: ${rfqId(item.rfq.id)}` : `Bid submitted for ${item.rfq.title}`, detail: `${item.rfq.buyer_company || item.rfq.buyer_name} | ${money(item.quote.unit_price)}`, timestamp: item.quote.created_at, tone: item.quote.status === "awarded" ? "amber" : "slate", icon: item.quote.status === "awarded" ? "award" : "bid" })
    })
    if (lowStock[0]) nextItems.push({ id: `stock-${lowStock[0].id}`, title: `Inventory alert for ${lowStock[0].name}`, detail: `${lowStock[0].stock} units currently available`, timestamp: new Date().toISOString(), tone: "slate", icon: "catalog" })
    if (outstandingOrders[0]) nextItems.push({ id: `outstanding-${outstandingOrders[0].id}`, title: `Payment follow-up on order #${outstandingOrders[0].id}`, detail: `${outstandingOrders[0].payment_status.replaceAll("_", " ")} | ${money(toNumber(outstandingOrders[0].total_amount))}`, timestamp: outstandingOrders[0].created_at, tone: "amber", icon: "alert" })
    return nextItems.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
  }, [bidRows, lowStock, opportunities, outstandingOrders])

  const query = deferredSearch.trim().toLowerCase()
  const shownOpportunities = useMemo(() => (query ? opportunities.filter((item) => [item.rfq.title, item.rfq.buyer_company || item.rfq.buyer_name, item.rfq.delivery_location].join(" ").toLowerCase().includes(query)) : opportunities), [opportunities, query])
  const shownBids = useMemo(() => (query ? activeBids.filter((item) => [item.rfq.title, item.rfq.buyer_company || item.rfq.buyer_name, rfqId(item.rfq.id)].join(" ").toLowerCase().includes(query)) : activeBids), [activeBids, query])
  const shownFeed = useMemo(() => (query ? feed.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(query)).slice(0, 4) : feed.slice(0, 4)), [feed, query])

  const exportSnapshot = () => {
    if (!user) return
    const blob = new Blob([JSON.stringify({ generated_at: new Date().toISOString(), supplier: user, metrics: { total_revenue: totalRevenue, win_rate: winRate, active_bids: activeBids.length, average_fulfillment_days: avgFulfillment, outstanding_amount: outstandingAmount, live_opportunities: opportunities.length }, products: supplierProducts, orders, rfqs: visibleRfqs }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `supplier-dashboard-${user.username}-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]"><div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/80 p-8 text-sm font-semibold text-[#617084] shadow-[0_25px_60px_rgba(15,23,42,0.08)]">Loading supplier command center...</div></main>

  if (!user) return <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]"><div className="mx-auto max-w-3xl rounded-[2rem] border border-[#ffd7d7] bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)]"><h1 className="font-[family-name:var(--font-display)] text-3xl font-black">Supplier session unavailable</h1><p className="mt-4 text-sm leading-7 text-[#7a8698]">{error || "Your dashboard could not be opened."}</p><Link href="/login?next=%2Fsupplier%2Fdashboard" className="mt-6 inline-flex rounded-2xl bg-[#0f4fb6] px-5 py-3 text-sm font-bold text-white">Return to Login</Link></div></main>

  return (
    <div
      className="min-h-screen bg-[#f7f9fb] text-[#191c1e]"
      style={{
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(0,86,210,0.04) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(213,227,252,0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(178,197,255,0.08) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(242,244,246,0.08) 0px, transparent 45%)",
      }}
    >
      <SupplierDashboardHeader user={user} rfqs={rfqs} products={products} />
      <SupplierSidebar active="dashboard" username={user.username} onSignOut={signOut} />

      <main className="px-4 py-8 pb-24 sm:px-6 lg:pl-[calc(18rem+2.5rem)] lg:pr-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <section className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-[-0.04em] text-[#0f172a] md:text-5xl">Performance Ledger</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#657286]">
                Track revenue, bid velocity, fulfillment reliability, and buyer demand using your actual supplier catalog, RFQs, and live orders.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={exportSnapshot} className="inline-flex items-center gap-2 rounded-[1rem] border border-[#e5e9f0] bg-white px-5 py-3 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]">
                <Icon type="download" className="h-4 w-4" />
                Export PDF
              </button>
              <Link href="/supplier/rfq" className="inline-flex items-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,#0f4fb6,#1d72ff)] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_30px_rgba(15,79,182,0.18)] transition hover:shadow-[0_20px_36px_rgba(15,79,182,0.26)]">
                View Full Audit
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Total Revenue" value={compactMoney(totalRevenue)} hint={`${orders.length} orders billed`} trend={spark(orders.slice(0, 7).map((item) => toNumber(item.total_amount)), [18, 26, 32, 48, 62, 80, 90])} tone="blue" icon="trend" />
            <KpiCard label="Win Rate" value={`${winRate.toFixed(1)}%`} hint={`${wonBids.length} awards secured`} trend={spark(bidRows.slice(0, 7).map((item) => (item.quote.status === "awarded" ? 10 : 6)), [5, 7, 8, 6, 9, 8, 10])} tone="slate" icon="award" />
            <KpiCard label="Active Bids" value={String(activeBids.length)} hint={`${pendingReview} pending review`} trend={spark(activeBids.slice(0, 7).map((item) => item.rfq.quantity || 1), [8, 10, 12, 11, 13, 15, 14])} tone="amber" icon="bid" />
            <KpiCard label="Avg Fulfillment" value={`${avgFulfillment.toFixed(1)} days`} hint={`${completedDurations.length} delivered orders`} trend={spark(completedDurations.slice(0, 7).map((value) => Math.max(1, 10 - value)), [4, 5, 6, 7, 8, 8, 9])} tone="blue" icon="truck" />
            <KpiCard label="Outstanding" value={compactMoney(outstandingAmount)} hint={`${outstandingOrders.length} invoices open`} trend={spark(outstandingOrders.slice(0, 7).map((item) => toNumber(item.total_amount)), [12000, 18000, 15000, 21000, 19000, 16000, 14000])} tone="slate" icon="invoice" />
          </section>

          <section className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-12">
            <div className="space-y-8 xl:col-span-8">
              <article className="overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 border-b border-[#eef2f6] bg-[#f6f8fb] px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#eef4ff] p-2 text-[#0f4fb6]"><Icon type="rfq" className="h-4 w-4" /></div>
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-lg font-black text-[#0f172a]">New Opportunities</h2>
                      <p className="text-xs font-medium text-[#94a3b8]">Live RFQs that match your active catalog and open supplier window.</p>
                    </div>
                  </div>
                  <span className="inline-flex rounded-md bg-[#0f4fb6] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">Matching Catalog</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="border-b border-[#eef2f6] bg-[#fbfcfe]">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Hospital / Clinic</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Requirements</th>
                        <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Est. Value</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Deadline</th>
                        <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {shownOpportunities.slice(0, 4).map((item) => (
                        <tr 
                          key={item.rfq.id} 
                          id={`opportunity-${item.rfq.id}`}
                          className={`group hover:bg-[#fbfcff] transition ${focusId === item.rfq.id ? "bg-blue-50 ring-2 ring-[#0f4fb6]" : ""}`}
                        >
                          <td className="px-6 py-4">
                            <p className="font-bold text-[#0f172a]">{item.rfq.buyer_company || item.rfq.buyer_name}</p>
                            <p className="text-xs text-[#94a3b8]">{item.rfq.buyer_type ? `${item.rfq.buyer_type} buyer` : "Institution"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {item.matches.map((listing) => (
                                <span key={listing.id} className="rounded-md bg-[#dbe8ff] px-2 py-0.5 text-[10px] font-semibold text-[#3a485b]">{listing.name}</span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-[#64748b]">{item.rfq.title}</p>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-[#0f172a]">{money(item.rfq.target_budget)}</td>
                          <td className="px-6 py-4 text-xs font-bold text-[#475569]">{deadlineLabel(item.rfq.quote_deadline)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                router.push(`/supplier/rfq?rfqId=${item.rfq.id}`)
                              }}
                              className="inline-flex rounded-lg bg-[linear-gradient(135deg,#0f4fb6,#1d72ff)] px-3 py-1.5 text-xs font-bold text-white hover:shadow-lg transition cursor-pointer"
                            >
                              Review and Bid
                            </button>
                          </td>
                        </tr>
                      ))}
                      {shownOpportunities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#64748b]">No matching opportunities found right now. Add more active listings or adjust search keywords.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <article id="bid-tracker" className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
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
                      <div key={`${item.rfq.id}-${item.quote.id}`} className={`flex flex-col gap-4 rounded-[1.25rem] border-l-4 bg-[#f8fafc] p-4 md:flex-row md:items-center md:justify-between ${state.border}`}>
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
            </div>

            <div className="space-y-8 xl:col-span-4">
              <article className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-black text-[#0f172a]">Revenue Trajectory</h2>
                <div className="relative mt-6 flex h-40 items-end justify-between gap-3 px-2">
                  {periodBars.map((height, index) => (
                    <div key={`${periods[index]?.key}-${height}`} className="flex h-full flex-1 items-end">
                      <span className={`block w-full rounded-t-[0.65rem] ${index === periodBars.length - 2 ? "bg-[linear-gradient(180deg,#0f4fb6,#1d72ff)]" : index === periodBars.length - 1 ? "bg-[#7db0ff]" : "bg-[#e8eef7]"}`} style={{ height: `${height}%` }} />
                    </div>
                  ))}
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 240 120" aria-hidden="true"><path d="M8,88 C44,82 68,68 96,54 S154,28 232,22" fill="none" stroke="#0f4fb6" strokeWidth="2.2" /></svg>
                </div>
                <div className="mt-5 flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">
                  {periods.map((period) => <span key={period.key} className={period.total > 0 ? "text-[#0f4fb6]" : ""}>{period.label}</span>)}
                </div>
              </article>

              <article className="relative overflow-hidden rounded-[1.8rem] bg-[#dbe8ff] p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-black text-[#0f172a]">Market Insight</h2>
                <p className="mt-3 text-sm leading-7 text-[#4b5d73]">{insight}</p>
                <Link href="/supplier/rfq" className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#0f4fb6]">
                  View Full Report
                  <span className="text-sm">+</span>
                </Link>
                <div className="absolute -bottom-8 -right-6 text-[7rem] font-black text-[#0f4fb6]/8">+</div>
              </article>

              <article id="intelligence-feed" className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-black text-[#0f172a]">Intelligence Feed</h2>
                  {alerts > 0 ? <span className="h-2 w-2 rounded-full bg-[#ba1a1a]" /> : null}
                </div>
                <div className="space-y-5">
                  {shownFeed.length > 0 ? shownFeed.map((item) => <SignalRow key={item.id} item={item} />) : <div className="rounded-[1.25rem] border border-dashed border-[#dbe4ef] bg-[#f8fafc] px-5 py-8 text-sm text-[#64748b]">No live supplier alerts matched your search.</div>}
                </div>
              </article>
            </div>
          </section>

          <footer id="settings" className="mt-12 rounded-[1.8rem] border border-white/80 bg-[#eef2f5] px-6 py-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-black text-[#0f172a]">MedVendor Ecosystem</h2>
                <p className="mt-2 max-w-xl text-sm leading-7 text-[#64748b]">Connecting active healthcare facilities with responsive suppliers through catalog intelligence, RFQ visibility, and order execution workflows.</p>
              </div>
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Workspace</p>
                  <div className="mt-4 space-y-2 text-sm text-[#475569]">
                    <Link href="/supplier/rfq" className="block hover:text-[#0f4fb6]">Bid Guidelines</Link>
                    <Link href="/supplier/orders" className="block hover:text-[#0f4fb6]">Order Follow-up</Link>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Support</p>
                  <div className="mt-4 space-y-2 text-sm text-[#475569]">
                    <Link href="/supplier/products" className="block hover:text-[#0f4fb6]">Catalog Management</Link>
                    <a href="mailto:support@medvendor.in" className="block hover:text-[#0f4fb6]">Support Desk</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t border-[#dbe4ef] pt-6 text-xs font-bold text-[#94a3b8] md:flex-row md:items-center md:justify-between">
              <p>© 2026 MedVendor Procurement Systems. All rights reserved.</p>
              <div className="flex gap-4">
                <a href="mailto:support@medvendor.in">Privacy</a>
                <a href="mailto:support@medvendor.in">Terms</a>
                <a href="mailto:support@medvendor.in">Cookies</a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
