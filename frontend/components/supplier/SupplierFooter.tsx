"use client"

import React from "react"
import Link from "next/link"

export default function SupplierFooter() {
  return (
    <footer className="w-full border-t border-slate-100 bg-white mt-auto">
      <div className="mx-auto max-w-[1600px] w-full px-6 py-12 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 pb-8 border-b border-slate-100">
          {/* Brand block */}
          <div className="flex flex-col items-start space-y-3 text-left">
            <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-slate-900">
              Pathya<span className="text-blue-600">Tech</span>
            </span>
            <p className="max-w-xs text-xs leading-relaxed text-slate-500 font-medium">
              Standardizing clinical sourcing, supplier quotation analytics, and purchase order tracking in a single, high-fidelity workspace.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-start space-y-4 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Workspace Pages
            </h3>
            <ul className="flex flex-col space-y-2.5">
              {[
                { href: "/supplier/dashboard", label: "Dashboard Hub" },
                { href: "/supplier/products", label: "My Products" },
                { href: "/supplier/rfq", label: "RFQs Desk" },
                { href: "/supplier/orders", label: "My Orders" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account & Subscriptions */}
          <div className="flex flex-col items-start space-y-4 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Account & Pricing
            </h3>
            <ul className="flex flex-col space-y-2.5">
              {[
                { href: "/supplier/profile", label: "Profile Settings" },
                { href: "/supplier/subscription", label: "Membership Plans" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="flex flex-col items-start space-y-4 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Trust & Support
            </h3>
            <ul className="flex flex-col space-y-2.5">
              {[
                { href: "mailto:support@pathyatech.com?subject=Supplier%20Support", label: "Help Desk Support" },
                { href: "mailto:legal@pathyatech.com?subject=Privacy%20Policy", label: "Privacy Policy" },
                { href: "mailto:legal@pathyatech.com?subject=Terms%20of%20Service", label: "Terms of Service" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs font-semibold text-slate-400">
            © 2026 PathyaTech Procurement Platform. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {/* LinkedIn */}
            <Link
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-slate-400 transition hover:scale-105 hover:text-[#0A66C2]"
            >
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </Link>

            {/* X / Twitter */}
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X / Twitter"
              className="text-slate-400 transition hover:scale-105 hover:text-[#0F1419]"
            >
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>

            {/* Facebook */}
            <Link
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-slate-400 transition hover:scale-105 hover:text-[#1877F2]"
            >
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
              </svg>
            </Link>

            {/* Instagram */}
            <Link
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-slate-400 transition hover:scale-105 hover:text-[#E1306C]"
            >
              <svg
                className="h-4.5 w-4.5 fill-none stroke-current"
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
      </div>
    </footer>
  )
}
