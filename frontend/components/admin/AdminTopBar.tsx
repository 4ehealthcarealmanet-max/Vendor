"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { clearToken } from "@/services"

export default function AdminTopBar({ 
  adminName, 
  searchQuery, 
  onSearchChange,
  onProfileClick
}: { 
  adminName: string; 
  searchQuery?: string; 
  onSearchChange?: (val: string) => void;
  onProfileClick?: () => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    clearToken()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-40 flex h-24 w-full items-center justify-between border-b border-[#e5e9f0] bg-white/80 px-8 backdrop-blur-md">
      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <h1 className="text-[15px] font-black tracking-[0.15em] text-[#0f172a] uppercase">Admin Dashboard</h1>
        </div>

        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Global Search Matrix..."
            className="h-12 w-96 rounded-[1rem] border border-[#e2e8f0] bg-[#f8fafc] pl-12 pr-4 text-xs font-bold text-[#0f172a] outline-none transition-all focus:border-[#0f4fb6] focus:bg-white focus:shadow-[0_0_0_4px_rgba(15,79,182,0.06)]"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors group-focus-within:text-[#0f4fb6]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-[#e2e8f0] bg-white px-1.5 py-0.5 text-[10px] font-black text-[#94a3b8] tracking-tighter">⌘K</div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
           <button className="relative rounded-[0.9rem] bg-[#f8fafc] p-2.5 text-[#64748b] transition-all hover:bg-[#f1f5f9] hover:text-[#0f172a]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <div className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
           </button>
           <button className="rounded-[0.9rem] bg-[#f8fafc] p-2.5 text-[#64748b] transition-all hover:bg-[#f1f5f9] hover:text-[#0f172a]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
           </button>
        </div>

        <div className="relative">
          <div 
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen)
              onProfileClick?.()
            }}
            className="flex items-center gap-4 pl-8 border-l-2 border-[#f1f5f9] cursor-pointer group transition-all active:scale-95"
          >
            <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <p className="text-xs font-black text-slate-950 capitalize">{adminName}</p>
                </div>
            </div>
            <div className="h-12 w-12 rounded-[1.25rem] bg-white border-2 border-slate-100 p-1 shadow-lg group-hover:rotate-3 transition-transform">
                <div className="h-full w-full rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white font-black text-xs shadow-inner">
                  {adminName.slice(0, 2).toUpperCase() || "AD"}
                </div>
            </div>
          </div>

          {/* Admin Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              <div className="absolute right-0 mt-3 w-64 origin-top-right rounded-[1.5rem] border border-[#e5e9f0] bg-white p-2 shadow-2xl z-20 animate-slide-down">
                <div className="p-4 border-b border-[#f1f5f9]">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">System Administrator</p>
                   <h4 className="mt-1 font-black text-[#0f172a]">{adminName}</h4>
                   <p className="text-xs font-medium text-[#64748b]">admin@antigravity.io</p>
                </div>
                <div className="p-1 mt-1 border-t border-[#f1f5f9]">
                   <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-50 group"
                   >
                      <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Logout
                   </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
