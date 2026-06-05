"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import PublicLandingPage from "@/components/home/PublicLandingPage"
import { clearToken, getCurrentUser, getToken } from "@/services"

export default function Home() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true

    const redirectAuthenticatedUser = async () => {
      const token = getToken()
      if (!token) {
        if (active) setCheckingSession(false)
        return
      }

      try {
        const user = await getCurrentUser()
        if (!active) return
        if (user.role === "admin") {
          router.replace("/admin/dashboard")
          return
        }
        router.replace(user.role === "buyer" ? "/buyer/dashboard" : "/supplier/dashboard")
      } catch {
        clearToken()
        if (active) setCheckingSession(false)
      }
    }

    redirectAuthenticatedUser()

    return () => {
      active = false
    }
  }, [router])

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#f7f9fb] px-6 py-10 text-[#191c1e]">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-8 text-sm font-semibold text-[#617084] shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          Checking your workspace...
        </div>
      </main>
    )
  }

  return <PublicLandingPage />
}
