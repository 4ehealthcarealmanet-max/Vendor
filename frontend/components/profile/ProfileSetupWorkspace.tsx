"use client"

import { FormEvent, ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import BuyerNavbar from "@/components/buyer/BuyerNavbar"
import BuyerFooter from "@/components/buyer/BuyerFooter"
import SupplierNavbar from "@/components/supplier/SupplierNavbar"
import SupplierFooter from "@/components/supplier/SupplierFooter"
import {
  clearToken,
  getCurrentUser,
  getUserProfile,
  isAuthSessionError,
  logoutUser,
  notifyUser,
  updateUserProfile,
} from "@/services"
import type { AuthUser } from "@/services"
import {
  Building2,
  User,
  ShieldCheck,
  Truck,
  MapPin,
  FileText,
  Lock,
  Clock,
  Sparkles,
  CheckCircle
} from "lucide-react"

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
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingSaveRole, setPendingSaveRole] = useState<"supplier" | "buyer" | null>(null)
  const [supplierForm, setSupplierForm] = useState<SupplierProfileForm>(defaultSupplierForm())
  const [buyerForm, setBuyerForm] = useState<BuyerProfileForm>(defaultBuyerForm())
  const [originalSupplierForm, setOriginalSupplierForm] = useState<SupplierProfileForm | null>(null)
  const [originalBuyerForm, setOriginalBuyerForm] = useState<BuyerProfileForm | null>(null)
  const [hasActiveSub, setHasActiveSub] = useState(true)
  const [activeTab, setActiveTab] = useState<"identity" | "contact" | "capacity" | "documents">("identity")

  const tabs = role === "supplier" ? [
    { id: "identity", label: "Business Identity", icon: Building2 },
    { id: "contact", label: "Primary Contact", icon: User },
    { id: "capacity", label: "Supply Capacity", icon: Truck },
    { id: "documents", label: "Verification Docs", icon: FileText }
  ] : [
    { id: "identity", label: "Organization Details", icon: Building2 },
    { id: "contact", label: "Procurement Contacts", icon: User },
    { id: "documents", label: "Onboarding Docs", icon: FileText }
  ]

  const isSupplierFormDirty = () => {
    if (!originalSupplierForm) return true
    return JSON.stringify(supplierForm) !== JSON.stringify(originalSupplierForm)
  }

  const isBuyerFormDirty = () => {
    if (!originalBuyerForm) return true
    return JSON.stringify(buyerForm) !== JSON.stringify(originalBuyerForm)
  }

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await getCurrentUser()

        if (me.role !== role) {
          router.replace(me.role === "supplier" ? "/supplier/profile" : "/buyer/profile")
          return
        }

        setUser(me)
        setHasActiveSub(me.has_active_subscription ?? true)

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
            setOriginalSupplierForm({
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
            const hasSupplierProfile = Boolean(profileData.company_name)
            setIsEditing(!hasSupplierProfile)
            setIsNewProfile(!hasSupplierProfile)
          } else {
            const bForm = {
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
            }
            setBuyerForm(bForm)
            setOriginalBuyerForm(bForm)
            const hasBuyerProfile = Boolean(profileData.organization_name)
            setIsEditing(!hasBuyerProfile)
            setIsNewProfile(!hasBuyerProfile)
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

    if (!isSupplierFormDirty()) {
      notifyUser({
        type: "info",
        title: "No Changes",
        message: "You haven't made any changes to your profile yet."
      })
      return
    }

    if (
      (!originalSupplierForm?.companyName && supplierForm.companyName) ||
      (!originalSupplierForm?.brandName && supplierForm.brandName) ||
      (!originalSupplierForm?.gstNumber && supplierForm.gstNumber) ||
      (!originalSupplierForm?.licenseNumber && supplierForm.licenseNumber)
    ) {
      setPendingSaveRole("supplier")
      setShowConfirmModal(true)
      return
    }

    executeSupplierSave()
  }

  const executeSupplierSave = async () => {
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
      const freshUser = await getCurrentUser()
      setUser(freshUser)
      setHasActiveSub(freshUser.has_active_subscription ?? true)
      setOriginalSupplierForm(supplierForm)

      const successTitle = freshUser.status === "approved" ? "Profile Updated" : "Profile Saved"
      const successMessage = freshUser.status === "approved"
        ? "Your changes have been saved successfully."
        : "Profile saved! Waiting for admin approval."

      setMessage(successMessage)
      notifyUser({
        type: "success",
        title: successTitle,
        message: successMessage
      })

      // Also save to localStorage as a fallback
      if (typeof window !== "undefined") {
        window.localStorage.setItem(supplierDraftKey, JSON.stringify(supplierForm))
      }

      if (!freshUser.has_active_subscription) {
        router.push("/supplier/subscription")
        return
      }
    } catch (saveError) {
      setError("Failed to save profile to database. Please check your connection.")
      notifyUser({
        type: "error",
        title: "Save Failed",
        message: "Could not save profile changes. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBuyerSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isBuyerFormDirty()) {
      notifyUser({
        type: "info",
        title: "No Changes",
        message: "You haven't made any changes to your profile yet."
      })
      return
    }

    if (
      (!originalBuyerForm?.organizationName && buyerForm.organizationName) ||
      (!originalBuyerForm?.buyerType && buyerForm.buyerType) ||
      (!originalBuyerForm?.gstNumber && buyerForm.gstNumber)
    ) {
      setPendingSaveRole("buyer")
      setShowConfirmModal(true)
      return
    }

    executeBuyerSave()
  }

  const executeBuyerSave = async () => {
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
      const freshUser = await getCurrentUser()
      setUser(freshUser)
      setHasActiveSub(freshUser.has_active_subscription ?? true)
      setOriginalBuyerForm(buyerForm)

      const successTitle = freshUser.status === "approved" ? "Profile Updated" : "Profile Saved"
      const successMessage = freshUser.status === "approved"
        ? "Your changes have been saved successfully."
        : "Profile saved! Waiting for admin approval."

      setMessage(successMessage)
      notifyUser({
        type: "success",
        title: successTitle,
        message: successMessage
      })

      // Also save to localStorage as a fallback
      if (typeof window !== "undefined") {
        window.localStorage.setItem(buyerDraftKey, JSON.stringify(buyerForm))
      }

      if (!freshUser.has_active_subscription) {
        router.push("/buyer/subscription")
        return
      }
    } catch (saveError) {
      setError("Failed to save profile to database. Please check your connection.")
      notifyUser({
        type: "error",
        title: "Save Failed",
        message: "Could not save profile changes. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a] flex flex-col">
        {role === "supplier" ? (
          <SupplierNavbar active="profile" />
        ) : (
          <BuyerNavbar active="profile" />
        )}
        <main className={`w-full py-8 md:py-12 ${role === "supplier" || role === "buyer" ? "mx-auto max-w-[1600px] px-6 md:px-8 pb-24" : ""} flex-1 flex flex-col justify-center items-center min-h-[50vh]`}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <div className="absolute h-3 w-3 rounded-full bg-blue-600 animate-ping" />
            </div>
            <span className="text-sm font-bold text-slate-500 tracking-tight">
              Loading profile settings...
            </span>
          </div>
        </main>
        {role === "buyer" ? <BuyerFooter /> : <SupplierFooter />}
      </div>
    )
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
    <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a] flex flex-col">
      {role === "supplier" ? (
        <SupplierNavbar active="profile" username={user.username} onSignOut={signOut} />
      ) : (
        <BuyerNavbar active="profile" username={user.username} buyerType={user.buyer_type} status={user.status} hasActiveSubscription={hasActiveSub} onSignOut={signOut} />
      )}

      <main className={`flex-1 px-4 py-6 pb-24 sm:px-6 lg:py-8 ${role === "supplier" || role === "buyer" ? "mx-auto max-w-[1600px] lg:px-8 w-full" : ""}`}>
        <div className="mx-auto max-w-5xl">
          {showConfirmModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
              <div className="w-[400px] rounded-[1.5rem] bg-white p-6 shadow-2xl animate-fade-in-up">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h3 className="mb-2 text-lg font-black text-slate-900 tracking-tight">Are you absolutely sure?</h3>
                <p className="mb-6 text-sm text-slate-600 leading-relaxed font-medium">
                  You are about to save core identity fields (like Organization Name, GST, etc.). <strong className="text-amber-700">Once saved, these fields cannot be edited later.</strong> Please ensure the information is 100% accurate.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowConfirmModal(false)
                      setPendingSaveRole(null)
                    }}
                    className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Review Again
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmModal(false)
                      if (pendingSaveRole === "supplier") executeSupplierSave()
                      else executeBuyerSave()
                    }}
                    className="rounded-xl bg-[#0f4fb6] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0b46a8] shadow-md transition-all active:scale-95"
                  >
                    Confirm & Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {user.status !== "approved" && (
            <div className="mb-6 rounded-[1.2rem] border border-[#fde3b8] bg-[#fff8ec] p-5 shadow-[0_10px_30px_rgba(189,127,15,0.05)]">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fde3b8] text-[#ad6a08]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
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

          {/* Modern Profile Header Hero Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-[#0f172a] shadow-sm mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
              {/* Profile Avatar & Info */}
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm shrink-0">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-slate-800">
                      {role === "supplier" 
                        ? (supplierForm.companyName || "Unnamed Business Profile") 
                        : (buyerForm.organizationName || "Unnamed Organization Profile")}
                    </h1>
                    {user.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-500 text-xs mt-1.5 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
                    <span>{role === "supplier" ? "Supplier Partner Account" : "Healthcare Procurement Account"}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>@{user.username}</span>
                  </p>

                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-3 text-xs text-slate-600">
                    {role === "supplier" ? (
                      <>
                        {supplierForm.businessCategory && (
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-400">Category:</span>
                            <span className="font-extrabold text-blue-600">{supplierForm.businessCategory}</span>
                          </div>
                        )}
                        {supplierForm.city && (
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="font-extrabold text-slate-700">{supplierForm.city}, {supplierForm.state}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {buyerForm.buyerType && (
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-400">Type:</span>
                            <span className="font-extrabold text-indigo-600 capitalize">{buyerForm.buyerType}</span>
                          </div>
                        )}
                        {buyerForm.city && (
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="font-extrabold text-slate-700">{buyerForm.city}, {buyerForm.state}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed Layout Container */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="space-y-3 lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm grid grid-cols-2 lg:flex lg:flex-col gap-2">
                {tabs.map((t) => {
                  const Icon = t.icon
                  const isActive = activeTab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center justify-center lg:justify-start gap-2 px-2.5 py-3 text-[11px] lg:text-xs font-black rounded-xl transition duration-200 cursor-pointer select-none text-center lg:text-left ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                          : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Verification Tip */}
              <div className="hidden lg:block bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl p-4 shadow-inner">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Verification Tip</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium mt-1">
                      Ensure your regulatory credentials (GSTIN / Drug License) match your uploaded certificates exactly to avoid delays in admin verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form Content Card */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
                <div className="border-b border-slate-100 pb-4 mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {activeTab === "identity" && "Core identification, registration & billing setup."}
                      {activeTab === "contact" && "Primary point of contact for customer enquiries."}
                      {activeTab === "capacity" && "Logistics, warehousing capacity, and lead times."}
                      {activeTab === "documents" && "Uploaded certificates for compliance auditing."}
                    </p>
                  </div>
                  {isEditing && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Editing Mode
                    </span>
                  )}
                </div>

                {role === "supplier" ? (
                  <form className="space-y-6" onSubmit={handleSupplierSave}>
                    {activeTab === "identity" && (
                      <div className="space-y-5 animate-fade-in">
                        <ProfileSection title="Company Details" caption="Basic business information.">
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Company Name" value={supplierForm.companyName} onChange={(value) => setSupplierForm((prev) => ({ ...prev, companyName: value }))} placeholder="Meditech Surgical Pvt Ltd" disabled={!isEditing || Boolean(originalSupplierForm?.companyName)} />
                            <TextField label="Brand Name" value={supplierForm.brandName} onChange={(value) => setSupplierForm((prev) => ({ ...prev, brandName: value }))} placeholder="MediSure" disabled={!isEditing || Boolean(originalSupplierForm?.brandName)} />
                            <TextField label="GST Number" value={supplierForm.gstNumber} onChange={(value) => setSupplierForm((prev) => ({ ...prev, gstNumber: value }))} placeholder="27ABCDE1234F1Z5" disabled={!isEditing || Boolean(originalSupplierForm?.gstNumber)} />
                            <TextField label="Drug Or Trade License" value={supplierForm.licenseNumber} onChange={(value) => setSupplierForm((prev) => ({ ...prev, licenseNumber: value }))} placeholder="DL-2026-7788" disabled={!isEditing || Boolean(originalSupplierForm?.licenseNumber)} />
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
                      </div>
                    )}

                    {activeTab === "contact" && (
                      <div className="space-y-5 animate-fade-in">
                        <ProfileSection title="Primary Contact" caption="Primary contact details.">
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Contact Person" value={supplierForm.contactName} onChange={(value) => setSupplierForm((prev) => ({ ...prev, contactName: value }))} placeholder="Aman Verma" disabled={!isEditing} />
                            <TextField label="Designation" value={supplierForm.designation} onChange={(value) => setSupplierForm((prev) => ({ ...prev, designation: value }))} placeholder="Sales Manager" disabled={!isEditing} />
                            <TextField label="Phone Number" value={supplierForm.phone} onChange={(value) => setSupplierForm((prev) => ({ ...prev, phone: value }))} placeholder="+91 98765 43210" disabled={!isEditing} />
                            <TextField label="Official Email" value={supplierForm.email} onChange={(value) => setSupplierForm((prev) => ({ ...prev, email: value }))} placeholder="sales@company.com" disabled={!isEditing} />
                          </div>
                        </ProfileSection>
                      </div>
                    )}

                    {activeTab === "capacity" && (
                      <div className="space-y-5 animate-fade-in">
                        <ProfileSection title="Supply Capacity" caption="Products and fulfilment details.">
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextAreaField label="Product Categories" value={supplierForm.productCategories} onChange={(value) => setSupplierForm((prev) => ({ ...prev, productCategories: value }))} placeholder="Syringes, gloves, test kits, ward consumables" disabled={!isEditing} />
                            <TextAreaField label="Supply Regions" value={supplierForm.supplyRegions} onChange={(value) => setSupplierForm((prev) => ({ ...prev, supplyRegions: value }))} placeholder="Delhi NCR, Punjab, Haryana" disabled={!isEditing} />
                            <TextField label="Minimum Order Value" value={supplierForm.minimumOrderValue} onChange={(value) => setSupplierForm((prev) => ({ ...prev, minimumOrderValue: value }))} placeholder="INR 25,000" disabled={!isEditing} />
                            <TextField label="Average Lead Time" value={supplierForm.averageLeadTime} onChange={(value) => setSupplierForm((prev) => ({ ...prev, averageLeadTime: value }))} placeholder="3-5 working days" disabled={!isEditing} />
                            <TextField label="Warehouse Capacity" value={supplierForm.warehouseCapacity} onChange={(value) => setSupplierForm((prev) => ({ ...prev, warehouseCapacity: value }))} placeholder="2000 sq ft cold + dry storage" disabled={!isEditing} />
                          </div>
                        </ProfileSection>
                      </div>
                    )}

                    {activeTab === "documents" && (
                      <div className="space-y-5 animate-fade-in">
                        <ProfileSection title="Compliance Documents" caption="Upload images of your certificates.">
                          <div className="grid gap-4 md:grid-cols-2">
                            <FileUploadField label="GST Certificate" value={supplierForm.gstDocument} onChange={(val) => setSupplierForm(prev => ({ ...prev, gstDocument: val }))} disabled={!isEditing} />
                            <FileUploadField label="Drug/Trade License" value={supplierForm.licenseDocument} onChange={(val) => setSupplierForm(prev => ({ ...prev, licenseDocument: val }))} disabled={!isEditing} />
                            <FileUploadField label="ISO Certificate (Optional)" value={supplierForm.isoCertificate} onChange={(val) => setSupplierForm(prev => ({ ...prev, isoCertificate: val }))} disabled={!isEditing} />
                          </div>
                        </ProfileSection>
                      </div>
                    )}

                    <FormMessage message={message} error={error} />
                    
                    <div className="border-t border-slate-100 pt-5 mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <p className="text-[10px] text-slate-400 font-bold max-w-sm text-center sm:text-left">
                        {isEditing 
                          ? "Identity fields cannot be changed once verified by our admin." 
                          : "Click 'Edit Profile' to modify contact, logistics, or document files."}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                        {isEditing ? (
                          <>
                            {!isNewProfile && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (originalSupplierForm) {
                                    setSupplierForm(originalSupplierForm)
                                  }
                                  setIsEditing(false)
                                  setMessage("")
                                  setError("")
                                }}
                                className="w-full sm:w-auto justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3 text-xs font-black text-slate-500 transition duration-200 active:scale-95 cursor-pointer flex items-center gap-2"
                              >
                                Cancel
                              </button>
                            )}
                            <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full sm:w-auto justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs font-black text-white shadow-md shadow-blue-500/10 transition duration-200 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {loading ? "Saving..." : "Save Profile"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMessage("")
                              setError("")
                              setIsEditing(true)
                            }}
                            className="w-full sm:w-auto justify-center rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-6 py-3 text-xs font-black text-blue-600 shadow-sm transition duration-200 active:scale-95 cursor-pointer flex items-center gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Edit Profile
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                ) : (
                  <form className="space-y-6" onSubmit={handleBuyerSave}>
                    {activeTab === "identity" && (
                      <div className="space-y-5 animate-fade-in">
                        <ProfileSection title="Organization Details" caption="Basic organization information.">
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Organization Name" value={buyerForm.organizationName} onChange={(value) => setBuyerForm((prev) => ({ ...prev, organizationName: value }))} placeholder="CityCare Hospital" disabled={!isEditing || Boolean(originalBuyerForm?.organizationName)} />
                            <SelectField
                              label="Buyer Type"
                              value={buyerForm.buyerType}
                              onChange={(value) => setBuyerForm((prev) => ({ ...prev, buyerType: value }))}
                              disabled={!isEditing || Boolean(originalBuyerForm?.buyerType)}
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
                            <TextField label="GST Number" value={buyerForm.gstNumber} onChange={(value) => setBuyerForm((prev) => ({ ...prev, gstNumber: value }))} placeholder="Optional for internal billing" disabled={!isEditing || Boolean(originalBuyerForm?.gstNumber)} />
                          </div>
                          <TextAreaField label="Registered Address" value={buyerForm.address} onChange={(value) => setBuyerForm((prev) => ({ ...prev, address: value }))} placeholder="Procurement office address" disabled={!isEditing} />
                          <div className="grid gap-4 md:grid-cols-3">
                            <TextField label="City" value={buyerForm.city} onChange={(value) => setBuyerForm((prev) => ({ ...prev, city: value }))} placeholder="Lucknow" disabled={!isEditing} />
                            <TextField label="State" value={buyerForm.state} onChange={(value) => setBuyerForm((prev) => ({ ...prev, state: value }))} placeholder="Uttar Pradesh" disabled={!isEditing} />
                            <TextField label="Pincode" value={buyerForm.pincode} onChange={(value) => setBuyerForm((prev) => ({ ...prev, pincode: value }))} placeholder="226001" disabled={!isEditing} />
                          </div>
                        </ProfileSection>
                      </div>
                    )}

                    {activeTab === "contact" && (
                      <div className="space-y-5 animate-fade-in">
                        <ProfileSection title="Procurement Contacts" caption="Primary contact information.">
                          <div className="grid gap-4 md:grid-cols-2">
                            <TextField label="Procurement Contact" value={buyerForm.procurementContactName} onChange={(value) => setBuyerForm((prev) => ({ ...prev, procurementContactName: value }))} placeholder="Neha Sharma" disabled={!isEditing} />
                            <TextField label="Designation" value={buyerForm.designation} onChange={(value) => setBuyerForm((prev) => ({ ...prev, designation: value }))} placeholder="Purchase Head" disabled={!isEditing} />
                            <TextField label="Phone Number" value={buyerForm.phone} onChange={(value) => setBuyerForm((prev) => ({ ...prev, phone: value }))} placeholder="+91 98111 22334" disabled={!isEditing} />
                            <TextField label="Official Email" value={buyerForm.email} onChange={(value) => setBuyerForm((prev) => ({ ...prev, email: value }))} placeholder="procurement@citycare.org" disabled={!isEditing} />
                          </div>
                        </ProfileSection>
                      </div>
                    )}

                    {activeTab === "documents" && (
                      <div className="space-y-5 animate-fade-in">
                        <ProfileSection title="Onboarding Documents" caption="Upload any initial required files for registration.">
                          <div className="grid gap-4 md:grid-cols-1">
                            <FileUploadField label="Authorization Document" value={buyerForm.onboardingDocuments} onChange={(val) => setBuyerForm(prev => ({ ...prev, onboardingDocuments: val }))} disabled={!isEditing} />
                          </div>
                        </ProfileSection>
                      </div>
                    )}

                    <FormMessage message={message} error={error} />
                    
                    <div className="border-t border-slate-100 pt-5 mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <p className="text-[10px] text-slate-400 font-bold max-w-sm text-center sm:text-left">
                        {isEditing 
                          ? "Core details like organization name and type are locked after submission." 
                          : "Click 'Edit Profile' to update procurement details."}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                        {isEditing ? (
                          <>
                            {!isNewProfile && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (originalBuyerForm) {
                                    setBuyerForm(originalBuyerForm)
                                  }
                                  setIsEditing(false)
                                  setMessage("")
                                  setError("")
                                }}
                                className="w-full sm:w-auto justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3 text-xs font-black text-slate-500 transition duration-200 active:scale-95 cursor-pointer flex items-center gap-2"
                              >
                                Cancel
                              </button>
                            )}
                            <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full sm:w-auto justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs font-black text-white shadow-md shadow-blue-500/10 transition duration-200 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {loading ? "Saving..." : "Save Profile"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMessage("")
                              setError("")
                              setIsEditing(true)
                            }}
                            className="w-full sm:w-auto justify-center rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-6 py-3 text-xs font-black text-blue-600 shadow-sm transition duration-200 active:scale-95 cursor-pointer flex items-center gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Edit Profile
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      {role === "buyer" ? <BuyerFooter /> : <SupplierFooter />}
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
    <section className="space-y-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h3>
        <p className="mt-1 text-[10px] text-slate-400 font-bold leading-normal">{caption}</p>
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
    <label className="block text-xs font-black text-slate-700 tracking-tight">
      <span className="block mb-2">{label}</span>
      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-850 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            disabled ? "pr-10" : ""
          }`}
        />
        {disabled && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
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
    <label className="block text-xs font-black text-slate-700 tracking-tight">
      <span className="block mb-2">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-850 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
    <label className="block text-xs font-black text-slate-700 tracking-tight">
      <span className="block mb-2">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-850 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            disabled ? "pr-10" : ""
          }`}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {disabled ? (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock className="h-3.5 w-3.5" />
          </div>
        ) : (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>
    </label>
  )
}

function FormMessage({ message, error }: { message: string; error: string }) {
  if (!message && !error) return null

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-xs font-bold ${error
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-blue-100 bg-blue-50/70 text-blue-700"
        }`}
    >
      {error || message}
    </div>
  )
}

function FileUploadField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64String = event.target?.result as string
      onChange(base64String)
    }
    reader.readAsDataURL(file)
  }

  return (
    <label className="block text-xs font-black text-slate-700 tracking-tight">
      <span className="block mb-2">{label}</span>
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl border border-dashed transition duration-200 ${
        disabled ? "bg-slate-50 border-slate-200" : "bg-white border-slate-300 hover:border-blue-500"
      }`}>
        <div className="relative flex-1">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            disabled={disabled}
            className="block w-full text-xs text-slate-500 file:mr-3.5 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 disabled:cursor-not-allowed"
          />
        </div>
        {value && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg self-start sm:self-auto">
            <CheckCircle className="h-3.5 w-3.5 animate-pulse" />
            Uploaded
          </span>
        )}
      </div>
    </label>
  )
}
