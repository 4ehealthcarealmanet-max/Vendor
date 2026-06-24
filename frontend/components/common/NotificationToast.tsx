"use client"

import { useEffect, useState, useRef } from "react"
import { AppNotification, AppNotificationType, notifyUser, getNotifications, markAllNotificationsRead, clearAllNotifications } from "@/services/utils/notificationService"
import { getRfqs, getOrders, getToken, getCurrentUser } from "@/services"
import { useRouter } from "next/navigation"
import { Bell, Check, Trash2, ExternalLink, Info, CheckCircle, AlertCircle, X } from "lucide-react"

interface AppDetailedNotification {
  id: number
  type: AppNotificationType
  title: string
  message: string
  details?: string
  url?: string
  isRead: boolean
  timestamp: string
}

export default function NotificationToast() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppDetailedNotification[]>([])
  const [toasts, setToasts] = useState<AppDetailedNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Sync unread count to headers/navbars
  useEffect(() => {
    const count = notifications.filter((n) => !n.isRead).length
    window.dispatchEvent(new CustomEvent("app:notifications-updated", { detail: { unreadCount: count } }))
  }, [notifications])

  // Listen for toggle notifications event from headers
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    window.addEventListener("app:toggle-notifications", handleToggle)
    return () => window.removeEventListener("app:toggle-notifications", handleToggle)
  }, [])

  // Click outside to close notification drawer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Poll backend notifications, then update UI
  useEffect(() => {
    if (typeof window === "undefined") return

    let lastNotifications: AppDetailedNotification[] = []
    let initialized = false

    const poll = async () => {
      if (!getToken()) {
        lastNotifications = []
        setNotifications([])
        initialized = false
        return
      }

      try {
        const fetched = await getNotifications()

        // Map backend notification to frontend representation
        const mapped: AppDetailedNotification[] = fetched.map((notif: any) => ({
          id: notif.id || Date.now(),
          type: notif.type || "info",
          title: notif.title || "Notification",
          message: notif.message,
          details: notif.details,
          url: notif.url,
          isRead: notif.is_read || false,
          timestamp: notif.created_at
            ? new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }))

        if (!initialized) {
          lastNotifications = mapped
          setNotifications(mapped)
          initialized = true
          return
        }

        // Compare to find new notifications
        for (const notif of mapped) {
          const exists = lastNotifications.some((n) => n.id === notif.id)
          if (!exists) {
            // New notification! Add to active toasts
            setToasts((prev) => [...prev, notif])
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== notif.id))
            }, 8000)
          }
        }

        setNotifications(mapped)
        lastNotifications = mapped
      } catch (error) {
        // Silence errors during background refreshes
      }
    }

    poll()
    const timer = setInterval(poll, 5000)

    // Listen for dispatched browser notifications (local notifications if any)
    const handleNotification = (event: any) => {
      const detail = event.detail as AppNotification
      const id = Date.now()
      const newNotif: AppDetailedNotification = {
        id,
        type: detail.type || "info",
        title: detail.title || "Notification",
        message: detail.message,
        details: (detail as any).details,
        url: (detail as any).url,
        isRead: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setToasts((prev) => [...prev, newNotif])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 8000)
    }

    window.addEventListener("app:notification", handleNotification)

    return () => {
      clearInterval(timer)
      window.removeEventListener("app:notification", handleNotification)
    }
  }, [])

  // Helper actions
  const markAsRead = (id: number) => {
    setNotifications((prev) => {
      return prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    })
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setToasts([])
    } catch (e) {
      // safe fallback if not authenticated
    }
  }

  const clearAll = async () => {
    try {
      await clearAllNotifications()
      setNotifications([])
      setToasts([])
    } catch (e) {
      // safe fallback if not authenticated
    }
  }

  const handleNotificationClick = (n: AppDetailedNotification) => {
    markAsRead(n.id)
    setIsOpen(false)
    if (n.url) {
      router.push(n.url)
    }
  }

  return (
    <>
      {/* 1. Temporary Slide-in Toast Alerts (Top Center) */}
      <div className="fixed top-8 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-3 pointer-events-none w-full max-w-md px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => handleNotificationClick(t)}
            className={`pointer-events-auto flex w-full animate-pop-in items-start gap-4 rounded-2xl border p-4 shadow-[0_20px_50px_rgba(15,23,42,0.15)] bg-white/95 backdrop-blur-md cursor-pointer transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_25px_60px_rgba(15,23,42,0.2)] ${
              t.type === "success" ? "border-emerald-250" : t.type === "error" ? "border-rose-250" : "border-blue-250"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
              t.type === "success" ? "bg-emerald-50 text-emerald-600" :
              t.type === "error" ? "bg-rose-50 text-rose-600" :
              "bg-blue-50 text-blue-600"
            }`}>
              {t.type === "success" ? <CheckCircle className="h-5 w-5" /> : t.type === "error" ? <AlertCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                <p className="text-xs font-black text-slate-800 tracking-tight truncate">{t.title}</p>
              </div>
              <p className="text-xs font-bold text-slate-605 leading-snug mt-0.5">{t.message}</p>
              {t.details && (
                <div className="mt-1.5 rounded-lg bg-slate-50 border border-slate-100 p-1.5 text-[9px] font-semibold text-slate-500 leading-normal">
                  {t.details}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setToasts((prev) => prev.filter((item) => item.id !== t.id))
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 2. Global Drawer Container (Aligned Top Right) */}
      {getToken() && isOpen && (
        <div ref={drawerRef} className="fixed top-[76px] right-6 md:right-8 z-[99] w-[420px] max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_70px_rgba(15,23,42,0.22)] flex flex-col max-h-[500px] animate-fade-in-up">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-slate-900 flex items-center gap-2">
                Alert Center
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                  {notifications.length} Total
                </span>
              </h3>
            </div>
            
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 uppercase tracking-wider transition hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="text-slate-400 hover:text-rose-600 transition p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  title="Clear All Notifications"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Drawer List */}
          <div className="flex-1 overflow-y-auto min-h-[250px] py-2 pr-1 space-y-2 mt-2 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-3 shadow-inner">
                  <Bell className="h-6 w-6 opacity-60" />
                </div>
                <p className="text-xs font-bold text-slate-800">Your Alert Center is empty</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  You will receive real-time updates when bids are submitted, awarded, or new RFQs launch.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 transition duration-200 cursor-pointer hover:bg-slate-50 ${
                    n.isRead 
                      ? "border-slate-100 bg-white" 
                      : "border-blue-50 bg-blue-50/15"
                  }`}
                >
                  {/* Left icon wrapper */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    n.type === "success" ? "bg-emerald-50 text-emerald-600" :
                    n.type === "error" ? "bg-rose-50 text-rose-600" :
                    "bg-blue-50 text-blue-600"
                  }`}>
                    {n.type === "success" ? <CheckCircle className="h-4.5 w-4.5" /> : n.type === "error" ? <AlertCircle className="h-4.5 w-4.5" /> : <Info className="h-4.5 w-4.5" />}
                  </div>

                  {/* Content block */}
                  <div className="flex-1 min-w-0 text-left pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                        <p className={`text-xs font-extrabold truncate ${n.isRead ? "text-slate-700" : "text-slate-900"}`}>
                          {n.title}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0">{n.timestamp}</span>
                    </div>
                    
                    <p className={`text-[11px] font-semibold leading-relaxed mt-0.5 ${n.isRead ? "text-slate-500" : "text-slate-750"}`}>
                      {n.message}
                    </p>

                    {n.details && (
                      <div className="mt-1.5 rounded-lg bg-slate-50 border border-slate-100 p-2 text-[9px] font-semibold text-slate-500 leading-normal">
                        {n.details}
                      </div>
                    )}
                  </div>

                  {/* Action column */}
                  <div className="flex flex-col items-center justify-center shrink-0 self-center pl-1">
                    {n.url ? (
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600 transition" />
                    ) : (
                      !n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(n.id)
                          }}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded-md cursor-pointer"
                          title="Mark Read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
