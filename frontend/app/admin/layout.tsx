"use client"

import { Suspense } from "react"
import AdminSidebar from "@/components/admin/AdminSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#f7f9fb]">
      <Suspense fallback={<div className="w-72 bg-white border-r border-[#e5e9f0]" />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 pl-72">
        {children}
      </div>
    </div>
  )
}
