"use client"

import AdminSidebar from "@/components/admin/AdminSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#f7f9fb]">
      <AdminSidebar />
      <div className="flex-1 pl-72">
        {children}
      </div>
    </div>
  )
}
