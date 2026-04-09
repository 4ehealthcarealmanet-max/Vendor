"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getPublicRfqs, getToken } from "@/services"
import type { VendorRfq } from "@/services"
import {
  buyerBenefits,
  formatCompactCurrency,
  heroImage,
  lifecycleSteps,
  mapRfqToTender,
  marketplaceImage,
  supplierBenefits,
  trustBrands,
} from "@/components/home/landingData"
import Navbar from "@/components/common/Navbar"
import {
  AnalyticsIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  GavelIcon,
  GlobeIcon,
  HospitalIcon,
  InventoryIcon,
  InventoryStackIcon,
  PublicGridIcon,
  ShieldIcon,
  VerifiedIcon,
} from "@/components/home/HomeIcons"

const animationStyles = `
  @keyframes scrollVerified {
    0%, 20% { transform: translateY(0); opacity: 1; }
    25% { transform: translateY(-24px); opacity: 0; }
    30%, 80% { transform: translateY(0); opacity: 1; }
    85% { transform: translateY(24px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  .animate-scroll-verified {
    animation: scrollVerified 3.8s ease-in-out infinite;
  }
  @keyframes floatCard {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .animate-float-card {
    animation: floatCard 8s ease-in-out infinite;
  }
  @keyframes stepPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 86, 210, 0.4); }
    50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(0, 86, 210, 0); }
  }
  .animate-step-pulse {
    animation: stepPulse 3s ease-in-out infinite;
  }
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-in-up {
    animation: slideInUp 0.6s ease-out forwards;
  }
  .step-card-hover {
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .step-card-hover:hover {
    transform: translateY(-10px) scale(1.04);
  }
  .step-number {
    position: relative;
    transition: all 0.35s ease;
  }
  .step-number::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.36), transparent 65%);
    opacity: 0;
    transition: opacity 0.35s ease;
  }
  .step-card-hover:hover .step-number {
    transform: scale(1.12) rotate(4deg);
    filter: drop-shadow(0 6px 18px rgba(0, 86, 210, 0.28));
  }
  .step-card-hover:hover .step-number::after {
    opacity: 1;
  }
  .hero-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 20%, rgba(56, 147, 255, 0.18), transparent 32%),
                radial-gradient(circle at 80% 80%, rgba(4, 120, 255, 0.12), transparent 24%);
    pointer-events: none;
    opacity: 0.9;
    mix-blend-mode: screen;
  }
`

export default function PublicLandingPage() {
  const [rfqs, setRfqs] = useState<VendorRfq[]>([])
  const [loadingRfqs, setLoadingRfqs] = useState(true)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadRfqs = async () => {
      try {
        const data = await getPublicRfqs()
        if (isActive) setRfqs(data)
      } catch {
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
    () => rfqs.filter((rfq) => rfq.status === "open" || rfq.status === "under_review"),
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

  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#191c1e] selection:bg-[#dae2ff] selection:text-[#001847]">
      <style>{animationStyles}</style>
      <Navbar />

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-8 pt-16 md:grid-cols-12 md:items-center md:pb-12 md:pt-20 md:px-8">
        <div className="md:col-span-6 lg:col-span-7">
          <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold leading-[1.05] tracking-[-0.05em] md:text-4xl">
            The Future of{" "}
            <span className="bg-gradient-to-r from-[#0040a1] to-[#0056d2] bg-clip-text text-transparent">
              Clinical Sourcing
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[#5d6577] md:text-base">
            MedVendor transforms healthcare procurement into a seamless, high-performance operation.
            Navigate the marketplace with verified suppliers, live RFQs, and buyer-supplier workflows
            that feel enterprise-ready from day one.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/register?role=buyer" className="solid-action inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(0,86,210,0.22)]">
              Register as Buyer
            </Link>
            <Link href="/register?role=supplier" className="ghost-action inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-[#191c1e]">
              Join as Supplier
            </Link>
          </div>
        </div>

        <div className="relative md:col-span-6 lg:col-span-5">
          <div className="relative mx-auto aspect-[3/4] max-w-[420px] overflow-hidden rounded-[1.8rem] bg-[#0d1b2e] shadow-[0_24px_54px_rgba(0,0,0,0.16)] transition-transform duration-300 will-change-transform hover:-translate-y-1.5 hover:scale-[1.02] animate-float-card">
            <Image
              src="/images/procurement-doctor.jpg"
              alt="Doctor using a smartphone with a digital healthcare interface"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover object-center transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,33,0.06)_0%,rgba(9,20,36,0.14)_35%,rgba(6,16,30,0.48)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0d1b2e]/72 via-[#0d1b2e]/18 to-transparent" />
            <div className="absolute inset-x-10 top-8 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur-sm">
              Sourcing Center
            </div>
          </div>

          <button
            type="button"
            className="absolute -bottom-3 left-4 rounded-2xl border border-[#dbe1ea] bg-white px-3 py-2 text-left shadow-[0_18px_30px_rgba(20,27,45,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c8d4ea] hover:shadow-[0_22px_34px_rgba(20,27,45,0.16)] active:translate-y-[2px] active:border-[#10233d] active:bg-[#10233d] active:shadow-[0_10px_18px_rgba(16,35,61,0.28)] active:[&_p]:text-white/85 active:[&_svg]:text-white md:-left-6"
          >
            <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dae2ff] text-[#0040a1] transition-colors duration-300 active:bg-white/15 active:text-white">
                <VerifiedIcon />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#8790a1] transition-colors duration-300">
                  Verified Leads
                </p>
                <div className="mt-1 h-6 overflow-hidden">
                  <p className="animate-scroll-verified text-sm font-extrabold text-[#191c1e] transition-colors duration-300">
                    {loadingRfqs ? "Loading..." : `${activeRfqs.length} Active`}
                  </p>
                </div>
                <p className="text-xs text-[#6a7284] transition-colors duration-300">
                  {loadingRfqs
                    ? "Updating market feed"
                    : activeRfqs.length > 0
                      ? `${activeBuyerCount} buyers | INR ${formatCompactCurrency(totalPipelineValue)}`
                      : "No live tenders yet"}
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      <section id="suppliers" className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="interactive-card relative overflow-hidden rounded-[1.5rem] border border-[#d9e7ff] bg-white p-5 shadow-[0_14px_32px_rgba(15,79,182,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(15,79,182,0.1)] md:p-6">
            <div className="pointer-events-none absolute inset-0 hidden md:block">
              <Image
                src="/images/for buyer.jpeg"
                alt="Buyer card visual background"
                fill
                sizes="50vw"
                className="object-cover object-right-top opacity-66 brightness-[0.74] contrast-[1.12] saturate-[1.02]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.99)_0%,rgba(255,255,255,0.96)_28%,rgba(255,255,255,0.78)_48%,rgba(255,255,255,0.34)_68%,rgba(255,255,255,0.08)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_30%,rgba(255,255,255,0.16)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_36%,rgba(196,220,255,0.16),rgba(255,255,255,0)_32%)]" />
            </div>
            <div className="relative z-10 max-w-[25rem]">
              <div className="max-w-[25rem]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0056d2] text-white shadow-[0_10px_26px_rgba(0,86,210,0.18)]">
                  <HospitalIcon />
                </div>
                <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.04em] text-[#12356b]">
                  For Buyers
                </h2>
                <ul className="mt-5 space-y-2.5">
              {buyerBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-sm text-[#596171]">
                  <span className="text-[#0056d2]">
                    <CheckCircleIcon />
                  </span>
                  <span className="leading-6">{benefit}</span>
                </li>
              ))}
                </ul>
                <Link href={protectedHref("/buyer/dashboard")} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#0056d2] transition hover:gap-3">
                  Explore Buyer Solutions
                  <ArrowRightIcon />
                </Link>
              </div>
            </div>
          </article>

          <article className="interactive-card relative overflow-hidden rounded-[1.5rem] border border-[#d9e7ff] bg-white p-5 shadow-[0_14px_32px_rgba(15,79,182,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(15,79,182,0.1)] md:p-6">
            <div className="pointer-events-none absolute inset-0 hidden md:block">
              <Image
                src="/images/for supplier.jpeg"
                alt="Supplier card visual background"
                fill
                sizes="50vw"
                className="object-cover object-right-top opacity-66 brightness-[0.74] contrast-[1.12] saturate-[1.02]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.99)_0%,rgba(255,255,255,0.96)_28%,rgba(255,255,255,0.78)_48%,rgba(255,255,255,0.34)_68%,rgba(255,255,255,0.08)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_30%,rgba(255,255,255,0.16)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_36%,rgba(196,220,255,0.14),rgba(255,255,255,0)_32%)]" />
            </div>
            <div className="relative z-10 max-w-[25rem]">
              <div className="max-w-[25rem]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0056d2] text-white shadow-[0_10px_26px_rgba(0,86,210,0.18)]">
                  <InventoryIcon />
                </div>
                <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.04em] text-[#12356b]">
                  For Suppliers
                </h2>
                <ul className="mt-5 space-y-2.5">
              {supplierBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-sm text-[#596171]">
                  <span className="text-[#0056d2]">
                    <CheckCircleIcon />
                  </span>
                  <span className="leading-6">{benefit}</span>
                </li>
              ))}
                </ul>
                <Link href={protectedHref("/supplier/dashboard")} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#0056d2] transition hover:gap-3">
                  Join Supplier Network
                  <ArrowRightIcon />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[-0.04em]">
              Live Public Tenders
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-[#5d6577]">
              Ongoing procurement opportunities across the MedVendor network.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#eef3fb] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#51617a]">
              {loadingRfqs ? "Refreshing" : activeRfqs.length > 0 ? "Live Market Feed" : "Waiting for RFQs"}
            </span>
            <Link href={protectedHref("/supplier/rfq")} className="inline-flex items-center gap-2 text-xs font-bold text-[#0056d2] hover:underline">
              View All Active RFQs
              <ArrowRightIcon />
            </Link>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          {loadingRfqs ? (
            <div className="rounded-[1.4rem] border border-[#dbe1ea] bg-white px-6 py-8 text-xs text-[#6a7284] shadow-[0_14px_30px_rgba(20,27,45,0.04)]">
              Loading live public tenders...
            </div>
          ) : displayedTenders.length === 0 ? (
            <div className="rounded-[1.4rem] border border-[#dbe1ea] bg-white px-6 py-8 text-xs text-[#6a7284] shadow-[0_14px_30px_rgba(20,27,45,0.04)]">
              No live public tenders are available right now. Real tenders will appear here when
              buyers publish open RFQs.
            </div>
          ) : (
            displayedTenders.map((tender) => (
              <article key={tender.id} className="group flex flex-col gap-5 rounded-[1.4rem] border border-transparent bg-white p-5 shadow-[0_14px_30px_rgba(20,27,45,0.04)] transition hover:border-[#d4daea] hover:shadow-[0_20px_40px_rgba(20,27,45,0.08)] md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffefe8] text-[10px] font-black text-[#a93802] transition group-hover:scale-110">
                    {tender.initials}
                  </div>
                  <div>
                    <Link href={protectedHref("/supplier/rfq")} className="text-sm font-bold transition hover:text-[#0056d2]">
                      {tender.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#6a7284]">
                      Ref: {tender.reference} | {tender.buyer}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                  <div className="text-left md:text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#8a90a0]">
                      Value
                    </p>
                    <p className="mt-0.5 text-xs font-bold">{tender.budget}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#8a90a0]">
                      Ends In
                    </p>
                    <p className={`mt-0.5 text-xs font-bold ${tender.urgent ? "text-[#ba1a1a]" : "text-[#191c1e]"}`}>
                      {tender.endsIn}
                    </p>
                  </div>
                  <Link href={protectedHref("/supplier/rfq")} className="inline-flex items-center justify-center rounded-lg border-2 border-[#0056d2] px-4 py-2 text-xs font-bold text-[#0056d2] transition hover:bg-[#0056d2] hover:text-white">
                    Place Bid
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section id="marketplace" className="bg-[#f2f4f6] py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[-0.04em] md:text-[2rem]">
              Platform Capabilities
            </h2>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-[#5d6577] md:text-sm">
              A comprehensive ecosystem designed to handle every facet of clinical procurement with
              architectural precision.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-4 md:grid-rows-2 md:[grid-auto-rows:minmax(140px,auto)]">
            <article className="interactive-card relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-white to-[#f9f9f9] p-6 md:col-span-2 md:row-span-2">
              <div className="relative z-10">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em] md:text-[1.35rem]">
                  B2C Marketplace
                </h3>
                <p className="mt-2.5 max-w-[30rem] text-xs leading-5 text-[#5d6577]">
                  Instant access to standardized supplies with direct ordering, transparent pricing,
                  and ready-to-ship catalog visibility.
                </p>
              </div>
              <div className="absolute bottom-0 right-0 h-[68%] w-[74%] overflow-hidden rounded-tl-[1.8rem]">
                <Image
                  src={marketplaceImage}
                  alt="Doctor using a smartphone with digital healthcare procurement interface"
                  fill
                  sizes="(max-width: 768px) 100vw, 35vw"
                  className="object-cover object-center opacity-70 transition-transform duration-700 hover:scale-110 hover:opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/18 to-transparent" />
              </div>
              <span className="absolute bottom-5 left-5 inline-flex rounded-full bg-[#dae2ff] px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#0040a1]">
                Active Now
              </span>
            </article>

            <article className="interactive-card flex items-center justify-between gap-3 rounded-[1.8rem] bg-white p-6 shadow-sm md:col-span-2">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-[-0.03em] md:text-[1.35rem]">
                  RFQ Tendering
                </h3>
                <p className="mt-2 text-xs leading-5 text-[#5d6577]">
                  Complex bidding made simple with multi-vendor comparison, live quotation review,
                  and tender workflows that feel operationally real.
                </p>
              </div>
              <div className="hidden text-[#0056d2]/20 md:block shrink-0">
                <GavelIcon />
              </div>
            </article>

            <article className="interactive-card rounded-[1.4rem] bg-white p-6 shadow-sm">
              <span className="text-[#0056d2]">
                <AnalyticsIcon />
              </span>
              <h3 className="mt-3 text-sm font-bold">Compliance Analytics</h3>
              <p className="mt-2 text-xs leading-5 text-[#5d6577]">
                Real-time tracking of sourcing ethics, documentation status, and regulatory signals.
              </p>
            </article>

            <article className="interactive-card rounded-[1.4rem] bg-white p-6 shadow-sm">
              <span className="text-[#515f74]">
                <InventoryStackIcon />
              </span>
              <h3 className="mt-3 text-sm font-bold">Inventory Control</h3>
              <p className="mt-2 text-xs leading-5 text-[#5d6577]">
                Predictive stock management and supply continuity planning for multi-facility teams.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="solutions" className="relative overflow-hidden bg-gradient-to-b from-[#f7f9fb] to-[#eef2f9] py-16 md:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0">
            <Image
              src="/images/procurement-lifecycle.png"
              alt="Healthcare procurement operations background"
              fill
              sizes="100vw"
              className="object-cover object-center opacity-[0.88] contrast-[1.28] brightness-[0.72] saturate-[1.08] mix-blend-multiply"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(214,227,248,0.24)_0%,rgba(207,222,246,0.2)_28%,rgba(192,210,239,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(10,40,92,0.06),rgba(21,56,109,0.18)_48%,rgba(27,58,105,0.28)_100%)]" />
          <div className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0056d2]/16 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-8">
          <div className="text-center mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-extrabold tracking-[-0.04em] animate-slide-in-up">
              The Procurement Lifecycle
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-xs text-[#5d6577] animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
              Three steps to a more efficient, compliant, and cost-effective clinical supply chain.
            </p>
          </div>
          
          <div className="relative mt-10 grid gap-8 md:grid-cols-3">
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden border-t-2 border-dashed border-[#a8adbb]/50 md:block" />
            
            {lifecycleSteps.map((item, index) => (
              <article 
                key={item.step} 
                className="step-card-hover relative z-10 rounded-[1.2rem] border border-transparent p-3 text-center group transition-colors duration-300 hover:border-[#c7daf8] hover:bg-transparent active:border-[#7aa7ea]"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="relative inline-block">
                  <div className="mx-auto flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0056d2] to-[#0040a1] text-lg md:text-xl font-black text-white shadow-[0_12px_28px_rgba(0,86,210,0.25)] step-number group-hover:animate-step-pulse relative">
                    {item.step}
                    <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 transition-all duration-300" />
                  </div>
                  <div className="absolute -inset-2 rounded-full bg-[#0056d2]/0 group-hover:bg-[#0056d2]/10 blur-lg transition-all duration-300 -z-10" />
                </div>
                
                <h3 className="mt-4 md:mt-5 font-[family-name:var(--font-display)] text-xs md:text-sm font-bold tracking-[-0.02em] text-[#191c1e] group-hover:text-[#0056d2] transition-colors duration-300">
                  {item.title}
                </h3>
                
                <p className="mx-auto mt-2 md:mt-3 max-w-xs text-[10px] md:text-xs leading-5 text-[#5d6577] group-hover:text-[#4a5568] transition-colors duration-300">
                  {item.text}
                </p>

                <div className="absolute -inset-2 rounded-[1.2rem] bg-[#0056d2]/0 opacity-0 blur-xl transition-all duration-300 group-hover:bg-[#0056d2]/10 group-hover:opacity-100 active:bg-[#0056d2]/14 -z-10 md:block hidden" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-[#0056d2] px-8 py-10 text-center text-white shadow-[0_25px_60px_rgba(0,86,210,0.26)] md:px-16 md:py-12">
          <div className="relative z-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[-0.04em] md:text-3xl">
              Ready to Modernize Your
              <br />
              Clinical Supply Chain?
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-black text-[#0040a1] transition hover:scale-[1.02]">
                Create Free Account
              </Link>
              <Link href="mailto:demo@medvendor.in?subject=Schedule%20a%20MedVendor%20Demo" className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-[#0040a1] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0b4bbb]">
                Schedule Demo
              </Link>
            </div>
          </div>
          <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-[family-name:var(--font-display)] text-[9rem] font-black tracking-[-0.08em] text-white/6 md:text-[18rem]">
            MED
          </span>
        </div>
      </section>

      <section className="bg-gradient-to-b from-[#f7f9fb] to-[#f2f4f6] py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="text-center">
            <p className="font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-[0.28em] text-[#8a90a0] mb-8">
              Trusted by 500+ Healthcare Providers
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
              {trustBrands.map((brand, index) => (
                <div 
                  key={brand} 
                  className="group relative transition-all duration-300 hover:scale-110 cursor-default"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-lg font-extrabold tracking-[-0.03em] text-[#9aa1af] group-hover:text-[#0056d2] transition-all duration-300">
                    {brand}
                  </div>
                  <div className="absolute -inset-2 rounded-lg bg-[#0056d2]/0 group-hover:bg-[#0056d2]/8 transition-all duration-300 -z-10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer id="resources" className="border-t border-[#d7dce6] bg-[#f2f4f6] px-6 py-12 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4">
          <div>
            <span className="block font-[family-name:var(--font-display)] text-lg font-black tracking-[-0.03em]">
              MedVendor
            </span>
            <p className="mt-6 text-xs leading-6 text-[#6a7284]">
              Architectural procurement for modern healthcare. Streamlining the global supply chain
              through transparency and verified intelligence.
            </p>
          </div>
          <FooterColumn
            title="Platform"
            links={[
              { href: protectedHref("/buyer/products"), label: "Marketplace" },
              { href: protectedHref("/supplier/rfq"), label: "Tendering System" },
              { href: "#marketplace", label: "Compliance Hub" },
              { href: protectedHref("/supplier/dashboard"), label: "Supplier Verification" },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { href: "/login", label: "Help Center" },
              { href: protectedHref("/buyer/dashboard"), label: "Buyer Workspace" },
              { href: "#solutions", label: "Sourcing Guide" },
              { href: protectedHref("/supplier/dashboard"), label: "Case Studies" },
            ]}
          />
          <FooterColumn
            title="Legal"
            compact
            links={[
              { href: "mailto:legal@medvendor.in?subject=Privacy%20Policy", label: "Privacy Policy" },
              { href: "mailto:legal@medvendor.in?subject=Terms%20of%20Service", label: "Terms of Service" },
              { href: "mailto:legal@medvendor.in?subject=Compliance", label: "Compliance" },
              { href: "mailto:legal@medvendor.in?subject=Global%20Sourcing", label: "Global Sourcing" },
            ]}
          />
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-[#d7dce6] pt-8 md:flex-row">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#8a90a0]">
            (c) 2024 MedVendor Architectural Procurement. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[#9aa1af]">
            <Link href="#resources" className="transition hover:text-[#0056d2]" aria-label="Resources">
              <GlobeIcon />
            </Link>
            <Link href="#marketplace" className="transition hover:text-[#0056d2]" aria-label="Platform">
              <PublicGridIcon />
            </Link>
            <Link href="mailto:security@medvendor.in" className="transition hover:text-[#0056d2]" aria-label="Security">
              <ShieldIcon />
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FooterColumn({
  title,
  links,
  compact = false,
}: {
  title: string
  links: { href: string; label: string }[]
  compact?: boolean
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0056d2]">{title}</h3>
      <div className={`mt-6 space-y-3 ${compact ? "text-xs font-semibold uppercase tracking-[0.16em]" : "text-xs"} text-[#6a7284]`}>
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="block transition hover:text-[#0056d2]">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
