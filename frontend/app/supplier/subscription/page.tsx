"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SupplierSidebar from "@/components/supplier/SupplierSidebar"
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

// Loader helper
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function SupplierSubscriptionPage() {
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
        if (me.role !== "supplier") {
          router.replace("/buyer/subscription")
          return
        }
        setUser(me)

        const activePlans = await getSubscriptionPlans()
        setPlans(activePlans)
      } catch (err) {
        if (isAuthSessionError(err)) {
          clearToken()
          router.push("/login?next=%2Fsupplier%2Fsubscription")
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
        notifyUser({
          type: "error",
          title: "Script Load Error",
          message: "Could not load Razorpay SDK. Check your internet connection.",
        })
        setPurchasing(null)
        return
      }

      // Initialize order on backend
      const orderData = await initializeSubscriptionPayment(planId)

      const options = {
        key: orderData.key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency,
        name: "MedVendor Portal",
        description: `Premium Subscription - ${planName}`,
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
              notifyUser({
                type: "success",
                title: "Payment Verified",
                message: "Your subscription has been activated successfully!",
              })
              // Reload page or redirect to dashboard
              router.replace("/supplier/dashboard")
            } else {
              throw new Error("Activation pending verification.")
            }
          } catch (verifyErr) {
            notifyUser({
              type: "error",
              title: "Verification Failed",
              message: "Payment was captured but failed activation. Contact support.",
            })
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          name: user?.username || "",
          email: user?.email || "",
        },
        theme: {
          color: "#0f4fb6",
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (paymentErr) {
      console.error(paymentErr)
      notifyUser({
        type: "error",
        title: "Checkout Error",
        message: "Failed to initialize payment order. Try again later.",
      })
    } finally {
      setPurchasing(null)
    }
  }

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#f6f8fb]" />
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a]">
      <SupplierSidebar
        active="subscription"
        username={user?.username}
        status={user?.status}
        hasActiveSubscription={user?.has_active_subscription}
        onSignOut={signOut}
      />

      <main className="px-4 py-6 pb-24 sm:px-6 lg:pl-[calc(18rem+2rem)] lg:pr-6 lg:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center lg:text-left">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f4fb6]">Membership Plans</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#0f172a] sm:text-5xl">
              Unlock the Marketplace
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#64748b] max-w-xl">
              Get full access to MedVendor RFQs, Order tracking, and catalog management features. Select a membership tier to get started.
            </p>
          </div>

          {user?.has_active_subscription ? (
            <div className="mb-8 rounded-[1.5rem] border border-[#d7f0df] bg-[#f1fcf4] p-6 shadow-[0_12px_30px_rgba(23,114,69,0.05)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d7f0df] text-[#177245]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#177245]">Active Subscription</h3>
                  <p className="mt-1 text-sm text-[#2b7c52]">
                    Your account has an active premium subscription. Thank you for partnering with MedVendor.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-[1.5rem] border border-[#fde3b8] bg-[#fff8ec] p-6 shadow-[0_12px_30px_rgba(189,127,15,0.05)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fde3b8] text-[#ad6a08]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#ad6a08]">Workspace Locked</h3>
                  <p className="mt-1 text-sm text-[#925906]">
                    Please purchase a subscription to unlock dashboard details, catalog updates, and order fulfillment features.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && <div className="mb-6 text-sm font-semibold text-red-600">{error}</div>}

          {plans.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[#dbe4ef] bg-white p-12 text-center">
              <h3 className="text-lg font-bold text-[#64748b]">No active plans available</h3>
              <p className="mt-2 text-sm text-[#94a3b8]">Contact platform admin to configure subscription plans.</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              {plans.map((plan) => {
                const isActivePlan = user?.active_subscription_plan_id === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between overflow-hidden rounded-[2rem] border p-8 shadow-[0_22px_45px_rgba(15,23,42,0.04)] backdrop-blur transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] ${
                      isActivePlan
                        ? "border-[#0f4fb6] ring-2 ring-[#0f4fb6] bg-gradient-to-b from-[#f5f9ff] to-white/70"
                        : "border-white/80 bg-white/70"
                    }`}
                  >
                    {isActivePlan && (
                      <div className="absolute right-4 top-4 rounded-full bg-[#0f4fb6] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                        Active Plan
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">{plan.name}</h3>
                      <p className="mt-2 text-sm text-[#64748b] leading-relaxed min-h-[3.5rem]">{plan.description}</p>
                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-[#0f4fb6]">₹{Number(plan.price_inr).toLocaleString("en-IN")}</span>
                        <span className="text-sm font-semibold text-[#94a3b8]">/{plan.duration_days} days</span>
                      </div>

                      <ul className="mt-8 space-y-3.5">
                        <li className="flex items-center gap-3 text-sm font-medium text-[#475569]">
                          <svg className="h-5 w-5 shrink-0 text-[#10b981]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                          Full access to RFQ bidding & proposals
                        </li>
                        <li className="flex items-center gap-3 text-sm font-medium text-[#475569]">
                          <svg className="h-5 w-5 shrink-0 text-[#10b981]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                          Catalog & product inventory management
                        </li>
                        <li className="flex items-center gap-3 text-sm font-medium text-[#475569]">
                          <svg className="h-5 w-5 shrink-0 text-[#10b981]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                          Fulfillment, shipping, & order workflows
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => handleSubscribe(plan.id, plan.name)}
                      disabled={purchasing !== null || isActivePlan}
                      className={`mt-8 w-full rounded-2xl py-4 text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,79,182,0.18)] transition-all hover:shadow-[0_18px_36px_rgba(15,79,182,0.28)] disabled:opacity-50 active:scale-95 ${
                        isActivePlan
                          ? "bg-[#10b981] hover:bg-[#10b981] cursor-default"
                          : "bg-[#0f4fb6] hover:bg-[#0b46a8]"
                      }`}
                    >
                      {purchasing === plan.id ? "Processing..." : isActivePlan ? "Current Active Plan" : "Subscribe Now"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
