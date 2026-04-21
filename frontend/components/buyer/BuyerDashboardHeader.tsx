"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import type { AuthUser, VendorRfq, VendorProductService } from "@/services"
import { clearToken, logoutUser } from "@/services"

interface BuyerDashboardHeaderProps {
  user: AuthUser
  rfqs?: VendorRfq[]
  products?: VendorProductService[]
  searchText: string
  setSearchText: (val: string) => void
  pendingActions: number
}

export default function BuyerDashboardHeader({
  user,
  rfqs = [],
  products = [],
  searchText,
  setSearchText,
  pendingActions,
}: BuyerDashboardHeaderProps) {
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [searchResults, setSearchResults] = useState<(VendorRfq | VendorProductService)[]>([])
  const [searching, setSearching] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // Search logic
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      setSearching(true)
      try {
        const rfqMatches = rfqs.filter((r) =>
          r.title.toLowerCase().includes(searchText.toLowerCase()) ||
          (r.buyer_company || r.buyer_name).toLowerCase().includes(searchText.toLowerCase())
        )
        const productMatches = products.filter((p) =>
          p.name.toLowerCase().includes(searchText.toLowerCase()) ||
          p.description.toLowerCase().includes(searchText.toLowerCase())
        )
        setSearchResults([...rfqMatches.slice(0, 3), ...productMatches.slice(0, 3)])
      } finally {
        setSearching(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [searchText, rfqs, products])

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false)
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setShowNotifications(false)
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setShowAccountMenu(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const buyerInitials = (user.username || "BV").slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur lg:ml-[18rem]">
      <div className="flex items-center justify-between gap-6 px-6 py-4 md:px-8">
        {/* Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-lg">
          <div className="flex items-center gap-3 rounded-full border border-[#dfe7f1] bg-[#f8fafc] px-4 py-2.5 transition duration-200 focus-within:border-[#0f4fb6] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(15,79,182,0.1)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search RFQs, locations, orders..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-full border-0 bg-transparent text-sm text-[#1f2937] placeholder:text-[#a0aab8] outline-none font-medium"
            />
            {searching && (
              <svg className="h-4 w-4 animate-spin text-[#0f4fb6]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>

          {showSearch && (searchResults.length > 0 || (searchText.trim() && searching)) ? (
            <div className="absolute top-full left-0 right-0 mt-3 rounded-2xl border border-[#e5e9f0] bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {searchResults.map((item, idx) => {
                  const isRfq = "title" in item
                  const itemName = isRfq ? (item as VendorRfq).title : (item as VendorProductService).name
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setShowSearch(false)
                        const url = isRfq ? `/buyer/rfq?view=my&search=${encodeURIComponent(itemName)}` : `/buyer/products?search=${encodeURIComponent(itemName)}`
                        router.push(url)
                      }}
                      className="block w-full px-4 py-3 rounded-xl text-left hover:bg-[#f3f8ff] transition"
                    >
                      <p className="font-semibold text-[#1f2937] text-sm">{itemName}</p>
                      <p className="text-xs text-[#6b7280] mt-1">{isRfq ? "RFQ" : "Product"}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe7f1] bg-white text-[#6b7280] transition hover:bg-[#f8fafc] hover:text-[#0f4fb6]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
              {pendingActions > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-lg">
                  {pendingActions}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-3 w-80 rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                <p className="font-semibold text-[#1f2937] text-sm flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[#0f4fb6]" />
                  Action Required
                </p>
                <div className="mt-4 space-y-2">
                  {pendingActions > 0 ? (
                    <p className="text-sm text-[#6b7280]">{pendingActions} items need your attention (Overdue orders or RFQs pending award).</p>
                  ) : (
                    <p className="text-sm text-[#9ca3af]">No new notifications</p>
                  )}
                  <button
                    onClick={() => {
                      setShowNotifications(false)
                      document.getElementById("recent-activity")?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="mt-2 text-xs font-bold text-[#0f4fb6] hover:underline"
                  >
                    View Recent Activity
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Analytics/Chart Icon */}
          <button
            type="button"
            onClick={() => document.getElementById("supplier-health")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe7f1] bg-white text-[#6b7280] transition hover:bg-[#f8fafc] hover:text-[#0f4fb6]"
            aria-label="View supplier health"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19V9" />
              <path d="M10 19V5" />
              <path d="M16 19v-7" />
              <path d="M22 19v-3" />
            </svg>
          </button>

          {/* Account Manager */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 rounded-full border border-[#dfe7f1] bg-gradient-to-br from-[#eef4ff] to-[#e8f1ff] px-3 py-2 text-sm font-semibold text-[#0f4fb6] transition hover:bg-gradient-to-br hover:from-[#e3ecff] hover:to-[#dfe8ff]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#0f4fb6] to-[#0056d2] text-[11px] font-bold text-white shadow-md">
                {buyerInitials}
              </span>
              <span className="hidden sm:inline max-w-[100px] truncate">{user.username}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {showAccountMenu && (
              <div className="absolute top-full right-0 mt-3 w-64 rounded-2xl border border-[#e5e9f0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] overflow-hidden">
                <div className="border-b border-[#ede9f1] bg-gradient-to-br from-[#f8fafc] to-[#f0f4f8] px-5 py-4">
                  <p className="text-sm font-bold text-[#1f2937]">{user.username}</p>
                  <p className="text-xs text-[#6b7280] mt-1">{user.email}</p>
                  <p className="mt-3 inline-block rounded-full bg-gradient-to-r from-[#dde8ff] to-[#e3ecff] px-3 py-1.5 text-[10px] font-bold uppercase text-[#0056d2] tracking-wide">
                    {user.role}
                  </p>
                </div>
                <div className="border-t border-[#ede9f1] p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-3 rounded-xl text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
