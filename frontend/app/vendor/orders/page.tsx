"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import BuyerSidebar from "@/components/buyer/BuyerSidebar"
import SupplierSidebar from "@/components/supplier/SupplierSidebar"
import { clearToken, getCurrentUser, isAuthSessionError, logoutUser } from "@/services/authService"
import { createOrder, getApiErrorMessage, getOrders, getProducts } from "@/services/vendorService"
import { VendorOrder, VendorOrderInput, VendorProductService } from "@/types/vendor"

export default function OrderPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [products, setProducts] = useState<VendorProductService[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItemName, setSelectedItemName] = useState("")
  const [selectedProductId, setSelectedProductId] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [username, setUsername] = useState<string>("")
  const [userRole, setUserRole] = useState<"supplier" | "buyer" | "">("")
  const [buyerType, setBuyerType] = useState<string>("")
  const [feedback, setFeedback] = useState<string>("")

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await getCurrentUser()
        if (pathname?.startsWith("/buyer") && me.role === "supplier") {
          router.replace("/supplier/orders")
          return
        }
        if (pathname?.startsWith("/supplier") && me.role === "buyer") {
          router.replace("/buyer/orders")
          return
        }
        setUsername(me.username)
        setUserRole(me.role)
        setBuyerType(me.buyer_type || "")
        const [productList, orderList] = await Promise.all([getProducts(), getOrders()])
        setProducts(productList)
        setOrders(orderList)
      } catch (error) {
        if (isAuthSessionError(error)) {
          clearToken()
          setFeedback("You are not authenticated. Redirecting to login...")
          router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login")
          return
        }

        setFeedback("Could not load orders right now. Check the backend API and try again.")
      }
    }
    loadData()
  }, [pathname, router])

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId),
    [products, selectedProductId]
  )

  const buyableProducts = useMemo(
    () => products.filter((item) => item.is_active && item.stock > 0),
    [products]
  )

  const estimatedTotal = useMemo(() => {
    if (!selectedProduct) return 0
    return Number(selectedProduct.price) * quantity
  }, [selectedProduct, quantity])

  const matchingProductNames = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) return []
    const names = buyableProducts
      .map((item) => item.name.trim())
      .filter((name) => name.toLowerCase().includes(normalizedSearch))
    return Array.from(new Set(names))
  }, [buyableProducts, searchTerm])

  const sellerOptions = useMemo(() => {
    if (!selectedItemName) return []
    return buyableProducts
      .filter((item) => item.name.trim().toLowerCase() === selectedItemName.trim().toLowerCase())
      .sort((a, b) => Number(a.price) - Number(b.price))
  }, [buyableProducts, selectedItemName])

  const placeOrder = async () => {
    if (!selectedProduct) {
      setFeedback("Select seller listing before placing an order.")
      return
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setFeedback("Quantity must be a whole number greater than 0.")
      return
    }

    if (selectedProduct.stock < quantity) {
      setFeedback("Requested quantity is greater than available stock.")
      return
    }

    const payload: VendorOrderInput = {
      vendor: selectedProduct.vendor,
      total_amount: estimatedTotal,
      items: [
        {
          product: selectedProduct.id,
          quantity,
          price: Number(selectedProduct.price),
        },
      ],
    }

    try {
      setSubmitting(true)
      setFeedback("")
      const createdOrder = await createOrder(payload)
      setOrders((prev) => [createdOrder, ...prev])
      setQuantity(1)
      setSearchTerm("")
      setSelectedItemName("")
      setSelectedProductId(0)
      setFeedback(`Order #${createdOrder.id} placed. Status: ${createdOrder.status}.`)
    } catch (error) {
      setFeedback(
        getApiErrorMessage(error, "Could not place the order. Verify the backend order API is running and accepts nested items.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const signOut = async () => {
    try {
      await logoutUser()
    } finally {
      clearToken()
      router.push("/login")
    }
  }

  const isBuyerRoute = pathname?.startsWith("/buyer") || userRole === "buyer"
  const isSupplierRoute = pathname?.startsWith("/supplier") || userRole === "supplier"

  return (
    <>
      {isBuyerRoute ? (
        <BuyerSidebar
          active="orders"
          username={username}
          buyerType={buyerType || null}
          onSignOut={signOut}
        />
      ) : isSupplierRoute ? (
        <SupplierSidebar
          active="orders"
          username={username}
          onSignOut={signOut}
        />
      ) : null}
      <main className={`px-4 py-8 md:px-6 md:py-12 ${(isBuyerRoute || isSupplierRoute) ? "pb-24 lg:pl-[calc(18rem+2.5rem)]" : ""}`}>
      <div className="health-container space-y-6">
        <header className="glass-card rounded-[22px] p-6 md:p-8">
          <p className="text-xs font-semibold tracking-[0.1em] text-[var(--brand)] uppercase">
            Vendor Module
          </p>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Order Management and Tracking</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)] md:text-base">
            This page keeps the previous B2C buy-now flow for direct procurement orders and lifecycle
            tracking. For institutional tendering and quotation comparison, use the B2B RFQ workspace.
          </p>
          <p className="mt-3 text-sm text-[#2f5660]">Signed in as: {username || "..."}</p>
          <p className="text-sm text-[#2f5660]">Role: {userRole || "..."}</p>
          {userRole === "buyer" && buyerType ? (
            <p className="text-sm text-[#2f5660]">Buyer Type: {buyerType}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={userRole === "buyer" ? "/buyer/products" : "/supplier/products"}
              className="rounded-xl border border-[#9dcdd0] bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-strong)] transition hover:bg-[#f3fcfd]"
            >
              Back to Marketplace
            </Link>
            <Link
              href={userRole === "buyer" ? "/buyer/rfq" : "/supplier/rfq"}
              className="rounded-xl border border-[#cbd9f0] bg-white px-4 py-3 text-sm font-semibold text-[#33556b] transition hover:bg-[#f5f9ff]"
            >
              B2B RFQ Workspace
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-[#d3e4e7] bg-white px-4 py-3 text-sm font-semibold text-[#3a616b] transition hover:bg-[#f3fbfc]"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          {userRole === "buyer" ? (
            <article className="soft-panel rounded-[20px] p-5">
              <h2 className="text-2xl font-extrabold">B2C Buy Now</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Search item, compare seller offers, select quantity, then place order. This is the
                previous B2C instant-buy path; use RFQ for tender-based B2B procurement.
              </p>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-[#2f5560]">1. Search Product or Service</span>
                  <input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value)
                      setSelectedItemName("")
                      setSelectedProductId(0)
                    }}
                    placeholder="e.g. BP Machine"
                    className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--brand)]"
                  />
                </label>

                {matchingProductNames.length > 0 ? (
                  <div className="rounded-xl border border-[#d8e8f6] bg-[#f8fbff] p-4">
                    <p className="text-sm font-semibold text-[#2f5560]">2. Matching Items</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {matchingProductNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedItemName(name)
                            setSelectedProductId(0)
                            setFeedback("")
                          }}
                          className={`rounded-full border px-3 py-1 text-sm ${
                            selectedItemName === name
                              ? "border-[#3b82f6] bg-[#eaf1ff] text-[#1d4ed8] shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
                              : "border-[#cde2e5] bg-white text-[#355860] hover:border-[#9fc6ff]"
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedItemName ? (
                  <div className="rounded-xl border border-[#d8e8f6] bg-[#f8fbff] p-4">
                    <p className="text-sm font-semibold text-[#2f5560]">3. Available Sellers for {selectedItemName}</p>
                    {sellerOptions.length === 0 ? (
                      <p className="mt-2 text-sm text-[#4c6c75]">No seller currently has this item.</p>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        {sellerOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductId(option.id)
                              setFeedback("")
                            }}
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                              selectedProductId === option.id
                                ? "border-[#3b82f6] bg-[#eaf1ff] shadow-[0_6px_18px_rgba(59,130,246,0.18)]"
                                : "border-[#d0e0e8] bg-white hover:border-[#9fc6ff]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-semibold text-[#1f4b56]">
                                {option.vendor_company_name || option.vendor_username || `Vendor ${option.vendor}`}
                              </p>
                              {selectedProductId === option.id ? (
                                <span className="rounded-full bg-[#1d4ed8] px-2 py-1 text-xs font-semibold text-white">
                                  Selected
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-[#4c6c75]">
                              <span className="rounded-full bg-[#edf4ff] px-2 py-1 text-xs font-semibold text-[#1d4ed8]">
                                INR {Number(option.price).toLocaleString()}
                              </span>
                              <span className="rounded-full bg-[#e8fbf1] px-2 py-1 text-xs font-semibold text-[#0a7c57]">
                                Stock {option.stock}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-[#2f5560]">4. Quantity</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className="rounded-xl border border-[#cde2e5] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--brand)]"
                  />
                  {selectedProduct ? (
                    <span className="text-xs text-[var(--text-muted)]">Available stock: {selectedProduct.stock}</span>
                  ) : null}
                </label>

                <div className="rounded-xl border border-[#dbe8ff] bg-[linear-gradient(180deg,#f8fbff_0%,#f1f7ff_100%)] p-4 text-sm">
                  <p className="text-[#4c6c75]">
                    Selected Seller:{" "}
                    <span className="font-semibold text-[#1f4b56]">
                      {selectedProduct
                        ? selectedProduct.vendor_company_name ||
                          selectedProduct.vendor_username ||
                          `Vendor ${selectedProduct.vendor}`
                        : "-"}
                    </span>
                  </p>
                  <p className="mt-1 text-[#4c6c75]">
                    Unit Price:{" "}
                    <span className="font-semibold text-[#1f4b56]">
                      INR {selectedProduct ? Number(selectedProduct.price).toLocaleString() : "-"}
                    </span>
                  </p>
                  <p className="mt-2 text-base text-[#2c4f59]">
                    Estimated Total:{" "}
                    <span className="font-extrabold text-[#1d4ed8]">
                      INR {estimatedTotal.toLocaleString()}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={submitting || !selectedProduct}
                  className="rounded-2xl bg-[linear-gradient(90deg,#4f8df4_0%,#2f6fdf_100%)] px-4 py-3 text-base font-bold text-white shadow-[0_10px_24px_rgba(47,111,223,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Placing order..." : "Buy Now"}
                </button>
              </div>

              {feedback ? (
                <p className="mt-3 rounded-lg border border-[#d9e8ea] bg-[#f8fdff] px-3 py-2 text-sm text-[#355860]">
                  {feedback}
                </p>
              ) : null}
            </article>
          ) : (
            <article className="soft-panel rounded-[20px] p-5">
              <h2 className="text-xl font-bold">Supplier View</h2>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Suppliers cannot place orders. This page shows incoming buyer orders for your listings.
              </p>
            </article>
          )}

        </section>

        <section className="soft-panel rounded-[20px] p-5">
          <h2 className="text-xl font-bold">{userRole === "supplier" ? "Incoming Buyer Orders" : "My Orders"}</h2>
          {orders.length === 0 ? (
            <p className="mt-3 rounded-lg border border-[#d8ecee] bg-[#fbfeff] px-3 py-4 text-sm text-[#4d6972]">
              No orders returned from API yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-[#d9e9eb] text-left text-[#4a6872]">
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Vendor</th>
                    <th className="px-2 py-2">Buyer</th>
                    {userRole === "supplier" ? <th className="px-2 py-2">Buyer Type</th> : null}
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-[#edf5f6]">
                      <td className="px-2 py-2 font-semibold">#{order.id}</td>
                      <td className="px-2 py-2">{order.vendor}</td>
                      <td className="px-2 py-2">{order.buyer}</td>
                      {userRole === "supplier" ? (
                        <td className="px-2 py-2 capitalize">{order.buyer_type || "-"}</td>
                      ) : null}
                      <td className="px-2 py-2">INR {Number(order.total_amount).toLocaleString()}</td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-[#e7f8f7] px-2 py-1 text-xs font-semibold text-[#0a6d72] capitalize">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      </main>
    </>
  )
}
