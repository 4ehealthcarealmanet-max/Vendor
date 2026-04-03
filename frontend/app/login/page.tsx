"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import AuthScreen from "@/components/auth/AuthScreen"

function LoginPageContent() {
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role")
  const defaultRole = roleParam === "buyer" ? "buyer" : "supplier"

  return <AuthScreen defaultMode="login" nextPath={searchParams.get("next")} defaultRole={defaultRole} />
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-stage py-8 md:py-12">
          <div className="health-container">
            <section className="spotlight-card rounded-[28px] p-6 text-sm text-[#5d7386]">
              Loading login form...
            </section>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
