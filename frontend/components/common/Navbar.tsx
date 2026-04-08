"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AuthUser } from "@/services"
import { clearToken, getCurrentUser, getToken, logoutUser } from "@/services"
import { navLinks } from "@/components/home/landingData"

const roleNav = {
  buyer: [
    { href: "/buyer/dashboard", label: "Dashboard" },
    { href: "/buyer/rfq", label: "RFQs" },
    { href: "/buyer/products", label: "Products" },
    { href: "/buyer/orders", label: "Orders" },
  ],
  supplier: [
    { href: "/supplier/dashboard", label: "Dashboard" },
    { href: "/supplier/rfq", label: "RFQs" },
    { href: "/supplier/products", label: "Products" },
    { href: "/supplier/orders", label: "Orders" },
  ],
}

type UserState = AuthUser | null

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<UserState>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let active = true
    const initialize = async () => {
      const token = getToken()
      if (!token) {
        if (active) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const profile = await getCurrentUser()
        if (active) setUser(profile)
      } catch {
        clearToken()
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()
    return () => {
      active = false
    }
  }, [])

  const menuItems = useMemo(() => {
    if (user?.role && roleNav[user.role]) {
      return roleNav[user.role]
    }
    return navLinks
  }, [user])

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch {
      // ignore logout errors and clear local state anyway
    }
    clearToken()
    setUser(null)
    router.push("/")
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#dbe1ea]/80 bg-white/95 shadow-[0_6px_24px_rgba(25,28,30,0.04)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <div className="flex items-center gap-8 lg:gap-12">
          <Link href="/" className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[-0.04em] text-[#133b81]">
            MedVendor
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#6a7284] md:flex">
            {menuItems.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors duration-200 hover:text-[#0056d2]">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-[#dbe1ea] bg-[#f8fbff] px-4 py-2 text-sm text-[#0f4fb6] md:flex">
                <span className="font-semibold">{user.username}</span>
                <span className="rounded-full bg-[#dbe2ff] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0056d2]">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-[#0040a1] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,86,210,0.18)] transition hover:bg-[#00377f]"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-[#5a6477] transition-colors hover:text-[#0056d2]">
                Login
              </Link>
              <Link href="/register" className="rounded-lg bg-gradient-to-br from-[#0040a1] to-[#0056d2] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,86,210,0.22)] transition hover:opacity-95">
                Register
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe1ea] bg-white text-[#1f2937] md:hidden"
            aria-label="Toggle navigation"
          >
            <span className="text-xl">{menuOpen ? "×" : "≡"}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-[#dbe1ea]/80 bg-white/95 px-6 py-4 md:hidden">
          <div className="space-y-3">
            {menuItems.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#1f2937] transition hover:bg-[#f1f5ff]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  handleLogout()
                }}
                className="w-full rounded-2xl bg-[#0040a1] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,86,210,0.18)]"
              >
                Logout
              </button>
            ) : (
              <div className="space-y-2">
                <Link href="/login" className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#1f2937] transition hover:bg-[#f1f5ff]" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link href="/register" className="block rounded-2xl bg-[#0040a1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00377f]" onClick={() => setMenuOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
