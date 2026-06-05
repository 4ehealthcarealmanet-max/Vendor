"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { clearToken } from "@/services"

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRole = searchParams.get("role")

  const handleLogout = () => {
    clearToken()
    router.push("/login")
  }

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    )},
    { name: "Buyers", href: "/admin/dashboard?role=buyer", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )},
    { name: "Suppliers", href: "/admin/dashboard?role=supplier", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    )},
    { name: "Settings", href: "/admin/settings", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    )},
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 border-r border-[#e5e9f0] bg-white z-50 flex flex-col">
      <div className="p-8 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <span className="font-black text-xl tracking-tighter text-[#0f172a] uppercase">Admin Dashboard</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 mt-4">
        {menuItems.map((item) => {
          const itemRole = item.href.includes('role=') ? item.href.split('role=')[1] : null
          const isActive = itemRole 
            ? currentRole === itemRole 
            : (pathname === item.href && !currentRole)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${
                isActive 
                  ? "text-[#0f4fb6] bg-blue-50/50" 
                  : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              }`}
            >
              <div className={`${isActive ? "text-[#0f4fb6]" : "text-[#94a3b8] group-hover:text-[#0f172a]"} transition-colors`}>
                {item.icon}
              </div>
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#f1f5f9]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black text-rose-600 transition-all hover:bg-rose-50 hover:shadow-inner group"
        >
          <div className="text-rose-400 group-hover:text-rose-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
          Logout
        </button>
      </div>
    </aside>
  )
}
