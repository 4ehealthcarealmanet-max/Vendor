"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminTopBar from "@/components/admin/AdminTopBar"
import { getCurrentUser, resetPassword } from "@/services"
import { AuthUser } from "@/types"

export default function AdminSettingsPage() {
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  })

  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getCurrentUser()
        setAdminUser(me)
      } catch (err) {
        console.error(err)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert("New passwords do not match.")
      return
    }
    try {
      setIsUpdating(true)
      await resetPassword(passwordForm)
      alert("Password updated successfully.")
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
    } catch (err) {
      alert("Failed to update password. Please check your current password.")
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center"><p className="font-black uppercase tracking-[0.3em] text-[#94a3b8] animate-pulse">Loading settings...</p></div>

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <AdminTopBar adminName={adminUser?.username || "Admin"} />

      <main className="max-w-4xl mx-auto p-8 lg:p-12">
        <header className="mb-12">
          <h2 className="text-4xl font-black tracking-tighter text-[#0f172a]">Settings</h2>
          <p className="text-sm font-medium text-[#64748b] mt-1">Configure platform behavior and administrative security.</p>
        </header>

        <div className="space-y-8">
          {/* Security Section */}
          <section className="bg-white rounded-[2.5rem] border border-[#e5e9f0] p-8 lg:p-10 shadow-sm">
            <h3 className="text-lg font-black text-[#0f172a] uppercase tracking-widest mb-8">Security</h3>
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] ml-1">Current Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwordForm.current_password}
                    onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    className="w-full h-12 rounded-2xl border border-[#e5e9f0] bg-white px-4 text-sm font-medium outline-none focus:border-[#0f4fb6] transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] ml-1">New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    className="w-full h-12 rounded-2xl border border-[#e5e9f0] bg-white px-4 text-sm font-medium outline-none focus:border-[#0f4fb6] transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] ml-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwordForm.confirm_password}
                    onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    className="w-full h-12 rounded-2xl border border-[#e5e9f0] bg-white px-4 text-sm font-medium outline-none focus:border-[#0f4fb6] transition-all" 
                  />
                </div>
              </div>
              <div className="pt-4">
                <button 
                  disabled={isUpdating}
                  className="px-8 py-4 rounded-2xl bg-[#0f172a] text-white text-[11px] font-black uppercase tracking-widest shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                >
                  {isUpdating ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>

          {/* Platform Governance Section */}
          <section className="bg-white rounded-[2.5rem] border border-[#e5e9f0] p-8 lg:p-10 shadow-sm">
            <h3 className="text-lg font-black text-[#0f172a] uppercase tracking-widest mb-8">Platform Governance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 rounded-3xl border border-[#f1f5f9]">
                <div>
                  <p className="text-sm font-bold text-[#0f172a]">Maintenance Mode</p>
                  <p className="text-xs text-[#64748b] mt-0.5">Restrict platform access for scheduled maintenance.</p>
                </div>
                <button 
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`h-7 w-12 rounded-full relative transition-all duration-300 ${maintenanceMode ? 'bg-amber-500' : 'bg-[#e2e8f0]'}`}
                >
                  <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-300 ${maintenanceMode ? 'right-1 shadow-sm' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-6 rounded-3xl border border-[#f1f5f9]">
                <div>
                  <p className="text-sm font-bold text-[#0f172a]">New User Email Alerts</p>
                  <p className="text-xs text-[#64748b] mt-0.5">Receive notifications when a new participant registers.</p>
                </div>
                <button 
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`h-7 w-12 rounded-full relative transition-all duration-300 ${emailAlerts ? 'bg-emerald-500' : 'bg-[#e2e8f0]'}`}
                >
                  <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-300 ${emailAlerts ? 'right-1 shadow-sm' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
