"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import AdminTopBar from "@/components/admin/AdminTopBar"
import { getAdminUsers, updateAdminUserStatus, getCurrentUser } from "@/services"
import { AdminUser, AuthUser } from "@/types"
import { ProfileGroup, InfoRow, DocumentPreview, AuditRow } from "@/components/admin/AdminComponents"

export default function UserDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const load = async () => {
      // Try to load from session storage first for instant display
      const cachedUser = sessionStorage.getItem("admin_selected_user")
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser)
          if (parsed.id === Number(id)) {
            setUser(parsed)
            setLoading(false)
          }
        } catch (e) {
          console.error("Error parsing cached user", e)
        }
      }

      try {
        const [usersData, me] = await Promise.all([
          getAdminUsers(),
          getCurrentUser()
        ])
        const found = usersData.find(u => u.id === Number(id))
        if (found) {
          setUser(found)
          // Update cache with fresh data
          sessionStorage.setItem("admin_selected_user", JSON.stringify(found))
        } else if (!user) {
          router.push("/admin/dashboard")
        }
        setAdminUser(me)
      } catch (err) {
        console.error(err)
        if (!user) router.push("/admin/dashboard")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  const updateStatus = async (status: "approved" | "rejected") => {
    if (!user) return
    try {
      setIsUpdating(true)
      const response = await updateAdminUserStatus(user.id, status)
      const updatedUser = { ...user, status: response.user.status as AdminUser["status"] }
      setUser(updatedUser)
      
      // Update individual cache
      sessionStorage.setItem("admin_selected_user", JSON.stringify(updatedUser))
      
      // Update list cache for dashboard
      const cachedList = sessionStorage.getItem("admin_users_list")
      if (cachedList) {
        try {
          const list = JSON.parse(cachedList) as AdminUser[]
          const newList = list.map(u => u.id === updatedUser.id ? updatedUser : u)
          sessionStorage.setItem("admin_users_list", JSON.stringify(newList))
        } catch (e) {
          console.error("Error updating cached list", e)
        }
      }
    } catch {
      alert("Could not update user status.")
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center"><p className="font-black uppercase tracking-[0.3em] text-[#94a3b8] animate-pulse">Loading dossier...</p></div>

  if (!user) return null

  const info = user.verification_info || {}
  const isSupplier = user.role === "supplier"
  const val = (v?: string) => v && v.trim() ? v : "-"
  const primaryName = isSupplier
    ? info.contact_name || user.name
    : info.procurement_contact_name || info.contact_name || user.name

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <AdminTopBar
        adminName={adminUser?.username || "Admin"}
      />

      <main className="max-w-4xl mx-auto p-8 lg:p-12">
        <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_rgba(15,23,42,0.08)] border border-[#e5e9f0] overflow-hidden">
          {/* Header Banner */}
          <div className={`h-48 relative shrink-0 ${isSupplier ? "bg-gradient-to-br from-violet-900 to-violet-700" : "bg-gradient-to-br from-[#0f172a] to-indigo-900"}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <button
              onClick={() => router.back()}
              className="absolute left-8 top-8 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 transition-all backdrop-blur-md border border-white/10 z-20 text-xs font-black uppercase tracking-widest"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back to Matrix
            </button>
            {/* Role tag */}
            <div className="absolute left-8 bottom-8 flex items-center gap-2">
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isSupplier ? "bg-violet-500/30 text-violet-100 border border-violet-400/30" : "bg-indigo-500/30 text-indigo-100 border border-indigo-400/30"}`}>
                {user.role}
              </span>
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.status === "approved" ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30" :
                  user.status === "rejected" ? "bg-rose-500/20 text-rose-200 border border-rose-400/30" :
                    "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                }`}>
                {user.status}
              </span>
            </div>
          </div>

          <div className="p-8 lg:p-12 -mt-12 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-8 border-b border-[#f1f5f9]">
              <div className={`h-28 w-28 rounded-3xl border-4 border-white shadow-2xl flex items-center justify-center font-black text-4xl shrink-0 ${isSupplier ? "bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700" : "bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700"}`}>
                {primaryName?.slice(0, 1).toUpperCase()}
              </div>
              <div className="pb-2">
                <h3 className="text-3xl font-black text-[#0f172a] tracking-tighter leading-tight">{primaryName}</h3>
                <p className="text-sm text-[#64748b] font-medium mt-1">@{user.username} &middot; {user.email}</p>
                {info.designation && <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] mt-1.5">{info.designation}</p>}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <AuditRow label="Approval Status"
                    value={user.status === 'approved' ? 'APPROVED ✓' : user.status === 'rejected' ? 'REJECTED ✗' : 'PENDING REVIEW'}
                    status={user.status === 'approved' ? 'success' : user.status === 'rejected' ? 'danger' : 'warning'}
                  />
                  <AuditRow label="Member Since" value={new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
                </div>

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

                <ProfileGroup title="Address" color={isSupplier ? "violet" : "indigo"}>
                  {info.address && <InfoRow label="Address" value={val(info.address)} fullWidth />}
                  <div className="grid grid-cols-3 gap-2">
                    <InfoRow label="City" value={val(info.city)} />
                    <InfoRow label="State" value={val(info.state)} />
                    <InfoRow label="Pincode" value={val(info.pincode)} />
                  </div>
                </ProfileGroup>
              </div>

              <div className="space-y-6">
                <ProfileGroup title="Contact Information" color={isSupplier ? "violet" : "indigo"}>
                  <InfoRow label={isSupplier ? "Contact Person" : "Procurement Contact"} value={val(isSupplier ? info.contact_name : info.procurement_contact_name || info.contact_name)} />
                  <InfoRow label="Designation" value={val(info.designation)} />
                  <InfoRow label="Phone" value={val(info.phone)} />
                  <InfoRow label="Email" value={val(info.email)} />
                </ProfileGroup>

                {isSupplier && (
                  <>
                    <ProfileGroup title="Supply Capacity" color="violet">
                      <InfoRow label="Product Categories" value={val(info.product_categories)} fullWidth />
                      <InfoRow label="Supply Regions" value={val(info.supply_regions)} fullWidth />
                      <div className="grid grid-cols-2 gap-2">
                         <InfoRow label="Min. Order Value" value={val(info.minimum_order_value)} />
                         <InfoRow label="Lead Time" value={val(info.average_lead_time)} />
                      </div>
                      <InfoRow label="Warehouse Capacity" value={val(info.warehouse_capacity)} />
                    </ProfileGroup>
                    <ProfileGroup title="Banking Details" color="violet">
                      <InfoRow label="Account Name" value={val(info.bank_account_name)} />
                      <InfoRow label="Account Number" value={val(info.bank_account_number)} />
                      <InfoRow label="IFSC Code" value={val(info.ifsc_code)} />
                    </ProfileGroup>
                  </>
                )}

                {!isSupplier && (
                  <>
                    <ProfileGroup title="Procurement Details" color="indigo">
                      <InfoRow label="Monthly Spend" value={val(info.monthly_spend)} />
                      <InfoRow label="Payment Terms" value={val(info.payment_terms)} />
                      <InfoRow label="Urgency Window" value={val(info.urgency_window)} />
                      <InfoRow label="Approval Flow" value={val(info.approval_flow)} fullWidth />
                      <InfoRow label="Categories Needed" value={val(info.categories_needed)} fullWidth />
                    </ProfileGroup>
                  </>
                )}
              </div>
            </div>

            {/* Documents Section - Full Width */}
            <div className="mt-8">
               {(info.gst_document || info.license_document || info.iso_certificate || info.onboarding_documents) && (
                  <ProfileGroup title="Compliance & Verification Documents" color="emerald">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {info.gst_document && <DocumentPreview label="GST Certificate" dataUrl={info.gst_document} />}
                      {info.license_document && <DocumentPreview label="Drug/Trade License" dataUrl={info.license_document} />}
                      {info.iso_certificate && <DocumentPreview label="ISO Certificate" dataUrl={info.iso_certificate} />}
                      {info.onboarding_documents && <DocumentPreview label="Authorization Document" dataUrl={info.onboarding_documents} />}
                    </div>
                  </ProfileGroup>
               )}
            </div>

            {/* Action Section */}
            <div className="mt-12 pt-8 border-t border-[#f1f5f9] flex flex-col sm:flex-row gap-4">
              <button
                disabled={isUpdating || user.status === 'approved'}
                onClick={() => updateStatus("approved")}
                className="flex-1 py-5 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center gap-3 text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:-translate-y-1 hover:bg-[#0f172a]/90 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Approve Participant Access
              </button>
              <button
                disabled={isUpdating || user.status === 'rejected'}
                onClick={() => updateStatus("rejected")}
                className="flex-1 py-5 rounded-2xl bg-white border-2 border-rose-100 text-rose-500 flex items-center justify-center gap-3 text-[13px] font-black uppercase tracking-[0.2em] transition-all hover:bg-rose-50 hover:border-rose-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                Reject Request
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
