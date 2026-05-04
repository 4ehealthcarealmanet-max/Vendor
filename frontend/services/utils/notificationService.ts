export type AppNotificationType = "success" | "error" | "info" | "warning"

export type AppNotification = {
  type?: AppNotificationType
  title?: string
  message: string
}

export const notifyUser = ({ type = "info", title, message }: AppNotification) => {
  if (typeof window === "undefined" || !message.trim()) return

  window.dispatchEvent(
    new CustomEvent<AppNotification>("app:notification", {
      detail: { type, title, message },
    })
  )
}
