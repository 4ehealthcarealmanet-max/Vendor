"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import type { AuthUser, VendorRfq, VendorProductService } from "@/services"
import { clearToken, logoutUser } from "@/services"

interface DashboardHeaderProps {
  user: AuthUser
  rfqs?: VendorRfq[]
  products?: VendorProductService[]
  onRefresh?: () => void
}

export default function DashboardHeader({ user, rfqs = [], products = [], onRefresh }: DashboardHeaderProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<(VendorRfq | VendorProductService)[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // Fetch notification count
  useEffect(() => {
    if (rfqs.length > 0) {
      const newRfqs = rfqs.filter((r) => r.status === "open").length
      setNotificationCount(newRfqs)
    }
  }, [rfqs])

  // Search handler with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        // Use already-loaded data from props
        const rfqMatches = rfqs.filter((r) =>
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.buyer_name.toLowerCase().includes(searchTerm.toLowerCase())
        )

        const productMatches = products.filter((p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
        )

        setSearchResults([...rfqMatches.slice(0, 3), ...productMatches.slice(0, 3)])
      } catch (err) {
        console.error("Search error:", err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [searchTerm, rfqs, products])

  // Close dropdowns on outside click
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
    } catch {
      // ignore
    }
    clearToken()
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5e9f0]/50 bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-6 px-6 py-4 md:px-8">
        {/* Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-lg">
          <div className="flex items-center gap-3 rounded-full border border-[#dfe7f1] bg-[#f8fafc] px-4 py-3 transition duration-200 focus-within:border-[#0f4fb6] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(15,79,182,0.1)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search RFQs, buyers, or products…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                setShowSearch(true)
                console.log("Search focused, term:", searchTerm)
              }}
              className="w-full border-0 bg-transparent text-sm text-[#1f2937] placeholder:text-[#a0aab8] outline-none font-medium"
            />
            {searching ? (
              <svg className="h-4 w-4 animate-spin text-[#0f4fb6]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
          </div>

          {showSearch && (searchResults.length > 0 || (searchTerm.trim() && searching)) ? (
            <div className="absolute top-full left-0 right-0 mt-3 rounded-2xl border border-[#e5e9f0] bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
              {searching ? (
                <div className="flex items-center justify-center gap-2 px-4 py-4">
                  <svg className="h-5 w-5 animate-spin text-[#0f4fb6]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm text-[#6b7280]">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {searchResults.map((item, idx) => {
                    const isRfq = "title" in item
                    const itemId = isRfq ? (item as VendorRfq).id : (item as VendorProductService).id
                    const itemName = isRfq ? (item as VendorRfq).title : (item as VendorProductService).name
                    
                    const handleNavigate = () => {
                      console.log("Navigating to", isRfq ? "RFQ" : "Product", itemId, itemName)
                    const searchQuery = encodeURIComponent(itemName)
                    const url = isRfq 
                      ? `/supplier/dashboard?search=${searchQuery}&focus=rfq&focusId=${itemId}`
                      : `/supplier/dashboard?search=${searchQuery}&focus=product&focusId=${itemId}`
                      setTimeout(() => {
                        router.push(url)
                      }, 50)
                    }
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={handleNavigate}
                        className="block w-full px-4 py-3 rounded-xl text-left hover:bg-[#f3f8ff] transition cursor-pointer"
                      >
                        <p className="font-semibold text-[#1f2937] text-sm">{itemName}</p>
                        <p className="text-xs text-[#6b7280] mt-1">{isRfq ? (item as VendorRfq).buyer_name : (item as VendorProductService).description.slice(0, 50)}</p>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : showSearch && searchTerm.trim() && !searching ? (
            <div className="absolute top-full left-0 right-0 mt-3 rounded-2xl border border-[#e5e9f0] bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)] text-center">
              <p className="text-sm text-[#6b7280]">No results found</p>
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
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notificationCount > 0 ? (
                <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-lg">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              ) : null}
            </button>

            {showNotifications ? (
              <div className="absolute top-full right-0 mt-3 w-80 rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                <p className="font-semibold text-[#1f2937] text-sm flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[#0f4fb6]" />
                  New Opportunities
                </p>
                <div className="mt-4 space-y-2">
                  {notificationCount > 0 ? (
                    <p className="text-sm text-[#6b7280]">{notificationCount} open RFQs available for you to bid on</p>
                  ) : (
                    <p className="text-sm text-[#9ca3af]">No new notifications</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Account Manager */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 rounded-full border border-[#dfe7f1] bg-gradient-to-br from-[#eef4ff] to-[#e8f1ff] px-3 py-2 text-sm font-semibold text-[#0f4fb6] transition hover:bg-gradient-to-br hover:from-[#e3ecff] hover:to-[#dfe8ff]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#0f4fb6] to-[#0056d2] text-[11px] font-bold text-white shadow-md">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline max-w-[100px] truncate">{user.username}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {showAccountMenu ? (
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
                    onClick={() => {
                      setShowAccountMenu(false)
                      handleLogout()
                    }}
                    className="block w-full px-4 py-3 rounded-xl text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

