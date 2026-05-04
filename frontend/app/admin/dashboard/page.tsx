"use client"

import { useEffect, useState, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import AdminTopBar from "@/components/admin/AdminTopBar"
import { getAdminUsers, updateAdminUserStatus, getCurrentUser } from "@/services"
import { AdminUser, AuthUser } from "@/types"

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const [usersData, me] = await Promise.all([
          getAdminUsers(),
          getCurrentUser()
        ])
        setUsers(usersData)
        setAdminUser(me)
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

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null
  }, [users, selectedUserId])

  const stats = useMemo(() => {
    const pending = users.filter(u => u.status === "pending").length
    const approved = users.filter(u => u.status === "approved").length
    return {
      total: users.length,
      active: approved,
      pending: pending,
      urgent: users.filter(u => u.status === "pending" && new Date(u.created_at) > new Date(Date.now() - 86400000)).length
    }
  }, [users])

  const updateStatus = async (userId: number, status: "approved" | "rejected") => {
    try {
      setUpdatingUserId(userId)
      const response = await updateAdminUserStatus(userId, status)
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: response.user.status as AdminUser["status"] } : user
        )
      )
    } catch {
      alert("Could not update user status.")
    } finally {
      setUpdatingUserId(null)
    }
  }

  if (loading) return <main className="min-h-screen bg-[#f7f9fb]" />

  return (
    <div className="min-h-screen bg-[#f7f9fb] selection:bg-[#0f4fb6]/10 selection:text-[#0f4fb6]">
      <div className="flex flex-col min-h-screen">
        <AdminTopBar
          adminName={adminUser?.username || "Aris"}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-8 lg:p-12 space-y-12">
          <div className="max-w-7xl mx-auto space-y-12">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 shrink-0">
              <MetricCard label="Total Participants" value={stats.total} delta="+4.2%" tone="blue" />
              <MetricCard label="Active Participants" value={stats.active} status="Stable" tone="indigo" />
              <MetricCard label="Awaiting Approval" value={stats.pending} tone="violet" />
              <MetricCard label="Urgent Actions" value={stats.urgent} tone="amber" />
            </div>

            {/* Header & Matrix Container */}
            <div className="space-y-8">
              <div className="shrink-0">
                <div className="flex items-end justify-between pb-6 border-b border-[#e5e9f0]">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter text-[#0f172a]">User Vetting Matrix</h2>
                    <p className="text-sm font-medium text-[#64748b] mt-1">Strategic verification of global market participants and operational clearances.</p>
                  </div>
                  <div className="flex items-end gap-6">
                    <div className="flex items-end gap-4">
                      <FilterDropdown label="Participant Role" value={roleFilter} onChange={setRoleFilter} options={["all", "buyer", "supplier"]} />
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
              <div>
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
                        isActive={selectedUserId === user.id}
                        onClick={() => setSelectedUserId(user.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Detail Panel - Elevated Overlay */}
        <aside className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-[-30px_0_60px_rgba(15,23,42,0.1)] z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col ${selectedUserId ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
          }`}>
          {selectedUser ? (() => {
            const info = selectedUser.verification_info || {}
            const isSupplier = selectedUser.role === "supplier"
            const val = (v?: string) => v && v.trim() ? v : "-"
            const primaryName = isSupplier
              ? info.contact_name || selectedUser.name
              : info.procurement_contact_name || info.contact_name || selectedUser.name

            return (
              <div className="h-full flex flex-col relative animate-fade-in overflow-hidden">
                {/* Header Banner */}
                <div className={`h-36 relative shrink-0 ${isSupplier ? "bg-gradient-to-br from-violet-900 to-violet-700" : "bg-gradient-to-br from-[#0f172a] to-indigo-900"}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="absolute right-5 top-5 h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/10 z-20"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                  {/* Role tag */}
                  <div className="absolute left-6 bottom-5 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isSupplier ? "bg-violet-500/30 text-violet-100 border border-violet-400/30" : "bg-indigo-500/30 text-indigo-100 border border-indigo-400/30"}`}>
                      {selectedUser.role}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${selectedUser.status === "approved" ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30" :
                        selectedUser.status === "rejected" ? "bg-rose-500/20 text-rose-200 border border-rose-400/30" :
                          "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                      }`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>

                {/* Avatar + Name */}
                <div className="px-7 -mt-10 relative z-10 pb-4 border-b border-[#f1f5f9]">
                  <div className="flex items-end gap-4">
                    <div className={`h-20 w-20 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center font-black text-3xl shrink-0 ${isSupplier ? "bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700" : "bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700"}`}>
                      {primaryName?.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="pb-1">
                      <h3 className="text-xl font-black text-[#0f172a] tracking-tight leading-tight">{primaryName}</h3>
                      <p className="text-[11px] text-[#64748b] font-medium mt-0.5">@{selectedUser.username} &middot; {selectedUser.email}</p>
                      {info.designation && <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mt-0.5">{info.designation}</p>}
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-7 py-5 pb-40 space-y-5">

                  {/* Status Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <AuditRow label="Approval Status"
                      value={selectedUser.status === 'approved' ? 'APPROVED ✓' : selectedUser.status === 'rejected' ? 'REJECTED ✗' : 'PENDING REVIEW'}
                      status={selectedUser.status === 'approved' ? 'success' : selectedUser.status === 'rejected' ? 'danger' : 'warning'}
                    />
                    <AuditRow label="Joined" value={new Date(selectedUser.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                  </div>

                  {/* Business / Organization */}
                  <ProfileGroup title={isSupplier ? "Business Details" : "Organization Details"} color={isSupplier ? "violet" : "indigo"}>
                    <InfoRow label={isSupplier ? "Company Name" : "Organization"} value={val(info.company_name)} />
                    {isSupplier && <InfoRow label="Brand Name" value={val(info.brand_name)} />}
                    {isSupplier && <InfoRow label="Business Category" value={val(info.business_category)} />}
                    {isSupplier && <InfoRow label="Years in Business" value={val(info.years_in_business)} />}
                    {isSupplier && <InfoRow label="GST Number" value={val(info.gst_number)} />}
                    {isSupplier && <InfoRow label="License Number" value={val(info.license_number)} />}
                    {!isSupplier && <InfoRow label="Buyer Type" value={val(info.buyer_type)} />}
                    {!isSupplier && <InfoRow label="Department" value={val(info.department)} />}
                    {!isSupplier && <InfoRow label="Institution Size" value={val(info.institution_size)} />}
                    {!isSupplier && <InfoRow label="GST Number" value={val(info.gst_number)} />}
                  </ProfileGroup>

                  {/* Address */}
                  <ProfileGroup title="Address" color={isSupplier ? "violet" : "indigo"}>
                    {info.address && <InfoRow label="Address" value={val(info.address)} fullWidth />}
                    <div className="grid grid-cols-3 gap-2">
                      <InfoRow label="City" value={val(info.city)} />
                      <InfoRow label="State" value={val(info.state)} />
                      <InfoRow label="Pincode" value={val(info.pincode)} />
                    </div>
                  </ProfileGroup>

                  {/* Contact */}
                  <ProfileGroup title="Contact Information" color={isSupplier ? "violet" : "indigo"}>
                    <InfoRow label={isSupplier ? "Contact Person" : "Procurement Contact"} value={val(isSupplier ? info.contact_name : info.procurement_contact_name || info.contact_name)} />
                    <InfoRow label="Designation" value={val(info.designation)} />
                    <InfoRow label="Phone" value={val(info.phone)} />
                    <InfoRow label="Email" value={val(info.email)} />
                  </ProfileGroup>

                  {/* Supplier-specific */}
                  {isSupplier && (
                    <>
                      <ProfileGroup title="Supply Capacity" color="violet">
                        <InfoRow label="Product Categories" value={val(info.product_categories)} fullWidth />
                        <InfoRow label="Supply Regions" value={val(info.supply_regions)} fullWidth />
                        <InfoRow label="Min. Order Value" value={val(info.minimum_order_value)} />
                        <InfoRow label="Lead Time" value={val(info.average_lead_time)} />
                        <InfoRow label="Warehouse Capacity" value={val(info.warehouse_capacity)} />
                      </ProfileGroup>
                      <ProfileGroup title="Banking Details" color="violet">
                        <InfoRow label="Account Name" value={val(info.bank_account_name)} />
                        <InfoRow label="Account Number" value={val(info.bank_account_number)} />
                        <InfoRow label="IFSC Code" value={val(info.ifsc_code)} />
                      </ProfileGroup>
                      {(info.gst_document || info.license_document || info.iso_certificate) && (
                        <ProfileGroup title="Compliance Documents" color="emerald">
                          {info.gst_document && <DocumentPreview label="GST Certificate" dataUrl={info.gst_document} />}
                          {info.license_document && <DocumentPreview label="Drug/Trade License" dataUrl={info.license_document} />}
                          {info.iso_certificate && <DocumentPreview label="ISO Certificate" dataUrl={info.iso_certificate} />}
                        </ProfileGroup>
                      )}
                    </>
                  )}

                  {/* Buyer-specific */}
                  {!isSupplier && (
                    <>
                      <ProfileGroup title="Procurement Details" color="indigo">
                        <InfoRow label="Monthly Spend" value={val(info.monthly_spend)} />
                        <InfoRow label="Payment Terms" value={val(info.payment_terms)} />
                        <InfoRow label="Urgency Window" value={val(info.urgency_window)} />
                        <InfoRow label="Approval Flow" value={val(info.approval_flow)} fullWidth />
                        <InfoRow label="Categories Needed" value={val(info.categories_needed)} fullWidth />
                        <InfoRow label="Delivery Locations" value={val(info.delivery_locations)} fullWidth />
                        <InfoRow label="Compliance Needs" value={val(info.compliance_needs)} fullWidth />
                      </ProfileGroup>
                      {info.onboarding_documents && (
                        <ProfileGroup title="Onboarding Documents" color="emerald">
                          <DocumentPreview label="Authorization Document" dataUrl={info.onboarding_documents} />
                        </ProfileGroup>
                      )}
                    </>
                  )}


                </div>

                {/* Action Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-[#f1f5f9] flex flex-col gap-2.5 z-30">
                  <button
                    disabled={updatingUserId === selectedUser.id || selectedUser.status === 'approved'}
                    onClick={() => updateStatus(selectedUser.id, "approved")}
                    className="w-full py-4 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center gap-3 text-[12px] font-black uppercase tracking-widest shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Approve User Access
                  </button>
                  <button
                    disabled={updatingUserId === selectedUser.id || selectedUser.status === 'rejected'}
                    onClick={() => updateStatus(selectedUser.id, "rejected")}
                    className="w-full py-4 rounded-2xl bg-white border-2 border-rose-100 text-rose-500 flex items-center justify-center gap-3 text-[12px] font-black uppercase tracking-widest transition-all hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    Reject Access
                  </button>
                </div>
              </div>
            )
          })() : null}
        </aside>
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

function AuditRow({ label, value, highlight, status }: { label: string; value: string; highlight?: boolean; status?: 'success' | 'warning' | 'danger' }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:border-[#0f4fb6]/20 ${status === 'success' ? 'bg-emerald-50/60 border-emerald-100' :
        status === 'danger' ? 'bg-rose-50/60 border-rose-100' :
          status === 'warning' ? 'bg-amber-50/60 border-amber-100' :
            'bg-[#f8faff] border-[#eef2f8]'
      }`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] font-black tracking-tight ${status === 'success' ? 'text-emerald-700' :
          status === 'danger' ? 'text-rose-600' :
            status === 'warning' ? 'text-amber-600' :
              highlight ? 'text-[#0f4fb6]' : 'text-[#0f172a]'
        }`}>
        {value}
      </span>
    </div>
  )
}

function DocumentCard({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="group/doc flex items-center gap-4 p-4 rounded-2xl border-2 border-[#f1f5f9] hover:border-[#0f4fb6]/20 transition-all cursor-pointer bg-white">
      <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover/doc:bg-rose-500 group-hover/doc:text-white transition-all">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
      </div>
      <div className="flex-1">
        <p className="text-[12px] font-black text-[#0f172a] tracking-tight">{name}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">{meta}</p>
      </div>
      <div className="text-slate-300 group-hover/doc:text-[#0f4fb6] transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
      </div>
    </div>
  )
}

function VettingRequestCard({ user, isActive, onClick }: { user: AdminUser; isActive: boolean; onClick: () => void }) {
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
      className={`group relative cursor-pointer rounded-[2.5rem] border-2 bg-white/80 p-6 transition-all duration-500 ease-out backdrop-blur-sm ${isActive
          ? "border-[#0f4fb6] bg-white shadow-[0_25px_50px_rgba(15,79,182,0.15)] -translate-y-2 scale-[1.01]"
          : "border-white hover:border-[#e5e9f0] hover:shadow-2xl hover:-translate-y-2"
        }`}
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
              <div className={`transition-transform duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-2'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isSupplier ? "text-violet-400" : "text-indigo-400"}><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileGroup({ title, color, children }: { title: string; color: "violet" | "indigo" | "emerald"; children: ReactNode }) {
  const accent =
    color === "violet" ? "text-violet-700" :
      color === "emerald" ? "text-emerald-700" :
        "text-[#0f4fb6]"
  const border =
    color === "violet" ? "border-violet-100" :
      color === "emerald" ? "border-emerald-100" :
        "border-indigo-100"
  return (
    <div className={`rounded-2xl border bg-[#fafbff] p-4 space-y-3 ${border}`}>
      <h4 className={`text-[9px] font-black uppercase tracking-[0.25em] ${accent}`}>{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  const isEmpty = value === "-"
  return (
    <div className={`flex ${fullWidth ? "flex-col gap-0.5" : "items-center justify-between"} py-2 px-3 rounded-xl bg-white border border-[#eef2f8]`}>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-[11px] font-semibold tracking-tight ${isEmpty ? "text-slate-300 italic" : "text-[#0f172a]"} ${fullWidth ? "mt-0.5" : "text-right ml-2"}`}>
        {value}
      </span>
    </div>
  )
}

function DocumentPreview({ label, dataUrl }: { label: string; dataUrl: string }) {
  const isPdf = dataUrl.startsWith("data:application/pdf")
  return (
    <div className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-xl mb-3 last:mb-0 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      {isPdf ? (
        <a href={dataUrl} download={`${label}.pdf`} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-2 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="18"/><line x1="15" y1="15" x2="12" y2="18"/></svg>
          Download PDF
        </a>
      ) : (
        <a href={dataUrl} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={label} className="w-full h-auto max-h-[160px] object-cover hover:opacity-80 transition-opacity" />
        </a>
      )}
    </div>
  )
}

function DetailItem({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-3xl border-2 transition-all duration-300 ${highlight ? 'bg-emerald-50 border-emerald-100' : 'bg-[#f8fafc] border-transparent hover:border-[#e5e9f0]'}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#94a3b8] mb-1">{label}</p>
      <div className="flex items-center gap-3">
        <span className={`text-[13px] font-black tracking-tight ${highlight ? 'text-emerald-700' : 'text-[#0f172a]'}`}>{value}</span>
      </div>
    </div>
  )
}
