"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Clock, MapPin, Building2, Package, Tag, Calendar, FileSpreadsheet,
  FileText, Eye, Download, AlertCircle, CheckCircle, Edit, RefreshCw, Trash2,
  UserCheck, Info, Loader2
} from "lucide-react"
import type { VendorRfq, VendorQuotation } from "@/services"

// ----------------------------------------------------
// Formatting and Math Helpers
// ----------------------------------------------------
const formatDisplayDate = (value: string | null) => {
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

const formatTenderType = (value: VendorRfq["tender_type"]) => {
  if (value === "open") return "Open Tender"
  if (value === "limited") return "Limited Tender"
  return "Reverse Auction"
}

const formatRfqStatus = (value: VendorRfq["status"]) => {
  if (value === "under_review") return "Under Review"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const getLowestBid = (quotations: any[]) => {
  if (!quotations || quotations.length === 0) return null
  return quotations.reduce((min, q) => q.unit_price < min.unit_price ? q : min, quotations[0])
}

// ----------------------------------------------------
// Sub-components
// ----------------------------------------------------
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

function InfoPillIcon({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
      <div className="shrink-0 p-1.5 bg-slate-50 border border-slate-100 rounded-lg">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="mt-0.5 text-xs font-extrabold text-slate-700 truncate">{value}</p>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// ----------------------------------------------------
// Bidding Price Trend Chart (Custom SVG Trading Graph)
// ----------------------------------------------------
function BidTrendChart({ quotations, targetBudget }: { quotations: any[]; targetBudget: number }) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  const pointsData = React.useMemo(() => {
    if (!quotations || quotations.length === 0) {
      return [
        { label: "Base Price", price: targetBudget || 500000, supplier: "" },
        { label: "Est. Bid A", price: (targetBudget || 500000) * 0.95, supplier: "" },
        { label: "Est. Bid B", price: (targetBudget || 500000) * 0.92, supplier: "" },
        { label: "Est. Bid C", price: (targetBudget || 500000) * 0.88, supplier: "" },
        { label: "Current L1", price: (targetBudget || 500000) * 0.85, supplier: "" },
      ]
    }

    const sorted = [...quotations].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    )
    return sorted.map((q, idx) => ({
      label: `Quote #${idx + 1}`,
      price: q.unit_price,
      supplier: q.supplier_company || q.supplier_name,
    }))
  }, [quotations, targetBudget])

  const width = 600
  const height = 180
  const paddingLeft = 70
  const paddingRight = 20
  const paddingTop = 25
  const paddingBottom = 30

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const prices = pointsData.map((p) => p.price)
  const hasTargetBudget = targetBudget > 0
  
  // Calculate pricing scale safely
  const maxPrice = Math.max(...prices, ...(hasTargetBudget ? [targetBudget] : [])) * 1.05
  const minPrice = Math.min(...prices, ...(hasTargetBudget ? [targetBudget * 0.8] : [])) * 0.95
  const priceRange = maxPrice - minPrice || 1

  const points = pointsData.map((pt, i) => {
    const x = paddingLeft + (pointsData.length > 1 ? (i / (pointsData.length - 1)) * chartWidth : chartWidth / 2)
    const y = paddingTop + chartHeight - ((pt.price - minPrice) / priceRange) * chartHeight
    return { ...pt, x, y }
  })

  // Calculate smooth Bezier Curve
  const lineD = React.useMemo(() => {
    if (points.length === 0) return ""
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const cp1x = curr.x + (next.x - curr.x) / 3
      const cp1y = curr.y
      const cp2x = curr.x + (2 * (next.x - curr.x)) / 3
      const cp2y = next.y
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
    }
    return d
  }, [points])

  const areaD = React.useMemo(() => {
    if (points.length === 0 || !lineD) return ""
    return `${lineD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
  }, [points, lineD, paddingTop, chartHeight])

  const lowestBid = prices.length > 0 ? Math.min(...prices) : 0
  const savings = hasTargetBudget && lowestBid < targetBudget ? targetBudget - lowestBid : 0

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width
    
    let closestIdx = 0
    let minDiff = Infinity
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = idx
      }
    })
    setHoveredIndex(closestIdx)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-6">
      {/* Title & Core Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-[10px] font-black tracking-wider text-slate-400 uppercase">RFQ Price Index & Bidding Trend</h4>
          <h3 className="text-sm font-extrabold text-slate-805 mt-0.5">Live Quotation Downward Progression</h3>
        </div>
        
        {/* Metric widgets */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 w-full md:w-auto">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-1.5 min-w-[100px]">
            <p className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">Current L1 Offer</p>
            <p className="text-xs font-black text-blue-600 mt-0.5">
              {lowestBid > 0 ? `₹${lowestBid.toLocaleString("en-IN")}` : "No Bids"}
            </p>
          </div>
          {hasTargetBudget && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-1.5 min-w-[100px]">
              <p className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">Target Budget</p>
              <p className="text-xs font-black text-slate-700 mt-0.5">
                ₹{targetBudget.toLocaleString("en-IN")}
              </p>
            </div>
          )}
          {savings > 0 && (
            <div className="rounded-xl border border-emerald-105 bg-emerald-50/40 px-3.5 py-1.5 min-w-[100px] col-span-2 sm:col-span-1">
              <p className="text-[8px] font-extrabold uppercase text-emerald-600 tracking-wider">Est. Price Delta</p>
              <p className="text-xs font-black text-emerald-700 mt-0.5">
                -₹{savings.toLocaleString("en-IN")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#3b82f6" floodOpacity="0.3" />
            </filter>
          </defs>

          <style>{`
            @keyframes pulse-ring {
              0% { r: 4.5; opacity: 0.8; }
              100% { r: 13; opacity: 0; }
            }
            .pulse-circle {
              animation: pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
            }
          `}</style>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + ratio * chartHeight
            const gridVal = maxPrice - ratio * priceRange
            return (
              <g key={idx} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[9px] font-extrabold"
                >
                  ₹{Math.round(gridVal).toLocaleString("en-IN")}
                </text>
              </g>
            )
          })}

          {/* Target Budget Line */}
          {hasTargetBudget && (() => {
            const yTarget = paddingTop + chartHeight - ((targetBudget - minPrice) / priceRange) * chartHeight
            if (yTarget >= paddingTop && yTarget <= paddingTop + chartHeight) {
              return (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={yTarget}
                    x2={width - paddingRight}
                    y2={yTarget}
                    stroke="#f87171"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={width - paddingRight - 4}
                    y={yTarget - 4}
                    textAnchor="end"
                    className="fill-rose-500 font-bold text-[8px] uppercase tracking-wider"
                  >
                    Target Budget
                  </text>
                </g>
              )
            }
            return null
          })()}

          {/* Chart Area */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Chart Line */}
          {lineD && (
            <path
              d={lineD}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              filter="url(#glow)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Vertical indicator line on hover */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].x}
              y1={paddingTop}
              x2={points[hoveredIndex].x}
              y2={paddingTop + chartHeight}
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-70"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => {
            const isLast = idx === points.length - 1
            const isHovered = hoveredIndex === idx
            return (
              <g key={idx} className="group/point">
                {isLast && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    className="fill-blue-400/30 stroke-none pulse-circle"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? "6.5" : isLast ? "5.5" : "4.5"}
                  className={`fill-white stroke-2 transition-all duration-150 ${
                    isHovered
                      ? "stroke-indigo-600 fill-indigo-50 r-6"
                      : isLast
                      ? "stroke-indigo-600"
                      : "stroke-blue-600"
                  }`}
                />
              </g>
            )
          })}

          {/* X Axis Labels */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx
            return (
              <text
                key={idx}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className={`transition-colors duration-150 text-[8px] uppercase tracking-wider ${
                  isHovered ? "fill-indigo-600 font-black" : "fill-slate-400 font-extrabold"
                }`}
              >
                {p.label}
              </text>
            )
          })}

          {/* Interactive Overlay Hover Rect */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            className="cursor-crosshair"
          />

          {/* Floating Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (() => {
            const p = points[hoveredIndex]
            return (
              <g className="pointer-events-none transition-all duration-150">
                <rect
                  x={p.x - 70}
                  y={p.y - 45}
                  width="140"
                  height="34"
                  rx="6"
                  fill="#0f172a"
                  className="shadow-lg"
                />
                <polygon
                  points={`${p.x - 5},${p.y - 11} ${p.x + 5},${p.y - 11} ${p.x},${p.y - 6}`}
                  fill="#0f172a"
                />
                <text
                  x={p.x}
                  y={p.y - 32}
                  textAnchor="middle"
                  className="fill-white font-mono text-[10px] font-bold"
                >
                  ₹{p.price.toLocaleString("en-IN")}
                </text>
                <text
                  x={p.x}
                  y={p.y - 21}
                  textAnchor="middle"
                  className="fill-slate-400 text-[8px] font-semibold"
                >
                  {p.supplier ? `${p.supplier.slice(0, 18)}${p.supplier.length > 18 ? '...' : ''}` : p.label}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// Main component props type definition
// ----------------------------------------------------
export interface RfqDetailPageProps {
  selectedRfq: VendorRfq
  userRole: "buyer" | "supplier"
  username: string
  supplierCompanyName: string | null
  supplierVendorProfile: number | null
  setSelectedRfqId: (id: number | null) => void
  openRejectQuotationModal: (rfqId: number, quoteId: number) => void
  openDeleteRfqModal: (rfqId: number) => void
  handleReopenRfq: (rfqId: number) => void
  handleCloseRfq: (rfqId: number) => void
  startEditingRfq: (rfq: any) => void
  handleAwardQuotation: (rfq: any, quoteId: number) => void
  submitting: boolean
  supplierCanQuote: boolean
  activeQuoteRfqId: number | null
  setActiveQuoteRfqId: (id: number | null) => void
  quoteForm: any
  setQuoteForm: any
  emptyQuoteForm: any
  handleSubmitQuotation: (rfq: any) => void
  matchingSupplierListings: any[]
  editingQuotationContext: any
  editingMatchingSupplierListings: any[]
  editingQuoteForm: any
  setEditingQuoteForm: any
  handleUpdateQuotation: (rfq: any) => void
  cancelEditingQuotation: () => void
  startEditingQuotation: (rfq: any, quote: any) => void
  message: string
  setMessage: (msg: string) => void
}

// ----------------------------------------------------
// Main component implementation
// ----------------------------------------------------
export default function RfqDetailPage({
  selectedRfq,
  userRole,
  username,
  supplierCompanyName,
  supplierVendorProfile,
  setSelectedRfqId,
  openRejectQuotationModal,
  openDeleteRfqModal,
  handleReopenRfq,
  handleCloseRfq,
  startEditingRfq,
  handleAwardQuotation,
  submitting,
  supplierCanQuote,
  activeQuoteRfqId,
  setActiveQuoteRfqId,
  quoteForm,
  setQuoteForm,
  emptyQuoteForm,
  handleSubmitQuotation,
  matchingSupplierListings,
  editingQuotationContext,
  editingMatchingSupplierListings,
  editingQuoteForm,
  setEditingQuoteForm,
  handleUpdateQuotation,
  cancelEditingQuotation,
  startEditingQuotation,
  message,
  setMessage,
}: RfqDetailPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isOwner = selectedRfq.buyer_name === username
  const statusTone =
    selectedRfq.status === "closed"
      ? "bg-[#fff2f2] text-[#a53c3c]"
      : selectedRfq.status === "awarded"
        ? "bg-[#eefaf2] text-[#0f7a54]"
        : selectedRfq.status === "under_review"
          ? "bg-[#edf4ff] text-[#2459c4]"
          : "bg-[#edf7f6] text-[#0f766e]"

  const isSupplierQuoteOwner = (quote: any) => {
    const quoteVendorId = quote.supplier_vendor_id
    if (supplierVendorProfile && quoteVendorId && quoteVendorId === supplierVendorProfile) return true
    if (quote.supplier_name?.trim().toLowerCase() === username.trim().toLowerCase()) return true
    if (supplierCompanyName && quote.supplier_company?.trim().toLowerCase() === supplierCompanyName.trim().toLowerCase()) return true
    return false
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={() => {
            setSelectedRfqId(null)
            if (searchParams.get("rfqId") || searchParams.get("id") || searchParams.get("highlight")) {
              router.push(pathname)
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-655 md:hover:text-slate-950 transition-all duration-200 bg-white md:hover:bg-slate-50 border border-slate-200 md:hover:border-slate-350 rounded-xl px-4.5 py-2.5 shadow-sm active:scale-[0.98] group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 md:group-hover:-translate-x-1 text-slate-500 md:group-hover:text-slate-950" />
          <span>Back to Requests List</span>
        </button>
      </div>

      {/* Main RFQ Card Header info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                selectedRfq.product_type === "product"
                  ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                  : "bg-purple-50 text-purple-700 border-purple-100"
              }`}>
                {selectedRfq.product_type}
              </span>
              <span className="rounded bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                {formatTenderType(selectedRfq.tender_type)}
              </span>
              <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${statusTone}`}>
                {formatRfqStatus(selectedRfq.status)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-805 leading-tight">
              {selectedRfq.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Deadline: <strong className="text-slate-600">{formatDisplayDate(selectedRfq.quote_deadline)}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Location: <strong className="text-slate-600">{selectedRfq.delivery_location}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="flex items-center gap-1">
                  Buyer: <strong className="text-slate-600">{selectedRfq.buyer_company || selectedRfq.buyer_name}</strong>
                  {userRole === "supplier" && selectedRfq.buyer_user_id && (
                    <Link
                      href={`/supplier/messages?partner_id=${selectedRfq.buyer_user_id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-650 md:hover:text-indigo-800 transition ml-1.5 px-2 py-0.5 bg-indigo-50 md:hover:bg-indigo-100 rounded align-middle"
                      title={`Chat with ${selectedRfq.buyer_company || selectedRfq.buyer_name}`}
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Chat</span>
                    </Link>
                  )}
                </span>
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-none">
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-400">Reference: #{selectedRfq.id}</span>
          </div>
        </div>

        {/* Snapshots / Grid */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <InfoPillIcon icon={<Package className="h-4 w-4 text-blue-500" />} label="Requested Quantity" value={`${selectedRfq.quantity} ${selectedRfq.product_type === "product" ? "units" : "slots"}`} />
          <InfoPillIcon icon={<Tag className="h-4 w-4 text-indigo-500" />} label="Tender Type" value={formatTenderType(selectedRfq.tender_type)} />
          <InfoPillIcon icon={<Calendar className="h-4 w-4 text-emerald-500" />} label="Quote Deadline" value={formatDisplayDate(selectedRfq.quote_deadline)} />
          <InfoPillIcon icon={<Clock className="h-4 w-4 text-amber-600" />} label="Delivery Target" value={formatDisplayDate(selectedRfq.expected_delivery_date)} />
          <InfoPillIcon icon={<MapPin className="h-4 w-4 text-rose-500" />} label="Delivery Location" value={selectedRfq.delivery_location} />
          <InfoPillIcon icon={<FileSpreadsheet className="h-4 w-4 text-violet-500" />} label="Offers Received" value={selectedRfq.quotations.length} />
        </div>

        {/* Scope & Details */}
        <div className="grid gap-6 lg:grid-cols-3 pt-2">
          <div className="lg:col-span-2 space-y-5">
            {/* Scope */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 sm:p-5">
              <h4 className="text-xs font-black tracking-wider text-slate-400 uppercase border-b border-slate-200/50 pb-2 mb-3">Scope & Specifications</h4>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line break-words">{selectedRfq.description}</p>
            </div>

            {/* PDF Spec */}
            {selectedRfq.tender_document_url && (
              <div className="rounded-xl border border-blue-105 bg-blue-50/20 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full min-w-0 overflow-hidden">
                <div className="flex items-start gap-3 w-full min-w-0 flex-1">
                  <div className="p-2.5 bg-blue-100/60 rounded-xl text-blue-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-850 break-all lg:break-words">{selectedRfq.tender_document_name || `RFQ-${selectedRfq.id}.pdf`}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Uploaded: {formatDisplayDateTime(selectedRfq.tender_document_uploaded_at)}</p>
                    {selectedRfq.tender_document_note && (
                      <p className="text-xs text-slate-500 mt-1.5 italic break-words">Note: {selectedRfq.tender_document_note}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 w-full lg:w-auto shrink-0 lg:self-center">
                  <a
                    href={selectedRfq.tender_document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 px-3.5 py-2.5 lg:py-2 text-xs font-bold text-slate-700 shadow-sm transition active:scale-95"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Open</span>
                  </a>
                  <a
                    href={selectedRfq.tender_document_url}
                    download={selectedRfq.tender_document_name || `rfq-${selectedRfq.id}.pdf`}
                    className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 md:hover:bg-blue-700 px-3.5 py-2.5 lg:py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar stats/invited */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-slate-50/30">
              <h4 className="text-xs font-black tracking-wider text-slate-400 uppercase border-b border-slate-200/50 pb-2 mb-3">Target Invitation</h4>
              <p className="text-xs font-semibold text-slate-705 leading-relaxed">
                {selectedRfq.invited_vendors.length > 0
                  ? selectedRfq.invited_vendors.map((vendor) => vendor.vendor_name).join(", ")
                  : "Open Market — Open to all qualified suppliers."}
              </p>
            </div>

            {selectedRfq.status === "closed" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">RFQ Closed</p>
                  <p className="mt-0.5">This tender desk is locked. No new quotes are accepted.</p>
                </div>
              </div>
            )}

            {selectedRfq.awarded_quote_id && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-805 flex items-start gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Award Complete</p>
                  <p className="mt-0.5">
                    Awarded to: {selectedRfq.quotations.find(q => q.id === selectedRfq.awarded_quote_id)?.supplier_company || "Selected Vendor"}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reverse Auction Compete */}
        {selectedRfq.tender_type === "reverse" && (() => {
          const lowestQuote = getLowestBid(selectedRfq.quotations)
          const isAuctionLive = selectedRfq.status === "open"
          return (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 space-y-4 shadow-sm relative overflow-hidden">
              {isAuctionLive && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  Live Auction
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100/60 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-805 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    Reverse Auction Dashboard
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Suppliers compete downwards to win the contract.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Target Budget</p>
                  <p className="text-base font-extrabold text-slate-700">INR {selectedRfq.target_budget.toLocaleString()}</p>
                </div>
              </div>

              {userRole === "supplier" && selectedRfq.buyer_name !== username && isAuctionLive && (() => {
                const supplierQuote = selectedRfq.quotations.find((q) => q.supplier_name === username)
                if (!supplierQuote) {
                  return (
                    <div className="rounded-xl bg-blue-50 border border-blue-150 p-3.5 flex items-center gap-3">
                      <Info className="h-5 w-5 text-blue-505 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-900">You haven't bid yet!</p>
                        <p className="text-[10px] text-blue-600 mt-0.5">Submit your quotation below to enter the auction and secure L1 status.</p>
                      </div>
                    </div>
                  )
                }
                const isL1 = lowestQuote && supplierQuote.id === lowestQuote.id
                if (isL1) {
                  return (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-150 p-3.5 flex items-center gap-3 animate-pulse">
                      <CheckCircle className="h-5 w-5 text-emerald-650 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-955">🎉 You are currently L1 (Leading Bidder)!</p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">Your bid of INR {supplierQuote.unit_price.toLocaleString()} is the lowest.</p>
                      </div>
                    </div>
                  )
                } else {
                  return (
                    <div className="rounded-xl bg-amber-50 border border-amber-150 p-3.5 flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-900">⚠️ You have been outbid!</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">Your bid: INR {supplierQuote.unit_price.toLocaleString()} | L1 Bid: INR {lowestQuote?.unit_price.toLocaleString()}.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveQuoteRfqId(selectedRfq.id)
                          const nextBid = lowestQuote ? Math.max(0, lowestQuote.unit_price - 100) : selectedRfq.target_budget
                          setQuoteForm({
                            product_id: supplierQuote.product_id || 0,
                            unit_price: nextBid,
                            lead_time_days: supplierQuote.lead_time_days || 7,
                            validity_days: supplierQuote.validity_days || 30,
                            notes: "Competing in Live Auction",
                          })
                        }}
                        className="rounded-lg bg-amber-655 hover:bg-amber-700 px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-wider transition cursor-pointer shrink-0"
                      >
                        Quick Underbid
                      </button>
                    </div>
                  )
                }
              })()}

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-white border border-slate-100 p-3 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Current L1 Bid</span>
                  <span className="text-lg font-black text-rose-600 mt-1">
                    {lowestQuote ? `INR ${lowestQuote.unit_price.toLocaleString()}` : "No Bids Yet"}
                  </span>
                </div>
                <div className="rounded-xl bg-white border border-slate-100 p-3 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Est. Total Savings</span>
                  <span className="text-lg font-black text-emerald-600 mt-1">
                    {lowestQuote 
                      ? `INR ${((selectedRfq.target_budget - lowestQuote.unit_price) * selectedRfq.quantity).toLocaleString()}` 
                      : "INR 0"
                    }
                  </span>
                </div>
                <div className="rounded-xl bg-white border border-slate-100 p-3 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Auction Bid Count</span>
                  <span className="text-lg font-black text-slate-700 mt-1 flex items-center gap-1.5">
                    {selectedRfq.quotations.length} Bids
                    {isAuctionLive && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
                  </span>
                </div>
                <div className="rounded-xl bg-white border border-slate-100 p-3 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Time Remaining</span>
                  <span className="text-xs font-black text-slate-700 mt-1">
                    <CountdownTimer deadline={selectedRfq.quote_deadline} />
                  </span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Supplier Sourcing Quote Submission Form */}
        {userRole === "supplier" && selectedRfq.buyer_name !== username && selectedRfq.status !== "awarded" && selectedRfq.status !== "closed" ? (
          <div className="mt-5 border-t border-slate-150 pt-4">
            {activeQuoteRfqId === selectedRfq.id ? (
              <div className="grid gap-3 rounded-2xl border border-blue-101 bg-blue-50/20 p-5 md:grid-cols-2 animate-fade-in-up">
                <div className="md:col-span-2 border-b border-blue-100 pb-3 mb-2">
                  <h3 className="text-sm font-black text-blue-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4.5 w-4.5 text-blue-600" />
                    <span>
                      {selectedRfq.tender_type === "reverse"
                        ? "Submit Auction Bid (Compete Downwards)"
                        : "Submit Sourcing Quotation"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-blue-600/80 font-medium mt-0.5">
                    Fill in your product unit offer price, estimated lead time, and validity days to place your bid.
                  </p>
                </div>
                {!quoteForm || matchingSupplierListings.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-805 md:col-span-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>No matching active {selectedRfq.product_type} listings are available in your catalog for this request.</span>
                  </div>
                ) : null}

                <label className="grid gap-1 text-xs font-bold text-slate-500">
                  <span>Unit Offer Price (INR)</span>
                  <input
                    type="number"
                    min={0}
                    value={quoteForm.unit_price}
                    onChange={(event) =>
                      setQuoteForm((prev: any) => ({ ...prev, unit_price: Number(event.target.value) }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="grid gap-1 text-xs font-bold text-slate-500">
                  <span>Lead Time (days)</span>
                  <input
                    type="number"
                    min={1}
                    value={quoteForm.lead_time_days}
                    onChange={(event) =>
                      setQuoteForm((prev: any) => ({ ...prev, lead_time_days: Number(event.target.value) }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="grid gap-1 text-xs font-bold text-slate-505">
                  <span>Quote Validity (days)</span>
                  <input
                    type="number"
                    min={1}
                    value={quoteForm.validity_days}
                    onChange={(event) =>
                      setQuoteForm((prev: any) => ({ ...prev, validity_days: Number(event.target.value) }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="grid gap-1 text-xs font-bold text-slate-550 md:col-span-2">
                  <span>Commercial Notes</span>
                  <textarea
                    rows={3}
                    value={quoteForm.notes}
                    onChange={(event) => setQuoteForm((prev: any) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Specify warranty, installation support, delivery, payment terms, etc."
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                  />
                </label>

                {message ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs font-semibold text-blue-800 md:col-span-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 animate-pulse" />
                    <span>{message}</span>
                  </div>
                ) : null}

                {submitting ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs font-semibold text-blue-800 md:col-span-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 shrink-0 text-blue-600 animate-spin" />
                    <span>Submitting your quotation to the buyer. Please wait...</span>
                  </div>
                ) : null}

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 md:col-span-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Calculated Total Bid Value</p>
                    <p className="text-base font-black text-slate-700 mt-0.5">
                      ₹{((quoteForm?.unit_price || 0) * (selectedRfq?.quantity || 1)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSubmitQuotation(selectedRfq)}
                      disabled={submitting || !quoteForm || quoteForm.product_id === 0}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Submit Quotation Offer</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuoteRfqId(null)
                        setQuoteForm(emptyQuoteForm)
                      }}
                      className="rounded-xl border border-slate-250 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuoteRfqId(selectedRfq.id)
                    setQuoteForm(emptyQuoteForm)
                  }}
                  disabled={!supplierCanQuote}
                  className="rounded-xl bg-blue-650 hover:bg-blue-700 px-5 py-3 text-xs font-bold text-white transition active:scale-[0.98] cursor-pointer shadow-sm shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Sourcing Quotation
                </button>
                {!supplierCanQuote && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-805 flex items-start gap-2.5 max-w-xl">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-650 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">Quotation Submission Blocked</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-amber-750">
                        You currently have 0 active products in your catalog. You must add at least 1 active product to your catalog before you can submit quotations to buyers.
                      </p>
                      <Link
                        href="/supplier/products"
                        className="mt-2 inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-amber-955 text-[11px] cursor-pointer"
                      >
                        Go to My Products Catalog &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Bid Trend Chart Section */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <BidTrendChart quotations={selectedRfq.quotations} targetBudget={selectedRfq.target_budget} />
        </div>

        {/* Quotations List */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-500" />
              <span>{selectedRfq.tender_type === "reverse" ? "Live Quotations Received" : "Quotations Received"}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600 border border-slate-200">
                {selectedRfq.quotations.length}
              </span>
            </h4>
            {isOwner && (
              <div className="flex flex-wrap gap-2">
                {selectedRfq.status !== "awarded" && (
                  <button
                    type="button"
                    onClick={() => startEditingRfq(selectedRfq)}
                    disabled={submitting}
                    className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 rounded-lg cursor-pointer transition"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit RFQ</span>
                  </button>
                )}
                {selectedRfq.status === "closed" ? (
                  <button
                    type="button"
                    onClick={() => handleReopenRfq(selectedRfq.id)}
                    disabled={submitting}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white rounded-lg cursor-pointer transition shadow-sm"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reopen RFQ</span>
                  </button>
                ) : selectedRfq.status !== "awarded" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCloseRfq(selectedRfq.id)}
                      disabled={submitting}
                      className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 rounded-lg cursor-pointer transition"
                    >
                      <Clock className="h-3 w-3" />
                      <span>Close RFQ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openDeleteRfqModal(selectedRfq.id);
                        setSelectedRfqId(null);
                      }}
                      disabled={submitting}
                      className="flex items-center gap-1 border border-rose-250 hover:bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-705 rounded-lg cursor-pointer transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete RFQ</span>
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {selectedRfq.quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              <FileText className="h-6 w-6 text-slate-350" />
              <p className="text-xs font-medium text-slate-455">No quotations submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 font-extrabold uppercase tracking-wider">
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Listing Product</th>
                        <th className="px-4 py-3">Unit Price</th>
                        <th className="px-4 py-3">Lead Time</th>
                        <th className="px-4 py-3">Validity</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3">Submitted At</th>
                        {isOwner || userRole === "supplier" ? <th className="px-4 py-3 text-right">Action</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRfq.quotations.map((quote) => {
                        const isAwarded = selectedRfq.awarded_quote_id === quote.id
                        return (
                          <tr key={quote.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50/65 transition align-middle">
                            <td className="px-4 py-3 font-bold text-slate-805">
                              <div className="flex items-center gap-2">
                                <span>{quote.supplier_company || quote.supplier_name}</span>
                                {quote.supplier_user_id && (
                                  <Link
                                    href={`/${userRole}/messages?partner_id=${quote.supplier_user_id}`}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-650 hover:text-blue-800 transition ml-1 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 rounded align-middle"
                                    title={`Chat with ${quote.supplier_company || quote.supplier_name}`}
                                  >
                                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    <span>Chat</span>
                                  </Link>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-655 font-medium">{quote.product_name}</td>
                            <td className="px-4 py-3 font-extrabold text-slate-700">INR {quote.unit_price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-650">{quote.lead_time_days} days</td>
                            <td className="px-4 py-3 text-slate-650">{quote.validity_days} days</td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={quote.notes}>{quote.notes || "-"}</td>
                            <td className="px-4 py-3 text-slate-550">
                              {quote.created_at
                                ? new Date(quote.created_at).toLocaleString([], {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "-"}
                            </td>
                            {isOwner ? (
                              <td className="px-4 py-3 text-right">
                                {isAwarded || quote.status === "awarded" ? (
                                  <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                                    Awarded
                                  </span>
                                ) : quote.status === "rejected" ? (
                                  <span className="inline-flex rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-707 border border-rose-100" title={quote.rejection_reason || "Rejected"}>
                                    Rejected
                                  </span>
                                ) : selectedRfq.status === "awarded" || selectedRfq.status === "closed" ? (
                                  <span className="text-xs font-bold text-slate-400">Locked</span>
                                ) : (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAwardQuotation(selectedRfq, quote.id)}
                                      disabled={submitting}
                                      className="flex items-center gap-1 border border-emerald-200 bg-white hover:bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 rounded-lg cursor-pointer transition shadow-sm"
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                      <span>Award & PO</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openRejectQuotationModal(selectedRfq.id, quote.id)}
                                      disabled={submitting}
                                      className="flex items-center gap-1 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-705 rounded-lg cursor-pointer transition"
                                    >
                                      <AlertCircle className="h-3.5 w-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            ) : userRole === "supplier" ? (
                              <td className="px-4 py-3 text-right">
                                {isSupplierQuoteOwner(quote) ? (
                                  selectedRfq.status === "awarded" || selectedRfq.status === "closed" ? (
                                    <span className="text-xs font-bold text-slate-400">Locked</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => startEditingQuotation(selectedRfq, quote)}
                                      disabled={submitting}
                                      className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 rounded-lg cursor-pointer transition"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                      <span>Edit Offer</span>
                                    </button>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                            ) : null}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden space-y-4">
                {selectedRfq.quotations.map((quote) => {
                  const isAwarded = selectedRfq.awarded_quote_id === quote.id
                  return (
                    <div
                      key={quote.id}
                      className="rounded-2xl border border-slate-150 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.02)] space-y-3.5"
                    >
                      {/* Supplier Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-805 truncate">
                            {quote.supplier_company || quote.supplier_name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {quote.created_at
                              ? new Date(quote.created_at).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "-"}
                          </span>
                        </div>
                        {quote.supplier_user_id && (
                          <Link
                            href={`/${userRole}/messages?partner_id=${quote.supplier_user_id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-650 px-2.5 py-1 bg-blue-50 active:bg-blue-100 rounded-xl transition"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>Chat</span>
                          </Link>
                        )}
                      </div>

                      {/* Product details & Price */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-450 font-medium">Listing Product:</span>
                          <span className="text-slate-700 font-bold truncate max-w-[150px]">{quote.product_name}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-450 font-medium">Unit Price:</span>
                          <span className="text-sm font-black text-slate-805">INR {quote.unit_price.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Timeline/Validity Info */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                        <div>
                          <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Lead Time</span>
                          <span className="font-extrabold text-slate-700">{quote.lead_time_days} days</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Validity</span>
                          <span className="font-extrabold text-slate-700">{quote.validity_days} days</span>
                        </div>
                      </div>

                      {/* Commercial notes if present */}
                      {quote.notes && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Notes</span>
                          <p className="text-xs text-slate-600 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 mt-1">{quote.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {(isOwner || isSupplierQuoteOwner(quote)) && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          {isOwner ? (
                            isAwarded || quote.status === "awarded" ? (
                              <span className="w-full text-center py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">
                                Awarded
                              </span>
                            ) : quote.status === "rejected" ? (
                              <span className="w-full text-center py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold" title={quote.rejection_reason || "Rejected"}>
                                Rejected
                              </span>
                            ) : selectedRfq.status === "awarded" || selectedRfq.status === "closed" ? (
                              <span className="text-xs font-bold text-slate-400">Locked</span>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 w-full">
                                <button
                                  type="button"
                                  onClick={() => handleAwardQuotation(selectedRfq, quote.id)}
                                  disabled={submitting}
                                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 md:hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 cursor-pointer"
                                >
                                  <UserCheck className="h-4 w-4" />
                                  <span>Award & PO</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRejectQuotationModal(selectedRfq.id, quote.id)}
                                  disabled={submitting}
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white md:hover:bg-rose-50 py-2.5 text-xs font-bold text-rose-600 transition active:scale-95 cursor-pointer"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )
                          ) : (
                            isSupplierQuoteOwner(quote) && (
                              selectedRfq.status === "awarded" || selectedRfq.status === "closed" ? (
                                <span className="text-xs font-bold text-slate-400">Locked</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditingQuotation(selectedRfq, quote)}
                                  disabled={submitting}
                                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white md:hover:bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition active:scale-95 cursor-pointer"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>Edit Offer</span>
                                </button>
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {userRole === "supplier" && editingQuotationContext?.rfqId === selectedRfq.id ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-blue-101 bg-blue-50/20 p-5 md:grid-cols-2 animate-fade-in-up">
              <div className="md:col-span-2 border-b border-blue-100 pb-3 mb-2">
                <h3 className="text-sm font-black text-blue-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-blue-600" />
                  <span>Update Sourcing Quotation</span>
                </h3>
                <p className="text-[11px] text-blue-600/80 font-medium mt-0.5">
                  Modify your offer details below to update your submitted bid.
                </p>
              </div>

              {editingMatchingSupplierListings.length === 0 ? (
                <div className="rounded-xl border border-amber-250 bg-amber-50 px-4 py-3 text-xs text-amber-808 md:col-span-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>No matching active listings available for this RFQ.</span>
                </div>
              ) : null}


              <label className="grid gap-1 text-xs font-bold text-slate-505">
                <span>Unit Price (INR)</span>
                <input
                  type="number"
                  min={0}
                  value={editingQuoteForm.unit_price}
                  onChange={(event) =>
                    setEditingQuoteForm((prev: any) => ({ ...prev, unit_price: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="grid gap-1 text-xs font-bold text-slate-500">
                <span>Lead Time (days)</span>
                <input
                  type="number"
                  min={1}
                  value={editingQuoteForm.lead_time_days}
                  onChange={(event) =>
                    setEditingQuoteForm((prev: any) => ({ ...prev, lead_time_days: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="grid gap-1 text-xs font-bold text-slate-500">
                <span>Quote Validity (days)</span>
                <input
                  type="number"
                  min={1}
                  value={editingQuoteForm.validity_days}
                  onChange={(event) =>
                    setEditingQuoteForm((prev: any) => ({ ...prev, validity_days: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-2">
                <span>Commercial Notes</span>
                <textarea
                  rows={3}
                  value={editingQuoteForm.notes}
                  onChange={(event) => setEditingQuoteForm((prev: any) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Specify warranty, installation support, delivery, payment terms, etc."
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500"
                />
              </label>

              {message ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs font-semibold text-blue-800 md:col-span-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 animate-pulse" />
                  <span>{message}</span>
                </div>
              ) : null}

              {submitting ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs font-semibold text-blue-800 md:col-span-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 text-blue-600 animate-spin" />
                  <span>Updating your quotation. Please wait...</span>
                </div>
              ) : null}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 md:col-span-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Calculated Total Bid Value</p>
                  <p className="text-base font-black text-slate-700 mt-0.5">
                    ₹{((editingQuoteForm?.unit_price || 0) * (selectedRfq?.quantity || 1)).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuotation(selectedRfq)}
                    disabled={submitting || !editingQuoteForm || editingQuoteForm.product_id === 0}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Quotation</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingQuotation}
                    className="rounded-xl border border-slate-250 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
