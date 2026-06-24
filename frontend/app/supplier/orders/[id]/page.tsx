"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useParams } from "next/navigation"
import Link from "next/link"
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
  logoutUser,
  updateOrderTracking,
} from "@/services"
import type { VendorOrder, VendorProductService } from "@/services"

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

type SupplierOrderFilter = "all" | "pending" | "in_progress" | "shipped" | "completed"

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
  if (bucket === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-100"
  if (bucket === "shipped") return "bg-blue-50 text-blue-700 border-blue-100"
  if (bucket === "in_progress") return "bg-amber-50 text-amber-700 border-amber-100"
  return "bg-slate-50 text-slate-650 border-slate-100"
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

const canSubcontract = (order: VendorOrder, products: VendorProductService[]) => {
  if (["completed", "cancelled", "shipped", "delivered", "goods_received", "ready_to_dispatch", "partially_subcontracted"].includes(order.status)) return false
  return order.items.some((item) => {
    const product = products.find((p) => p.id === item.product)
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

export default function SupplierOrderDetailPage() {
  const { id } = useParams()
  const pathname = usePathname()
  const router = useRouter()

  const [order, setOrder] = useState<VendorOrder | null>(null)
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState<string>("")
  const [feedback, setFeedback] = useState<string>("")
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [shortageQuantity, setShortageQuantity] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const me = await getCurrentUser()
        if (me.role !== "supplier") {
          router.replace(me.role === "buyer" ? "/buyer/orders" : "/")
          return
        }
        if (!me.has_active_subscription) {
          router.replace("/supplier/subscription")
          return
        }
        setUserId(me.id)
        setUsername(me.username)

        const [productList, orderList] = await Promise.all([getProducts(), getOrders()])
        setProducts(productList)
        const found = orderList.find((o) => o.id === Number(id))
        if (found) {
          setOrder(found)
        } else {
          setFeedback("Order not found.")
        }
      } catch (error) {
        if (isAuthSessionError(error)) {
          clearToken()
          setFeedback("You are not authenticated. Redirecting to login...")
          router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login")
          return
        }
        setFeedback("Could not load order details right now.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, pathname, router])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const moveOrderForward = async () => {
    if (!order) return
    try {
      setUpdatingOrderId(order.id)
      setFeedback("")
      const updated =
        order.status === "po_released"
          ? await acceptPo(order.id)
          : await updateOrderTracking(order.id, nextTrackingPayload(order) ?? {})
      setOrder(updated)
      setFeedback(`Order HL-ORD-${updated.id} updated to ${orderStatusLabel(updated)}.`)
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "Could not update order tracking."))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleSubcontract = async () => {
    if (!order) return
    if (!Number.isInteger(shortageQuantity) || shortageQuantity < 1) {
      setFeedback("Shortage quantity must be a whole number greater than 0.")
      return
    }

    try {
      setUpdatingOrderId(order.id)
      setFeedback("")
      const result = await createSubcontractRfq(order.id, shortageQuantity)
      const refreshedList = await getOrders()
      const found = refreshedList.find((o) => o.id === order.id)
      if (found) setOrder(found)
      setFeedback(`Subcontract RFQ #${result.subcontract_rfq_id} created for order HL-ORD-${order.id}.`)
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "Could not create subcontract RFQ."))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a] flex flex-col">
        <SupplierNavbar
          active="orders"
          username={username}
          onSignOut={signOut}
        />
        <main className="w-full px-6 md:px-8 pb-24 py-8 md:py-12 flex-1 flex flex-col justify-center items-center min-h-[75vh]">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <div className="absolute h-3 w-3 rounded-full bg-blue-600 animate-ping" />
            </div>
            <span className="text-sm font-bold text-slate-500 tracking-tight">
              Loading order details...
            </span>
          </div>
        </main>
        <SupplierFooter />
      </div>
    )
  }

  const subtotal = order ? order.items.reduce((sum, item) => sum + (toNumber(item.price) * toNumber(item.quantity)), 0) : 0
  const tax = subtotal * 0.18 // 18% GST estimate
  const grandTotal = order ? toNumber(order.total_amount) : 0

  const step1Active = true
  const step2Active = order ? (order.status !== "po_released" || ["in_transit", "out_for_delivery", "delivered"].includes(order.delivery_status || "")) : false
  const step3Active = order ? (["shipped", "delivered", "goods_received", "completed"].includes(order.status) || ["in_transit", "out_for_delivery", "delivered"].includes(order.delivery_status || "")) : false
  const step4Active = order ? (["goods_received", "completed"].includes(order.status) || order.delivery_status === "delivered") : false

  let progressWidth = "0%"
  if (step4Active) progressWidth = "75%"
  else if (step3Active) progressWidth = "50%"
  else if (step2Active) progressWidth = "25%"

  return (
    <div className="min-h-screen bg-[#f6f8fb] flex flex-col">
      <SupplierNavbar
        active="orders"
        username={username}
        onSignOut={signOut}
      />
      <main className="min-h-[75vh] flex-1 w-full py-8 md:py-12 mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 pb-12">
        <div className="w-full space-y-6">
          {/* Breadcrumbs / Back button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link
                href="/supplier/orders"
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600 hover:text-blue-750 transition px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100"
              >
                ← Back to Workspace
              </Link>
              <h1 className="text-2xl sm:text-4xl font-black tracking-[-0.04em] text-slate-800 mt-2">
                Order <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">HL-ORD-{String(order?.id).padStart(4, "0")}</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {order && (
                <span className={`rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase shadow-sm tracking-wider ${statusChipClass(order)}`}>
                  Status: {orderStatusLabel(order)}
                </span>
              )}
            </div>
          </div>

          {feedback ? (
            <p className="rounded-xl border border-blue-100 bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm animate-fade-in">
              {feedback}
            </p>
          ) : null}

          {order ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Details, Progress, Items Table, Timeline (Takes 2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Live Order Progress Stepper Card */}
                <div className="rounded-2xl border border-[#dbe4ef] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.02)] space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.15em] text-[#0f4fb6] flex items-center gap-2">
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                      </svg>
                      Live Tracking Stepper
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">Real-time status updates</span>
                  </div>

                  <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-0 pt-2">
                    <div className="absolute hidden sm:block left-[12.5%] right-[12.5%] top-[20px] h-1 bg-slate-200 -translate-y-1/2 z-0" />
                    <div
                      className="absolute hidden sm:block left-[12.5%] top-[20px] h-1 bg-gradient-to-r from-blue-500 to-indigo-600 -translate-y-1/2 transition-all duration-500 z-[2]"
                      style={{ width: progressWidth }}
                    />

                    {[
                      {
                        label: "PO Released",
                        desc: "Order Initiated",
                        active: step1Active,
                        icon: (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      },
                      {
                        label: "Processing",
                        desc: "In Production",
                        active: step2Active,
                        icon: (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        )
                      },
                      {
                        label: "Shipped",
                        desc: "In Transit",
                        active: step3Active,
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
                        active: step4Active,
                        icon: (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )
                      }
                    ].map((step, idx) => (
                      <div key={idx} className="relative z-10 flex flex-row sm:flex-col items-center gap-3.5 sm:gap-0 sm:flex-1">
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

                {/* Items Summary Table */}
                <div className="rounded-2xl border border-[#dbe4ef] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.02)] space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.15em] text-[#0f4fb6] flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Line Items summary
                    </h3>
                    <span className="text-xs font-bold text-slate-500">{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
                  </div>

                  {/* Mobile View: List of items cards (Hidden on Desktop) */}
                  <div className="block md:hidden space-y-3">
                    {order.items.map((item, idx) => {
                      const product = products.find((entry) => entry.id === item.product)
                      return (
                        <div key={idx} className="rounded-xl border border-slate-150 bg-slate-50/50 p-4 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">
                                {product?.name || `Product #${item.product}`}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">ID: {item.product}</p>
                            </div>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-blue-100">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-150/60 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Unit Price</span>
                              <span className="text-slate-700 font-semibold">{money(item.price)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Total</span>
                              <span className="text-slate-900 font-black text-sm">{money(toNumber(item.quantity) * toNumber(item.price))}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop View: High-density Table (Hidden on Mobile) */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-150">
                    <table className="w-full min-w-[500px] border-collapse text-left text-sm">
                      <thead className="bg-[#f8fafc] text-slate-700">
                        <tr>
                          <th className="px-4 py-3.5 font-bold">Product Name</th>
                          <th className="px-4 py-3.5 font-bold text-center">Quantity</th>
                          <th className="px-4 py-3.5 font-bold text-right">Unit Price</th>
                          <th className="px-4 py-3.5 font-bold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {order.items.map((item, idx) => {
                          const product = products.find((entry) => entry.id === item.product)
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition">
                              <td className="px-4 py-4 font-semibold text-slate-800">
                                {product?.name || `Product #${item.product}`}
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">ID: {item.product}</p>
                              </td>
                              <td className="px-4 py-4 font-bold text-center">{item.quantity}</td>
                              <td className="px-4 py-4 text-right font-medium">{money(item.price)}</td>
                              <td className="px-4 py-4 text-right font-extrabold text-slate-900">
                                {money(toNumber(item.quantity) * toNumber(item.price))}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <div className="w-72 space-y-2.5 text-slate-650 text-xs">
                      <div className="flex justify-between font-medium">
                        <span>Subtotal:</span>
                        <span className="text-slate-800 font-bold">{money(subtotal)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>GST Estimate (18%):</span>
                        <span className="text-slate-800 font-bold">{money(tax)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-150 pt-2 text-sm font-black text-slate-850">
                        <span>Grand Total:</span>
                        <span className="text-blue-650 text-base">{money(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline activity log */}
                <div className="rounded-2xl border border-[#dbe4ef] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.02)] space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#64748b] flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Order Timeline Log
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {order.events.length} events recorded
                    </span>
                  </div>

                  <div className="relative pl-6 border-l border-slate-200 ml-3 space-y-6 py-2">
                    {order.events.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium italic">
                        Timeline will appear here as the order moves through PO, shipping, receipt, and payment.
                      </p>
                    ) : (
                      order.events.map((event) => {
                        let iconTone = "bg-slate-100 text-slate-550 border-slate-250"
                        if (event.message.toLowerCase().includes("released") || event.message.toLowerCase().includes("accepted")) {
                          iconTone = "bg-blue-50 text-blue-600 border-blue-200"
                        } else if (event.message.toLowerCase().includes("shipped") || event.message.toLowerCase().includes("transit")) {
                          iconTone = "bg-amber-50 text-amber-600 border-amber-200"
                        } else if (event.message.toLowerCase().includes("received") || event.message.toLowerCase().includes("delivered")) {
                          iconTone = "bg-emerald-50 text-emerald-600 border-emerald-200"
                        } else if (event.message.toLowerCase().includes("payment")) {
                          iconTone = "bg-purple-50 text-purple-600 border-purple-200"
                        }

                        return (
                          <div key={event.id} className="relative group">
                            {/* Dot timeline indicator */}
                            <span className={`absolute -left-[35px] top-1.5 flex items-center justify-center w-5 h-5 rounded-full border text-[9px] font-bold shadow-sm ${iconTone}`}>
                              •
                            </span>

                            <div className="rounded-xl border border-[#e7edf5] bg-[#fbfdff] px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.03)] hover:border-slate-300 transition duration-200">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-bold text-slate-800">{event.message}</p>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {shortDateTime(event.created_at)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500 font-medium">
                                Action by: <span className="text-slate-700 font-bold">{event.actor_name || "System"}</span> {event.actor_role ? `(${readable(event.actor_role)})` : ""}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Actions, Details, Contacts */}
              <div className="space-y-6">

                {/* Quick Actions Card */}
                <div className="rounded-2xl border border-[#dbe4ef] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.02)] space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Fulfillment Actions
                  </h3>

                  <div className="space-y-2.5">
                    {nextActionLabel(order) ? (
                      <button
                        type="button"
                        onClick={moveOrderForward}
                        disabled={updatingOrderId === order.id}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white cursor-pointer transition shadow-md hover:shadow-blue-500/10 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {updatingOrderId === order.id ? "Updating..." : nextActionLabel(order).toUpperCase()}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => printOrderPdf(order, products)}
                      className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-3 text-xs font-black text-slate-700 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      DOWNLOAD PDF INVOICE
                    </button>
                  </div>
                </div>

                {/* Subcontract support card */}
                {canSubcontract(order, products) ? (
                  <div className="rounded-2xl border border-[#dbe4ef] bg-[#f8fbff] p-5 shadow-[0_4px_24px_rgba(15,23,42,0.02)] space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Subcontract support
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Need helper stock to fulfill this order? Input shortage amount to launch an RFQ.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min={1}
                        value={shortageQuantity}
                        onChange={(e) => setShortageQuantity(Number(e.target.value))}
                        className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={handleSubcontract}
                        disabled={updatingOrderId === order.id}
                        className="flex-1 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-650 py-2.5 text-xs font-bold transition active:scale-[0.98] disabled:opacity-60"
                      >
                        {updatingOrderId === order.id ? "Launching..." : "Launch RFQ"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Metadata details card */}
                <div className="rounded-2xl border border-[#dbe4ef] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.02)] space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Fulfillment Metadata
                  </h3>

                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400 font-medium">Order Date:</span>
                      <span className="text-slate-800 font-bold">{shortDate(order.created_at)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400 font-medium">Delivery Status:</span>
                      <span className="text-slate-800 font-bold capitalize">{readable(order.delivery_status)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400 font-medium">Tracking Note:</span>
                      <span className="text-slate-700 text-right max-w-[150px] truncate block font-bold" title={order.tracking_note || ""}>
                        {order.tracking_note || "-"}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400 font-medium">Order Sub-total:</span>
                      <span className="text-slate-800 font-bold">{money(subtotal)}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-400 font-medium">Grand Total:</span>
                      <span className="text-slate-900 font-black">{money(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Buyer Profile Card */}
                <div className="rounded-2xl border border-[#dbe4ef] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.02)] space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Buyer Details
                  </h3>

                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                        {order.buyer_username?.slice(0, 2).toUpperCase() || "BY"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-800 truncate">
                          {order.buyer_username || `Buyer #${order.buyer}`}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Procurement Client</p>
                      </div>
                    </div>

                    <Link
                      href={`/supplier/messages?partner_id=${order.buyer}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-extrabold text-slate-700 transition active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Open Chat with Buyer
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#dbe4ef] text-slate-400 font-bold">
              Order could not be loaded or was not found.
            </div>
          )}
        </div>
      </main>
      <SupplierFooter />
    </div>
  )
}
