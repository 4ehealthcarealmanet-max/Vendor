"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, logoutUser, clearToken } from "@/services"

type BuyerSection = "dashboard" | "orders" | "rfqs" | "marketplace" | "profile" | "subscription" | "messages"

export type BuyerNavbarProps = {
  active: BuyerSection
  username?: string
  buyerType?: string | null
  status?: string
  hasActiveSubscription?: boolean
  onSignOut?: () => void
  userEmail?: string
  userRole?: string
  searchText?: string
  setSearchText?: (val: string) => void
  pendingActions?: number
}

const navItems: Array<{ key: BuyerSection; href: string; label: string; glyph: string }> = [
  { key: "dashboard", href: "/buyer/dashboard", label: "Dashboard", glyph: "DB" },
  { key: "orders", href: "/buyer/orders", label: "Orders", glyph: "OR" },
  { key: "rfqs", href: "/buyer/rfq?view=my", label: "MY RFQs", glyph: "RF" },
  { key: "marketplace", href: "/buyer/products", label: "Marketplace", glyph: "MK" },
  { key: "subscription", href: "/buyer/subscription", label: "Subscription", glyph: "SB" },
  { key: "messages", href: "/buyer/messages", label: "Messages", glyph: "MS" },
]

const getProfileInitials = (value?: string | null) => {
  const cleaned = (value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase()
  return cleaned || "BV"
}

const formatBuyerTier = (value?: string | null) => {
  if (!value) return "Buyer Tier"
  return `${value.replace(/_/g, " ").toUpperCase()} Tier`
}

export default function BuyerNavbar({
  active,
  username: propUsername,
  buyerType: propBuyerType,
  status: propStatus,
  hasActiveSubscription: propHasActiveSubscription = true,
  onSignOut: propOnSignOut,
  userEmail: propUserEmail = "buyer@medvendor.in",
  userRole: propUserRole = "buyer",
  searchText = "",
  setSearchText,
  pendingActions = 0,
}: BuyerNavbarProps) {
  const router = useRouter()

  // Local state for self-updating user details
  const [username, setUsername] = useState(propUsername || "Buyer")
  const [buyerType, setBuyerType] = useState(propBuyerType || null)
  const [status, setStatus] = useState(propStatus || "approved")
  const [hasActiveSubscription, setHasActiveSubscription] = useState(propHasActiveSubscription)
  const [userEmail, setUserEmail] = useState(propUserEmail)
  const [userRole, setUserRole] = useState(propUserRole)

  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const accountRef = useRef<HTMLDivElement>(null)

  const initials = getProfileInitials(username)
  const isPending = status === "pending"

  const isItemDisabled = (itemKey: BuyerSection) => {
    if (isPending) {
      return itemKey !== "subscription" && itemKey !== "profile"
    }
    if (!hasActiveSubscription) {
      return itemKey !== "subscription" && itemKey !== "profile"
    }
    return false
  }

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setShowAccountMenu(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sync unreadCount from global notification polling
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

  // Fetch fresh user profile on mount to resolve stale username across page transitions
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          setUsername(user.username)
          if (user.buyer_type) setBuyerType(user.buyer_type)
          if (user.status) setStatus(user.status)
          if (user.email) setUserEmail(user.email)
          if (user.role) setUserRole(user.role)
        }
      } catch {
        // quiet
      }
    }
    fetchUserProfile()
  }, [])

  const handleSignOut = async () => {
    if (propOnSignOut) {
      propOnSignOut()
      return
    }
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <>
      {/* ── Desktop Navbar (lg+) ─────────────────────────── */}
      <header className="sticky top-0 z-40 hidden w-full border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur lg:block">
        <div className="mx-auto max-w-[1600px] w-full px-6 py-4 md:px-8 flex items-center justify-between gap-6">

          {/* Logo */}
          <div className="flex items-center shrink-0">
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-slate-900">
              Pathya<span className="text-blue-600">Tech</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-2 mx-auto">
            {navItems.map((item) => {
              const disabled = isItemDisabled(item.key)
              const isActive = item.key === active
              return (
                <Link
                  key={item.key}
                  href={disabled ? "#" : item.href}
                  onClick={(e) => { if (disabled) e.preventDefault() }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ${
                    isActive
                      ? "bg-blue-55 text-blue-600 font-bold"
                      : disabled
                        ? "cursor-not-allowed opacity-40 text-slate-400"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("app:toggle-notifications"))}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-transparent text-slate-500 transition hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2.5 rounded-xl bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-xl bg-blue-50 text-[11px] font-black text-blue-600 shadow-sm">
                  {initials}
                </span>
                <span className="hidden sm:inline text-slate-700 font-bold">{username}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {showAccountMenu && (
                <div className="absolute top-full right-0 mt-2 w-60 rounded-2xl border border-slate-100 bg-white shadow-lg overflow-hidden z-50">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                    <p className="text-sm font-bold text-slate-900 truncate">{username}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate">{userEmail}</p>
                    <p className="mt-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-[9px] font-bold uppercase text-blue-600 tracking-wider">
                      {formatBuyerTier(buyerType)}
                    </p>
                  </div>
                  <div className="p-1 space-y-0.5">
                    <Link href="/buyer/profile" className={`block w-full px-4 py-2 rounded-xl text-left text-xs font-bold transition ${active === "profile" ? "bg-blue-55 text-blue-600" : "text-slate-600 hover:bg-slate-50"}`}>
                      Profile Setup
                    </Link>
                    <Link href="mailto:support@medvendor.in" className="block w-full px-4 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                      Support Center
                    </Link>
                    <button type="button" onClick={handleSignOut} className="block w-full px-4 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition cursor-pointer">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Navbar (< lg) ────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3.5">
          {/* Logo */}
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-slate-900">
            Pathya<span className="text-blue-600">Tech</span>
          </span>

          {/* Right: notification + hamburger */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("app:toggle-notifications"))}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 transition"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 17H5l2-2v-4a5 5 0 1 1 10 0v4l2 2h-4" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Pending actions badge */}
            {pendingActions > 0 && (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-sm">
                {pendingActions}
              </span>
            )}

            {/* Hamburger / Close */}
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition"
            >
              {mobileMenuOpen ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile Slide-Down Menu ───────────────────── */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white shadow-xl max-h-[calc(100svh-56px)] overflow-y-auto overscroll-contain">
            {/* User info header — sticky inside the scroll area */}
            <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-blue-600">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{username}</p>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase text-blue-600 tracking-wider">
                {formatBuyerTier(buyerType)}
              </span>
            </div>

            {/* Nav links */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const disabled = isItemDisabled(item.key)
                const isActive = item.key === active
                return (
                  <Link
                    key={item.key}
                    href={disabled ? "#" : item.href}
                    onClick={(e) => {
                      if (disabled) { e.preventDefault(); return }
                      closeMobileMenu()
                    }}
                    className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : disabled
                          ? "opacity-40 text-slate-400 cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <SidebarGlyph
                      label={item.glyph}
                      tone={isActive ? "active" : "slate"}
                      small
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto text-[10px] font-black text-white/70 uppercase tracking-wider">Active</span>
                    )}
                  </Link>
                )
              })}

              {/* Profile link */}
              <Link
                href="/buyer/profile"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active === "profile"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <SidebarGlyph label="PR" tone={active === "profile" ? "active" : "slate"} small />
                <span>Profile</span>
              </Link>
            </nav>

            {/* Footer actions */}
            <div className="border-t border-slate-100 p-3 space-y-1 pb-6">
              <Link
                href="mailto:support@medvendor.in"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" /><path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
                </svg>
                Support Center
              </Link>
              <button
                type="button"
                onClick={() => { closeMobileMenu(); handleSignOut() }}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  )
}

function SidebarGlyph({
  label,
  tone,
  small = false,
}: {
  label: string
  tone: "blue" | "amber" | "slate" | "active"
  small?: boolean
}) {
  const palette =
    tone === "blue"
      ? "bg-blue-50 text-blue-600"
      : tone === "amber"
        ? "bg-rose-50 text-rose-600"
        : tone === "active"
          ? "bg-white/20 text-white"
          : "bg-slate-50 text-slate-500"

  const sizeClass = small ? "h-7 w-7" : "h-8 w-8"
  const iconSize = small ? "h-3 w-3" : "h-3.5 w-3.5"

  return (
    <span className={`inline-flex items-center justify-center rounded-xl ${palette} ${sizeClass}`}>
      <SidebarGlyphIcon label={label} className={iconSize} />
    </span>
  )
}

function SidebarGlyphIcon({ label, className }: { label: string; className: string }) {
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

  if (label === "MK") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="19" r="1.5" />
        <circle cx="18" cy="19" r="1.5" />
        <path d="M3 4h2l2.4 9.6a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H7" />
      </svg>
    )
  }

  if (label === "PR") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
        <path d="M19 7h2" />
        <path d="M20 6v2" />
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
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    )
  }

  if (label === "SB") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="7" y1="15" x2="11" y2="15" />
      </svg>
    )
  }

  if (label === "MS") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  }

  return <span className="text-[10px] font-black uppercase">{label}</span>
}
