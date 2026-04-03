"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import BuyerSidebar from "@/components/buyer/BuyerSidebar"
import { clearToken, getCurrentUser, isAuthSessionError, logoutUser } from "@/services/authService"
import { getOrders, getProducts, getRfqs } from "@/services/vendorService"
import { AuthUser } from "@/types/auth"
import { VendorOrder, VendorProductService, VendorRfq } from "@/types/vendor"

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

const getProfileInitials = (value?: string | null) => {
  const cleaned = (value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase()
  return cleaned || "BV"
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
      detail: `Status ${order.status.replaceAll("_", " ")} | Payment ${order.payment_status.replaceAll("_", " ")}`,
      timestamp: order.created_at,
      accent: "slate",
      amount: formatCurrency(toNumber(order.total_amount)),
      glyph: "PO",
    }

    const deliveredEvent =
      order.delivered_at || order.goods_received_at
        ? {
            id: `order-complete-${order.id}`,
            title: `Order #${order.id} moved to ${order.delivery_status.replaceAll("_", " ")} stage.`,
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
  const [user, setUser] = useState<AuthUser | null>(null)
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [rfqs, setRfqs] = useState<VendorRfq[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchText, setSearchText] = useState("")
  const deferredSearch = useDeferredValue(searchText)

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getCurrentUser()
        if (me.role !== "buyer") {
          router.push("/supplier/dashboard")
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
      router.push("/login")
    }
  }

  const buyerRfqs = useMemo(
    () => rfqs.filter((rfq) => rfq.buyer_name.trim().toLowerCase() === (user?.username ?? "").trim().toLowerCase()),
    [rfqs, user?.username]
  )

  const liveCatalog = useMemo(() => products.filter((item) => item.is_active && item.stock > 0), [products])
  const openBuyerRfqs = useMemo(
    () => buyerRfqs.filter((rfq) => rfq.status === "open" || rfq.status === "under_review"),
    [buyerRfqs]
  )
  const totalQuotes = useMemo(() => buyerRfqs.reduce((sum, rfq) => sum + rfq.quotations.length, 0), [buyerRfqs])
  const totalSpend = useMemo(() => orders.reduce((sum, order) => sum + toNumber(order.total_amount), 0), [orders])

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
      orders.filter((order) => {
        if (order.payment_status === "overdue") return true
        if (["completed", "cancelled"].includes(order.status)) return false
        return (Date.now() - new Date(order.created_at).getTime()) / 86_400_000 > 14
      }),
    [orders]
  )

  const pendingAwardRfqs = useMemo(
    () =>
      buyerRfqs.filter(
        (rfq) => (rfq.status === "open" || rfq.status === "under_review") && rfq.quotations.length > 0 && !rfq.awarded_quote_id
      ),
    [buyerRfqs]
  )

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

  const activityFeed = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const feed = createActivityFeed(buyerRfqs, orders)
    if (!query) return feed.slice(0, 4)
    return feed.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(query)).slice(0, 4)
  }, [buyerRfqs, deferredSearch, orders])

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
    () => buildSparkline(orders.slice(0, 7).map((order) => toNumber(order.total_amount)), [8, 12, 16, 18, 22, 26, 31]),
    [orders]
  )

  const pendingActions = overdueOrders.length + pendingAwardRfqs.length
  const supplierCoverage =
    buyerRfqs.length === 0 ? 0 : Math.round((buyerRfqs.filter((rfq) => rfq.quotations.length > 0).length / buyerRfqs.length) * 100)
  const awardReadiness =
    openBuyerRfqs.length === 0 ? 0 : Math.round((openBuyerRfqs.filter((rfq) => rfq.quotations.length >= 2).length / openBuyerRfqs.length) * 100)
  const supplierDepth = Math.min(100, uniqueSuppliers.size * 14)
  const averageQuotes = buyerRfqs.length === 0 ? 0 : totalQuotes / buyerRfqs.length
  const organizationLabel = user?.buyer_type ? buyerTypeLabels[user.buyer_type] : "Buyer"
  const buyerInitials = getProfileInitials(user?.username)

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
      orders,
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
      <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/75 p-8 text-sm font-semibold text-[#617084] shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          Loading buyer command center...
        </div>
      </main>
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
      className="min-h-screen bg-[#f7f9fb] text-[#191c1e]"
      style={{
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(0, 86, 210, 0.04) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(255, 219, 207, 0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(178, 197, 255, 0.08) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(242, 244, 246, 0.05) 0px, transparent 45%)",
      }}
    >
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link href="/buyer/dashboard" className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-[-0.04em] text-[#0f172a]">
              Med<span className="text-[#0f4fb6]">Vendor</span>
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/buyer/products" className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7b8798] transition hover:text-[#0f4fb6]">Marketplace</Link>
              <a href="#recent-activity" className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7b8798] transition hover:text-[#0f4fb6]">Analytics</a>
              <Link href="/buyer/rfq?view=my" className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7b8798] transition hover:text-[#0f4fb6]">Contracts</Link>
            </nav>
          </div>
          <div className="ml-auto flex items-center gap-3 md:gap-4">
            <label className="hidden min-w-[250px] items-center gap-3 rounded-full border border-[#e6ebf2] bg-[#f8fafc] px-4 py-2.5 text-sm text-[#94a3b8] focus-within:ring-2 focus-within:ring-[#0f4fb6]/15 md:flex">
              <Glyph label="SR" tone="blue" small />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search RFQs, locations, orders..."
                className="w-full border-0 bg-transparent p-0 text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
            </label>
            <button type="button" onClick={() => document.getElementById("recent-activity")?.scrollIntoView({ behavior: "smooth" })} className="relative rounded-full p-2" aria-label="View notifications">
              <Glyph label="NT" tone="slate" small />
              {pendingActions > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" /> : null}
            </button>
            <button type="button" onClick={() => document.getElementById("supplier-health")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full p-2" aria-label="View supplier health">
              <Glyph label="AI" tone="slate" small />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dbe8ff,#fff1e8)] text-sm font-black text-[#0f4fb6] ring-2 ring-[#0f4fb6]/10">
              {buyerInitials}
            </div>
          </div>
        </div>
      </header>

      <BuyerSidebar
        active="dashboard"
        username={user.username}
        buyerType={user.buyer_type}
        onSignOut={signOut}
      />

      <main className="px-4 py-8 pb-24 sm:px-6 lg:pl-[calc(18rem+2.5rem)] lg:pr-10 lg:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#ebf2ff] px-3 py-1.5 text-[#0f4fb6]">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em]">{organizationLabel} Performance Cycle</span>
                </div>
                <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[#0f172a] sm:text-5xl md:text-6xl">
                  Buyer <span className="font-medium italic text-[#0f4fb6]">Overview.</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[#657286] sm:text-lg sm:leading-8">
                  Monitor procurement cycles, supplier response depth, and live order velocity across your buyer workspace with actual RFQ and order data.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={exportSnapshot} className="inline-flex items-center gap-2 rounded-[1.2rem] border border-[#e5e9f0] bg-white px-6 py-3.5 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]">
                  <Glyph label="EX" tone="slate" />
                  Export Data
                </button>
                <Link href="/buyer/rfq" className="inline-flex items-center gap-2 rounded-[1.2rem] bg-[#0f4fb6] px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_30px_rgba(15,79,182,0.2)] transition hover:shadow-[0_20px_38px_rgba(15,79,182,0.28)]">
                  <span className="text-base leading-none">+</span>
                  New Request
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Active RFQs" value={String(openBuyerRfqs.length).padStart(2, "0")} hint={`${liveCatalog.length} live listings available`} trend={rfqSpark} accent="blue" glyph="RF" />
              <MetricCard label="Quotes Received" value={String(totalQuotes).padStart(2, "0")} hint={`Avg ${averageQuotes.toFixed(1)} per RFQ`} trend={quoteSpark} accent="slate" glyph="QT" />
              <MetricCard label="Pending Action" value={String(pendingActions).padStart(2, "0")} hint={pendingActions > 0 ? `${pendingAwardRfqs.length} RFQs need review` : "No blockers right now"} trend={riskSpark} accent="amber" glyph="AL" />
              <MetricCard label="Total Spend" value={formatCompactCurrency(totalSpend)} hint={`${orders.length} orders tracked`} trend={spendSpark} accent="dark" glyph="IN" />
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-12">
              <div className="space-y-10 xl:col-span-8">
                <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur">
                  <div className="flex flex-col gap-4 border-b border-[#eff3f8] px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-xl font-black text-[#0f172a]">Active Ledger</h2>
                      <p className="mt-1 text-xs font-medium text-[#94a3b8]">Tracking {searchableLedger.length} buyer RFQs with live quotation activity.</p>
                    </div>
                    <Link href="/buyer/rfq?view=my" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#0f4fb6] transition hover:gap-2">
                      Complete History
                      <span className="text-sm">→</span>
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#fbfcfe]">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#9aa3b2] md:px-8">Identifier</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#9aa3b2] md:px-8">Resource Title</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#9aa3b2] md:px-8">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#9aa3b2] md:px-8">Quotes</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.22em] text-[#9aa3b2] md:px-8">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9]">
                        {searchableLedger.slice(0, 5).map((rfq) => (
                          <tr key={rfq.id} className="group transition hover:bg-[#fbfcff]">
                            <td className="px-6 py-5 font-mono text-[11px] font-bold text-[#7b8798] md:px-8">{buildRfqIdentifier(rfq.id)}</td>
                            <td className="px-6 py-5 md:px-8">
                              <Link href="/buyer/rfq?view=my" className="font-[family-name:var(--font-display)] text-sm font-extrabold text-[#0f172a] transition group-hover:text-[#0f4fb6]">{rfq.title}</Link>
                              <p className="mt-1 text-xs text-[#94a3b8]">{rfq.delivery_location}</p>
                            </td>
                            <td className="px-6 py-5 md:px-8">
                              <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${rfqStatusClasses[rfq.status]}`}>{rfqStatusLabels[rfq.status]}</span>
                            </td>
                            <td className="px-6 py-5 text-sm text-[#475569] md:px-8">{rfq.quotations.length} {rfq.quotations.length === 1 ? "response" : "responses"}</td>
                            <td className="px-6 py-5 text-right text-xs text-[#94a3b8] md:px-8">{formatShortDate(new Date(getLatestRfqTouch(rfq)).toISOString())}</td>
                          </tr>
                        ))}
                        {searchableLedger.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#64748b] md:px-8">No RFQs matched your search. Try another keyword or create a new request.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="recent-activity">
                  <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-display)] text-2xl font-black text-[#0f172a]">
                    <span className="h-1 w-10 rounded-full bg-[#0f4fb6]" />
                    Recent Activity
                  </h2>
                  <div className="space-y-4">
                    {activityFeed.length > 0 ? activityFeed.map((activity) => <ActivityCard key={activity.id} activity={activity} />) : (
                      <div className="rounded-[1.6rem] border border-white/80 bg-white/80 p-6 text-sm text-[#64748b] shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                        No recent buyer activity matched your current search.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-8 xl:col-span-4">
                <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#0f4fb6]/6 blur-2xl" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9aa3b2]">Priority Actions</h3>
                  <div className="mt-6 space-y-3">
                    <QuickActionLink href="/buyer/rfq" glyph="RF" label="Create New RFQ" badge={`${openBuyerRfqs.length} LIVE`} />
                    <QuickActionLink href="/buyer/orders" glyph="OR" label="Review All Orders" badge={`${orders.length} TRACKED`} />
                    <QuickActionLink href="/buyer/rfq?view=my" glyph="QT" label="Compare Supplier Quotes" badge={`${pendingAwardRfqs.length} HOT`} />
                  </div>
                </section>

                <section id="supplier-health" className="relative overflow-hidden rounded-[2.5rem] bg-[#0f172a] p-8 text-white shadow-[0_30px_60px_rgba(15,23,42,0.28)]">
                  <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#0f4fb6]/20 blur-3xl opacity-60" />
                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#b9c7df]">
                        <Glyph label="AI" tone="dark" />
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold">Supplier Health</h3>
                    </div>
                    <p className="mt-5 text-sm leading-7 text-[#a5b1c2]">Real marketplace intelligence built from your active RFQs, supplier participation depth, and award readiness.</p>
                    <div className="mt-8 space-y-7">
                      <HealthBar label="Response Coverage" value={`${supplierCoverage}%`} progress={supplierCoverage} tone="blue" />
                      <HealthBar label="Award Readiness" value={`${awardReadiness}%`} progress={awardReadiness} tone="amber" />
                      <HealthBar label="Supplier Depth" value={`${uniqueSuppliers.size} active`} progress={supplierDepth} tone="blue" />
                    </div>
                    <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#94a3b8]">Workspace Summary</p>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-[#94a3b8]">Buyer Type</p><p className="mt-1 font-bold text-white">{organizationLabel}</p></div>
                        <div><p className="text-[#94a3b8]">Supplier Reach</p><p className="mt-1 font-bold text-white">{uniqueSuppliers.size} vendors</p></div>
                        <div><p className="text-[#94a3b8]">Open Orders</p><p className="mt-1 font-bold text-white">{orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length}</p></div>
                        <div><p className="text-[#94a3b8]">Catalog Depth</p><p className="mt-1 font-bold text-white">{liveCatalog.length} listings</p></div>
                      </div>
                    </div>
                    <Link href="/buyer/rfq?view=my" className="mt-8 inline-flex w-full items-center justify-center rounded-[1.2rem] bg-white px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#111827] transition hover:bg-[#f6f7fb]">
                      Access Buyer Report
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
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
        <path d="M3 12a9 9 0 0 0 15.55 6.36L21 16" />
        <path d="M21 12A9 9 0 0 0 5.64 5.64L3 8" />
        <path d="M3 3v5h5" />
        <path d="M16 16h5v5" />
      </svg>
    )
  }

  return <span className="text-[10px] font-black uppercase">{label}</span>
}

function MetricCard({
  label,
  value,
  hint,
  trend,
  accent,
  glyph,
}: {
  label: string
  value: string
  hint: string
  trend: number[]
  accent: "blue" | "slate" | "amber" | "dark"
  glyph: string
}) {
  const palette =
    accent === "blue"
      ? {
          shell: "border-white/80 bg-white text-[#0f172a]",
          bar: "bg-[#0f4fb6]/18 group-hover:bg-[#0f4fb6]/34",
          label: "text-[#98a2b3]",
          hint: "text-[#10b981]",
          tone: "blue" as const,
        }
      : accent === "slate"
        ? {
            shell: "border-white/80 bg-white text-[#0f172a]",
            bar: "bg-[#475569]/18 group-hover:bg-[#475569]/32",
            label: "text-[#98a2b3]",
            hint: "text-[#94a3b8]",
            tone: "slate" as const,
          }
        : accent === "amber"
          ? {
              shell: "border-white/80 bg-white text-[#0f172a]",
              bar: "bg-[#a93802]/18 group-hover:bg-[#a93802]/32",
              label: "text-[#98a2b3]",
              hint: "text-[#a93802]",
              tone: "amber" as const,
            }
          : {
              shell: "border-[#0f172a] bg-[#0f172a] text-white",
              bar: "bg-white/10 group-hover:bg-white/24",
              label: "text-[#64748b]",
              hint: "text-[#cbd5e1]",
              tone: "dark" as const,
            }

  return (
    <article className={`group rounded-[1.8rem] border p-6 shadow-[0_15px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 ${palette.shell}`}>
      <div className="flex items-start justify-between">
        <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${palette.label}`}>{label}</p>
        <Glyph label={glyph} tone={palette.tone} />
      </div>
      <div className="mt-5">
        <h3 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-[-0.04em]">{value}</h3>
        <p className={`mt-2 text-xs font-semibold ${palette.hint}`}>{hint}</p>
      </div>
      <div className="mt-5 flex h-10 items-end gap-1">
        {trend.map((height, index) => (
          <span key={`${height}-${index}`} className={`block w-full rounded-t-sm transition ${palette.bar}`} style={{ height: `${height}%` }} />
        ))}
      </div>
    </article>
  )
}

function ActivityCard({ activity }: { activity: DashboardActivity }) {
  const tone =
    activity.accent === "blue"
      ? { border: "border-l-[#0f4fb6]", glyph: "blue" as const }
      : activity.accent === "amber"
        ? { border: "border-l-[#a93802]", glyph: "amber" as const }
        : { border: "border-l-[#475569]", glyph: "slate" as const }

  return (
    <article className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className={`flex gap-4 rounded-[1.5rem] border-l-4 px-1 ${tone.border}`}>
        <div className="mt-1">
          <Glyph label={activity.glyph} tone={tone.glyph} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-7 text-[#0f172a]">{activity.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-[#94a3b8]">
            <span>{formatRelativeTime(activity.timestamp)}</span>
            <span>{activity.detail}</span>
            {activity.amount ? (
              <span className="rounded-md bg-[#f3f6fa] px-2 py-1 text-[10px] font-black text-[#475569]">{activity.amount}</span>
            ) : null}
          </div>
        </div>
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
      className="group flex items-center justify-between rounded-[1.2rem] border border-[#edf1f7] bg-[#f8fafc] px-5 py-4 transition hover:border-[#0f4fb6] hover:bg-[#0f4fb6] hover:text-white"
    >
      <div className="flex items-center gap-4">
        <Glyph label={glyph} tone="blue" />
        <span className="text-sm font-extrabold">{label}</span>
      </div>
      <div className="rounded-lg bg-[#e8efff] px-2.5 py-1 text-[10px] font-black text-[#0f4fb6] transition group-hover:bg-white/15 group-hover:text-white">
        {badge}
      </div>
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
  const barTone = tone === "blue" ? "bg-[#0f4fb6]" : "bg-[#f59e0b]"
  const shadowTone = tone === "blue" ? "rgba(15,79,182,0.55)" : "rgba(245,158,11,0.45)"

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-[#94a3b8]">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div className={`${barTone} h-full rounded-full`} style={{ width: `${Math.max(8, progress)}%`, boxShadow: `0 0 14px ${shadowTone}` }} />
      </div>
    </div>
  )
}
