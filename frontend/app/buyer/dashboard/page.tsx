"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import BuyerNavbar from "@/components/buyer/BuyerNavbar"
import BuyerDashboardHeader from "@/components/buyer/BuyerDashboardHeader"
import BuyerFooter from "@/components/buyer/BuyerFooter"
import {
  FileText,
  MessageSquare,
  AlertTriangle,
  IndianRupee,
  Activity,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import {
  clearToken,
  getCurrentUser,
  getOrders,
  getProducts,
  getRfqs,
  isAuthSessionError,
  logoutUser,
} from "@/services"
import type { AuthUser, VendorOrder, VendorProductService, VendorRfq } from "@/services"

type DashboardActivity = {
  id: string
  title: string
  detail: string
  timestamp: string
  accent: "blue" | "amber" | "slate"
  amount?: string
  glyph: string
}

const buyerTypeLabels: Record<NonNullable<AuthUser["buyer_type"]>, string> = {
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  ngo: "NGO",
  clinic: "Clinic",
}

const rfqStatusLabels: Record<VendorRfq["status"], string> = {
  open: "Open Market",
  under_review: "In Review",
  awarded: "Awarded",
  closed: "Closed",
}

const rfqStatusClasses: Record<VendorRfq["status"], string> = {
  open: "border-[#dbe8ff] bg-[#f3f7ff] text-[#0f4fb6]",
  under_review: "border-[#fde3b8] bg-[#fff8ec] text-[#ad6a08]",
  awarded: "border-[#d7f0df] bg-[#f1fcf4] text-[#177245]",
  closed: "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]",
}

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)

const readableStatus = (value: string) => value.replaceAll("_", " ")

const formatShortDate = (value?: string | null) => {
  if (!value) return "No date"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", { month: "short", day: "2-digit" })
}

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "Just now"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const diffMinutes = Math.round((parsed.getTime() - Date.now()) / 60_000)
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute")
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour")
  return formatter.format(Math.round(diffHours / 24), "day")
}

const orderStatusLabel = (order: VendorOrder) => {
  if (order.status === "po_released") return "Pending"
  if (order.status === "po_accepted") return "Accepted"
  if (order.status === "partially_subcontracted") return "Processing"
  if (order.status === "ready_to_dispatch") return "Ready"
  if (order.status === "goods_received") return "Completed"
  if (order.status === "delivered" || order.delivery_status === "delivered") return "Delivered"
  if (order.delivery_status === "out_for_delivery") return "Out For Delivery"
  if (order.delivery_status === "in_transit") return "In Transit"
  return readableStatus(order.status)
}

const orderStatusChipClass = (order: VendorOrder) => {
  if (["completed", "goods_received"].includes(order.status) || order.delivery_status === "delivered") {
    return "border-[#d7f0df] bg-[#f1fcf4] text-[#177245]"
  }
  if (order.status === "shipped" || order.delivery_status === "in_transit" || order.delivery_status === "out_for_delivery") {
    return "border-[#dbe8ff] bg-[#f3f7ff] text-[#0f4fb6]"
  }
  if (order.status === "cancelled") {
    return "border-[#fee2e2] bg-[#fff5f5] text-[#b91c1c]"
  }
  return "border-[#fde3b8] bg-[#fff8ec] text-[#ad6a08]"
}

const orderStatusDetail = (order: VendorOrder) =>
  `Delivery ${readableStatus(order.delivery_status)} | Payment ${readableStatus(order.payment_status)}`

const getLatestOrderTouch = (order: VendorOrder) => {
  const timestamps = [
    order.created_at,
    order.po_released_at ?? "",
    order.po_accepted_at ?? "",
    order.shipped_at ?? "",
    order.delivered_at ?? "",
    order.goods_received_at ?? "",
    ...order.events.map((event) => event.created_at),
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))

  return timestamps.length > 0 ? Math.max(...timestamps) : 0
}

const buildRfqIdentifier = (rfqId: number) => `RFQ-${new Date().getFullYear()}-${String(rfqId).padStart(3, "0")}`

const getLatestRfqTouch = (rfq: VendorRfq) => {
  const timestamps = [rfq.created_at, rfq.awarded_at ?? "", ...rfq.quotations.map((quote) => quote.created_at)]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))

  return timestamps.length > 0 ? Math.max(...timestamps) : 0
}

const buildSparkline = (values: number[], fallback: number[]) => {
  const source = values.length > 0 ? values : fallback
  const max = Math.max(...source, 1)
  return source.map((value) => {
    const normalized = Math.round((value / max) * 70) + 22
    return Math.min(100, Math.max(18, normalized))
  })
}

const createActivityFeed = (rfqs: VendorRfq[], orders: VendorOrder[]) => {
  const rfqActivities: DashboardActivity[] = rfqs.flatMap((rfq) => {
    const createdEvent: DashboardActivity = {
      id: `rfq-created-${rfq.id}`,
      title: `${rfq.title} was published to the supplier network.`,
      detail: `${buildRfqIdentifier(rfq.id)} | ${rfq.delivery_location}`,
      timestamp: rfq.created_at,
      accent: "blue",
      glyph: "RF",
    }

    const awardedEvent =
      rfq.awarded_at && rfq.awarded_supplier_name
        ? {
          id: `rfq-award-${rfq.id}`,
          title: `${rfq.awarded_supplier_name} was awarded for ${rfq.title}.`,
          detail: rfq.awarded_order_id ? `PO #${rfq.awarded_order_id} released from RFQ award.` : "Award confirmed.",
          timestamp: rfq.awarded_at,
          accent: "amber" as const,
          glyph: "AW",
        }
        : null

    const quotationEvents = rfq.quotations.map((quote) => ({
      id: `quote-${rfq.id}-${quote.id}`,
      title: `${quote.supplier_company || quote.supplier_name} submitted a new quote for ${rfq.title}.`,
      detail: `${buildRfqIdentifier(rfq.id)} | Lead time ${quote.lead_time_days} days`,
      timestamp: quote.created_at,
      accent: quote.status === "rejected" ? ("amber" as const) : ("blue" as const),
      amount: formatCurrency(quote.unit_price),
      glyph: "QT",
    }))

    return [createdEvent, ...(awardedEvent ? [awardedEvent] : []), ...quotationEvents]
  })

  const orderActivities: DashboardActivity[] = orders.flatMap((order) => {
    const createdEvent: DashboardActivity = {
      id: `order-created-${order.id}`,
      title: `Purchase order #${order.id} was created for vendor #${order.vendor}.`,
      detail: `Status ${orderStatusLabel(order)} | Payment ${readableStatus(order.payment_status)}`,
      timestamp: order.created_at,
      accent: "slate",
      amount: formatCurrency(toNumber(order.total_amount)),
      glyph: "PO",
    }

    const deliveredEvent =
      order.delivered_at || order.goods_received_at
        ? {
          id: `order-complete-${order.id}`,
          title: `Order #${order.id} moved to ${readableStatus(order.delivery_status)} stage.`,
          detail: order.tracking_note || "Delivery milestone updated.",
          timestamp: order.goods_received_at || order.delivered_at || order.created_at,
          accent: "amber" as const,
          glyph: "UP",
        }
        : null

    return [createdEvent, ...(deliveredEvent ? [deliveredEvent] : [])]
  })

  return [...rfqActivities, ...orderActivities].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  )
}

export default function BuyerDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("buyer_user")
      if (cached) {
        try { return JSON.parse(cached) } catch { return null }
      }
    }
    return null
  })
  const [products, setProducts] = useState<VendorProductService[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("buyer_products")
      if (cached) {
        try { return JSON.parse(cached) } catch { return [] }
      }
    }
    return []
  })
  const [orders, setOrders] = useState<VendorOrder[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("buyer_orders")
      if (cached) {
        try { return JSON.parse(cached) } catch { return [] }
      }
    }
    return []
  })
  const [rfqs, setRfqs] = useState<VendorRfq[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("buyer_rfqs")
      if (cached) {
        try { return JSON.parse(cached) } catch { return [] }
      }
    }
    return []
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const hasCached = sessionStorage.getItem("buyer_products") &&
                        sessionStorage.getItem("buyer_orders") &&
                        sessionStorage.getItem("buyer_rfqs") &&
                        sessionStorage.getItem("buyer_user")
      return !hasCached
    }
    return true
  })
  const [error, setError] = useState("")
  const [searchText, setSearchText] = useState("")
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "open" | "under_review" | "awarded" | "closed">("all")
  const deferredSearch = useDeferredValue(searchText)

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getCurrentUser()
        if (me.role !== "buyer") {
          router.push("/supplier/dashboard")
          return
        }
        if (me.status === "pending") {
          router.replace("/buyer/profile")
          return
        }
        if (!me.has_active_subscription) {
          router.replace("/buyer/subscription")
          return
        }

        setUser(me)
        const [productData, orderData, rfqData] = await Promise.all([getProducts(), getOrders(), getRfqs()])
        setProducts(productData)
        setOrders(orderData)
        setRfqs(rfqData)

        // Cache for next visit
        sessionStorage.setItem("buyer_user", JSON.stringify(me))
        sessionStorage.setItem("buyer_products", JSON.stringify(productData))
        sessionStorage.setItem("buyer_orders", JSON.stringify(orderData))
        sessionStorage.setItem("buyer_rfqs", JSON.stringify(rfqData))
      } catch (loadError) {
        if (isAuthSessionError(loadError)) {
          clearToken()
          setError("Your buyer session expired. Please login again.")
          router.push("/login?next=%2Fbuyer%2Fdashboard")
          return
        }

        setError("Could not load your buyer dashboard right now. Check the backend and try again.")
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

  const buyerRfqs = useMemo(
    () => rfqs.filter((rfq) => rfq.buyer_name.trim().toLowerCase() === (user?.username ?? "").trim().toLowerCase()),
    [rfqs, user?.username]
  )
  const buyerOrders = useMemo(() => orders.filter((order) => order.buyer === user?.id), [orders, user?.id])

  const liveCatalog = useMemo(() => products.filter((item) => item.is_active && item.stock > 0), [products])
  const openBuyerRfqs = useMemo(
    () => buyerRfqs.filter((rfq) => rfq.status === "open" || rfq.status === "under_review"),
    [buyerRfqs]
  )
  const totalQuotes = useMemo(() => buyerRfqs.reduce((sum, rfq) => sum + rfq.quotations.length, 0), [buyerRfqs])
  const totalSpend = useMemo(() => buyerOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0), [buyerOrders])

  const uniqueSuppliers = useMemo(() => {
    const supplierKeys = new Set<string>()
    buyerRfqs.forEach((rfq) => {
      rfq.quotations.forEach((quote) => {
        supplierKeys.add((quote.supplier_company || quote.supplier_name).trim().toLowerCase())
      })
    })
    return supplierKeys
  }, [buyerRfqs])

  const overdueOrders = useMemo(
    () =>
      buyerOrders.filter((order) => {
        if (order.payment_status === "overdue") return true
        if (["completed", "cancelled"].includes(order.status)) return false
        return (Date.now() - new Date(order.created_at).getTime()) / 86_400_000 > 14
      }),
    [buyerOrders]
  )

  const pendingAwardRfqs = useMemo(
    () =>
      buyerRfqs.filter(
        (rfq) => (rfq.status === "open" || rfq.status === "under_review") && rfq.quotations.length > 0 && !rfq.awarded_quote_id
      ),
    [buyerRfqs]
  )

  const getRfqImage = (rfqTitle: string) => {
    const matchedProduct = products.find(p =>
      rfqTitle.toLowerCase().includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(rfqTitle.toLowerCase())
    )
    if (matchedProduct && matchedProduct.images && matchedProduct.images.length > 0) {
      return matchedProduct.images[0].image_url
    }
    if (rfqTitle.toLowerCase().includes("glove") || rfqTitle.toLowerCase().includes("surgical")) {
      return "/images/clinical-sourcing-user-hero-v3.jpg"
    }
    return "/images/clinical-sourcing-hero.png"
  }

  const getOrderImage = (order: VendorOrder) => {
    if (order.items && order.items.length > 0) {
      const firstItem = order.items[0]
      const matchedProduct = products.find(p => p.id === firstItem.product)
      if (matchedProduct && matchedProduct.images && matchedProduct.images.length > 0) {
        return matchedProduct.images[0].image_url
      }
    }
    return "/images/clinical-sourcing-hero.png"
  }

  const searchableLedger = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const base = [...buyerRfqs].sort((left, right) => getLatestRfqTouch(right) - getLatestRfqTouch(left))
    if (!query) return base

    return base.filter((rfq) =>
      [buildRfqIdentifier(rfq.id), rfq.title, rfq.delivery_location, rfqStatusLabels[rfq.status]]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [buyerRfqs, deferredSearch])

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === "all") return searchableLedger
    return searchableLedger.filter((rfq) => rfq.status === ledgerFilter)
  }, [searchableLedger, ledgerFilter])

  const activityFeed = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const feed = createActivityFeed(buyerRfqs, buyerOrders)
    if (!query) return feed.slice(0, 4)
    return feed.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(query)).slice(0, 4)
  }, [buyerOrders, buyerRfqs, deferredSearch])

  const rfqSpark = useMemo(
    () => buildSparkline(openBuyerRfqs.slice(0, 7).map((rfq) => rfq.quantity), [20, 28, 24, 32, 36, 30, 42]),
    [openBuyerRfqs]
  )
  const quoteSpark = useMemo(
    () => buildSparkline(buyerRfqs.slice(0, 7).map((rfq) => rfq.quotations.length || 1), [2, 5, 3, 4, 6, 5, 7]),
    [buyerRfqs]
  )
  const riskSpark = useMemo(
    () =>
      buildSparkline(
        buyerRfqs.slice(0, 7).map((rfq) => {
          const isPastDeadline = new Date(rfq.quote_deadline).getTime() < Date.now()
          return Number(isPastDeadline) + (rfq.quotations.length === 0 ? 2 : 0) + (rfq.status === "under_review" ? 1 : 0)
        }),
        [6, 5, 5, 3, 3, 2, 1]
      ),
    [buyerRfqs]
  )
  const spendSpark = useMemo(
    () => buildSparkline(buyerOrders.slice(0, 7).map((order) => toNumber(order.total_amount)), [8, 12, 16, 18, 22, 26, 31]),
    [buyerOrders]
  )
  const recentBuyerOrders = useMemo(
    () => [...buyerOrders].sort((left, right) => getLatestOrderTouch(right) - getLatestOrderTouch(left)).slice(0, 4),
    [buyerOrders]
  )

  const pendingActions = overdueOrders.length + pendingAwardRfqs.length
  const supplierCoverage =
    buyerRfqs.length === 0 ? 0 : Math.round((buyerRfqs.filter((rfq) => rfq.quotations.length > 0).length / buyerRfqs.length) * 100)
  const awardReadiness =
    openBuyerRfqs.length === 0 ? 0 : Math.round((openBuyerRfqs.filter((rfq) => rfq.quotations.length >= 2).length / openBuyerRfqs.length) * 100)
  const supplierDepth = Math.min(100, uniqueSuppliers.size * 14)
  const averageQuotes = buyerRfqs.length === 0 ? 0 : totalQuotes / buyerRfqs.length
  const organizationLabel = user?.buyer_type ? buyerTypeLabels[user.buyer_type] : "Buyer"
  const exportSnapshot = () => {
    if (!user) return

    const payload = {
      generated_at: new Date().toISOString(),
      buyer: user,
      metrics: {
        active_rfqs: openBuyerRfqs.length,
        total_quotes: totalQuotes,
        pending_actions: pendingActions,
        total_spend: totalSpend,
        live_catalog: liveCatalog.length,
        active_suppliers: uniqueSuppliers.size,
      },
      rfqs: buyerRfqs,
      orders: buyerOrders,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `buyer-dashboard-${user.username}-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex flex-col">
        <BuyerNavbar active="dashboard" />
        <main className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 py-6 md:py-8 pb-10 md:px-8 lg:py-10 flex-1">
          {/* Skeleton shimmer loader */}
          <div className="animate-pulse space-y-6">
            {/* Welcome banner skeleton */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8">
              <div className="h-4 w-24 bg-slate-100 rounded-full mb-4" />
              <div className="h-7 w-64 bg-slate-100 rounded-lg mb-3" />
              <div className="h-3 w-80 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-60 bg-slate-100 rounded" />
              <div className="mt-6 flex gap-3">
                <div className="h-10 w-32 bg-slate-100 rounded-xl" />
                <div className="h-10 w-28 bg-blue-100 rounded-xl" />
              </div>
            </div>
            {/* Metric cards skeleton */}
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
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="h-2.5 w-32 bg-slate-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 bg-slate-100 rounded" />
                      <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
                    </div>
                    <div className="h-5 w-16 bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-4 space-y-2">
                    <div className="h-3 w-4/5 bg-slate-100 rounded" />
                    <div className="h-2.5 w-2/3 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <BuyerFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#ffd7d7] bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-black">Buyer session unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-[#7a8698]">{error || "Your dashboard could not be opened."}</p>
          <Link href="/login?next=%2Fbuyer%2Fdashboard" className="mt-6 inline-flex rounded-2xl bg-[#0f4fb6] px-5 py-3 text-sm font-bold text-white">
            Return to Login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex flex-col"
      style={{
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(0, 86, 210, 0.04) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(255, 219, 207, 0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(178, 197, 255, 0.08) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(242, 244, 246, 0.05) 0px, transparent 45%)",
      }}
    >
      <BuyerNavbar
        active="dashboard"
        username={user.username}
        buyerType={user.buyer_type}
        status={user.status}
        onSignOut={signOut}
        userEmail={user.email}
        userRole={user.role}
        searchText={searchText}
        setSearchText={setSearchText}
        pendingActions={pendingActions}
      />

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-4 sm:px-6 py-6 md:py-8 pb-10 md:px-8 lg:py-10">
        <div className="w-full animate-fade-in-up">
          {/* Light Minimalist Welcome Banner */}
          <div className="mb-6 sm:mb-10 relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-50/20 to-transparent pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {organizationLabel} Workspace
                </div>
                <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Welcome back, <span className="text-blue-600">{user.username}</span>
                </h1>
                <p className="mt-2 text-sm text-slate-500 max-w-xl">
                  Manage procurement schedules, analyze supplier bids, and monitor purchase order states all in one place.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={exportSnapshot}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export Data
                  </button>
                  <Link
                    href="/buyer/rfq?view=new"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition duration-200"
                  >
                    <span className="text-base leading-none font-bold">+</span>
                    New RFQ
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block w-72 h-44 shrink-0 relative overflow-hidden rounded-xl border border-slate-100 shadow-sm bg-slate-50">
                <img
                  src="/images/healthcare-procurement.png"
                  alt="Procurement Overview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active RFQs" value={String(openBuyerRfqs.length).padStart(2, "0")} hint={`${liveCatalog.length} live listings available`} accent="blue" icon={FileText} href="/buyer/rfq?view=my" />
            <MetricCard label="Quotes Received" value={String(totalQuotes).padStart(2, "0")} hint={`Avg ${averageQuotes.toFixed(1)} per RFQ`} accent="slate" icon={MessageSquare} href="/buyer/rfq?view=my" />
            <MetricCard label="Pending Action" value={String(pendingActions).padStart(2, "0")} hint={pendingActions > 0 ? `${pendingAwardRfqs.length} RFQs need review` : "No blockers right now"} accent="amber" icon={AlertTriangle} href="/buyer/rfq?view=my" />
            <MetricCard label="Total Spend" value={formatCompactCurrency(totalSpend)} hint={`${buyerOrders.length} orders tracked`} accent="dark" icon={IndianRupee} href="/buyer/orders" />
          </div>

          <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left 2-column Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Active Ledger */}
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-[#eff3f8] px-6 py-6 md:px-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-900">Active Ledger</h2>
                      <p className="mt-1 text-xs text-slate-500">Manage your active Requests for Quotes.</p>
                    </div>
                    <Link href="/buyer/rfq?view=my" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700">
                      Complete History
                      <span className="text-sm">→</span>
                    </Link>
                  </div>

                  {/* Ledger Tab Filter Bar (Scrollable on Mobile) */}
                  <div className="mt-5 flex overflow-x-auto scrollbar-none gap-1.5 border-b border-slate-100 pb-2 -mx-6 px-6 md:mx-0 md:px-0">
                    {[
                      { key: "all", label: "All RFQs" },
                      { key: "open", label: "Open Market" },
                      { key: "under_review", label: "In Review" },
                      { key: "awarded", label: "Awarded" },
                      { key: "closed", label: "Closed" }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setLedgerFilter(tab.key as any)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 border whitespace-nowrap ${ledgerFilter === tab.key
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900"
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop view of ledger (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 md:px-8">RFQ Title</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 md:px-8">Status</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 md:px-8">Quotes</th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 md:px-8">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLedger.slice(0, 5).map((rfq) => (
                        <tr key={rfq.id} className="group transition hover:bg-slate-50/30">
                          <td className="px-6 py-4 md:px-8">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                <img
                                  src={getRfqImage(rfq.title)}
                                  alt={rfq.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <Link href="/buyer/rfq?view=my" className="text-sm font-bold text-slate-900 transition group-hover:text-blue-600">
                                  {rfq.title}
                                </Link>
                                <p className="mt-0.5 text-xs text-slate-400 font-mono">
                                  {buildRfqIdentifier(rfq.id)} &bull; {rfq.delivery_location}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 md:px-8">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${rfqStatusClasses[rfq.status]}`}>{rfqStatusLabels[rfq.status]}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600 md:px-8">
                            {rfq.quotations.length} {rfq.quotations.length === 1 ? "quote" : "quotes"}
                          </td>
                          <td className="px-6 py-4 text-right text-xs text-slate-400 md:px-8">
                            {formatShortDate(new Date(getLatestRfqTouch(rfq)).toISOString())}
                          </td>
                        </tr>
                      ))}
                      {filteredLedger.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-xs text-slate-450 md:px-8">No RFQs matched your criteria.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list view of ledger (hidden on desktop) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredLedger.slice(0, 5).map((rfq) => (
                    <div key={rfq.id} className="p-5 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          <img
                            src={getRfqImage(rfq.title)}
                            alt={rfq.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href="/buyer/rfq?view=my" className="text-sm font-extrabold text-slate-900 active:text-blue-600 block truncate">
                            {rfq.title}
                          </Link>
                          <p className="mt-0.5 text-[10px] text-slate-400 font-mono">
                            {buildRfqIdentifier(rfq.id)} &bull; {rfq.delivery_location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rfqStatusClasses[rfq.status]}`}>
                          {rfqStatusLabels[rfq.status]}
                        </span>
                        <div className="text-right">
                          <p className="text-[10px] font-extrabold text-slate-600">
                            {rfq.quotations.length} {rfq.quotations.length === 1 ? "quote" : "quotes"}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Updated {formatShortDate(new Date(getLatestRfqTouch(rfq)).toISOString())}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredLedger.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No RFQs matched your criteria.
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Order Status */}
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-5">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-900">Order Status</h3>
                    <p className="mt-1 text-xs text-slate-500">Latest purchase orders with live delivery and payment states.</p>
                  </div>
                  <Link href="/buyer/orders" className="text-xs font-bold text-blue-600 transition hover:text-blue-750">
                    Open Orders Desk &rarr;
                  </Link>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentBuyerOrders.length > 0 ? recentBuyerOrders.map((order) => (
                    <article key={order.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition duration-200 hover:bg-white hover:shadow-sm">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          <img
                            src={getOrderImage(order)}
                            alt={`Order #${order.id}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">PO #{String(order.id).padStart(4, "0")}</p>
                              <p className="mt-0.5 text-xs text-slate-400">{formatShortDate(order.created_at)} | {formatCompactCurrency(toNumber(order.total_amount))}</p>
                            </div>
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${orderStatusChipClass(order)}`}>
                              {orderStatusLabel(order)}
                            </span>
                          </div>
                          <p className="mt-3 text-xs font-semibold text-slate-600">{orderStatusDetail(order)}</p>
                          <p className="mt-1 text-[11px] text-slate-400 truncate">{order.tracking_note || "No tracking updates available."}</p>
                        </div>
                      </div>
                    </article>
                  )) : (
                    <div className="md:col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-xs text-slate-400">
                      No active buyer orders yet.
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right 1-column Sidebar (Recent Activity) */}
            <div className="lg:col-span-1">
              {/* Recent Activity */}
              <section id="recent-activity" className="h-full rounded-2xl border border-slate-100 bg-white p-5 sm:p-7 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold text-slate-900">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {activityFeed.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      {activityFeed.map((activity) => <ActivityCard key={activity.id} activity={activity} />)}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">
                      No recent buyer activity.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <BuyerFooter />
    </div>
  )
}

function Glyph({
  label,
  tone,
  small = false,
}: {
  label: string
  tone: "blue" | "amber" | "slate" | "dark"
  small?: boolean
}) {
  const palette =
    tone === "blue"
      ? "bg-[#eef4ff] text-[#0f4fb6]"
      : tone === "amber"
        ? "bg-[#fff1e8] text-[#a93802]"
        : tone === "dark"
          ? "bg-white/10 text-[#dae2ff]"
          : "bg-[#f2f4f7] text-[#475569]"

  const sizeClass = small ? "h-8 w-8" : "h-9 w-9"
  const iconSize = small ? "h-3.5 w-3.5" : "h-4 w-4"

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl ${palette} ${sizeClass}`}
    >
      <GlyphIcon label={label} className={iconSize} />
    </span>
  )
}

function GlyphIcon({ label, className }: { label: string; className: string }) {
  if (label === "SR") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    )
  }

  if (label === "NT") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </svg>
    )
  }

  if (label === "AI") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19v-3" />
      </svg>
    )
  }

  if (label === "DB") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="4" rx="1.5" />
        <rect x="14" y="10" width="7" height="11" rx="1.5" />
        <rect x="3" y="13" width="7" height="8" rx="1.5" />
      </svg>
    )
  }

  if (label === "OR") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
    )
  }

  if (label === "RF") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
      </svg>
    )
  }

  if (label === "SP") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  if (label === "QT") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17h10l4-4V3H3v10l4 4Z" />
        <path d="M8 8h8" />
        <path d="M8 12h5" />
      </svg>
    )
  }

  if (label === "AL") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    )
  }

  if (label === "IN") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 14h.01" />
        <path d="M12 14h4" />
      </svg>
    )
  }

  if (label === "HP") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    )
  }

  if (label === "EX") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    )
  }

  if (label === "AW") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="5" />
        <path d="m8.21 13.89-1.42 6.11L12 17l5.21 3-1.42-6.12" />
      </svg>
    )
  }

  if (label === "PO") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    )
  }

  if (label === "UP") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v20" />
        <path d="m17 7-5-5-5 5" />
        <path d="m17 17-5 5-5-5" />
      </svg>
    )
  }

  return <span className="text-[10px] font-black uppercase">{label}</span>
}

function MetricCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
  href,
}: {
  label: string
  value: string
  hint: string
  accent: "blue" | "slate" | "amber" | "dark"
  icon: React.ComponentType<{ className?: string }>
  href: string
}) {
  const accentClasses = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    slate: "text-slate-600 bg-slate-50 border-slate-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    dark: "text-indigo-600 bg-indigo-50 border-indigo-100",
  }

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 md:p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl border ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">{hint}</p>
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      </div>
    </Link>
  )
}

function ActivityCard({ activity }: { activity: DashboardActivity }) {
  const accentBorder = activity.accent === "blue"
    ? "border-l-blue-400"
    : activity.accent === "amber"
      ? "border-l-amber-400"
      : "border-l-slate-300"

  return (
    <article className={`group flex items-start gap-3 sm:gap-4 rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm backdrop-blur transition-all duration-200 hover:bg-white hover:shadow-md border-l-4 ${accentBorder}`}>
      <div className="mt-0.5 flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-[1.2rem] bg-slate-50 ring-1 ring-slate-200 transition group-hover:bg-white group-hover:ring-slate-300">
        <Glyph label={activity.glyph} tone={activity.accent} small />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs sm:text-sm font-bold leading-5 text-slate-900 line-clamp-2">{activity.title}</p>
          <time className="shrink-0 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{formatRelativeTime(activity.timestamp)}</time>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500 truncate">{activity.detail}</p>
        {activity.amount && (
          <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
            {activity.amount}
          </div>
        )}
      </div>
    </article>
  )
}

function QuickActionLink({
  href,
  glyph,
  label,
  badge,
}: {
  href: string
  glyph: string
  label: string
  badge: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-[1.4rem] border border-[#f1f5f9] bg-[#f8fafc] p-4 transition hover:border-[#0f4fb6]/20 hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0f4fb6] shadow-sm ring-1 ring-[#e5e9f0] transition group-hover:ring-[#0f4fb6]/20">
          <GlyphIcon label={glyph} className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-[#0f172a]">{label}</span>
      </div>
      <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black tracking-widest text-[#0f4fb6] ring-1 ring-[#0f4fb6]/10">
        {badge}
      </span>
    </Link>
  )
}

function HealthBar({
  label,
  value,
  progress,
  tone,
}: {
  label: string
  value: string
  progress: number
  tone: "blue" | "amber"
}) {
  const bg = tone === "blue" ? "bg-blue-600" : "bg-amber-600"

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-950">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${bg}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
