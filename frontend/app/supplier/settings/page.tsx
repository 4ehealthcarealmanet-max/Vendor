"use client"

import { FormEvent, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import SupplierSidebar from "@/components/supplier/SupplierSidebar"
import {
  clearToken,
  getApiErrorMessage,
  getCurrentUser,
  isAuthSessionError,
  logoutUser,
  notifySupplier,
  resetPassword,
} from "@/services"

export default function SupplierSettingsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!message) return
    notifySupplier({
      type: isError ? "error" : "success",
      title: isError ? "Settings Alert" : "Settings Updated",
      message,
    })
  }, [isError, message])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await getCurrentUser()
        if (me.role === "buyer") {
          router.replace("/buyer/dashboard")
          return
        }
        setUsername(me.username)
      } catch (error) {
        if (isAuthSessionError(error)) {
          clearToken()
          router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login")
        }
      }
    }

    loadUser()
  }, [pathname, router])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const submitResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setIsError(false)

    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters.")
      setIsError(true)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirm password do not match.")
      setIsError(true)
      return
    }

    try {
      setSubmitting(true)
      const response = await resetPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage(response.detail || "Password reset successfully.")
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not reset password. Please try again."))
      setIsError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SupplierSidebar active="settings" username={username} onSignOut={signOut} />
      <main className="px-4 py-8 pb-24 md:px-6 md:py-12 lg:pl-[calc(18rem+2.5rem)]">
        <div className="mx-auto w-full max-w-xl space-y-5">
          <header className="settings-card rounded-xl border border-[#dbe4ef] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f4fb6]">Account Settings</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#0f172a] md:text-3xl">
              Reset Password
            </h1>
          </header>

          <section className="settings-card rounded-xl border border-[#dbe4ef] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <form onSubmit={submitResetPassword} className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-[#0f172a]">
                Current Password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className="rounded-xl border border-[#cdd9f4] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#0f4fb6]"
                  placeholder="Enter current password"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#0f172a]">
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={8}
                  className="rounded-xl border border-[#cdd9f4] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#0f4fb6]"
                  placeholder="Minimum 8 characters"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#0f172a]">
                Confirm Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  className="rounded-xl border border-[#cdd9f4] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#0f4fb6]"
                  placeholder="Re-enter new password"
                />
              </label>

              {message ? (
                <p
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                    isError
                      ? "border-[#f4caca] bg-[#fff7f7] text-[#991b1b]"
                      : "border-[#dbe8ff] bg-[#f8fbff] text-[#0f4fb6]"
                  }`}
                >
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#0f4fb6] px-4 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,79,182,0.2)] transition hover:bg-[#0d46a3] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </section>
        </div>
        <style jsx>{`
          .settings-card {
            position: relative;
            overflow: hidden;
            animation: settings-rise 380ms ease both;
            transition: transform 180ms ease, box-shadow 180ms ease;
          }

          .settings-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 22px 54px rgba(15, 23, 42, 0.1);
          }

          input:focus {
            box-shadow: 0 0 0 4px rgba(15, 79, 182, 0.08);
          }

          @keyframes settings-rise {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </main>
    </>
  )
}
