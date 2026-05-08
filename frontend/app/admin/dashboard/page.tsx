"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AdminTopBar from "@/components/admin/AdminTopBar"
import { getAdminUsers, getCurrentUser } from "@/services"
import { AdminUser, AuthUser } from "@/types"

export default function AdminDashboardPage() {
  const searchParams = useSearchParams()
  const initialRole = searchParams.get("role") || "all"

  const [users, setUsers] = useState<AdminUser[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("admin_users_list")
      if (cached) {
        try { return JSON.parse(cached) } catch { return [] }
      }
    }
    return []
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("admin_users_list")
    }
    return true
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>(initialRole)
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const role = searchParams.get("role")
    if (role) setRoleFilter(role)
    else setRoleFilter("all")
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      try {
        const [usersData, me] = await Promise.all([
          getAdminUsers(),
          getCurrentUser()
        ])
        setUsers(usersData)
        setAdminUser(me)
        // Cache for next visit
        sessionStorage.setItem("admin_users_list", JSON.stringify(usersData))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredUsers = useMemo(() => {
    let result = users
    if (statusFilter !== "all") result = result.filter(u => u.status === statusFilter)
    if (roleFilter !== "all") result = result.filter(u => u.role === roleFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.verification_info?.company_name?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [users, searchQuery, statusFilter, roleFilter])

  const stats = useMemo(() => {
    const relevantUsers = roleFilter === "all" ? users : users.filter(u => u.role === roleFilter)
    const pending = relevantUsers.filter(u => u.status === "pending").length
    const approved = relevantUsers.filter(u => u.status === "approved").length
    const roleLabel = roleFilter === "buyer" ? "Buyers" : roleFilter === "supplier" ? "Suppliers" : "Participants"
    
    return {
      total: relevantUsers.length,
      active: approved,
      pending: pending,
      urgent: relevantUsers.filter(u => u.status === "pending" && new Date(u.created_at) > new Date(Date.now() - 86400000)).length,
      label: roleLabel
    }
  }, [users, roleFilter])

  if (loading) return <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center"><p className="font-black uppercase tracking-[0.3em] text-[#94a3b8] animate-pulse">Loading command center...</p></div>

  return (
    <div className="min-h-screen bg-[#f7f9fb] selection:bg-[#0f4fb6]/10 selection:text-[#0f4fb6]">
      <div className="flex flex-col min-h-screen">
        <AdminTopBar
          adminName={adminUser?.username || "Admin"}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-8 lg:p-12 space-y-12">
          <div className="max-w-7xl mx-auto space-y-12">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 shrink-0">
              <MetricCard label={`Total ${stats.label}`} value={stats.total} delta="+4.2%" tone="blue" />
              <MetricCard label={`Active ${stats.label}`} value={stats.active} status="Stable" tone="indigo" />
              <MetricCard label="Awaiting Approval" value={stats.pending} tone="violet" />
              <MetricCard label="Urgent Actions" value={stats.urgent} tone="amber" />
            </div>

            {/* Header & Matrix Container */}
            <div className="space-y-8">
              <div className="shrink-0">
                <div className="flex items-end justify-between pb-6 border-b border-[#e5e9f0]">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter text-[#0f172a]">All Users</h2>
                    <p className="text-sm font-medium text-[#64748b] mt-1">Management and strategic verification of all platform participants.</p>
                  </div>
                  <div className="flex items-end gap-6">
                    <div className="flex items-end gap-4">
                      <FilterDropdown label="Clearance Status" value={statusFilter} onChange={setStatusFilter} options={["all", "pending", "approved", "rejected"]} />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Live Sync</p>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 space-y-6 pb-6">
                {filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-[#94a3b8] space-y-4">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <p className="text-sm font-black uppercase tracking-widest">No matching participants found</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <VettingRequestCard
                      key={user.id}
                      user={user}
                      onClick={() => {
                        sessionStorage.setItem("admin_selected_user", JSON.stringify(user))
                        router.push(`/admin/dashboard/user/${user.id}`)
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function FilterDropdown({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#94a3b8] ml-1">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[#e5e9f0] bg-white px-4 text-[11px] font-black uppercase tracking-widest text-[#0f172a] outline-none transition-all focus:border-[#0f4fb6] focus:shadow-[0_0_0_4px_rgba(15,79,182,0.06)] cursor-pointer"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
      </select>
    </div>
  )
}

function MetricCard({ label, value, delta, status, tone }: { label: string; value: number; delta?: string; status?: string; tone: string }) {
  const tones = {
    blue: "border-blue-500/50 hover:border-blue-500 bg-blue-50/20",
    indigo: "border-indigo-500/50 hover:border-indigo-500 bg-indigo-50/20",
    violet: "border-violet-500/50 hover:border-violet-500 bg-violet-50/20",
    amber: "border-amber-500/50 hover:border-amber-500 bg-amber-50/20",
  }
  const isLive = label.toLowerCase().includes("urgent") || label.toLowerCase().includes("awaiting")

  return (
    <article className={`group relative rounded-[2.25rem] border-2 bg-white p-5 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1.5 hover:shadow-2xl cursor-default overflow-hidden ${tones[tone as keyof typeof tones]}`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${tone === 'blue' ? 'bg-blue-500 shadow-[0_2px_10px_rgba(59,130,246,0.5)]' :
          tone === 'indigo' ? 'bg-indigo-500 shadow-[0_2px_10px_rgba(99,102,241,0.5)]' :
            tone === 'violet' ? 'bg-violet-500 shadow-[0_2px_10px_rgba(139,92,246,0.5)]' :
              'bg-amber-500 shadow-[0_2px_10px_rgba(245,158,11,0.5)]'
        }`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-[#f1f5f9] transition-all duration-500 group-hover:scale-110 relative overflow-hidden">
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${tone === 'blue' ? 'bg-blue-500' :
              tone === 'indigo' ? 'bg-indigo-500' :
                tone === 'violet' ? 'bg-violet-500' :
                  'bg-amber-500'
            }`} />
          <div className="transition-all duration-500 group-hover:scale-125 relative z-10 scale-90">
            {label.toLowerCase().includes("total") && <svg className="text-blue-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
            {label.toLowerCase().includes("active") && <svg className="text-indigo-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
            {label.toLowerCase().includes("awaiting") && <svg className="text-violet-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            {label.toLowerCase().includes("urgent") && <svg className="text-amber-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
          </div>
        </div>
        <div className="text-right">
          {isLive ? (
            <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-rose-600">Live</span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              {delta && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{delta}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 relative z-10 flex items-end justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">{label}</p>
          <p className="mt-0.5 text-4xl font-black tracking-tighter text-[#0f172a] group-hover:text-[#0f4fb6] transition-colors">{value.toLocaleString()}</p>
        </div>
        {!isLive && status && (
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#cbd5e1] mb-1">{status}</span>
        )}
      </div>
    </article>
  )
}

function VettingRequestCard({ user, onClick }: { user: AdminUser; onClick: () => void }) {
  const isSupplier = user.role === 'supplier'
  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    if (diff < 60000) return "Just now"
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-[2.5rem] border-2 bg-white/80 p-6 transition-all duration-500 ease-out backdrop-blur-sm border-white hover:border-[#e5e9f0] hover:shadow-2xl hover:-translate-y-2`}
    >
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className={`h-16 w-16 rounded-[1.25rem] p-0.5 shadow-sm transition-all duration-500 ${isSupplier ? 'bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200/50' : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/50'
            }`}>
            <div className={`h-full w-full rounded-[1.1rem] flex items-center justify-center font-black text-2xl ${isSupplier ? 'text-violet-600' : 'text-indigo-600'
              }`}>
              {user.name?.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-[17px] font-semibold text-[#0f172a] group-hover:text-[#0f4fb6] transition-colors tracking-tight">{user.name}</h4>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={`inline-flex rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] shadow-sm ${isSupplier ? 'bg-violet-600 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                  {user.role}
                </span>
                <span className="text-[10px] font-bold text-[#64748b] bg-[#f8fafc] px-2.5 py-0.5 rounded-lg border border-[#eef2f8]">
                  {user.verification_info?.company_name || 'Organization N/A'}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] shadow-sm ${user.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : user.status === 'rejected'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'approved' ? 'bg-emerald-500' :
                      user.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                    }`} />
                  {user.status === 'approved' ? 'Approved' : user.status === 'rejected' ? 'Rejected' : 'Pending'}
                </span>
              </div>
            </div>
            <div className="text-right">
              {getTimeAgo(user.created_at) === "Just now" && (
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600">Active Live</p>
                  </div>
                  <p className="text-[11px] font-black text-[#0f172a] mt-0.5 italic">Just now</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-6">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[#64748b]">
                <span>Audit Progress</span>
                <span className={isSupplier ? "text-violet-600" : "text-indigo-600"}>85%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#f1f5f9] overflow-hidden p-0.5">
                <div className={`h-full rounded-full transition-all duration-1000 ${isSupplier ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-gradient-to-r from-indigo-500 to-blue-500"}`} style={{ width: '85%' }} />
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div className={`transition-transform duration-300 group-hover:translate-x-2`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isSupplier ? "text-violet-400" : "text-indigo-400"}><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
