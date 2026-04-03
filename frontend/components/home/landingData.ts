import { VendorRfq } from "@/types/vendor"

export const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAZwKgxsahgiq_RXiwj7XPTbRvdKx0cDsH3F3OHNKdmkGS43xnglu-59cyPys1PsdnhhGWqdN4fkDKR5X2qX6sfwDnydQI1QcmLXEBQm9AZnYDEhFnCZf2fT30mYHzhJxvVCmZIUTaIbOp-zlrQxACp04IgEA1MHqcDMDmV8z8CmUX6b6qNOqm5x2iBh5XAnX0qM66DN0pCoyoshp_FV2G_GCI4D0KO8J1kWlbGH_nesKdMcK3d8_qXglrLCrqk9o-jDWFkWNX0tg"

export const marketplaceImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCVP67UVygDKO562YhLn77FYT_jhbR1CDGrX6zDll05IQREJkWzx3Q2ujKrojVNiRJx-y5lKwiqDMhoQzVlVNX7yxQzrZ0OesiRkW9W-DA1MfYbf8SvxTaMvA-1TVxT2xA2eyokoR_G9pdBMJW6B7mUDdfj8gJIaoOgNLnmvESR-noTo8XF8wrzdCFggh1cOprtHQkF_Rqz8IsPEMNkyX_qVM8L3fIBMeW_wygSJqZUeo-NX5kl6rsadmY354ZZg_g5IDZfidOaUQ"

export const navLinks = [
  { href: "#marketplace", label: "Marketplace" },
  { href: "#suppliers", label: "Suppliers" },
  { href: "#solutions", label: "Solutions" },
  { href: "#resources", label: "Resources" },
]

export const trustBrands = ["CLINIC-X", "MEDIGLOBE", "HEALTHCORE", "ZENITHCARE", "PROVITA"]

export const buyerBenefits = [
  "Efficient sourcing from verified vendors",
  "Automated compliance and audit trails",
  "Direct RFQ management dashboard",
]

export const supplierBenefits = [
  "Expand global market reach instantly",
  "Access high-intent verified leads",
  "Simplified bidding and order workflow",
]

export const lifecycleSteps = [
  {
    step: 1,
    title: "Browse",
    text: "Navigate our curated ledger of verified global suppliers and standardized product catalogs.",
  },
  {
    step: 2,
    title: "Quote",
    text: "Launch RFQs with smart templates or request instant pricing through our marketplace gateway.",
  },
  {
    step: 3,
    title: "Order",
    text: "Execute secure payments, track logistics in real-time, and manage automated audit logs.",
  },
]

export type LandingTender = {
  id: string
  initials: string
  title: string
  buyer: string
  reference: string
  budget: string
  endsIn: string
  href: string
  urgent: boolean
}

export const formatCurrency = (value: number) =>
  `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value)}`

export const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)

export const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ML"

export const getDeadlineLabel = (value: string) => {
  if (!value) return "Open now"

  const today = new Date()
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return value

  const diffMs = deadline.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / 86_400_000)

  if (diffDays < 0) return "Closed"
  if (diffDays === 0) return "Ends Today"
  if (diffDays === 1) return "1 Day"
  return `${diffDays} Days`
}

export const mapRfqToTender = (rfq: VendorRfq): LandingTender => {
  const buyer = rfq.buyer_company || rfq.buyer_name
  const reference = `RFQ-${String(rfq.id).padStart(4, "0")}`
  const budget = rfq.target_budget > 0 ? formatCurrency(rfq.target_budget) : "Value on request"
  const endsIn = getDeadlineLabel(rfq.quote_deadline)

  return {
    id: String(rfq.id),
    initials: getInitials(buyer),
    title: rfq.title,
    buyer,
    reference,
    budget,
    endsIn,
    href: "/register?role=supplier&next=%2Fsupplier%2Frfq",
    urgent: endsIn === "Ends Today" || endsIn.startsWith("1 Day") || endsIn.startsWith("2 Days"),
  }
}
