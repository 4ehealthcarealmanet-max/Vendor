"use client"

import { Suspense } from "react"
import MessagesWorkspace from "@/components/messages/MessagesWorkspace"

export default function BuyerMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
      </div>
    }>
      <MessagesWorkspace userRole="buyer" />
    </Suspense>
  )
}
