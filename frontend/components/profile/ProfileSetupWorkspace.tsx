"use client"

import { FormEvent, ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import BuyerSidebar from "@/components/buyer/BuyerSidebar"
import SupplierSidebar from "@/components/supplier/SupplierSidebar"
import {
  clearToken,
  getCurrentUser,
  getUserProfile,
  isAuthSessionError,
  logoutUser,
  updateUserProfile,
} from "@/services"
import type { AuthUser } from "@/services"

type ProfileRole = "supplier" | "buyer"

type SupplierProfileForm = {
  companyName: string
  brandName: string
  gstNumber: string
  licenseNumber: string
  businessCategory: string
  yearsInBusiness: string
  address: string
  city: string
  state: string
  pincode: string
  contactName: string
  designation: string
  phone: string
  email: string
  productCategories: string
  supplyRegions: string
  minimumOrderValue: string
  averageLeadTime: string
  warehouseCapacity: string
  bankAccountName: string
  bankAccountNumber: string
  ifscCode: string
  gstDocument: string
  licenseDocument: string
  isoCertificate: string
}

type BuyerProfileForm = {
  organizationName: string
  buyerType: string
  department: string
  institutionSize: string
  gstNumber: string
  address: string
  city: string
  state: string
  pincode: string
  procurementContactName: string
  designation: string
  phone: string
  email: string
  monthlySpend: string
  paymentTerms: string
  approvalFlow: string
  categoriesNeeded: string
  deliveryLocations: string
  urgencyWindow: string
  complianceNeeds: string
  onboardingDocuments: string
}

const supplierDraftKey = "medvendor-supplier-profile-draft"
const buyerDraftKey = "medvendor-buyer-profile-draft"

const defaultSupplierForm = (user?: AuthUser | null): SupplierProfileForm => ({
  companyName: "",
  brandName: "",
  gstNumber: "",
  licenseNumber: "",
  businessCategory: "",
  yearsInBusiness: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  contactName: user?.username ?? "",
  designation: "",
  phone: "",
  email: user?.email ?? "",
  productCategories: "",
  supplyRegions: "",
  minimumOrderValue: "",
  averageLeadTime: "",
  warehouseCapacity: "",
  bankAccountName: "",
  bankAccountNumber: "",
  ifscCode: "",
  gstDocument: "",
  licenseDocument: "",
  isoCertificate: "",
})

const defaultBuyerForm = (user?: AuthUser | null): BuyerProfileForm => ({
  organizationName: "",
  buyerType: user?.buyer_type ?? "",
  department: "",
  institutionSize: "",
  gstNumber: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  procurementContactName: user?.username ?? "",
  designation: "",
  phone: "",
  email: user?.email ?? "",
  monthlySpend: "",
  paymentTerms: "",
  approvalFlow: "",
  categoriesNeeded: "",
  deliveryLocations: "",
  urgencyWindow: "",
  complianceNeeds: "",
  onboardingDocuments: "",
})

const parseStoredDraft = <T,>(key: string): Partial<T> | null => {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<T>) : null
  } catch {
    return null
  }
}

export default function ProfileSetupWorkspace({ role }: { role: ProfileRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(true)
  const [isNewProfile, setIsNewProfile] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [supplierForm, setSupplierForm] = useState<SupplierProfileForm>(defaultSupplierForm())
  const [buyerForm, setBuyerForm] = useState<BuyerProfileForm>(defaultBuyerForm())

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await getCurrentUser()

        if (me.role !== role) {
          router.replace(me.role === "supplier" ? "/supplier/profile" : "/buyer/profile")
          return
        }

        setUser(me)

        // Load profile from backend
        try {
          const profileData = await getUserProfile()
          if (role === "supplier") {
            setSupplierForm({
              ...defaultSupplierForm(me),
              companyName: profileData.company_name || "",
              brandName: profileData.brand_name || "",
              gstNumber: profileData.gst_number || "",
              licenseNumber: profileData.license_number || "",
              businessCategory: profileData.business_category || "",
              yearsInBusiness: profileData.years_in_business || "",
              address: profileData.address || "",
              city: profileData.city || "",
              state: profileData.state || "",
              pincode: profileData.pincode || "",
              contactName: profileData.contact_name || me.username,
              designation: profileData.designation || "",
              phone: profileData.phone || "",
              email: profileData.email || me.email,
              productCategories: profileData.product_categories || "",
              supplyRegions: profileData.supply_regions || "",
              minimumOrderValue: profileData.minimum_order_value || "",
              averageLeadTime: profileData.average_lead_time || "",
              warehouseCapacity: profileData.warehouse_capacity || "",
              bankAccountName: profileData.bank_account_name || "",
              bankAccountNumber: profileData.bank_account_number || "",
              ifscCode: profileData.ifsc_code || "",
              gstDocument: profileData.gst_document || "",
              licenseDocument: profileData.license_document || "",
              isoCertificate: profileData.iso_certificate || "",
            })
          } else {
            setBuyerForm({
              ...defaultBuyerForm(me),
              organizationName: profileData.organization_name || "",
              buyerType: profileData.buyer_type || me.buyer_type || "",
              department: profileData.department || "",
              institutionSize: profileData.institution_size || "",
              gstNumber: profileData.gst_number || "",
              address: profileData.address || "",
              city: profileData.city || "",
              state: profileData.state || "",
              pincode: profileData.pincode || "",
              procurementContactName: profileData.procurement_contact_name || me.username,
              designation: profileData.designation || "",
              phone: profileData.phone || "",
              email: profileData.email || me.email,
              monthlySpend: profileData.monthly_spend || "",
              paymentTerms: profileData.payment_terms || "",
              approvalFlow: profileData.approval_flow || "",
              categoriesNeeded: profileData.categories_needed || "",
              deliveryLocations: profileData.delivery_locations || "",
              urgencyWindow: profileData.urgency_window || "",
              complianceNeeds: profileData.compliance_needs || "",
              onboardingDocuments: profileData.onboarding_documents || "",
            })
            setIsEditing(false)
            setIsNewProfile(false)
          }
        } catch (profileError) {
          console.error("Profile load failed, using defaults", profileError)
          // Fallback to localStorage if backend fails (optional)
          if (role === "supplier") {
            const draft = parseStoredDraft<SupplierProfileForm>(supplierDraftKey)
            setSupplierForm({ ...defaultSupplierForm(me), ...draft })
          } else {
            const draft = parseStoredDraft<BuyerProfileForm>(buyerDraftKey)
            setBuyerForm({ ...defaultBuyerForm(me), ...draft })
          }
        }
      } catch (loadError) {
        if (isAuthSessionError(loadError)) {
          clearToken()
          router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login")
          return
        }

        setError("Could not load profile setup. Check the backend connection and try again.")
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [pathname, role, router])

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/")
    }
  }

  const handleSupplierSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const data = {
        company_name: supplierForm.companyName,
        brand_name: supplierForm.brandName,
        gst_number: supplierForm.gstNumber,
        license_number: supplierForm.licenseNumber,
        business_category: supplierForm.businessCategory,
        years_in_business: supplierForm.yearsInBusiness,
        address: supplierForm.address,
        city: supplierForm.city,
        state: supplierForm.state,
        pincode: supplierForm.pincode,
        contact_name: supplierForm.contactName,
        designation: supplierForm.designation,
        phone: supplierForm.phone,
        email: supplierForm.email,
        product_categories: supplierForm.productCategories,
        supply_regions: supplierForm.supplyRegions,
        minimum_order_value: supplierForm.minimumOrderValue,
        average_lead_time: supplierForm.averageLeadTime,
        warehouse_capacity: supplierForm.warehouseCapacity,
        bank_account_name: supplierForm.bankAccountName,
        bank_account_number: supplierForm.bankAccountNumber,
        ifsc_code: supplierForm.ifscCode,
        gst_document: supplierForm.gstDocument,
        license_document: supplierForm.licenseDocument,
        iso_certificate: supplierForm.isoCertificate,
      }

      const response = await updateUserProfile(data)
      setMessage("Profile saved! Your account is now under review by the admin team. You will be notified once approved.")
      
      // Also save to localStorage as a fallback
      if (typeof window !== "undefined") {
        window.localStorage.setItem(supplierDraftKey, JSON.stringify(supplierForm))
      }
    } catch (saveError) {
      setError("Failed to save profile to database. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleBuyerSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const data = {
        organization_name: buyerForm.organizationName,
        buyer_type: buyerForm.buyerType,
        department: buyerForm.department,
        institution_size: buyerForm.institutionSize,
        gst_number: buyerForm.gstNumber,
        address: buyerForm.address,
        city: buyerForm.city,
        state: buyerForm.state,
        pincode: buyerForm.pincode,
        procurement_contact_name: buyerForm.procurementContactName,
        designation: buyerForm.designation,
        phone: buyerForm.phone,
        email: buyerForm.email,
        monthly_spend: buyerForm.monthlySpend,
        payment_terms: buyerForm.paymentTerms,
        approval_flow: buyerForm.approvalFlow,
        categories_needed: buyerForm.categoriesNeeded,
        delivery_locations: buyerForm.deliveryLocations,
        urgency_window: buyerForm.urgencyWindow,
        compliance_needs: buyerForm.complianceNeeds,
        onboarding_documents: buyerForm.onboardingDocuments,
      }

      const response = await updateUserProfile(data)
      setMessage("Profile saved! Your account is now under review by the admin team. You will be notified once approved.")

      // Also save to localStorage as a fallback
      if (typeof window !== "undefined") {
        window.localStorage.setItem(buyerDraftKey, JSON.stringify(buyerForm))
      }
    } catch (saveError) {
      setError("Failed to save profile to database. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#f6f8fb]" />
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#f1d5d5] bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a93802]">Profile Setup</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#0f172a]">Session unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-[#64748b]">{error || "User session could not be loaded."}</p>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a]">
      {role === "supplier" ? (
        <SupplierSidebar active="profile" username={user.username} status={user.status} onSignOut={signOut} />
      ) : (
        <BuyerSidebar active="profile" username={user.username} buyerType={user.buyer_type} status={user.status} onSignOut={signOut} />
      )}

      <main className="px-4 py-6 pb-24 sm:px-6 lg:pl-[calc(18rem+2rem)] lg:pr-6 lg:py-8">
        <div className="mx-auto max-w-4xl">
          {user.status === "pending" && (
            <div className="mb-6 rounded-[1.2rem] border border-[#fde3b8] bg-[#fff8ec] p-5 shadow-[0_10px_30px_rgba(189,127,15,0.05)]">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fde3b8] text-[#ad6a08]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#ad6a08]">Verification Pending</h3>
                  <p className="mt-1 text-xs leading-5 text-[#925906]">
                    Our admin team is reviewing your profile details. Once verified, you will have full access to the dashboard, orders, and RFQs.
                  </p>
                </div>
              </div>
            </div>
          )}
          <section className="rounded-[1.2rem] border border-[#e2e8f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">Form</p>
                  <h2 className="mt-1 text-base font-semibold text-[#0f172a]">
                    {role === "supplier" ? "Supplier details" : "Buyer details"}
                  </h2>
                </div>
                <p className="max-w-xl text-xs leading-5 text-[#64748b]">
                  {role === "supplier"
                    ? "Only the fields needed for verification and order readiness."
                    : "Only the fields needed for procurement clarity and supplier communication."}
                </p>
              </div>

              {role === "supplier" ? (
                <form className="space-y-5" onSubmit={handleSupplierSave}>
                  <ProfileSection
                    title="Company Details"
                    caption="Basic business information."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField label="Company Name" value={supplierForm.companyName} onChange={(value) => setSupplierForm((prev) => ({ ...prev, companyName: value }))} placeholder="Meditech Surgical Pvt Ltd" disabled={!isNewProfile} />
                      <TextField label="Brand Name" value={supplierForm.brandName} onChange={(value) => setSupplierForm((prev) => ({ ...prev, brandName: value }))} placeholder="MediSure" disabled={!isNewProfile} />
                      <TextField label="GST Number" value={supplierForm.gstNumber} onChange={(value) => setSupplierForm((prev) => ({ ...prev, gstNumber: value }))} placeholder="27ABCDE1234F1Z5" disabled={!isNewProfile} />
                      <TextField label="Drug Or Trade License" value={supplierForm.licenseNumber} onChange={(value) => setSupplierForm((prev) => ({ ...prev, licenseNumber: value }))} placeholder="DL-2026-7788" disabled={!isNewProfile} />
                      <TextField label="Business Category" value={supplierForm.businessCategory} onChange={(value) => setSupplierForm((prev) => ({ ...prev, businessCategory: value }))} placeholder="Disposables, diagnostics, equipment" disabled={!isEditing} />
                      <TextField label="Years In Business" value={supplierForm.yearsInBusiness} onChange={(value) => setSupplierForm((prev) => ({ ...prev, yearsInBusiness: value }))} placeholder="8 years" disabled={!isEditing} />
                    </div>
                    <TextAreaField label="Registered Address" value={supplierForm.address} onChange={(value) => setSupplierForm((prev) => ({ ...prev, address: value }))} placeholder="Full office or warehouse address" disabled={!isEditing} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <TextField label="City" value={supplierForm.city} onChange={(value) => setSupplierForm((prev) => ({ ...prev, city: value }))} placeholder="Mumbai" disabled={!isEditing} />
                      <TextField label="State" value={supplierForm.state} onChange={(value) => setSupplierForm((prev) => ({ ...prev, state: value }))} placeholder="Maharashtra" disabled={!isEditing} />
                      <TextField label="Pincode" value={supplierForm.pincode} onChange={(value) => setSupplierForm((prev) => ({ ...prev, pincode: value }))} placeholder="400001" disabled={!isEditing} />
                    </div>
                  </ProfileSection>

                  <ProfileSection title="Primary Contact" caption="Primary contact details.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField label="Contact Person" value={supplierForm.contactName} onChange={(value) => setSupplierForm((prev) => ({ ...prev, contactName: value }))} placeholder="Aman Verma" disabled={!isEditing} />
                      <TextField label="Designation" value={supplierForm.designation} onChange={(value) => setSupplierForm((prev) => ({ ...prev, designation: value }))} placeholder="Sales Manager" disabled={!isEditing} />
                      <TextField label="Phone Number" value={supplierForm.phone} onChange={(value) => setSupplierForm((prev) => ({ ...prev, phone: value }))} placeholder="+91 98765 43210" disabled={!isEditing} />
                      <TextField label="Official Email" value={supplierForm.email} onChange={(value) => setSupplierForm((prev) => ({ ...prev, email: value }))} placeholder="sales@company.com" disabled={!isEditing} />
                    </div>
                  </ProfileSection>

                  <ProfileSection title="Supply Capacity" caption="Products and fulfilment details.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextAreaField label="Product Categories" value={supplierForm.productCategories} onChange={(value) => setSupplierForm((prev) => ({ ...prev, productCategories: value }))} placeholder="Syringes, gloves, test kits, ward consumables" disabled={!isEditing} />
                      <TextAreaField label="Supply Regions" value={supplierForm.supplyRegions} onChange={(value) => setSupplierForm((prev) => ({ ...prev, supplyRegions: value }))} placeholder="Delhi NCR, Punjab, Haryana" disabled={!isEditing} />
                      <TextField label="Minimum Order Value" value={supplierForm.minimumOrderValue} onChange={(value) => setSupplierForm((prev) => ({ ...prev, minimumOrderValue: value }))} placeholder="INR 25,000" disabled={!isEditing} />
                      <TextField label="Average Lead Time" value={supplierForm.averageLeadTime} onChange={(value) => setSupplierForm((prev) => ({ ...prev, averageLeadTime: value }))} placeholder="3-5 working days" disabled={!isEditing} />
                      <TextField label="Warehouse Capacity" value={supplierForm.warehouseCapacity} onChange={(value) => setSupplierForm((prev) => ({ ...prev, warehouseCapacity: value }))} placeholder="2000 sq ft cold + dry storage" disabled={!isEditing} />
                    </div>
                  </ProfileSection>

                  <FormMessage message={message} error={error} />
                  <div className="flex flex-wrap gap-3">
                    {isEditing ? (
                      <button type="submit" className="rounded-[0.9rem] bg-[#0f4fb6] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0b46a8]">
                        {loading ? "Saving..." : "Save Profile"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="rounded-[0.9rem] border border-[#dbe4ef] bg-white px-4 py-2.5 text-xs font-semibold text-[#0f4fb6] transition hover:bg-[#f8fafc]"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleBuyerSave}>
                  <ProfileSection
                    title="Organization Details"
                    caption="Basic organization information."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField label="Organization Name" value={buyerForm.organizationName} onChange={(value) => setBuyerForm((prev) => ({ ...prev, organizationName: value }))} placeholder="CityCare Hospital" disabled={!isNewProfile} />
                      <SelectField
                        label="Buyer Type"
                        value={buyerForm.buyerType}
                        onChange={(value) => setBuyerForm((prev) => ({ ...prev, buyerType: value }))}
                        disabled={!isNewProfile}
                        options={[
                          { label: "Select type", value: "" },
                          { label: "Hospital", value: "hospital" },
                          { label: "Pharmacy", value: "pharmacy" },
                          { label: "Clinic", value: "clinic" },
                          { label: "NGO", value: "ngo" },
                        ]}
                      />
                      <TextField label="Department" value={buyerForm.department} onChange={(value) => setBuyerForm((prev) => ({ ...prev, department: value }))} placeholder="Central Procurement" disabled={!isEditing} />
                      <TextField label="Institution Size" value={buyerForm.institutionSize} onChange={(value) => setBuyerForm((prev) => ({ ...prev, institutionSize: value }))} placeholder="250 beds or 12 branches" disabled={!isEditing} />
                      <TextField label="GST Number" value={buyerForm.gstNumber} onChange={(value) => setBuyerForm((prev) => ({ ...prev, gstNumber: value }))} placeholder="Optional for internal billing" disabled={!isNewProfile} />
                    </div>
                    <TextAreaField label="Registered Address" value={buyerForm.address} onChange={(value) => setBuyerForm((prev) => ({ ...prev, address: value }))} placeholder="Procurement office address" disabled={!isEditing} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <TextField label="City" value={buyerForm.city} onChange={(value) => setBuyerForm((prev) => ({ ...prev, city: value }))} placeholder="Lucknow" disabled={!isEditing} />
                      <TextField label="State" value={buyerForm.state} onChange={(value) => setBuyerForm((prev) => ({ ...prev, state: value }))} placeholder="Uttar Pradesh" disabled={!isEditing} />
                      <TextField label="Pincode" value={buyerForm.pincode} onChange={(value) => setBuyerForm((prev) => ({ ...prev, pincode: value }))} placeholder="226001" disabled={!isEditing} />
                    </div>
                  </ProfileSection>

                  <ProfileSection title="Procurement Contacts" caption="Primary contact information.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField label="Procurement Contact" value={buyerForm.procurementContactName} onChange={(value) => setBuyerForm((prev) => ({ ...prev, procurementContactName: value }))} placeholder="Neha Sharma" disabled={!isEditing} />
                      <TextField label="Designation" value={buyerForm.designation} onChange={(value) => setBuyerForm((prev) => ({ ...prev, designation: value }))} placeholder="Purchase Head" disabled={!isEditing} />
                      <TextField label="Phone Number" value={buyerForm.phone} onChange={(value) => setBuyerForm((prev) => ({ ...prev, phone: value }))} placeholder="+91 98111 22334" disabled={!isEditing} />
                      <TextField label="Official Email" value={buyerForm.email} onChange={(value) => setBuyerForm((prev) => ({ ...prev, email: value }))} placeholder="procurement@citycare.org" disabled={!isEditing} />
                    </div>
                  </ProfileSection>

                  <FormMessage message={message} error={error} />
                  <div className="flex flex-wrap gap-3">
                    {isEditing ? (
                      <button type="submit" className="rounded-[0.9rem] bg-[#0f4fb6] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0b46a8]">
                        {loading ? "Saving..." : "Save Profile"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="rounded-[0.9rem] border border-[#dbe4ef] bg-white px-4 py-2.5 text-xs font-semibold text-[#0f4fb6] transition hover:bg-[#f8fafc]"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </form>
              )}
          </section>
        </div>
      </main>
    </div>
  )
}

function ProfileSection({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[1rem] border border-[#edf2f7] bg-[#fbfcff] p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
        <p className="mt-1 text-[11px] leading-5 text-[#64748b]">{caption}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <label className={`grid gap-1.5 text-xs font-medium ${disabled ? "text-[#94a3b8]" : "text-[#334155]"}`}>
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`rounded-[0.85rem] border border-[#dbe4ef] bg-white px-3 py-2.5 text-xs text-[#0f172a] outline-none transition focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed`}
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <label className={`grid gap-1.5 text-xs font-medium ${disabled ? "text-[#94a3b8]" : "text-[#334155]"}`}>
      <span>{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`rounded-[0.85rem] border border-[#dbe4ef] bg-white px-3 py-2.5 text-xs text-[#0f172a] outline-none transition focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed`}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  disabled?: boolean
}) {
  return (
    <label className={`grid gap-1.5 text-xs font-medium ${disabled ? "text-[#94a3b8]" : "text-[#334155]"}`}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`rounded-[0.85rem] border border-[#dbe4ef] bg-white px-3 py-2.5 text-xs text-[#0f172a] outline-none transition focus:border-[#0f4fb6] focus:shadow-[0_0_0_3px_rgba(15,79,182,0.08)] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed`}
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function FormMessage({ message, error }: { message: string; error: string }) {
  if (!message && !error) return null

  return (
    <div
      className={`rounded-[0.9rem] border px-3 py-2.5 text-xs ${
        error
          ? "border-[#f7d5d5] bg-[#fff7f7] text-[#991b1b]"
          : "border-[#d9e8ff] bg-[#f8fbff] text-[#0f4fb6]"
      }`}
    >
      {error || message}
    </div>
  )
}
