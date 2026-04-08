"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, ReactNode, useState } from "react"
import { loginUser, registerUser, setToken } from "@/services"

type AuthMode = "login" | "register"

type AuthScreenProps = {
  defaultMode: AuthMode
  nextPath?: string | null
  defaultRole?: "supplier" | "buyer"
}

type ApiErrorData = {
  detail?: string
  message?: string
  non_field_errors?: string[]
  [key: string]: unknown
}

type ApiError = {
  message?: string
  response?: {
    status?: number
    data?: ApiErrorData | string
  }
}

const getAuthErrorMessage = (error: ApiError, mode: AuthMode) => {
  const data = error.response?.data

  if (typeof data === "string") {
    const trimmed = data.trim()
    if (trimmed.startsWith("<")) {
      return "Auth API returned HTML instead of JSON. Check whether the backend server is running on the expected endpoint."
    }
    if (trimmed) return trimmed
  }

  if (data && typeof data === "object") {
    if (data.detail) return data.detail
    if (data.message) return data.message

    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length > 0) return String(value[0])
      if (typeof value === "string" && value.trim()) return value
    }
  }

  if (!error.response) {
    return "Auth service is unreachable. Start the backend API and try again."
  }

  if ((error.response.status ?? 0) >= 500) {
    return "The server hit an internal error. Check the backend terminal for the real exception."
  }

  return mode === "login"
    ? "Login failed. Check your username and password."
    : "Registration failed. Review the form details and try again."
}

const buyerTypeLabels = {
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  ngo: "NGO",
  clinic: "Clinic",
}

const authPanels = {
  login: {
    primaryAction: "Continue to Dashboard",
    secondaryLabel: "New here?",
    secondaryText: "Register",
    summary: "Access your procurement workspace",
  },
  register: {
    primaryAction: "Create Account",
    secondaryLabel: "Already have an account?",
    secondaryText: "Login",
    summary: "Create a buyer or supplier account",
  },
} as const

const roleCards = {
  supplier: {
    title: "Supplier",
    description: "Manage inventory",
    icon: <TruckIcon />,
  },
  buyer: {
    title: "Buyer",
    description: "Procure supplies",
    icon: <BuyerCartIcon />,
  },
} as const

export default function AuthScreen({
  defaultMode,
  nextPath,
  defaultRole = "supplier",
}: AuthScreenProps) {
  const router = useRouter()
  const mode = defaultMode
  const [role, setRole] = useState<"supplier" | "buyer">(defaultRole)
  const [buyerType, setBuyerType] = useState<"hospital" | "pharmacy" | "ngo" | "clinic">("hospital")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const activePanel = authPanels[mode]

  const redirectToDashboard = (userRole: "supplier" | "buyer") => {
    if (nextPath && nextPath.startsWith("/")) {
      router.push(nextPath)
      return
    }

    router.push(userRole === "buyer" ? "/buyer/dashboard" : "/supplier/dashboard")
  }

  const buildAuthHref = (targetMode: AuthMode) => {
    const params = new URLSearchParams()
    if (nextPath && nextPath.startsWith("/")) params.set("next", nextPath)
    if (role) params.set("role", role)
    const query = params.toString()
    return `/${targetMode}${query ? `?${query}` : ""}`
  }

  const submitForm = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response =
        mode === "register"
          ? await registerUser({
              username,
              email,
              password,
              role,
              ...(role === "buyer" ? { buyer_type: buyerType } : {}),
            })
          : await loginUser({ username, password })

      setToken(response.token)
      redirectToDashboard(response.user.role)
    } catch (error: unknown) {
      setMessage(getAuthErrorMessage(error as ApiError, mode))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6f8fb_0%,#eef3f8_100%)] px-4 py-10 text-[#1b2330]">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center">
        <div className="glass-card interactive-card w-full rounded-[28px] p-5 sm:p-6 md:p-8">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f1f4f8] p-1.5">
            <Link
              href={buildAuthHref("login")}
              className={`rounded-lg px-4 py-2.5 text-center text-sm font-bold transition ${
                mode === "login"
                  ? "bg-[#0f4fb6] text-white shadow-[0_8px_22px_rgba(15,79,182,0.24)]"
                  : "text-[#7a8497] hover:text-[#0f4fb6]"
              }`}
            >
              Login
            </Link>
            <Link
              href={buildAuthHref("register")}
              className={`rounded-lg px-4 py-2.5 text-center text-sm font-bold transition ${
                mode === "register"
                  ? "bg-[#0f4fb6] text-white shadow-[0_8px_22px_rgba(15,79,182,0.24)]"
                  : "text-[#7a8497] hover:text-[#0f4fb6]"
              }`}
            >
              Register
            </Link>
          </div>

          {mode === "register" ? (
            <div className="mt-6">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9aa3b2]">
                Select Role
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(["supplier", "buyer"] as const).map((item) => {
                  const card = roleCards[item]
                  const selected = role === item

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-[#0f4fb6] bg-[#f5f8ff] shadow-[0_10px_24px_rgba(15,79,182,0.08)]"
                          : "border-[#dce3ec] bg-white hover:border-[#b8c8e2]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={selected ? "text-[#0f4fb6]" : "text-[#6b7687]"}>{card.icon}</span>
                        <span
                          className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                            selected ? "border-[#0f4fb6]" : "border-[#c4ccd8]"
                          }`}
                        >
                          {selected ? <span className="h-2 w-2 rounded-full bg-[#0f4fb6]" /> : null}
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-bold text-[#1b2330]">{card.title}</p>
                      <p className="mt-1 text-xs text-[#8b95a7]">{card.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <form onSubmit={submitForm} className="mt-6 grid gap-5">
            <FieldShell
              label="Username"
              icon={<UserIcon />}
              input={
                <input
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="e.g. medical_admin"
                  className="w-full border-0 bg-transparent p-0 text-sm text-[#1b2330] outline-none placeholder:text-[#9aa3b2]"
                />
              }
            />

            {mode === "register" ? (
              <FieldShell
                label="Email Address"
                icon={<MailIcon />}
                input={
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@healthcare.org"
                    className="w-full border-0 bg-transparent p-0 text-sm text-[#1b2330] outline-none placeholder:text-[#9aa3b2]"
                  />
                }
              />
            ) : null}

            {mode === "register" && role === "buyer" ? (
              <FieldShell
                label="Organization Type"
                icon={<BuildingIcon />}
                input={
                  <select
                    value={buyerType}
                    onChange={(event) =>
                      setBuyerType(event.target.value as "hospital" | "pharmacy" | "ngo" | "clinic")
                    }
                    className="w-full border-0 bg-transparent p-0 text-sm text-[#1b2330] outline-none"
                  >
                    {Object.entries(buyerTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                }
              />
            ) : null}

            <FieldShell
              label="Password"
              icon={<LockIcon />}
              input={
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full border-0 bg-transparent p-0 text-sm text-[#1b2330] outline-none placeholder:text-[#9aa3b2]"
                />
              }
            />

            {message ? (
              <p className="rounded-2xl border border-[#f1d0d0] bg-[#fff7f7] px-4 py-3 text-sm text-[#a02828]">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="solid-action inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>{loading ? "Please wait..." : activePanel.primaryAction}</span>
              <ArrowLineIcon />
            </button>
          </form>
        </div>

        <div className="mt-7 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#667389] transition hover:text-[#0f4fb6]">
            <BackArrowIcon />
            Back to Home
          </Link>

          <p className="text-sm text-[#8a94a6]">
            {activePanel.secondaryLabel}{" "}
            <Link href={mode === "login" ? buildAuthHref("register") : buildAuthHref("login")} className="font-semibold text-[#0f4fb6] hover:underline">
              {activePanel.secondaryText}
            </Link>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#8f98a8]">
            <Link href="mailto:legal@medvendor.in?subject=Terms%20of%20Service" className="hover:text-[#0f4fb6]">
              Terms of Service
            </Link>
            <Link href="mailto:legal@medvendor.in?subject=Privacy%20Policy" className="hover:text-[#0f4fb6]">
              Privacy Policy
            </Link>
            <Link href="mailto:support@medvendor.in" className="hover:text-[#0f4fb6]">
              Contact Support
            </Link>
          </div>
        </div>

        <div className="mt-10 w-full self-stretch border-t border-[#dde4ed] bg-[#e9eef5] px-4 py-4 text-[11px] text-[#8892a3]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p>© 2024 MedVendor. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Security</span>
              <span>Terms</span>
              <span>Privacy</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function FieldShell({
  label,
  icon,
  input,
}: {
  label: string
  icon: ReactNode
  input: ReactNode
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-bold text-[#6f7a8c]">{label}</span>
      <div className="flex items-center gap-3 border-b border-[#d9e0e8] pb-3 text-[#7a8497] transition-colors duration-200 focus-within:border-[#2563eb] focus-within:text-[#0f4fb6]">
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">{input}</div>
      </div>
    </label>
  )
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 17H5V7h9v10h-1" />
      <path d="M14 10h3l2 3v4h-2" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  )
}

function BuyerCartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="18" cy="19" r="1.5" />
      <path d="M3 4h2l2.4 9.6a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H7" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V6l8-3 8 3v14" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
      <path d="M10 20v-3h4v3" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

function ArrowLineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
      <path d="M21 12H9" />
    </svg>
  )
}
