"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import BuyerNavbar from "@/components/buyer/BuyerNavbar"
import BuyerFooter from "@/components/buyer/BuyerFooter"
import {
  clearToken,
  getCurrentUser,
  getSubscriptionPlans,
  initializeSubscriptionPayment,
  verifySubscriptionPayment,
  isAuthSessionError,
  logoutUser,
  notifyUser,
} from "@/services"
import type { AuthUser, SubscriptionPlan } from "@/services"
import {
  ShieldCheck,
  Zap,
  Activity,
  PhoneCall,
  Lock,
  CreditCard,
  FileText,
  RefreshCw,
  Check,
  Sparkles,
  LockKeyhole,
  Info,
  HelpCircle
} from "lucide-react"

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

const PLAN_FEATURES = [
  [
    "Up to 5 RFQ submissions/month",
    "Browse verified supplier catalog",
    "Basic order tracking",
    "Standard email support",
  ],
  [
    "Unlimited RFQ creation & management",
    "Full marketplace access",
    "Advanced order & delivery tracking",
    "Analytics dashboard",
    "Priority email support",
  ],
  [
    "Everything in Standard",
    "Dedicated procurement advisor",
    "Custom compliance workflows",
    "API integration support",
    "24/7 priority support",
    "Custom reporting & exports",
  ],
]

const PLAN_ACCENT = [
  { border: "#E2E8F0", badge: "#64748B", badgeBg: "#F1F5F9", ring: "#E2E8F0", btn: "#334155", btnHover: "#1E293B", label: "Starter", bgGrad: "from-slate-50 to-white" },
  { border: "#2563EB", badge: "#2563EB", badgeBg: "#EFF6FF", ring: "#2563EB", btn: "#2563EB", btnHover: "#1D4ED8", label: "Most Popular", bgGrad: "from-blue-50/50 via-white to-white" },
  { border: "#7C3AED", badge: "#7C3AED", badgeBg: "#F5F3FF", ring: "#7C3AED", btn: "#7C3AED", btnHover: "#6D28D9", label: "Enterprise", bgGrad: "from-purple-50/50 via-white to-white" },
]

export default function BuyerSubscriptionPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await getCurrentUser()
        if (me.role !== "buyer") {
          router.replace("/supplier/subscription")
          return
        }
        setUser(me)
        const activePlans = await getSubscriptionPlans()
        setPlans(activePlans)
      } catch (err) {
        if (isAuthSessionError(err)) {
          clearToken()
          router.push("/login?next=%2Fbuyer%2Fsubscription")
          return
        }
        setError("Failed to load plans. Please check backend connection.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  const handleSubscribe = async (planId: number, planName: string) => {
    setPurchasing(planId)
    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        notifyUser({ type: "error", title: "Script Load Error", message: "Could not load Razorpay SDK." })
        setPurchasing(null)
        return
      }
      const orderData = await initializeSubscriptionPayment(planId)
      const options = {
        key: orderData.key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency,
        name: "MedVendor Portal",
        description: `Premium Subscription – ${planName}`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          setLoading(true)
          try {
            const verifyRes = await verifySubscriptionPayment({
              plan_id: planId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            if (verifyRes.has_active_subscription) {
              notifyUser({ type: "success", title: "Subscription Activated", message: "Welcome to MedVendor Premium!" })
              router.replace("/buyer/dashboard")
            } else {
              throw new Error("Activation pending.")
            }
          } catch {
            notifyUser({ type: "error", title: "Verification Failed", message: "Contact support if amount was deducted." })
          } finally {
            setLoading(false)
          }
        },
        prefill: { name: user?.username || "", email: user?.email || "" },
        theme: { color: "#2563EB" },
      }
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch {
      notifyUser({ type: "error", title: "Checkout Error", message: "Failed to initialize payment. Try again." })
    } finally {
      setPurchasing(null)
    }
  }

  const signOut = async () => {
    try { await logoutUser() } finally { clearToken(); router.push("/") }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <BuyerNavbar active="subscription" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-blue-150 border-t-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Loading plans and billing configuration...</p>
          </div>
        </main>
        <BuyerFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <BuyerNavbar
        active="subscription"
        username={user?.username}
        buyerType={user?.buyer_type}
        status={user?.status}
        hasActiveSubscription={user?.has_active_subscription}
        onSignOut={signOut}
      />

      <main className="flex-1 w-full relative overflow-hidden">
        {/* Decorative subtle background glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-100/30 rounded-full blur-[90px] pointer-events-none -z-10" />

        {/* ── Hero Header ── */}
        <section className="w-full px-4 sm:px-6 pt-10 sm:pt-12 pb-6 sm:pb-8 max-w-4xl mx-auto text-left">
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#0F172A] leading-tight">
              Choose the plan that fits <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">your procurement scale</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              Access the clinical procurement pipeline, post RFQs to audited global suppliers, automate paperwork workflows, and scale your supply chain operations instantly.
            </p>

            {/* Trust Badges - Premium Icons */}
            <div className="flex flex-wrap justify-start items-center gap-2 sm:gap-2.5 pt-2 text-[9px] sm:text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-sm shrink-0">
                <LockKeyhole className="h-3.5 w-3.5 text-blue-600" />
                <span>Secure Razorpay Checkout</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-sm shrink-0">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Instant Activation</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-sm shrink-0">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                <span>Verified Supplier Networks</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-sm shrink-0">
                <PhoneCall className="h-3.5 w-3.5 text-purple-600" />
                <span>Priority Enterprise Support</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Status Banner ── */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-6">
          {user?.has_active_subscription ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3.5 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-emerald-800">Your Subscription is Active</p>
                <p className="text-[10px] sm:text-[11px] text-emerald-700 leading-relaxed">
                  Thank you for partnering with MedVendor. You have unrestricted access to create RFQs, view supplier proposals, and manage orders.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3.5 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <LockKeyhole className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-800">Workspace Feature Locked</p>
                <p className="text-[10px] sm:text-[11px] text-amber-700 leading-relaxed">
                  Please subscribe to a plan to start requesting bids, executing purchase orders, and analyzing your spending data.
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              <Info className="h-4 w-4 text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Plans Grid ── */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 pb-16">
          {plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <HelpCircle className="mx-auto h-10 w-10 text-slate-400 mb-2" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-700">No Subscription Plans Available</h3>
              <p className="mt-1 text-[11px] text-slate-500">Contact the platform administrator to publish billing configurations.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3 items-stretch">
              {plans.map((plan, idx) => {
                const isActivePlan = user?.active_subscription_plan_id === plan.id
                const accent = PLAN_ACCENT[idx] ?? PLAN_ACCENT[0]
                const features = PLAN_FEATURES[idx] ?? PLAN_FEATURES[0]
                const isPopular = idx === 1
                const isEnterprise = idx === 2

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border bg-gradient-to-b ${accent.bgGrad} p-4 sm:p-4.5 transition-all duration-300 shadow-sm md:hover:shadow-md md:hover:-translate-y-1 ${isActivePlan
                        ? "border-[#2563EB] ring-1.5 ring-[#2563EB]/30"
                        : isPopular
                          ? "border-blue-300 shadow-sm"
                          : isEnterprise
                            ? "border-purple-300 shadow-sm"
                            : "border-slate-200/80"
                      }`}
                  >
                    {/* Top Ribbon Badge */}
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div>
                        <span
                          className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ color: accent.badge, backgroundColor: accent.badgeBg }}
                        >
                          {accent.label}
                        </span>
                        <h3 className="mt-1 text-base font-bold text-[#0F172A] tracking-tight">{plan.name}</h3>
                      </div>
                      {isActivePlan && (
                        <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-[#0F172A]">
                          ₹{Number(plan.price_inr).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          / {plan.duration_days} days
                        </span>
                      </div>
                      {plan.description && (
                        <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 leading-relaxed min-h-[30px]">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-slate-100 my-3" />

                    {/* Features List */}
                    <ul className="space-y-2 flex-1 mb-5">
                      {features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-705 font-medium leading-tight">
                          <Check className="mt-0.5 shrink-0 h-3.5 w-3.5 text-emerald-600" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Subscribe Button */}
                    <button
                      onClick={() => handleSubscribe(plan.id, plan.name)}
                      disabled={purchasing !== null || isActivePlan}
                      className="w-full rounded-xl py-2 text-[11px] font-extrabold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      style={{
                        background: isActivePlan
                          ? "#10B981"
                          : `linear-gradient(135deg, ${accent.btn}, ${accent.btnHover})`,
                      }}
                    >
                      {purchasing === plan.id ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </>
                      ) : isActivePlan ? (
                        "Current Active Plan"
                      ) : (
                        <>
                          <span>Subscribe Now</span>
                          <Zap className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom Security Badges with Lucide Icons */}
          <div className="mt-10 pt-6 border-t border-slate-200/60 flex flex-wrap justify-start items-center gap-x-5 gap-y-3 text-[10px] sm:text-xs text-slate-500 font-semibold">
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>256-Bit SSL Encrypted Transactions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Powered by Razorpay payment gateway</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <span>GSTIN Compliant Invoices</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Cancel or Upgrade Anytime</span>
            </div>
          </div>
        </section>
      </main>

      <BuyerFooter />
    </div>
  )
}
