"use client"

import { Suspense } from "react"
import MessagesWorkspace from "@/components/messages/MessagesWorkspace"

export default function SupplierMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
      </div>
    }>
      <MessagesWorkspace userRole="supplier" />
    </Suspense>
  )
}
