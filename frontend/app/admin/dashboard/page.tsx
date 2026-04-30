"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  clearToken,
  getAdminUsers,
  getCurrentUser,
  isAuthSessionError,
  logoutUser,
  updateAdminUserStatus,
} from "@/services"
import type { AdminUser, AuthUser } from "@/services"

const buyerTypeLabels = {
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  ngo: "NGO",
  clinic: "Clinic",
} as const

const statusTone: Record<AdminUser["status"], string> = {
  pending: "border-[#fde3b8] bg-[#fff8ec] text-[#ad6a08]",
  approved: "border-[#d7f0df] bg-[#f1fcf4] text-[#177245]",
  rejected: "border-[#f7d5d5] bg-[#fff7f7] text-[#a93802]",
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [roleFilter, setRoleFilter] = useState<"all" | "buyer" | "supplier">("all")

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const me = await getCurrentUser()
        if (me.role !== "admin") {
          clearToken()
          router.replace("/login")
          return
        }

        const allUsers = await getAdminUsers()
        if (!active) return
        setAdminUser(me)
        setUsers(allUsers)
      } catch (error) {
        if (isAuthSessionError(error)) {
          clearToken()
        }
        if (active) {
          setMessage("Admin session unavailable. Please login again.")
          router.replace("/login")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [router])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.replace("/login")
    }
  }

  const filteredAndOrderedUsers = useMemo(() => {
    let result = [...users]
    
    if (statusFilter !== "all") {
      result = result.filter(u => u.status === statusFilter)
    }
    
    if (roleFilter !== "all") {
      result = result.filter(u => u.role === roleFilter)
    }

    const priority = { pending: 0, rejected: 1, approved: 2 }
    return result.sort((left, right) => {
      const byStatus = priority[left.status] - priority[right.status]
      if (byStatus !== 0) return byStatus
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    })
  }, [users, statusFilter, roleFilter])

  const pendingCount = users.filter((user) => user.status === "pending").length
  const approvedCount = users.filter((user) => user.status === "approved").length
  const rejectedCount = users.filter((user) => user.status === "rejected").length

  const updateStatus = async (userId: number, status: "approved" | "rejected") => {
    try {
      setUpdatingUserId(userId)
      setMessage("")
      const response = await updateAdminUserStatus(userId, status)
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: response.user.status as AdminUser["status"] } : user
        )
      )
      setMessage(response.detail)
    } catch {
      setMessage("Could not update user status right now.")
    } finally {
      setUpdatingUserId(null)
    }
  }

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/80 p-8 text-sm font-semibold text-[#617084] shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
          Loading admin dashboard...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f9fb] px-4 py-8 text-[#191c1e] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0f4fb6]">Single Admin Console</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#0f172a]">User Approval Dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64748b]">
                Review every buyer and supplier registration, then approve or reject access before they enter the platform.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">
                Logged in as <span className="font-bold text-[#0f172a]">{adminUser?.username ?? "admin"}</span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="rounded-[1rem] border border-[#dbe4ef] bg-white px-5 py-3 text-sm font-bold text-[#0f172a] transition hover:bg-[#f8fafc]"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Pending" value={String(pendingCount)} tone="amber" />
          <MetricCard label="Approved" value={String(approvedCount)} tone="green" />
          <MetricCard label="Rejected" value={String(rejectedCount)} tone="red" />
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-[#dbe4ef] bg-white px-3 py-2 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#0f4fb6]"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Only</option>
                  <option value="approved">Approved Only</option>
                  <option value="rejected">Rejected Only</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Role Filter</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="rounded-xl border border-[#dbe4ef] bg-white px-3 py-2 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#0f4fb6]"
                >
                  <option value="all">All Roles</option>
                  <option value="buyer">Buyers Only</option>
                  <option value="supplier">Suppliers Only</option>
                </select>
              </div>
              {(statusFilter !== "all" || roleFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter("all"); setRoleFilter("all"); }}
                  className="mt-5 text-xs font-bold text-[#0f4fb6] hover:underline"
                >
                  Reset Filters
                </button>
              )}
            </div>
            {message ? (
              <p className="rounded-[1rem] border border-[#dbe8ff] bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-[#0f4fb6]">
                {message}
              </p>
            ) : (
               <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Showing</p>
                <p className="text-sm font-bold text-[#0f172a]">{filteredAndOrderedUsers.length} Users</p>
               </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-[1.25rem] border border-[#e5e9f0]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-[#0f172a]">
                <tr>
                  <th className="px-4 py-4 font-bold">Name / Org</th>
                  <th className="px-4 py-4 font-bold">Email</th>
                  <th className="px-4 py-4 font-bold">Role</th>
                  <th className="px-4 py-4 font-bold">Status</th>
                  <th className="px-4 py-4 font-bold">Verification</th>
                  <th className="px-4 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {filteredAndOrderedUsers.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="transition hover:bg-[#fbfcff]">
                      <td className="px-4 py-4 font-semibold text-[#0f172a]">
                        <div>{user.name}</div>
                        <div className="text-[11px] font-normal text-[#64748b]">
                          {user.verification_info?.company_name || "Profile not setup"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#475569]">{user.email}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0f4fb6]">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusTone[user.status]}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                          className="text-xs font-bold text-[#0f4fb6] underline underline-offset-4"
                        >
                          {selectedUserId === user.id ? "Hide Details" : "View Details"}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => updateStatus(user.id, "approved")}
                            disabled={updatingUserId === user.id || user.status === "approved"}
                            className="rounded-lg bg-[#177245] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#145c38] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingUserId === user.id ? "Updating..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(user.id, "rejected")}
                            disabled={updatingUserId === user.id || user.status === "rejected"}
                            className="rounded-lg bg-[#a93802] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#8a2d02] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingUserId === user.id ? "Updating..." : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {selectedUserId === user.id && (
                      <tr className="bg-[#fbfcff]">
                        <td colSpan={6} className="px-6 py-6 border-b border-[#e5e9f0]">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-3">
                              <h4 className="text-xs font-black uppercase tracking-widest text-[#64748b]">Organization Info</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <span className="text-[#64748b]">Company Name:</span>
                                <span className="font-bold">{user.verification_info?.company_name || "-"}</span>
                                <span className="text-[#64748b]">GST Number:</span>
                                <span className="font-bold">{user.verification_info?.gst_number || "-"}</span>
                                <span className="text-[#64748b]">Address:</span>
                                <span className="font-bold">{user.verification_info?.address || "-"}</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-black uppercase tracking-widest text-[#64748b]">Registration Details</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <span className="text-[#64748b]">User Role:</span>
                                <span className="font-bold uppercase tracking-wider">{user.role}</span>
                                <span className="text-[#64748b]">Joined On:</span>
                                <span className="font-bold">{new Date(user.created_at).toLocaleDateString("en-IN")}</span>
                                {user.role === "buyer" && (
                                  <>
                                    <span className="text-[#64748b]">Buyer Type:</span>
                                    <span className="font-bold">{user.verification_info?.buyer_type || "-"}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredAndOrderedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#64748b]">
                      No buyer or supplier registrations found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "amber" | "green" | "red" }) {
  const palette =
    tone === "green"
      ? "border-[#d7f0df] bg-[#f1fcf4] text-[#177245]"
      : tone === "red"
        ? "border-[#f7d5d5] bg-[#fff7f7] text-[#a93802]"
        : "border-[#fde3b8] bg-[#fff8ec] text-[#ad6a08]"

  return (
    <article className={`rounded-[1.4rem] border p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ${palette}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-3 text-4xl font-black tracking-[-0.04em]">{value}</p>
    </article>
  )
}
