"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ReactNode } from "react"
import { clearToken, logoutUser } from "@/services"

type DashboardLink = {
  href: string
  label: string
  hint: string
}

type DashboardMetric = {
  label: string
  value: string | number
}

type DashboardShellProps = {
  roleLabel: string
  title: string
  description: string
  username: string
  supportText?: string
  metrics: DashboardMetric[]
  quickLinks: DashboardLink[]
  children?: ReactNode
}

export default function DashboardShell({
  roleLabel,
  title,
  description,
  username,
  supportText,
  metrics,
  quickLinks,
  children,
}: DashboardShellProps) {
  const router = useRouter()

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  return (
    <main className="dashboard-stage py-8 md:py-12">
      <div className="health-container space-y-6">
        <section className="hero-panel rounded-[30px] p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[#0f4c81] uppercase">
                {roleLabel}
              </p>
              <h1 className="mt-5 text-4xl leading-tight font-extrabold md:text-6xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#34566f]">{description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#31546c]">
                <p>Signed in as {username}</p>
                {supportText ? <p>{supportText}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/" className="ghost-action px-5 py-3">
                Home
              </Link>
              <button type="button" onClick={signOut} className="ghost-action px-5 py-3">
                Logout
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="feature-card rounded-[24px] p-5">
                <p className="text-xs font-semibold tracking-[0.1em] text-[#66819a] uppercase">{metric.label}</p>
                <p className="mt-3 text-3xl font-extrabold text-[#102033]">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="spotlight-card rounded-[28px] p-6">
            <h2 className="text-2xl font-bold">Quick access</h2>
            <div className="mt-5 grid gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="feature-card rounded-[22px] p-4 transition hover:-translate-y-0.5"
                >
                  <p className="font-semibold text-[#102033]">{link.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#5d7386]">{link.hint}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="spotlight-card rounded-[28px] p-6">{children}</div>
        </section>
      </div>
    </main>
  )
}
