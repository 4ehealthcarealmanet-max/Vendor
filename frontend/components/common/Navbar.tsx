"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AuthUser } from "@/services"
import { clearToken, getCurrentUser, getToken, logoutUser } from "@/services"
import { navLinks } from "@/components/home/landingData"
import AuthScreen from "@/components/auth/AuthScreen"

const hoverCardData: Record<string, {
  description: string
  featured: {
    title: string
    badge?: string
    desc: string
    cta: string
    href: string
  }
  items: Array<{
    title: string
    desc: string
    href: string
    icon: React.ReactNode
  }>
}> = {
  Marketplace: {
    description: "Access a certified network of manufacturers, healthcare equipment, and surgical supplies.",
    featured: {
      title: "AI-Powered Sourcing",
      badge: "New",
      desc: "Instantly match your procurement lists with verified medical supplies globally.",
      cta: "Explore Matcher",
      href: "/register?role=buyer"
    },
    items: [
      {
        title: "Medical Equipment",
        desc: "Advanced diagnostic imaging, laboratory monitors, and patient life support systems.",
        href: "#marketplace",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      },
      {
        title: "Clinical Consumables",
        desc: "High-grade surgical gloves, syringes, sanitizers, and diagnostic kits.",
        href: "#marketplace",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )
      },
      {
        title: "Logistics & Delivery",
        desc: "Real-time temperature control and guaranteed sterile shipping pathways.",
        href: "#marketplace",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1zm0 0h5l3 3v-3h2v-6h-7v6z" />
          </svg>
        )
      }
    ]
  },
  Suppliers: {
    description: "Onboard, track, and collaborate with verified manufacturers and distributors.",
    featured: {
      title: "Supplier Verification",
      badge: "Standard",
      desc: "Every vendor undergoes rigid ISO and regulatory credential verification checks.",
      cta: "Verify Standards",
      href: "/register?role=supplier"
    },
    items: [
      {
        title: "Global Directory",
        desc: "Instantly filter verified OEM manufacturers, wholesale distributors, and local hubs.",
        href: "#suppliers",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      },
      {
        title: "Bidding Terminal",
        desc: "Suppliers submit competitive bids directly through a secure unified system.",
        href: "#suppliers",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1m-4-6h8" />
          </svg>
        )
      },
      {
        title: "Secure Escrows",
        desc: "Procurement funds are released upon verified recipient milestone delivery.",
        href: "#suppliers",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      }
    ]
  },
  Solutions: {
    description: "Streamline hospital supplies requisition with intelligent cloud automation tools.",
    featured: {
      title: "Enterprise Solutions",
      badge: "Hospital",
      desc: "Tailored multi-facility support, central warehousing, and tier-based approval routes.",
      cta: "Book Consultation",
      href: "/register?role=buyer"
    },
    items: [
      {
        title: "Requisition Control",
        desc: "Automated RFQ dispatch templates and structured buyer verification checks.",
        href: "#solutions",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        )
      },
      {
        title: "Compliance Ledger",
        desc: "Digital certificate management, license validation, and cryptographically secure logs.",
        href: "#solutions",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        )
      },
      {
        title: "Analytics Hub",
        desc: "Identify seasonal cost trends, delivery lapses, and optimize storage expenses.",
        href: "#solutions",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        )
      }
    ]
  },
  Resources: {
    description: "Browse documentation, developer references, standard guides, and platform support.",
    featured: {
      title: "Help & Documentation",
      badge: "Docs",
      desc: "Detailed step-by-step videos and articles explaining the entire bid submission workflow.",
      cta: "Visit Docs",
      href: "#resources"
    },
    items: [
      {
        title: "Developer API",
        desc: "Connect your inventory, logistics feed, and EMR database using our webhooks.",
        href: "#resources",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )
      },
      {
        title: "Live Chat Support",
        desc: "Connect directly with our support specialists for urgent delivery and billing tickets.",
        href: "mailto:support@medvendor.in",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      },
      {
        title: "Procurement Insights",
        desc: "Research whitepapers, pricing indices, and policy briefs about healthcare systems.",
        href: "#resources",
        icon: (
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      }
    ]
  }
}

function NavHoverCard({ link }: { link: { href: string; label: string } }) {
  const [isOpen, setIsOpen] = useState(false)
  const data = hoverCardData[link.label]

  if (!data) return null

  return (
    <div
      className="relative py-3"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link
        href={link.href}
        className={`flex items-center gap-1 transition-colors duration-205 hover:text-[#2563EB] py-1 text-sm font-semibold ${
          isOpen ? "text-[#2563EB]" : "text-[#64748B]"
        }`}
      >
        <span>{link.label}</span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#2563EB]" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Link>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[320px] rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md z-50 transition-all duration-300 animate-fade-in text-left">
          <div className="grid gap-1">
            {data.items.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="group flex items-start gap-3.5 rounded-xl p-2.5 transition duration-200 hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition duration-305">
                  {item.icon}
                </div>
                <div>
                  <h5 className="text-[12px] font-bold text-slate-800 group-hover:text-[#2563EB] transition duration-200">
                    {item.title}
                  </h5>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
  admin: [
    { href: "/admin/dashboard", label: "Admin Dashboard" },
  ],
}

type UserState = AuthUser | null

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<UserState>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean
    mode: "login" | "register"
    role?: "supplier" | "buyer"
    next?: string
  }>({
    isOpen: false,
    mode: "login",
  })

  useEffect(() => {
    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: "login" | "register"; role?: "supplier" | "buyer"; next?: string }>
      setAuthModal({
        isOpen: true,
        mode: customEvent.detail?.mode || "login",
        role: customEvent.detail?.role,
        next: customEvent.detail?.next,
      })
    }
    window.addEventListener("open-auth-modal", handleOpenAuth)
    return () => window.removeEventListener("open-auth-modal", handleOpenAuth)
  }, [])

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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: translate(-50%, 4px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0) scale(1);
            }
          }
          .animate-fade-in {
            animation: fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
          .animate-slide-in {
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        `
      }} />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#dbe1ea]/80 bg-white/95 shadow-[0_6px_24px_rgba(25,28,30,0.04)] backdrop-blur-md">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          {/* Logo on Left */}
          <div className="flex items-center">
            <Link href="/" className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[-0.04em] text-[#0F172A] hover:opacity-90 transition-opacity duration-200">
              Pathya<span className="text-[#2563EB]">Tech</span>
            </Link>
          </div>

          {/* Navigation Items Centered */}
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#64748B] md:flex absolute left-1/2 -translate-x-1/2">
            {menuItems.map((link) => {
              const isLandingLink = ["Marketplace", "Suppliers", "Solutions", "Resources"].includes(link.label)
              if (isLandingLink) {
                return <NavHoverCard key={link.label} link={link} />
              }
              return (
                <Link key={link.href} href={link.href} className="transition-colors duration-200 hover:text-[#2563EB]">
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3 z-10">
            {loading ? null : user ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm text-[#2563EB] md:flex">
                  <span className="font-semibold">{user.username}</span>
                  <span className="rounded-full bg-[#DBEAFE] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] transition hover:bg-[#1D4ED8]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAuthModal({ isOpen: true, mode: "login" })}
                  className="hidden md:inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-[#64748B] transition-colors hover:text-[#2563EB]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthModal({ isOpen: true, mode: "register" })}
                  className="hidden md:inline-flex rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] transition hover:bg-[#1D4ED8]"
                >
                  Register
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe1ea] bg-white text-[#1f2937] md:hidden"
              aria-label="Open navigation"
            >
              <span className="text-xl">≡</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer/Sidebar Menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-[9999] w-[300px] bg-white shadow-[-10px_0_50px_rgba(15,23,42,0.15)] flex flex-col md:hidden animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <span className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-[-0.04em] text-[#0F172A]">
                Pathya<span className="text-[#2563EB]">Tech</span>
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 hover:text-slate-800"
                aria-label="Close navigation"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
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
            </div>

            {/* Footer / Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#2563EB]">
                    <span className="font-bold truncate">{user.username}</span>
                    <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#2563EB] shrink-0 ml-auto">
                      {user.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full rounded-2xl bg-red-550 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(239,68,68,0.18)] transition hover:bg-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setAuthModal({ isOpen: true, mode: "login" })
                    }}
                    className="w-full text-center block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#1f2937] transition hover:bg-slate-50"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setAuthModal({ isOpen: true, mode: "register" })
                    }}
                    className="w-full text-center block rounded-2xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] transition hover:bg-[#1D4ED8]"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {authModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-[500px] my-auto">
            <AuthScreen
              defaultMode={authModal.mode}
              defaultRole={authModal.role}
              nextPath={authModal.next}
              isModal={true}
              onClose={() => setAuthModal({ isOpen: false, mode: "login" })}
            />
          </div>
        </div>
      )}
    </>
  )
}
