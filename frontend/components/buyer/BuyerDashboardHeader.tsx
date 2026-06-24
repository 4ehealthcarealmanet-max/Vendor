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
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [searchResults, setSearchResults] = useState<(VendorRfq | VendorProductService)[]>([])
  const [searching, setSearching] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
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
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setShowAccountMenu(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sync unreadCount from global notifications
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_notifications")
      if (saved) {
        try {
          const list = JSON.parse(saved)
          setUnreadCount(list.filter((n: any) => !n.isRead).length)
        } catch {}
      }
    }

    const handleUpdate = (event: any) => {
      setUnreadCount(event.detail?.unreadCount ?? 0)
    }

    window.addEventListener("app:notifications-updated", handleUpdate)
    return () => window.removeEventListener("app:notifications-updated", handleUpdate)
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
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 shadow-sm backdrop-blur lg:ml-[18rem]">
      <div className="flex items-center justify-between gap-6 px-6 py-4 md:px-8">
        {/* Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-lg">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 transition duration-200 focus-within:border-blue-600 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.06)]">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search RFQs, locations, orders..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium"
            />
            {searching && (
              <svg className="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>

          {showSearch && (searchResults.length > 0 || (searchText.trim() && searching)) ? (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-lg z-50">
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
                      className="block w-full px-4 py-3 rounded-xl text-left hover:bg-slate-50 transition"
                    >
                      <p className="font-semibold text-slate-800 text-sm">{itemName}</p>
                      <p className="text-xs text-slate-400 mt-1">{isRfq ? "RFQ" : "Product"}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("app:toggle-notifications"))}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Account Manager */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-black text-blue-600 shadow-sm">
                {buyerInitials}
              </span>
              <span className="hidden sm:inline max-w-[100px] truncate text-slate-700">{user.username}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {showAccountMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white shadow-lg overflow-hidden z-50">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <p className="text-sm font-bold text-slate-900">{user.username}</p>
                  <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                  <p className="mt-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-[9px] font-bold uppercase text-blue-600 tracking-wider">
                    {user.role}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold text-rose-605 hover:bg-rose-50/50 transition"
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
