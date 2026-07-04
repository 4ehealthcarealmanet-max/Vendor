"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import BuyerNavbar from "@/components/buyer/BuyerNavbar"
import BuyerFooter from "@/components/buyer/BuyerFooter"
import SupplierNavbar from "@/components/supplier/SupplierNavbar"
import SupplierFooter from "@/components/supplier/SupplierFooter"
import {
  acceptPo,
  clearToken,
  createSubcontractRfq,
  getApiErrorMessage,
  getCurrentUser,
  getOrders,
  getProducts,
  isAuthSessionError,
  markOrderReceived,
  logoutUser,
  reorderFromOrder,
  updateOrderTracking,
  confirmPayment,
  makeDummyPayment,
} from "@/services"
import type { VendorOrder, VendorProductService } from "@/services"

type SupplierOrderFilter = "all" | "pending" | "in_progress" | "shipped" | "completed"

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toNumber(value))

const shortDate = (value?: string | null) => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" })
}

const shortDateTime = (value?: string | null) => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const readable = (value: string) => value.replaceAll("_", " ")

const orderBucket = (order: VendorOrder): SupplierOrderFilter => {
  if (order.status === "completed" || order.status === "goods_received" || order.delivery_status === "delivered") return "completed"
  if (order.status === "shipped" || order.status === "delivered" || order.delivery_status === "in_transit" || order.delivery_status === "out_for_delivery") return "shipped"
  if (order.status === "processing" || order.status === "ready_to_dispatch" || order.status === "po_accepted" || order.delivery_status === "loaded") return "in_progress"
  return "pending"
}

const orderStatusLabel = (order: VendorOrder) => {
  if (order.status === "po_released") return "Pending"
  if (order.status === "po_accepted") return "Accepted"
  if (order.status === "partially_subcontracted") return "Processing"
  if (order.status === "ready_to_dispatch") return "Ready"
  if (order.status === "goods_received") return "Completed"
  return readable(order.status)
}

const statusChipClass = (order: VendorOrder) => {
  const bucket = orderBucket(order)
  if (bucket === "completed") return "bg-[#dbeafe] text-[#0f4fb6]"
  if (bucket === "shipped") return "bg-[#e0ecff] text-[#1d4ed8]"
  if (bucket === "in_progress") return "bg-[#eef4ff] text-[#2459c4]"
  return "bg-[#f3f7ff] text-[#3b5fb8]"
}

const paymentStatusLabel = (status: VendorOrder["payment_status"]) => {
  if (status === "payment_requested") return "Payment Requested"
  if (status === "partially_paid") return "Partially Paid"
  return readable(status)
}

const paymentStatusChipClass = (status: VendorOrder["payment_status"]) => {
  if (status === "paid") return "bg-emerald-100 text-emerald-800"
  if (status === "partially_paid") return "bg-blue-100 text-blue-800"
  if (status === "payment_requested") return "bg-purple-100 text-purple-800"
  if (status === "overdue") return "bg-rose-100 text-rose-800"
  return "bg-amber-100 text-amber-800" // pending
}


const nextTrackingPayload = (order: VendorOrder): Partial<Pick<VendorOrder, "status" | "delivery_status" | "tracking_note">> | null => {
  if (order.status === "po_accepted") return { status: "processing", delivery_status: "loaded", tracking_note: "Order is being processed by supplier." }
  if (order.status === "processing" || order.status === "partially_subcontracted") return { status: "ready_to_dispatch", delivery_status: "loaded", tracking_note: "Order packed and ready to dispatch." }
  if (order.status === "ready_to_dispatch") return { status: "shipped", delivery_status: "in_transit", tracking_note: "Shipment is in transit." }
  if (order.status === "shipped") return { status: "delivered", delivery_status: "delivered", tracking_note: "Shipment delivered to buyer location." }
  return null
}

const nextActionLabel = (order: VendorOrder) => {
  if (order.status === "po_released") return "Accept PO"
  if (order.status === "po_accepted") return "Start Processing"
  if (order.status === "processing" || order.status === "partially_subcontracted") return "Ready to Dispatch"
  if (order.status === "ready_to_dispatch") return "Mark Shipped"
  if (order.status === "shipped") return "Mark Delivered"
  return ""
}

const orderProductSummary = (order: VendorOrder, products: VendorProductService[]) =>
  order.items
    .map((item) => {
      const product = products.find((entry) => entry.id === item.product)
      return `${product?.name || `Product #${item.product}`} x ${item.quantity}`
    })
    .join(", ") || "No items"

const canMarkReceived = (order: VendorOrder) =>
  order.delivery_status === "delivered" && order.status !== "goods_received" && order.status !== "completed"

const canSubcontract = (order: VendorOrder, products: VendorProductService[]) => {
  if (["completed", "cancelled", "shipped", "delivered", "goods_received", "ready_to_dispatch", "partially_subcontracted"].includes(order.status)) return false
  return order.items.some((item) => {
    const product = products.find((p) => p.id === item.product)
    // Show subcontract option only if we don't have enough stock for THIS item
    return product && product.stock < item.quantity
  })
}

const printOrderPdf = (order: VendorOrder, products: VendorProductService[]) => {
  const doc = window.open("", "_blank", "width=900,height=700")
  if (!doc) return

  const items = order.items
    .map((item) => {
      const product = products.find((entry) => entry.id === item.product)
      return `<tr><td>${product?.name || `Product #${item.product}`}</td><td>${item.quantity}</td><td>${money(item.price)}</td><td>${money(item.quantity * item.price)}</td></tr>`
    })
    .join("")

  doc.document.write(`
    <html>
      <head>
        <title>Order HL-ORD-${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
          .head { display: flex; justify-content: space-between; border-bottom: 2px solid #0f4fb6; padding-bottom: 16px; }
          h1 { margin: 0; font-size: 28px; }
          .chip { display: inline-block; margin-top: 10px; padding: 6px 10px; border-radius: 999px; background: #eef4ff; color: #0f4fb6; font-weight: 700; text-transform: capitalize; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 24px 0; }
          .box { border: 1px solid #dbe4ef; border-radius: 12px; padding: 12px; background: #f8fbff; }
          .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
          .value { margin-top: 6px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border-bottom: 1px solid #e5e9f0; padding: 12px; text-align: left; }
          th { background: #f6f8fb; color: #475569; font-size: 12px; text-transform: uppercase; }
          .total { text-align: right; font-size: 22px; font-weight: 800; margin-top: 20px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="float:right;padding:10px 14px;border:0;border-radius:8px;background:#0f4fb6;color:white;font-weight:700;">Download / Save PDF</button>
        <div class="head">
          <div>
            <h1>Supplier Order Report</h1>
            <div class="chip">${orderStatusLabel(order)}</div>
          </div>
          <div>
            <p><strong>Order:</strong> HL-ORD-${order.id}</p>
            <p><strong>Generated:</strong> ${shortDate(new Date().toISOString())}</p>
          </div>
        </div>
        <div class="grid">
          <div class="box"><div class="label">Buyer</div><div class="value">Buyer #${order.buyer}</div></div>
          <div class="box"><div class="label">Buyer Type</div><div class="value">${order.buyer_type || "-"}</div></div>
          <div class="box"><div class="label">Order Date</div><div class="value">${shortDate(order.created_at)}</div></div>
          <div class="box"><div class="label">Delivery Status</div><div class="value">${readable(order.delivery_status)}</div></div>
          <div class="box"><div class="label">Tracking Note</div><div class="value">${order.tracking_note || "No tracking note"}</div></div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
        <div class="total">Total Amount: ${money(order.total_amount)}</div>
      </body>
    </html>
  `)
  doc.document.close()
  doc.focus()
}

export default function OrderPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState<string>("")
  const [userRole, setUserRole] = useState<"supplier" | "buyer" | "admin" | "">("")
  const [buyerType, setBuyerType] = useState<string>("")
  const [feedback, setFeedback] = useState<string>("")
  const [orderFilter, setOrderFilter] = useState<SupplierOrderFilter>("all")
  const [orderSearch, setOrderSearch] = useState("")
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [shortageQuantity, setShortageQuantity] = useState<number>(1)
  const [supplierRoleFilter, setSupplierRoleFilter] = useState<"all" | "supplying" | "buying">("all")
  const [hasActiveSub, setHasActiveSub] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedUsername = sessionStorage.getItem("orders_username") || ""
      const cachedUserRole = (sessionStorage.getItem("orders_user_role") as any) || ""
      const cachedBuyerType = sessionStorage.getItem("orders_buyer_type") || ""
      const cachedUserId = sessionStorage.getItem("orders_user_id")

      let cachedProducts: VendorProductService[] = []
      const storedProducts = sessionStorage.getItem("orders_products")
      if (storedProducts) {
        try { cachedProducts = JSON.parse(storedProducts) } catch {}
      }

      let cachedOrders: VendorOrder[] = []
      const storedOrders = sessionStorage.getItem("orders_list")
      if (storedOrders) {
        try { cachedOrders = JSON.parse(storedOrders) } catch {}
      }

      if (cachedUsername) setUsername(cachedUsername)
      if (cachedUserRole) setUserRole(cachedUserRole)
      if (cachedBuyerType) setBuyerType(cachedBuyerType)
      if (cachedUserId) setUserId(Number(cachedUserId))
      if (cachedProducts.length > 0) setProducts(cachedProducts)
      if (cachedOrders.length > 0) setOrders(cachedOrders)

      const hasCache = Boolean(storedProducts && storedOrders && cachedUsername)
      setLoading(!hasCache)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!sessionStorage.getItem("orders_list")) {
          setLoading(true)
        }
        const me = await getCurrentUser()
        if (pathname?.startsWith("/buyer") && me.role === "supplier") {
          router.replace("/supplier/orders")
          return
        }
        if (pathname?.startsWith("/supplier") && me.role === "buyer") {
          router.replace("/buyer/orders")
          return
        }
        if (!me.has_active_subscription) {
          router.replace(me.role === "supplier" ? "/supplier/subscription" : "/buyer/subscription")
          return
        }
        setUserId(me.id)
        setUsername(me.username)
        setUserRole(me.role)
        setBuyerType(me.buyer_type || "")
        setHasActiveSub(me.has_active_subscription ?? true)
        const [productList, orderList] = await Promise.all([getProducts(), getOrders()])
        setProducts(productList)
        setOrders(orderList)

        // Cache for next visit
        sessionStorage.setItem("orders_products", JSON.stringify(productList))
        sessionStorage.setItem("orders_list", JSON.stringify(orderList))
        sessionStorage.setItem("orders_user_id", String(me.id))
        sessionStorage.setItem("orders_username", me.username)
        sessionStorage.setItem("orders_user_role", me.role)
        sessionStorage.setItem("orders_buyer_type", me.buyer_type || "")
      } catch (error) {
        if (isAuthSessionError(error)) {
          clearToken()
          setFeedback("You are not authenticated. Redirecting to login...")
          router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login")
          return
        }

        setFeedback("Could not load orders right now. Check the backend API and try again.")
      } finally {
        setLoading(false)
      }
    }
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

  const isBuyerRoute = pathname?.startsWith("/buyer") || userRole === "buyer"
  const isSupplierRoute = pathname?.startsWith("/supplier") || userRole === "supplier"
  const userOrders = useMemo(() => {
    if (userRole === "buyer") return orders.filter((order) => order.buyer === userId)
    if (userRole === "supplier") {
      return orders.filter((order) => order.vendor_user_id === userId || order.buyer === userId)
    }
    return orders
  }, [orders, userId, userRole])

  const roleFilteredOrders = useMemo(() => {
    if (userRole !== "supplier") return userOrders
    if (supplierRoleFilter === "supplying") {
      return userOrders.filter((order) => order.vendor_user_id === userId)
    }
    if (supplierRoleFilter === "buying") {
      return userOrders.filter((order) => order.buyer === userId)
    }
    return userOrders
  }, [userOrders, supplierRoleFilter, userRole, userId])

  const selectedOrder = useMemo(() => roleFilteredOrders.find((order) => order.id === selectedOrderId) ?? null, [roleFilteredOrders, selectedOrderId])

  const orderTabs: Array<{ key: SupplierOrderFilter; label: string; count: number }> = useMemo(
    () => [
      { key: "all", label: "All Orders", count: roleFilteredOrders.length },
      { key: "pending", label: "Pending", count: roleFilteredOrders.filter((order) => orderBucket(order) === "pending").length },
      { key: "in_progress", label: "In Progress", count: roleFilteredOrders.filter((order) => orderBucket(order) === "in_progress").length },
      { key: "shipped", label: "Shipped", count: roleFilteredOrders.filter((order) => orderBucket(order) === "shipped").length },
      { key: "completed", label: "Completed", count: roleFilteredOrders.filter((order) => orderBucket(order) === "completed").length },
    ],
    [roleFilteredOrders]
  )

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()
    return roleFilteredOrders.filter((order) => {
      const matchesFilter = orderFilter === "all" || orderBucket(order) === orderFilter
      const searchable = [
        `HL-ORD-${order.id}`,
        `ORD-${order.id}`,
        `Buyer #${order.buyer}`,
        order.buyer_username || "",
        order.vendor_name || "",
        `Vendor #${order.vendor}`,
        order.buyer_type || "",
        order.status,
        orderStatusLabel(order),
        order.delivery_status,
        readable(order.delivery_status),
        order.payment_status,
        paymentStatusLabel(order.payment_status),
        order.tracking_note,
        orderProductSummary(order, products),
      ]
        .join(" ")
        .toLowerCase()
      return matchesFilter && (!query || searchable.includes(query))
    })
  }, [orderFilter, orderSearch, roleFilteredOrders, products])
  const moveOrderForward = async (order: VendorOrder) => {
    try {
      setUpdatingOrderId(order.id)
      setFeedback("")
      const updated =
        order.status === "po_released"
          ? await acceptPo(order.id)
          : await updateOrderTracking(order.id, nextTrackingPayload(order) ?? {})
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setFeedback(`Order HL-ORD-${updated.id} updated to ${orderStatusLabel(updated)}.`)
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "Could not update order tracking."))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const replaceOrder = (updated: VendorOrder) => {
    setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  const runOrderMutation = async (
    order: VendorOrder,
    request: () => Promise<VendorOrder>,
    successMessage: (updated: VendorOrder) => string,
    errorMessage: string
  ) => {
    try {
      setUpdatingOrderId(order.id)
      setFeedback("")
      const updated = await request()
      replaceOrder(updated)
      setFeedback(successMessage(updated))
    } catch (error) {
      setFeedback(getApiErrorMessage(error, errorMessage))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleBuyerReceive = async (order: VendorOrder) => {
    await runOrderMutation(
      order,
      () => markOrderReceived(order.id),
      (updated) => `Order HL-ORD-${updated.id} marked as goods received.`,
      "Could not mark goods as received."
    )
  }

  const handleMakePayment = async (order: VendorOrder) => {
    await runOrderMutation(
      order,
      () => makeDummyPayment(order.id),
      (updated) => `Payment recorded. Waiting for supplier verification.`,
      "Could not request payment verification."
    )
  }

  const handleConfirmPayment = async (order: VendorOrder) => {
    await runOrderMutation(
      order,
      () => confirmPayment(order.id),
      (updated) => `Payment receipt confirmed for Order HL-ORD-${updated.id}.`,
      "Could not confirm payment receipt."
    )
  }

  const handleReorder = async (order: VendorOrder) => {
    try {
      setUpdatingOrderId(order.id)
      setFeedback("")
      const created = await reorderFromOrder(order.id)
      setOrders((prev) => [created, ...prev])
      setSelectedOrderId(created.id)
      setFeedback(`Reorder created as order HL-ORD-${created.id}.`)
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "Could not create reorder."))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleSubcontract = async (order: VendorOrder) => {
    if (!Number.isInteger(shortageQuantity) || shortageQuantity < 1) {
      setFeedback("Shortage quantity must be a whole number greater than 0.")
      return
    }

    try {
      setUpdatingOrderId(order.id)
      setFeedback("")
      const result = await createSubcontractRfq(order.id, shortageQuantity)
      const refreshed = await getOrders()
      setOrders(refreshed)
      setFeedback(
        `Subcontract RFQ #${result.subcontract_rfq_id} created for order HL-ORD-${order.id}.`
      )
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "Could not create subcontract RFQ."))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a] flex flex-col">
        {isBuyerRoute ? (
          <BuyerNavbar
            active="orders"
            username={username}
            buyerType={buyerType || null}
            hasActiveSubscription={hasActiveSub}
            onSignOut={signOut}
          />
        ) : isSupplierRoute ? (
          <SupplierNavbar
            active="orders"
            username={username}
            onSignOut={signOut}
          />
        ) : null}
        <main className={`w-full py-8 md:py-12 ${isSupplierRoute || isBuyerRoute ? "mx-auto max-w-[1600px] px-6 md:px-8 pb-24" : ""} flex-1 flex flex-col justify-center items-center min-h-[75vh]`}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <div className="absolute h-3 w-3 rounded-full bg-blue-600 animate-ping" />
            </div>
            <span className="text-sm font-bold text-slate-500 tracking-tight">
              Loading purchase orders...
            </span>
          </div>
        </main>
        {isBuyerRoute ? <BuyerFooter /> : isSupplierRoute ? <SupplierFooter /> : null}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] flex flex-col">
      {isBuyerRoute ? (
        <BuyerNavbar
          active="orders"
          username={username}
          buyerType={buyerType || null}
          hasActiveSubscription={hasActiveSub}
          onSignOut={signOut}
        />
      ) : isSupplierRoute ? (
        <SupplierNavbar
          active="orders"
          username={username}
          onSignOut={signOut}
        />
      ) : null}
      <main className={`min-h-[75vh] flex-1 w-full py-8 md:py-12 ${isSupplierRoute || isBuyerRoute ? "mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 pb-12" : ""}`}>
        <div className={`${isBuyerRoute || isSupplierRoute ? "w-full max-w-full" : "health-container"} space-y-6`}>
          {isSupplierRoute ? (
            <>
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-slate-800">
                    Supplier <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Order Workspace</span>
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold text-slate-450 mt-1">
                    Manage incoming purchase orders, update shipping tracking, and review transaction history.
                  </p>
                </div>
                <Link href="/supplier/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-750 transition self-start sm:self-center">
                  ← Back to Dashboard
                </Link>
              </header>

              {/* Statistics & Overview Banner */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">Total Volume</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {money(roleFilteredOrders.reduce((sum, o) => sum + toNumber(o.total_amount), 0))}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">Active Ops</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {roleFilteredOrders.filter(o => ["in_progress", "shipped"].includes(orderBucket(o))).length} Orders
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-violet-50 text-violet-650 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">New POs</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {roleFilteredOrders.filter(o => o.status === "po_released").length} Pending
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">Fulfilled</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {roleFilteredOrders.filter(o => orderBucket(o) === "completed").length} Done
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              {feedback ? (
                <p className="rounded-xl border border-[#dbe8ff] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#355860] mb-6">{feedback}</p>
              ) : null}

              <section className="supplier-orders-panel rounded-xl border border-[#dbe4ef] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                {/* Transaction Role Segmented Toggle (Supplying vs Buying) */}
                <div className="flex justify-start border-b border-slate-100 pb-4 mb-4">
                  <div className="inline-flex rounded-xl p-1 bg-slate-100/80 border border-slate-200/50 shadow-inner">
                    {(
                      [
                        { key: "all", label: "All Transactions" },
                        { key: "supplying", label: "Supplying (Sales)" },
                        { key: "buying", label: "Buying (Subcontracts)" },
                      ] as const
                    ).map((option) => {
                      const active = supplierRoleFilter === option.key
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setSupplierRoleFilter(option.key)
                            setOrderFilter("all") // Reset status filter on toggle to avoid empty states
                          }}
                          className={`rounded-lg px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                            active
                              ? "bg-white text-blue-600 shadow-sm border border-slate-200/40"
                              : "text-slate-500 hover:text-slate-800 border border-transparent"
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {orderTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setOrderFilter(tab.key)}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition border ${orderFilter === tab.key
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-transparent text-slate-500 border-transparent md:hover:bg-slate-50"
                          }`}
                      >
                        {tab.label} <span className="opacity-70 text-[10px] ml-0.5">{tab.count}</span>
                      </button>
                    ))}
                  </div>

                  <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dbe4ef] bg-white px-4 py-2.5 text-sm text-[#94a3b8] md:min-w-[320px] lg:min-w-[360px]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search orders, buyers, or products..."
                      className="w-full border-0 bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                    />
                  </label>
                </div>

                {/* Desktop View Table: Hidden on Mobile */}
                <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border border-[#e5e9f0]">
                  <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                    <thead className="bg-[#f8fafc] text-[#0f172a]">
                      <tr>
                        <th className="px-5 py-4 font-bold">Order ID</th>
                        <th className="px-5 py-4 font-bold">
                          {supplierRoleFilter === "buying" ? "Supplier Name" : supplierRoleFilter === "supplying" ? "Buyer Name" : "Buyer / Supplier"}
                        </th>
                        <th className="px-5 py-4 font-bold">Ordered Product Summary</th>
                        <th className="px-5 py-4 font-bold">Amount</th>
                        <th className="px-5 py-4 font-bold">Order Status</th>
                        <th className="px-5 py-4 font-bold">Payment Status</th>
                        <th className="px-5 py-4 text-right font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2f6]">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="supplier-order-row transition hover:bg-[#fbfcff]">
                          <td className="px-5 py-4 font-bold text-[#0f172a]">HL-ORD-{String(order.id).padStart(4, "0")}</td>
                          <td className="px-5 py-4 font-semibold text-[#0f172a]">
                            {order.buyer === userId ? (
                              <span className="flex flex-col">
                                <span className="text-slate-800">{order.vendor_name || `Supplier #${order.vendor}`}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Subcontracted Supplier</span>
                              </span>
                            ) : (
                              <span className="flex flex-col">
                                <span className="text-slate-800">{order.buyer_username || `Buyer #${order.buyer}`}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Client</span>
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={orderProductSummary(order, products)}>
                            {orderProductSummary(order, products)}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-[#0f172a]">{money(order.total_amount)}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusChipClass(order)}`}>
                              {orderStatusLabel(order)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentStatusChipClass(order.payment_status)}`}>
                              {paymentStatusLabel(order.payment_status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/supplier/messages?partner_id=${order.buyer === userId ? order.vendor_user_id : order.buyer}`}
                                className="flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-750 rounded-lg cursor-pointer transition shadow-sm"
                                aria-label={order.buyer === userId ? "Message Supplier" : "Message Buyer"}
                                title={order.buyer === userId ? "Message Supplier" : "Message Buyer"}
                              >
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                Chat
                              </Link>
                              <Link
                                href={`/supplier/orders/${order.id}`}
                                className="flex items-center gap-1 border border-blue-200 bg-white hover:bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-650 rounded-lg cursor-pointer transition shadow-sm"
                              >
                                View Details
                              </Link>
                              <button
                                type="button"
                                onClick={() => printOrderPdf(order, products)}
                                className="rounded-lg border border-[#dbe4ef] bg-white p-2 text-[#64748b] transition hover:border-[#0f4fb6] hover:text-[#0f4fb6]"
                                aria-label={`Download PDF`}
                                title="Download PDF"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M12 3v12" />
                                  <path d="m7 10 5 5 5-5" />
                                  <path d="M5 21h14" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-[#64748b]">No orders matched this filter or search.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List: Block on Mobile, Hidden on Desktop */}
                <div className="mt-4 block md:hidden space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm font-semibold text-slate-400">
                      No orders matched this filter or search.
                    </div>
                  ) : (
                    filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-150 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.02)] md:hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition duration-300 space-y-4"
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md">
                              HL-ORD-{String(order.id).padStart(4, "0")}
                            </span>
                            <h4 className="text-sm font-bold text-slate-800 mt-1.5 truncate max-w-[160px]">
                              {order.buyer === userId ? (
                                <span className="text-slate-850">To: {order.vendor_name || `Supplier #${order.vendor}`}</span>
                              ) : (
                                <span className="text-slate-850">From: {order.buyer_username || `Buyer #${order.buyer}`}</span>
                              )}
                            </h4>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusChipClass(order)}`}>
                              {orderStatusLabel(order)}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${paymentStatusChipClass(order.payment_status)}`}>
                              {paymentStatusLabel(order.payment_status)}
                            </span>
                          </div>
                        </div>

                        {/* Product Summary */}
                        <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100" title={orderProductSummary(order, products)}>
                          {orderProductSummary(order, products)}
                        </p>

                        {/* Financial and Status Info */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Amount</span>
                            <span className="text-sm font-extrabold text-slate-800">{money(order.total_amount)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Order Date</span>
                            <span className="text-xs font-semibold text-slate-650">{shortDate(order.created_at)}</span>
                          </div>
                        </div>

                        {/* Dynamic Quick Actions */}
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-1">
                          <Link
                            href={`/supplier/orders/${order.id}`}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-650 md:hover:bg-blue-750 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 text-center"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/supplier/messages?partner_id=${order.buyer === userId ? order.vendor_user_id : order.buyer}`}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 py-2.5 text-xs font-bold text-slate-750 transition active:scale-95"
                          >
                            Chat
                          </Link>
                          <button
                            type="button"
                            onClick={() => printOrderPdf(order, products)}
                            className="rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 p-2.5 text-slate-500 md:hover:text-blue-600 transition"
                            aria-label="Download PDF"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M12 3v12" />
                              <path d="m7 10 5 5 5-5" />
                              <path d="M5 21h14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-slate-800">
                    Procurement <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Order Workspace</span>
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold text-slate-450 mt-1">
                    Monitor purchase orders, verify supplier delivery timelines, and manage transaction settlements.
                  </p>
                </div>
                <Link href="/buyer/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-750 transition self-start sm:self-center">
                  ← Back to Dashboard
                </Link>
              </header>

              {/* Statistics & Overview Banner */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">Total Volume</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {money(userOrders.reduce((sum, o) => sum + toNumber(o.total_amount), 0))}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">Active Ops</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {userOrders.filter(o => ["in_progress", "shipped"].includes(orderBucket(o))).length} Orders
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-violet-50 text-violet-650 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">New POs</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {userOrders.filter(o => o.status === "po_released").length} Pending
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] md:hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">Fulfilled</p>
                      <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-800 mt-0.5 truncate">
                        {userOrders.filter(o => orderBucket(o) === "completed").length} Done
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              {feedback ? (
                <p className="rounded-xl border border-[#dbe8ff] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#355860] mb-6">{feedback}</p>
              ) : null}

              <section className="supplier-orders-panel rounded-xl border border-[#dbe4ef] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {/* Wrapped capsule filter tabs on mobile, horizontal row on desktop */}
                  <div className="flex flex-wrap gap-1.5">
                    {orderTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setOrderFilter(tab.key)}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition border ${orderFilter === tab.key
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-transparent text-slate-500 border-transparent md:hover:bg-slate-50"
                          }`}
                      >
                        {tab.label} <span className="opacity-70 text-[10px] ml-0.5">{tab.count}</span>
                      </button>
                    ))}
                  </div>

                  <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dbe4ef] bg-white px-4 py-2.5 text-sm text-[#94a3b8] md:min-w-[320px] lg:min-w-[360px]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search orders, vendors, or products..."
                      className="w-full border-0 bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                    />
                  </label>
                </div>

                {/* Desktop View Table: Hidden on Mobile */}
                <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border border-[#e5e9f0]">
                  <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                    <thead className="bg-[#f8fafc] text-[#0f172a]">
                      <tr>
                        <th className="px-5 py-4 font-bold">Order ID</th>
                        <th className="px-5 py-4 font-bold">Vendor Name</th>
                        <th className="px-5 py-4 font-bold">Ordered Product Summary</th>
                        <th className="px-5 py-4 font-bold">Amount</th>
                        <th className="px-5 py-4 font-bold">Order Status</th>
                        <th className="px-5 py-4 font-bold">Payment Status</th>
                        <th className="px-5 py-4 text-right font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2f6]">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="supplier-order-row transition hover:bg-[#fbfcff]">
                          <td className="px-5 py-4 font-bold text-[#0f172a]">HL-ORD-{String(order.id).padStart(4, "0")}</td>
                          <td className="px-5 py-4 font-semibold text-[#0f172a]">{order.vendor_name || `Vendor #${order.vendor}`}</td>
                          <td className="px-5 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={orderProductSummary(order, products)}>
                            {orderProductSummary(order, products)}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-[#0f172a]">{money(order.total_amount)}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusChipClass(order)}`}>
                              {orderStatusLabel(order)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentStatusChipClass(order.payment_status)}`}>
                              {paymentStatusLabel(order.payment_status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/buyer/messages?partner_id=${order.vendor_user_id}`}
                                className="flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-750 rounded-lg cursor-pointer transition shadow-sm"
                                aria-label="Message Supplier"
                                title="Message Supplier"
                              >
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                Chat
                              </Link>
                              <Link
                                href={`/buyer/orders/${order.id}`}
                                className="flex items-center gap-1 border border-blue-200 bg-white hover:bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-650 rounded-lg cursor-pointer transition shadow-sm"
                              >
                                View Details
                              </Link>
                              <button
                                type="button"
                                onClick={() => printOrderPdf(order, products)}
                                className="rounded-lg border border-[#dbe4ef] bg-white p-2 text-[#64748b] transition hover:border-[#0f4fb6] hover:text-[#0f4fb6]"
                                aria-label={`Download PDF`}
                                title="Download PDF"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M12 3v12" />
                                  <path d="m7 10 5 5 5-5" />
                                  <path d="M5 21h14" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-12 text-center text-[#64748b]">No procurement orders found matching current criteria.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List: Block on Mobile, Hidden on Desktop */}
                <div className="mt-4 block md:hidden space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm font-semibold text-slate-400">
                      No procurement orders found matching criteria.
                    </div>
                  ) : (
                    filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-150 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.02)] md:hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition duration-300 space-y-4"
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md">
                              HL-ORD-{String(order.id).padStart(4, "0")}
                            </span>
                            <h4 className="text-sm font-bold text-slate-800 mt-1.5 truncate max-w-[160px]">
                              {order.vendor_name || `Vendor #${order.vendor}`}
                            </h4>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusChipClass(order)}`}>
                              {orderStatusLabel(order)}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${paymentStatusChipClass(order.payment_status)}`}>
                              {paymentStatusLabel(order.payment_status)}
                            </span>
                          </div>
                        </div>

                        {/* Product Summary */}
                        <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100" title={orderProductSummary(order, products)}>
                          {orderProductSummary(order, products)}
                        </p>

                        {/* Financial and Status Info */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Amount</span>
                            <span className="text-sm font-extrabold text-slate-800">{money(order.total_amount)}</span>
                          </div>
                        </div>

                        {/* Dynamic Quick Actions */}
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-1">
                          <Link
                            href={`/buyer/orders/${order.id}`}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 md:hover:bg-blue-700 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 text-center"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/buyer/messages?partner_id=${order.vendor_user_id}`}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition active:scale-95"
                          >
                            Chat
                          </Link>
                          <button
                            type="button"
                            onClick={() => printOrderPdf(order, products)}
                            className="rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 p-2.5 text-slate-500 md:hover:text-blue-600 transition"
                            aria-label="Download PDF"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M12 3v12" />
                              <path d="m7 10 5 5 5-5" />
                              <path d="M5 21h14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
        {selectedOrder ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(15,23,42,0.48)] px-0 sm:px-4">
            <div className="max-h-[92vh] w-full sm:max-w-4xl overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#dbe4ef] bg-white p-4 sm:p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] animate-slide-up sm:animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f4fb6]">Order Lifecycle</p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-black text-[#0f172a]">HL-ORD-{String(selectedOrder.id).padStart(4, "0")}</h2>
                </div>
                <button type="button" onClick={() => setSelectedOrderId(null)} className="rounded-xl border border-[#dbe4ef] bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-[#64748b] transition active:scale-95 cursor-pointer">
                  Close
                </button>
              </div>

              {/* Live Order Status Stepper */}
              <div className="mt-5 border border-slate-100 bg-[#fafcff] rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.15em] text-[#0f4fb6] flex items-center gap-2">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                    </svg>
                    Live Tracking Stepper
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">Real-time status updates</span>
                </div>

                {/* Stepper container: Row on Desktop, Column on Mobile */}
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-0 pt-2">
                  {/* Progress Line Background - Desktop Only */}
                  <div className="absolute hidden sm:block left-[12.5%] right-[12.5%] top-[20px] h-1 bg-slate-200 -translate-y-1/2 z-0" />

                  {/* Active Progress Line - Desktop Only */}
                  <div
                    className="absolute hidden sm:block left-[12.5%] top-[20px] h-1 bg-gradient-to-r from-blue-500 to-indigo-600 -translate-y-1/2 transition-all duration-500 z-[2]"
                    style={{
                      width:
                        selectedOrder.status === "completed" || selectedOrder.status === "goods_received" ? "75%" :
                          selectedOrder.status === "shipped" || selectedOrder.status === "delivered" ? "50%" :
                            ["po_accepted", "processing", "ready_to_dispatch", "partially_subcontracted"].includes(selectedOrder.status) ? "25%" : "0%"
                    }}
                  />

                  {/* Steps */}
                  {[
                    {
                      label: "PO Released",
                      desc: "Order Initiated",
                      active: true,
                      icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )
                    },
                    {
                      label: "Processing",
                      desc: "In Production",
                      active: ["po_accepted", "processing", "ready_to_dispatch", "partially_subcontracted", "shipped", "delivered", "goods_received", "completed"].includes(selectedOrder.status),
                      icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )
                    },
                    {
                      label: "Shipped",
                      desc: "In Transit",
                      active: ["shipped", "delivered", "goods_received", "completed"].includes(selectedOrder.status),
                      icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2m-2-1a2 2 0 11-4 0" />
                        </svg>
                      )
                    },
                    {
                      label: "Delivered",
                      desc: "Completed",
                      active: ["goods_received", "completed"].includes(selectedOrder.status),
                      icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )
                    }
                  ].map((step, idx) => (
                    <div key={idx} className="relative z-10 flex flex-row sm:flex-col items-center gap-3.5 sm:gap-0 sm:flex-1">
                      {/* Vertical line indicator for mobile */}
                      {idx > 0 && (
                        <div className={`absolute sm:hidden left-[19px] -top-6 w-0.5 h-6 ${step.active ? "bg-blue-600" : "bg-slate-200"}`} />
                      )}

                      <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${step.active
                        ? "bg-blue-600 border-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.3)]"
                        : "bg-slate-100 border-slate-350 text-slate-400"
                        }`}>
                        {step.icon}
                      </div>

                      <div className="flex flex-col sm:items-center text-left sm:text-center sm:mt-2 pl-2 sm:pl-0">
                        <span className="text-xs font-bold text-slate-800">{step.label}</span>
                        <span className="text-[9px] font-medium text-slate-400 mt-0.5">{step.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
                {selectedOrder.buyer === userId ? (
                  <InfoBox label="Vendor" value={selectedOrder.vendor_name || `Vendor #${selectedOrder.vendor}`} />
                ) : (
                  <InfoBox label="Buyer" value={selectedOrder.buyer_username || `Buyer #${selectedOrder.buyer}`} />
                )}
                <InfoBox label="Buyer Type" value={selectedOrder.buyer_type || "Institution"} />
                <InfoBox label="Order Date" value={shortDate(selectedOrder.created_at)} />
                <InfoBox label="Amount" value={money(selectedOrder.total_amount)} />
                <InfoBox label="Order Status" value={orderStatusLabel(selectedOrder)} />
                <InfoBox label="Delivery Status" value={readable(selectedOrder.delivery_status)} />
                <InfoBox label="Payment Status" value={paymentStatusLabel(selectedOrder.payment_status)} />
                <InfoBox label="Items" value={orderProductSummary(selectedOrder, products)} />
              </div>

              <div className="mt-4 rounded-xl border border-[#dbe4ef] bg-[#f8fbff] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748b]">Tracking Note</p>
                <p className="mt-2 text-sm leading-6 text-[#0f172a]">{selectedOrder.tracking_note || "No tracking note yet."}</p>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-2xl border border-[#dbe4ef] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#64748b]">Timeline</h3>
                    <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#0f4fb6]">
                      {selectedOrder.events.length} events
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedOrder.events.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[#dbe4ef] px-4 py-5 text-sm text-[#64748b]">
                        Timeline will appear here as the order moves through PO, shipping, receipt, and payment.
                      </p>
                    ) : (
                      selectedOrder.events.map((event) => (
                        <div key={event.id} className="rounded-xl border border-[#e7edf5] bg-[#fbfdff] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-[#0f172a]">{event.message}</p>
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                              {shortDateTime(event.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#64748b]">
                            {event.actor_name || "System"} {event.actor_role ? `(${readable(event.actor_role)})` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#dbe4ef] bg-white p-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#64748b]">Actions</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => printOrderPdf(selectedOrder, products)} className="rounded-xl bg-[#0f4fb6] px-4 py-3 text-sm font-black text-white">
                      Download PDF
                    </button>

                    {selectedOrder.buyer === userId && selectedOrder.payment_status !== "paid" && selectedOrder.payment_status !== "payment_requested" ? (
                      <button
                        type="button"
                        onClick={() => handleMakePayment(selectedOrder)}
                        disabled={updatingOrderId === selectedOrder.id}
                        className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-black text-purple-700 disabled:opacity-60"
                      >
                        {updatingOrderId === selectedOrder.id ? "Updating..." : "Mark as Paid"}
                      </button>
                    ) : null}

                    {selectedOrder.payment_status === "payment_requested" && (selectedOrder.vendor_user_id === userId || selectedOrder.buyer !== userId) ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmPayment(selectedOrder)}
                        disabled={updatingOrderId === selectedOrder.id}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 disabled:opacity-60"
                      >
                        {updatingOrderId === selectedOrder.id ? "Updating..." : "Confirm Payment"}
                      </button>
                    ) : null}

                    {isSupplierRoute && nextActionLabel(selectedOrder) && (selectedOrder.vendor_user_id === userId || selectedOrder.buyer !== userId) ? (
                      <button
                        type="button"
                        onClick={() => moveOrderForward(selectedOrder)}
                        disabled={updatingOrderId === selectedOrder.id}
                        className="rounded-xl border border-[#cdd9f4] bg-white px-4 py-3 text-sm font-black text-[#0f4fb6] disabled:opacity-60"
                      >
                        {updatingOrderId === selectedOrder.id ? "Updating..." : nextActionLabel(selectedOrder)}
                      </button>
                    ) : null}

                    {selectedOrder.buyer === userId && canMarkReceived(selectedOrder) ? (
                      <button
                        type="button"
                        onClick={() => handleBuyerReceive(selectedOrder)}
                        disabled={updatingOrderId === selectedOrder.id}
                        className="rounded-xl border border-[#d9e7d1] bg-[#f6fff0] px-4 py-3 text-sm font-black text-[#2d6a2d] disabled:opacity-60"
                      >
                        {updatingOrderId === selectedOrder.id ? "Updating..." : "Mark Goods Received"}
                      </button>
                    ) : null}

                    {selectedOrder.buyer === userId ? (
                      <button
                        type="button"
                        onClick={() => handleReorder(selectedOrder)}
                        disabled={updatingOrderId === selectedOrder.id}
                        className="rounded-xl border border-[#dbe4ef] bg-white px-4 py-3 text-sm font-black text-[#0f4fb6] disabled:opacity-60"
                      >
                        {updatingOrderId === selectedOrder.id ? "Updating..." : "Reorder"}
                      </button>
                    ) : null}
                  </div>

                  {isSupplierRoute && selectedOrder.vendor_user_id === userId && canSubcontract(selectedOrder, products) ? (
                    <div className="mt-5 rounded-xl border border-[#dbe4ef] bg-[#f8fbff] p-4">
                      <p className="text-sm font-bold text-[#0f172a]">Need subcontract support?</p>
                      <p className="mt-1 text-sm text-[#64748b]">
                        If you cannot fulfill the full quantity, create a fresh RFQ for the shortage and continue the cycle.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          value={shortageQuantity}
                          onChange={(event) => setShortageQuantity(Number(event.target.value))}
                          className="w-32 rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f4fb6]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubcontract(selectedOrder)}
                          disabled={updatingOrderId === selectedOrder.id}
                          className="rounded-xl border border-[#dbe4ef] bg-white px-4 py-3 text-sm font-black text-[#0f4fb6] disabled:opacity-60"
                        >
                          {updatingOrderId === selectedOrder.id ? "Creating..." : "Create Subcontract RFQ"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          </div>
        ) : null}
        <style jsx>{`
        .supplier-orders-hero,
        .supplier-orders-panel {
          position: relative;
          overflow: hidden;
          animation: orders-rise 420ms ease both;
        }

        .supplier-orders-hero::before,
        .supplier-orders-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(110deg, transparent 0%, rgba(15, 79, 182, 0.05) 45%, transparent 74%);
          opacity: 0;
          transform: translateX(-45%);
          transition: opacity 220ms ease, transform 760ms ease;
        }

        .supplier-orders-hero:hover::before,
        .supplier-orders-panel:hover::before {
          opacity: 1;
          transform: translateX(45%);
        }

        .supplier-orders-panel,
        .supplier-orders-hero,
        .supplier-order-row,
        button,
        input {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease;
        }

        .supplier-orders-panel:hover,
        .supplier-orders-hero:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.1);
        }

        .supplier-order-row:hover {
          transform: translateX(2px);
        }

        button:hover {
          transform: translateY(-1px);
        }

        input:focus {
          box-shadow: 0 0 0 4px rgba(15, 79, 182, 0.08);
        }

        @keyframes orders-rise {
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dbe4ef] bg-[#f8fbff] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">{label}</p>
      <p className="mt-2 text-sm font-bold capitalize text-[#0f172a]">{value}</p>
    </div>
  )
}
