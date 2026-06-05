"use client"

import { useEffect, useState } from "react"
import { AppNotification, AppNotificationType } from "@/services/utils/notificationService"

export default function NotificationToast() {
  const [notifications, setNotifications] = useState<(AppNotification & { id: number })[]>([])

  useEffect(() => {
    const handleNotification = (event: any) => {
      const detail = event.detail as AppNotification
      const id = Date.now()
      
      setNotifications((prev) => [...prev, { ...detail, id }])

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, 5000)
    }

    window.addEventListener("app:notification", handleNotification)
    return () => window.removeEventListener("app:notification", handleNotification)
  }, [])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-8 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-4 pointer-events-none w-full max-w-md px-4">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto flex w-full animate-pop-in items-start gap-5 rounded-[1.5rem] border p-5 shadow-[0_25px_60px_rgba(15,23,42,0.15)] backdrop-blur-xl transition-all duration-500 ${
            n.type === "success"
              ? "border-emerald-200 bg-white/95 text-emerald-900"
              : n.type === "error"
              ? "border-rose-200 bg-white/95 text-rose-900"
              : "border-blue-200 bg-white/95 text-blue-900"
          }`}
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm animate-float ${
            n.type === "success" ? "bg-emerald-100 text-emerald-600" :
            n.type === "error" ? "bg-rose-100 text-rose-600" :
            "bg-blue-100 text-blue-600"
          }`}>
            {n.type === "success" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : n.type === "error" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            )}
          </div>
          <div className="flex-1 pt-1">
            {n.title && <p className="text-base font-black tracking-tight">{n.title}</p>}
            <p className={`text-sm font-semibold leading-relaxed ${n.title ? "mt-1 opacity-70" : ""}`}>
              {n.message}
            </p>
          </div>
          <button
            onClick={() => setNotifications((prev) => prev.filter((toast) => toast.id !== n.id))}
            className="rounded-xl p-2 transition hover:bg-black/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
    </div>
  )
}
