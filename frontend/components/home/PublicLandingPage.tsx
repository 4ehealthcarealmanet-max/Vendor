"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { getPublicRfqs, getToken } from "@/services"
import type { VendorRfq } from "@/services"
import {
  buyerBenefits,
  formatCompactCurrency,
  lifecycleSteps,
  mapRfqToTender,
  marketplaceImage,
  supplierBenefits,
} from "@/components/home/landingData"
import Navbar from "@/components/common/Navbar"
import {
  Hospital,
  Package,
  BadgeCheck,
  CheckCircle,
  ArrowRight,
  Gavel,
  LineChart,
  Boxes,
  Globe,
  Grid,
  Shield,
  Calendar,
  IndianRupee
} from "lucide-react"

const animationStyles = `
  /* ── existing loops ── */
  @keyframes scrollVerified {
    0%, 20% { transform: translateY(0); opacity: 1; }
    25% { transform: translateY(-24px); opacity: 0; }
    30%, 80% { transform: translateY(0); opacity: 1; }
    85% { transform: translateY(24px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  .animate-scroll-verified { animation: scrollVerified 3.8s ease-in-out infinite; }

  @keyframes floatCard {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .animate-float-card { animation: floatCard 8s ease-in-out infinite; }

  @keyframes stepPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
    50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(37,99,235,0); }
  }
  .animate-step-pulse { animation: stepPulse 3s ease-in-out infinite; }

  @keyframes orbitRing {
    0% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }
  .animate-orbit-ring { animation: orbitRing 2.2s ease-out infinite; }

  @keyframes lineGrow {
    0% { transform: scaleY(0); }
    100% { transform: scaleY(1); }
  }
  .animate-line-grow {
    animation: lineGrow 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    transform-origin: top;
  }

  /* ── scroll-reveal base states ── */
  .reveal {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
  }
  .reveal-left {
    opacity: 0;
    transform: translateX(-44px);
    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
  }
  .reveal-right {
    opacity: 0;
    transform: translateX(44px);
    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
  }
  .reveal-scale {
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
  }
  .reveal.is-visible,
  .reveal-left.is-visible,
  .reveal-right.is-visible,
  .reveal-scale.is-visible {
    opacity: 1;
    transform: none;
  }
  /* stagger delays — comfortable reading pace */
  .reveal-d1 { transition-delay: 0.12s; }
  .reveal-d2 { transition-delay: 0.24s; }
  .reveal-d3 { transition-delay: 0.36s; }
  .reveal-d4 { transition-delay: 0.50s; }
  .reveal-d5 { transition-delay: 0.64s; }

  /* ── scroll-triggered for lifecycle steps ── */
  .animate-fade-slide-up {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1);
  }
  .animate-fade-slide-up.is-visible { opacity: 1; transform: none; }

  /* ── grid + card ── */
  .bg-premium-grid {
    background-size: 40px 40px;
    background-image:
      linear-gradient(to right, rgba(37,99,235,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(37,99,235,0.02) 1px, transparent 1px);
  }
  .interactive-glass-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    box-shadow: 0 10px 30px rgba(15,23,42,0.04);
    transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  }
  .interactive-glass-card:hover {
    transform: translateY(-6px) scale(1.015);
    border-color: rgba(37,99,235,0.25);
    box-shadow: 0 24px 48px rgba(15,23,42,0.10), 0 0 0 1px rgba(37,99,235,0.08);
  }

  /* ── tender card shimmer on hover ── */
  .tender-card {
    position: relative;
    overflow: hidden;
  }
  .tender-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 40%, rgba(37,99,235,0.04) 100%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
    border-radius: inherit;
  }
  .tender-card:hover::before { opacity: 1; }

  /* ── CTA section pulse glow ── */
  @keyframes ctaGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
    50% { box-shadow: 0 0 40px 4px rgba(37,99,235,0.12); }
  }
  .cta-section { animation: ctaGlow 4s ease-in-out infinite; }

  /* ── benefit list item hover ── */
  .benefit-item {
    transition: transform 0.25s ease, color 0.25s ease;
  }
  .benefit-item:hover { transform: translateX(6px); }

  /* ── hero badge float ── */
  @keyframes badgeFloat {
    0%, 100% { transform: translateY(0) rotate(-1deg); }
    50% { transform: translateY(-6px) rotate(1deg); }
  }
  .badge-float { animation: badgeFloat 5s ease-in-out infinite; }
`

/** One-shot IntersectionObserver: adds 'is-visible' when element enters viewport */
function useScrollReveal(rootMargin = "-40px", trigger?: unknown) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const targets = el.querySelectorAll(
      ".reveal, .reveal-left, .reveal-right, .reveal-scale, .animate-fade-slide-up"
    )
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold: 0.08 }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
  return ref
}

export default function PublicLandingPage() {
  const [rfqs, setRfqs] = useState<VendorRfq[]>([])
  const [loadingRfqs, setLoadingRfqs] = useState(true)
  const [hasToken, setHasToken] = useState(false)
  const [activeHighlight, setActiveHighlight] = useState(0)
  const mainRef = useScrollReveal("-40px", loadingRfqs)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const closestIdx = Math.min(3, Math.floor(scrollY / 40))
      setActiveHighlight(closestIdx)
    }

    window.addEventListener("scroll", handleScroll)
    // Run once after mount
    setTimeout(handleScroll, 100)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    let isActive = true
    const loadRfqs = async () => {
      try {
        const data = await getPublicRfqs()
        if (isActive) setRfqs(data)
      } catch (err) {
        console.error("[PublicLandingPage] Failed to load public RFQs:", err)
        if (isActive) setRfqs([])
      } finally {
        if (isActive) setLoadingRfqs(false)
      }
    }
    loadRfqs()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    setHasToken(Boolean(getToken()))
  }, [])

  const activeRfqs = useMemo(
    () => rfqs.filter((rfq) => rfq.status === "open" || rfq.status === "under_review" || rfq.status === "closed"),
    [rfqs]
  )

  const activeBuyerCount = useMemo(
    () => new Set(activeRfqs.map((rfq) => (rfq.buyer_company || rfq.buyer_name).trim().toLowerCase())).size,
    [activeRfqs]
  )

  const totalPipelineValue = useMemo(
    () => activeRfqs.reduce((sum, rfq) => sum + (Number.isFinite(rfq.target_budget) ? rfq.target_budget : 0), 0),
    [activeRfqs]
  )

  const displayedTenders = useMemo(() => activeRfqs.slice(0, 3).map(mapRfqToTender), [activeRfqs])

  const protectedHref = (path: string) =>
    hasToken ? path : `/login?next=${encodeURIComponent(path)}`

  const triggerAuthModal = (mode: "login" | "register", role?: "supplier" | "buyer", next?: string) => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode, role, next } }))
  }

  const handleProtectedAction = (e: React.MouseEvent, path: string) => {
    if (!hasToken) {
      e.preventDefault()
      let nextDest = path
      if (path.includes("next=")) {
        try {
          const urlObj = new URL(path, window.location.href)
          nextDest = urlObj.searchParams.get("next") || path
        } catch {
          // fallback
        }
      }
      triggerAuthModal("login", undefined, nextDest)
    }
  }

  return (
    <main ref={mainRef as React.RefObject<HTMLElement>} className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-[#dae2ff] selection:text-[#001847] relative overflow-hidden">
      <style>{animationStyles}</style>

      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32 lg:py-40 grid gap-12 md:grid-cols-12 md:items-center mt-16">
        
        {/* Left Content */}
        <div className="md:col-span-6 lg:col-span-6 space-y-8 text-center md:text-left order-2 md:order-none">
          <h1 className="reveal max-w-2xl font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.02] tracking-[-0.05em] text-[#0F172A]">
            The Future of <br />
            <span className="text-[#2563EB]">
              Clinical Sourcing
            </span>
          </h1>

          <p className="reveal reveal-d1 max-w-xl mx-auto md:mx-0 text-sm md:text-base leading-relaxed text-[#64748B]">
            MedVendor transforms healthcare procurement into a seamless, high-performance operation.
            Navigate the marketplace with verified suppliers, live RFQs, and secure escrow workflows.
          </p>

          {/* Hero Feature Highlights with Icons */}
          {/* Desktop grid (hidden on mobile, shown on sm and above) */}
          <div className="reveal reveal-d2 hidden sm:grid gap-6 sm:grid-cols-2 max-w-xl mx-auto md:mx-0 pt-2">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                <Shield className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Verified Clinical Suppliers</h3>
                <p className="text-[11px] text-[#64748B]">Audited global supply chains.</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#14B8A6]">
                <Gavel className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Live Tendering Feed</h3>
                <p className="text-[11px] text-[#64748B]">Real-time open bidding.</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#F59E0B]">
                <Boxes className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Intelligent Catalog Control</h3>
                <p className="text-[11px] text-[#64748B]">Predictive stock planning.</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                <Globe className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Global Network Scales</h3>
                <p className="text-[11px] text-[#64748B]">Multi-facility clinical systems.</p>
              </div>
            </div>
          </div>

          {/* Mobile Vertical Connected Stepper (shown only on mobile, hidden on sm and above) */}
          <div id="mobile-stepper" className="sm:hidden relative pl-8 max-w-sm mx-auto pt-2 space-y-6 text-left">
            {/* The vertical connector track */}
            <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-slate-200">
              {/* Animated fill line based on activeHighlight */}
              <div 
                className="absolute top-0 left-0 w-full bg-[#2563EB] transition-all duration-700 rounded-full"
                style={{
                  height: `${(activeHighlight / 3) * 100}%`
                }}
              />
            </div>

            {[
              {
                title: "Verified Clinical Suppliers",
                desc: "Audited global supply chains.",
                icon: <Shield className="h-4.5 w-4.5" />
              },
              {
                title: "Live Tendering Feed",
                desc: "Real-time open bidding.",
                icon: <Gavel className="h-4.5 w-4.5" />
              },
              {
                title: "Intelligent Catalog Control",
                desc: "Predictive stock planning.",
                icon: <Boxes className="h-4.5 w-4.5" />
              },
              {
                title: "Global Network Scales",
                desc: "Multi-facility clinical systems.",
                icon: <Globe className="h-4.5 w-4.5" />
              }
            ].map((item, idx) => {
              const isActive = activeHighlight === idx;
              return (
                <div 
                  key={idx} 
                  className={`mobile-step-item flex items-start gap-4 transition-all duration-500 relative ${
                    isActive ? "opacity-100 scale-[1.02] translate-x-1" : "opacity-45 scale-100 translate-x-0"
                  }`}
                >
                  {/* Bullet Node */}
                  <div 
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                      isActive 
                        ? "bg-white border-[#2563EB] text-[#2563EB] shadow-md shadow-blue-500/10" 
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Text Details */}
                  <div className="space-y-0.5">
                    <h3 className={`text-xs font-bold transition-colors duration-500 ${
                      isActive ? "text-[#0F172A]" : "text-[#64748B]"
                    }`}>
                      {item.title}
                    </h3>
                    <p className={`text-[10px] transition-colors duration-500 ${
                      isActive ? "text-[#475569]" : "text-[#94A3B8]"
                    }`}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="reveal reveal-d3 flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-2">
            <button 
              onClick={() => triggerAuthModal("register", "buyer")}
              className="inline-flex items-center justify-center rounded-2xl bg-[#2563EB] px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.22)] hover:bg-[#1D4ED8] transition-all duration-300 active:scale-95"
            >
              Register as Buyer
            </button>
            <button 
              onClick={() => triggerAuthModal("register", "supplier")}
              className="inline-flex items-center justify-center rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-3.5 text-sm font-bold text-[#0F172A] shadow-sm hover:bg-[#F1F5F9] transition-all duration-300 active:scale-95"
            >
              Join as Supplier
            </button>
          </div>
        </div>

        {/* Right Visuals */}
        <div className="reveal-right relative md:col-span-6 lg:col-span-6 flex justify-center w-full order-1 md:order-none">
          <div className="relative w-full max-w-[640px]">
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-3xl border border-[#E2E8F0] shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.01] group">
              <Image
                src="/images/clinical-sourcing-user-hero-v3.jpg"
                alt="Clinical Sourcing Collaboration - MedVendor"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-[65%_center] transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Floating Verified Badge */}
            <div className="badge-float absolute -top-4 left-4 sm:-top-6 sm:-left-4 w-fit bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-2.5 shadow-xl flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Verified Network</p>
                <p className="text-xs font-black text-[#0F172A] mt-0.5 leading-none">100% Secure B2B</p>
                <p className="text-[10px] text-[#64748B] whitespace-nowrap mt-0.5 leading-none">Audited clinical logistics</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Buyer & Supplier Space Sections */}
      <section id="suppliers" className="w-full bg-[#FFFFFF] border-t border-b border-[#E2E8F0] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12 space-y-20 md:space-y-36">
          
          {/* Buyer Row */}
          <div className="grid gap-12 md:grid-cols-12 md:items-center reveal">
            {/* Left Side Image */}
            <div className="reveal-left md:col-span-6 flex justify-center w-full order-1 md:order-none">
              <div className="relative w-full max-w-[580px] aspect-[4/3] overflow-hidden rounded-3xl border border-[#E2E8F0] shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.01] group">
                <Image
                  src="/images/buyer-human-sourcing-v2.png"
                  alt="MedVendor Buyer Procurement Admin"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
            {/* Right Side Content */}
            <div className="reveal-right reveal-d1 md:col-span-6 space-y-6 order-2 md:order-none">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE] border border-blue-100 text-[#2563EB] shadow-sm">
                  <Hospital className="h-6 w-6" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-black tracking-[-0.04em] text-black">
                  For Buyers
                </h2>
              </div>
              <p className="text-sm md:text-base text-[#0F172A] font-medium leading-relaxed">
                Standardize your sourcing pipeline, automate documentation audit trails, and gain access to verified global suppliers.
              </p>
              <ul className="space-y-3 pt-2">
                {buyerBenefits.map((benefit) => (
                  <li key={benefit} className="benefit-item flex items-center gap-3 text-sm font-semibold text-[#0F172A]">
                    <span className="text-[#14B8A6]">
                      <CheckCircle className="h-5 w-5" />
                    </span>
                    <span className="leading-6">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Link 
                  href={protectedHref("/buyer/dashboard")} 
                  onClick={(e) => handleProtectedAction(e, "/buyer/dashboard")}
                  className="inline-flex items-center gap-2 text-sm font-black text-[#2563EB] hover:text-[#1D4ED8] group/link transition-colors duration-300"
                >
                  Explore Buyer Solutions
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Supplier Row */}
          <div className="grid gap-12 md:grid-cols-12 md:items-center reveal">
            {/* Left Side Content (Rendered below on mobile, left on desktop) */}
            <div className="reveal-left reveal-d1 md:col-span-6 space-y-6 order-2 md:order-none">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-150 text-[#14B8A6] shadow-sm">
                  <Package className="h-6 w-6" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-black tracking-[-0.04em] text-black">
                  For Suppliers
                </h2>
              </div>
              <p className="text-sm md:text-base text-[#0F172A] font-medium leading-relaxed">
                Showcase your clinical catalog, access highly qualified buying leads, and close orders using integrated payment systems.
              </p>
              <ul className="space-y-3 pt-2">
                {supplierBenefits.map((benefit) => (
                  <li key={benefit} className="benefit-item flex items-center gap-3 text-sm font-semibold text-[#0F172A]">
                    <span className="text-[#14B8A6]">
                      <CheckCircle className="h-5 w-5" />
                    </span>
                    <span className="leading-6">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Link 
                  href={protectedHref("/supplier/dashboard")} 
                  onClick={(e) => handleProtectedAction(e, "/supplier/dashboard")}
                  className="inline-flex items-center gap-2 text-sm font-black text-[#14B8A6] hover:text-[#0d9488] group/link transition-colors duration-300"
                >
                  Join Supplier Network
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
            {/* Right Side Image (Rendered on top on mobile, right on desktop) */}
            <div className="reveal-right md:col-span-6 flex justify-center w-full order-1 md:order-none">
              <div className="relative w-full max-w-[580px] aspect-[4/3] overflow-hidden rounded-3xl border border-[#E2E8F0] shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.01] group">
                <Image
                  src="/images/supplier-human-logistics-v2.png"
                  alt="MedVendor Supplier Logistics Manager"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Live Public Tenders List */}
      <section id="tenders" className="w-full bg-[#F8FAFC] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#E2E8F0] pb-8">
            <div className="reveal">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-black tracking-[-0.04em] text-[#0F172A]">
                Live Public <span className="text-[#2563EB]">Tenders</span>
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Browse active, open-bidding clinical opportunities across the MedVendor ecosystem.
              </p>
            </div>
            
            <div className="reveal reveal-d1 flex items-center gap-3">
              <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-bold text-[#2563EB]">
                {loadingRfqs ? "Refreshing..." : "Live Market Feed"}
              </span>
              <Link 
                href={protectedHref("/supplier/rfq")} 
                onClick={(e) => handleProtectedAction(e, "/supplier/rfq")}
                className="inline-flex items-center gap-2 text-xs font-black text-[#2563EB] hover:text-[#1D4ED8]"
              >
                View All Active RFQs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Tender Listing Cards */}
          <div className="mt-10">
            {loadingRfqs ? (
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 text-center text-sm text-[#64748B] shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#2563EB] animate-ping mr-2" />
                Loading live public tenders...
              </div>
            ) : displayedTenders.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 text-center text-sm text-[#64748B] shadow-sm">
                No live public tenders are available at this time. New RFQs will appear here when published.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {displayedTenders.map((tender) => (
                  <article 
                    key={tender.id} 
                    className="tender-card reveal reveal-d1 group relative flex flex-col items-center text-center rounded-3xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 shadow-sm transition-all duration-500 ease-out hover:-translate-y-2 hover:border-[#2563EB]/40 hover:shadow-xl hover:shadow-[#2563EB]/5"
                  >
                    {/* Centered Initials */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-sm font-black text-[#2563EB] transition-transform duration-300 group-hover:scale-110 mb-4">
                      {tender.initials}
                    </div>

                    {/* Title */}
                    <Link 
                      href={protectedHref("/supplier/rfq")} 
                      onClick={(e) => handleProtectedAction(e, "/supplier/rfq")}
                      className="text-base font-extrabold text-[#0F172A] hover:text-[#2563EB] transition-colors duration-300 max-w-xs line-clamp-2"
                    >
                      {tender.title}
                    </Link>

                    {/* Status Badge */}
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Bidding Open
                      </span>
                    </div>

                    {/* Reference / Buyer */}
                    <p className="mt-3 text-xs text-[#64748B] font-medium">
                      Ref: <span className="font-bold text-[#475569]">{tender.reference}</span> &bull; {tender.buyer}
                    </p>

                    {/* Description preview */}
                    {tender.description && (
                      <p className="mt-3 text-[11px] text-[#64748B] line-clamp-2 italic px-2">
                        "{tender.description}"
                      </p>
                    )}

                    {/* Specifications */}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                      {tender.quantity !== undefined && (
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-inset ring-slate-500/10">
                          Qty: {tender.quantity.toLocaleString()}
                        </span>
                      )}
                      {tender.tenderType && (
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-inset ring-slate-500/10 capitalize">
                          Type: {tender.tenderType}
                        </span>
                      )}
                      {tender.deliveryLocation && (
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-inset ring-slate-500/10 line-clamp-1 max-w-[120px]">
                          Loc: {tender.deliveryLocation}
                        </span>
                      )}
                    </div>

                    {/* Est. Value and Deadline */}
                    <div className="my-6 grid grid-cols-2 gap-4 w-full border-t border-b border-slate-100 py-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] flex items-center justify-center gap-1">
                          <IndianRupee className="h-3 w-3 text-[#2563EB]" />
                          Est. Value
                        </p>
                        <p className="text-sm font-black text-[#0F172A]">{tender.budget}</p>
                      </div>
                      <div className="space-y-1 border-l border-slate-100">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] flex items-center justify-center gap-1">
                          <Calendar className={`h-3 w-3 ${tender.endsIn === "Expired" ? "text-[#94A3B8]" : "text-[#F59E0B]"}`} />
                          Deadline
                        </p>
                        <p className={`text-sm font-black ${tender.endsIn === "Expired" ? "text-[#94A3B8]" : tender.urgent ? "text-red-500" : "text-[#F59E0B]"}`}>
                          {tender.endsIn}
                        </p>
                      </div>
                    </div>

                    {/* Button */}
                    <Link 
                      href={protectedHref("/supplier/rfq")} 
                      onClick={(e) => handleProtectedAction(e, "/supplier/rfq")}
                      className="w-full inline-flex items-center justify-center rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] px-6 py-3 text-xs font-black text-white transition-all duration-300 shadow-sm hover:shadow active:scale-95 mt-auto"
                    >
                      Submit Bid
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Platform Capabilities with Section Background (#F1F5F9) */}
      <section id="marketplace" className="border-t border-[#E2E8F0] bg-[#F1F5F9] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          
          <div className="reveal mb-12 max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-black tracking-[-0.04em] text-[#0F172A]">
              Platform <span className="text-[#2563EB]">Capabilities</span>
            </h2>
            <p className="mt-3 text-sm text-[#64748B] leading-relaxed">
              A comprehensive ecosystem designed to handle every facet of medical procurement with architectural precision.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4 md:grid-rows-2">
            
            {/* Grid Box 1 (B2C Marketplace - Double Size) */}
            <article className="reveal reveal-d1 interactive-glass-card group rounded-[2rem] p-6 md:col-span-2 md:row-span-2 flex flex-col justify-between relative overflow-hidden min-h-[22rem] bg-[#FFFFFF]">
              <div className="relative z-10 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em] text-[#0F172A] transition-colors duration-300 group-hover:text-[#2563EB]">
                    B2C Marketplace
                  </h3>
                  <p className="text-xs leading-relaxed text-[#64748B]">
                    Instant access to standardized supplies with direct ordering, transparent pricing, and ready-to-ship catalog visibility.
                  </p>
                </div>

                {/* Mock product ledger for visual content */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] p-3 border border-[#F1F5F9] hover:bg-slate-50 transition-colors duration-300">
                    <span className="text-xs font-semibold text-[#334155]">Surgical Gloves (Box of 100)</span>
                    <span className="text-xs font-black text-[#2563EB]">₹450</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] p-3 border border-[#F1F5F9] hover:bg-slate-50 transition-colors duration-300">
                    <span className="text-xs font-semibold text-[#334155]">Digital Pulse Oximeter</span>
                    <span className="text-xs font-black text-[#2563EB]">₹1,200</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] p-3 border border-[#F1F5F9] hover:bg-slate-50 transition-colors duration-300">
                    <span className="text-xs font-semibold text-[#334155]">N95 Respirators (Pack of 50)</span>
                    <span className="text-xs font-black text-[#2563EB]">₹2,100</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 text-[#F8FAFC] pointer-events-none transition-transform duration-700 ease-out group-hover:scale-110">
                <Globe className="h-44 w-44 text-[#F1F5F9]" />
              </div>
              <span className="relative z-10 mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#2563EB] w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live Now
              </span>
            </article>

            {/* Grid Box 2 (RFQ Tendering) */}
            <article className="reveal reveal-d2 interactive-glass-card group rounded-[2rem] p-6 md:col-span-2 flex items-center justify-between gap-4 bg-[#FFFFFF]">
              <div className="space-y-2">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em] text-[#0F172A] transition-colors duration-300 group-hover:text-[#2563EB]">
                  RFQ Tendering
                </h3>
                <p className="text-xs leading-relaxed text-[#64748B]">
                  Complex bidding made simple with multi-vendor comparison, live quotation review, and tender workflows.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 transition-all duration-500 group-hover:scale-110 group-hover:bg-[#2563EB] group-hover:text-white">
                <Gavel className="h-6 w-6 transition-transform duration-550 group-hover:rotate-12" />
              </div>
            </article>

            {/* Grid Box 3 (Compliance Analytics) */}
            <article className="reveal reveal-d3 interactive-glass-card group rounded-[2rem] p-6 flex flex-col justify-between bg-[#FFFFFF]">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#14B8A6] border border-teal-100 transition-all duration-500 group-hover:scale-110 group-hover:bg-[#14B8A6] group-hover:text-white">
                  <LineChart className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A] pt-2 transition-colors duration-300 group-hover:text-[#14B8A6]">Compliance Analytics</h3>
                <p className="text-[11px] leading-relaxed text-[#64748B]">
                  Real-time tracking of sourcing ethics, documentation status, and regulatory signals.
                </p>
              </div>
            </article>

            {/* Grid Box 4 (Inventory Control) */}
            <article className="reveal reveal-d4 interactive-glass-card group rounded-[2rem] p-6 flex flex-col justify-between bg-[#FFFFFF]">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#F59E0B] border border-amber-100 transition-all duration-500 group-hover:scale-110 group-hover:bg-[#F59E0B] group-hover:text-white">
                  <Boxes className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A] pt-2 transition-colors duration-300 group-hover:text-[#F59E0B]">Inventory Control</h3>
                <p className="text-[11px] leading-relaxed text-[#64748B]">
                  Predictive stock management and supply continuity planning for multi-facility teams.
                </p>
              </div>
            </article>

          </div>
        </div>
      </section>

      {/* Sourcing Lifecycle Section */}
      <section id="solutions" className="relative overflow-hidden py-20 md:py-28 bg-[#FFFFFF] border-t border-b border-[#E2E8F0]">
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/images/procurement-lifecycle.png"
            alt="Healthcare procurement operations"
            fill
            sizes="100vw"
            className="object-cover object-center opacity-5 mix-blend-multiply"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
          
          <div className="reveal text-center mb-16 space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold tracking-[-0.04em] text-[#0F172A]">
              The Procurement <span className="text-[#2563EB]">Lifecycle</span>
            </h2>
            <p className="mx-auto max-w-xl text-sm text-[#64748B] leading-relaxed">
              Three steps to a more efficient, compliant, and cost-effective clinical supply chain.
            </p>
          </div>

          {/* 3-column centered layout with connector */}
          <div className="relative mt-14">

            {/* Horizontal connector line (desktop only) */}
            <div className="hidden md:block absolute top-[3.25rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-[#2563EB] via-[#14B8A6] to-[#F59E0B] opacity-25" />

            <div className="grid gap-10 md:grid-cols-3 md:gap-6">
              {lifecycleSteps.map((item, index) => {
                const stepMeta = [
                  {
                    accent: "#2563EB",
                    glow: "rgba(37,99,235,0.18)",
                    bgLight: "#EFF6FF",
                    tag: "Discover",
                    icon: <Globe className="h-5 w-5" />,
                  },
                  {
                    accent: "#14B8A6",
                    glow: "rgba(20,184,166,0.18)",
                    bgLight: "#F0FDFA",
                    tag: "Negotiate",
                    icon: <Gavel className="h-5 w-5" />,
                  },
                  {
                    accent: "#F59E0B",
                    glow: "rgba(245,158,11,0.18)",
                    bgLight: "#FFFBEB",
                    tag: "Execute",
                    icon: <CheckCircle className="h-5 w-5" />,
                  },
                ][index] ?? { accent: "#2563EB", glow: "rgba(37,99,235,0.18)", bgLight: "#EFF6FF", tag: "", icon: null };

                return (
                  <div
                    key={item.step}
                    className="group flex flex-col items-center text-center animate-fade-slide-up hover:-translate-y-2"
                    style={{ transitionDelay: `${index * 0.18}s` }}
                  >
                    {/* Glowing orbital node */}
                    <div className="relative mb-7 flex items-center justify-center">
                      {/* Orbit ping ring */}
                      <span
                        className="absolute h-20 w-20 rounded-full opacity-0 group-hover:opacity-100 animate-orbit-ring pointer-events-none"
                        style={{ backgroundColor: stepMeta.glow }}
                      />
                      {/* Outer tinted ring */}
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl"
                        style={{
                          borderColor: `${stepMeta.accent}55`,
                          backgroundColor: stepMeta.bgLight,
                          boxShadow: `0 0 0 0 ${stepMeta.glow}`,
                        }}
                      >
                        {/* Inner solid disc */}
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shadow-md transition-all duration-300 group-hover:scale-105"
                          style={{ backgroundColor: stepMeta.accent }}
                        >
                          {item.step}
                        </div>
                      </div>
                    </div>

                    {/* Tag */}
                    <span
                      className="mb-3 inline-block rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: stepMeta.accent, backgroundColor: stepMeta.bgLight }}
                    >
                      {stepMeta.tag}
                    </span>

                    {/* Icon + Title */}
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span
                        className="transition-colors duration-300"
                        style={{ color: stepMeta.accent }}
                      >
                        {stepMeta.icon}
                      </span>
                      <h3
                        className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-[#0F172A] transition-colors duration-300"
                        style={{ color: undefined }}
                      >
                        <span
                          className="transition-colors duration-300 group-hover:text-[var(--sa)] "
                          style={{ "--sa": stepMeta.accent } as React.CSSProperties}
                        >
                          {item.title}
                        </span>
                      </h3>
                    </div>

                    {/* Body */}
                    <p className="text-sm leading-relaxed text-[#475569] max-w-xs px-2">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section w-full bg-[#F8FAFC] border-b border-[#E2E8F0] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="reveal max-w-2xl mx-auto text-center space-y-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-extrabold tracking-[-0.04em] leading-tight text-[#0F172A]">
              Ready to Modernize Your <br />
              <span className="text-[#2563EB]">Clinical Supply Chain?</span>
            </h2>
            <p className="text-sm md:text-base text-[#475569] leading-relaxed max-w-lg mx-auto">
              Create an account or connect with procurement experts to setup custom integrations, payment gates, and user hierarchies.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => triggerAuthModal("register")}
                className="inline-flex items-center justify-center rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] px-8 py-4 text-sm font-black text-white shadow-sm hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Create Free Account
              </button>
              <Link 
                href="mailto:demo@medvendor.in?subject=Schedule%20a%20MedVendor%20Demo" 
                className="inline-flex items-center justify-center rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-8 py-4 text-sm font-black text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Schedule Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <HomeFooter protectedHref={protectedHref} onClickProtected={handleProtectedAction} />
    </main>
  )
}

function HomeFooter({
  protectedHref,
  onClickProtected,
}: {
  protectedHref: (href: string) => string
  onClickProtected?: (e: React.MouseEvent, path: string) => void
}) {
  return (
    <footer
      id="resources"
      className="bg-gradient-to-b from-[#FFFFFF] to-[#F8FAFC] px-6 py-16 md:px-12"
    >
      {/* Top grid */}
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4 border-b border-[#E2E8F0] pb-12">

        {/* Brand */}
        <div className="flex flex-col items-start space-y-3 text-left">
          <span className="flex items-center gap-2 text-xl font-black tracking-[-0.04em] text-[#0F172A]">
            MedVendor
            <span className="inline-flex items-center rounded bg-[#DBEAFE] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#2563EB]">
              Enterprise
            </span>
          </span>
          <p className="max-w-[220px] text-[13px] font-normal leading-relaxed text-[#475569]">
            Standardizing healthcare sourcing globally. Built for modern clinical
            networks, verified suppliers, and automated audit trails.
          </p>
        </div>

        {/* Buyer Solutions */}
        <div className="flex flex-col items-start space-y-4 text-left">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#0F172A]">
            Buyer solutions
          </h3>
          <ul className="flex flex-col space-y-2.5">
            {[
              { href: protectedHref("/buyer/dashboard"), label: "Procurement dashboard" },
              { href: protectedHref("/buyer/products"),  label: "Medical marketplace" },
              { href: protectedHref("/buyer/rfq"),       label: "RFQs & tenders" },
              { href: protectedHref("/buyer/analytics"), label: "Procurement analytics" },
              { href: protectedHref("/buyer/subscription"), label: "Membership plans" },
            ].map(({ href, label }) => (
              <li key={label}>
                <Link
                  href={href}
                  onClick={(e) => onClickProtected?.(e, href)}
                  className="text-[13px] font-normal text-[#475569] transition-colors duration-200 hover:text-[#2563EB]"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Supplier Solutions */}
        <div className="flex flex-col items-start space-y-4 text-left">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#0F172A]">
            Supplier solutions
          </h3>
          <ul className="flex flex-col space-y-2.5">
            {[
              { href: protectedHref("/supplier/dashboard"),     label: "Supplier dashboard" },
              { href: protectedHref("/supplier/products"),      label: "Inventory manager" },
              { href: protectedHref("/supplier/products/new"),  label: "List new supplies" },
              { href: protectedHref("/supplier/orders"),        label: "Sales & orders" },
              { href: protectedHref("/supplier/analytics"),     label: "Sales analytics" },
            ].map(({ href, label }) => (
              <li key={label}>
                <Link
                  href={href}
                  onClick={(e) => onClickProtected?.(e, href)}
                  className="text-[13px] font-normal text-[#475569] transition-colors duration-200 hover:text-[#2563EB]"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust & Support */}
        <div className="flex flex-col items-start space-y-4 text-left">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#0F172A]">
            Trust & support
          </h3>
          <ul className="flex flex-col space-y-2.5">
            {[
              { href: "mailto:legal@medvendor.in?subject=Terms%20of%20Service",   label: "Terms of service" },
              { href: "mailto:legal@medvendor.in?subject=Privacy%20Policy",       label: "Privacy policy" },
              { href: "mailto:support@medvendor.in?subject=MedVendor%20Support",  label: "Help & support" },
            ].map(({ href, label }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="text-[13px] font-normal text-[#475569] transition-colors duration-200 hover:text-[#2563EB]"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-xs font-normal text-[#94A3B8]">
          © 2026 MedVendor Architectural Procurement. All rights reserved.
        </p>

        <div className="flex items-center gap-4">
          {/* LinkedIn */}
          <Link
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-[#94A3B8] transition-all duration-200 hover:scale-110 hover:text-[#0A66C2]"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </Link>

          {/* X / Twitter */}
          <Link
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X / Twitter"
            className="text-[#94A3B8] transition-all duration-200 hover:scale-110 hover:text-[#0F1419]"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>

          {/* Facebook */}
          <Link
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-[#94A3B8] transition-all duration-200 hover:scale-110 hover:text-[#1877F2]"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
            </svg>
          </Link>

          {/* Instagram */}
          <Link
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-[#94A3B8] transition-all duration-200 hover:scale-110 hover:text-[#E1306C]"
          >
            <svg
              className="h-4 w-4 fill-none stroke-current"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  )
}
