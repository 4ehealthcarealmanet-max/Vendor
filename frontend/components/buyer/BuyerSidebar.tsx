"use client"

import Link from "next/link"

type BuyerSection = "dashboard" | "orders" | "rfqs" | "marketplace" | "profile"

type BuyerSidebarProps = {
  active: BuyerSection
  username?: string
  buyerType?: string | null
  status?: string
  onSignOut?: () => void
}

const navItems: Array<{ key: BuyerSection; href: string; label: string; glyph: string }> = [
  { key: "dashboard", href: "/buyer/dashboard", label: "Dashboard", glyph: "DB" },
  { key: "orders", href: "/buyer/orders", label: "Orders", glyph: "OR" },
  { key: "rfqs", href: "/buyer/rfq?view=my", label: "MY RFQs", glyph: "RF" },
  { key: "marketplace", href: "/buyer/products", label: "Marketplace", glyph: "MK" },
]

const getProfileInitials = (value?: string | null) => {
  const cleaned = (value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase()
  return cleaned || "BV"
}

const formatBuyerTier = (value?: string | null) => {
  if (!value) return "Buyer Tier"
  return `${value.replace(/_/g, " ").toUpperCase()} Tier`
}

export default function BuyerSidebar({
  active,
  username,
  buyerType,
  status,
  onSignOut,
}: BuyerSidebarProps) {
  const initials = getProfileInitials(username)
  const isPending = status === "pending"

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[18rem] overflow-y-auto border-r border-white/70 bg-white/70 pt-24 shadow-[0_20px_50px_rgba(15,23,42,0.04)] backdrop-blur lg:flex">
        <div className="flex min-h-full flex-1 flex-col px-5 pb-8">
          <div className="mb-8 rounded-[1.5rem] border border-white/90 bg-white/70 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#0f4fb6] text-sm font-black text-white shadow-[0_16px_30px_rgba(15,79,182,0.24)]">
                {initials}
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-base font-extrabold leading-tight text-[#0f172a]">
                  Buyer&apos;s Desk
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b8798]">
                    {formatBuyerTier(buyerType)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={isPending ? "#" : item.href}
                onClick={(e) => {
                  if (isPending) e.preventDefault()
                }}
                className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition ${
                  item.key === active
                    ? "border border-[#dbe8ff] bg-[#f3f7ff] text-[#0f4fb6]"
                    : isPending
                    ? "cursor-not-allowed opacity-40 text-[#64748b]"
                    : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                }`}
              >
                <div className="relative">
                  <SidebarGlyph label={item.glyph} tone={item.key === active ? "blue" : "slate"} />
                  {isPending && (
                    <div className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-[#64748b] shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                  )}
                </div>
                {item.label}
              </Link>
            ))}
          </div>

          <Link
            href={isPending ? "#" : "/buyer/rfq?view=new"}
            onClick={(e) => {
              if (isPending) e.preventDefault()
            }}
            className={`mt-8 inline-flex items-center justify-center gap-2 rounded-[1.2rem] px-5 py-4 text-sm font-black text-white shadow-[0_20px_35px_rgba(17,24,39,0.18)] transition ${
              isPending
                ? "cursor-not-allowed bg-slate-400 opacity-60"
                : "bg-[#111827] hover:shadow-[0_22px_40px_rgba(17,24,39,0.28)]"
            }`}
          >
            <span className="text-base leading-none">+</span>
            Create RFQ
          </Link>

          <div className="mt-auto border-t border-[#e5e9f0] pt-6">
            <Link
              href="/buyer/profile"
              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold transition ${
                active === "profile"
                  ? "border border-[#dbe8ff] bg-[#f3f7ff] text-[#0f4fb6]"
                  : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              }`}
            >
              <SidebarGlyph label="PR" tone={active === "profile" ? "blue" : "slate"} />
              Profile Setup
            </Link>
            <Link
              href="mailto:support@medvendor.in"
              className="mt-1 flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
            >
              <SidebarGlyph label="HP" tone="slate" />
              Support Center
            </Link>
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="mt-1 flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm font-bold text-[#ba1a1a] transition hover:bg-[#fff4f4]"
              >
                <SidebarGlyph label="EX" tone="amber" />
                Log Out
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-white/70 bg-white/85 px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={isPending ? "#" : item.href}
            onClick={(e) => {
              if (isPending) e.preventDefault()
            }}
            className={`flex flex-col items-center gap-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] ${
              item.key === active ? "text-[#0f4fb6]" : "text-[#94a3b8]"
            } ${isPending ? "opacity-40" : ""}`}
          >
            <SidebarGlyph label={item.glyph} tone={item.key === active ? "blue" : "slate"} small />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

function SidebarGlyph({
  label,
  tone,
  small = false,
}: {
  label: string
  tone: "blue" | "amber" | "slate"
  small?: boolean
}) {
  const palette =
    tone === "blue"
      ? "bg-[#eef4ff] text-[#0f4fb6]"
      : tone === "amber"
        ? "bg-[#fff1e8] text-[#a93802]"
        : "bg-[#f2f4f7] text-[#475569]"

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

  return <span className="text-[10px] font-black uppercase">{label}</span>
}
