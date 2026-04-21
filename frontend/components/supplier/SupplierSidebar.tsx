"use client"

import Link from "next/link"

type SupplierSection = "dashboard" | "rfqs" | "orders" | "supplies" | "analytics" | "settings"

type SupplierSidebarProps = {
  active: SupplierSection
  username?: string
  onSignOut?: () => void
}

const navItems: Array<{ key: SupplierSection; href: string; label: string; glyph: string }> = [
  { key: "dashboard", href: "/supplier/dashboard", label: "Dashboard", glyph: "DB" },
  { key: "rfqs", href: "/supplier/rfq", label: "RFQs", glyph: "RF" },
  { key: "supplies", href: "/supplier/products", label: "Supplies", glyph: "MD" },
  { key: "orders", href: "/supplier/orders", label: "Orders", glyph: "OR" },
  { key: "analytics", href: "/supplier/analytics", label: "Analytics", glyph: "AN" },
]

const getProfileInitials = (value?: string | null) => {
  const cleaned = (value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase()
  return cleaned || "SP"
}

export default function SupplierSidebar({ active, username, onSignOut }: SupplierSidebarProps) {
  const initials = getProfileInitials(username)

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[18rem] overflow-y-auto border-r border-[#e5ebf3] bg-[#f6f8fb]/95 pt-8 shadow-[0_18px_40px_rgba(15,23,42,0.04)] backdrop-blur lg:flex">
        <div className="flex min-h-full flex-1 flex-col px-4 pb-8">
          <Link href="/supplier/dashboard" className="mb-8 flex items-center gap-3 px-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f4fb6,#1d72ff)] text-white shadow-[0_18px_28px_rgba(15,79,182,0.2)]">
              <SidebarGlyphIcon label="MD" className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-[family-name:var(--font-display)] text-xl font-extrabold tracking-[-0.04em] text-[#0f172a]">
                MedVendor
              </span>
              <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-[#7b8798]">
                Premium Supplier
              </span>
            </span>
          </Link>

          <div className="mb-8 rounded-[1.5rem] border border-white/90 bg-white/75 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#0f4fb6,#1d72ff)] text-sm font-black text-white shadow-[0_16px_30px_rgba(15,79,182,0.24)]">
                {initials}
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-base font-extrabold leading-tight text-[#0f172a]">
                  Supplier Desk
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b8798]">
                    Catalog Active
                  </p>
                </div>
              </div>
            </div>
          </div>


          <nav className="space-y-1" aria-label="Supplier">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-bold transition ${
                  item.key === active
                    ? "border border-[#dbe8ff] bg-white text-[#0f4fb6] shadow-[inset_4px_0_0_0_#0f4fb6]"
                    : "text-[#64748b] hover:bg-white hover:text-[#0f172a]"
                }`}
              >
                <SidebarGlyph label={item.glyph} tone={item.key === active ? "blue" : "slate"} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#e5ebf3] pt-6">
            <Link
              href="/supplier/settings"
              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold transition ${
                active === "settings"
                  ? "border border-[#dbe8ff] bg-white text-[#0f4fb6] shadow-[inset_4px_0_0_0_#0f4fb6]"
                  : "text-[#64748b] hover:bg-white hover:text-[#0f172a]"
              }`}
            >
              <SidebarGlyph label="ST" tone={active === "settings" ? "blue" : "slate"} />
              Settings
            </Link>
            <Link
              href="mailto:support@medvendor.in"
              className="mt-1 flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold text-[#64748b] transition hover:bg-white hover:text-[#0f172a]"
            >
              <SidebarGlyph label="HP" tone="slate" />
              Support
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

      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-white/80 bg-white/90 px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] ${
                item.key === active ? "text-[#0f4fb6]" : "text-[#94a3b8]"
              }`}
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
        : "bg-[#edf1f6] text-[#475569]"

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

  if (label === "RF") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
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

  if (label === "AN") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19v-3" />
      </svg>
    )
  }

  if (label === "MD") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 6v12" />
        <path d="M6 12h12" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </svg>
    )
  }

  if (label === "ST") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 7.2a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.25V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
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
