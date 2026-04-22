export type SupplierNotificationType = "success" | "error" | "info" | "warning"

export type SupplierNotification = {
  type?: SupplierNotificationType
  title?: string
  message: string
}

export const notifySupplier = ({ type = "info", title, message }: SupplierNotification) => {
  if (typeof window === "undefined" || !message.trim()) return

  window.dispatchEvent(
    new CustomEvent<SupplierNotification>("supplier:notification", {
      detail: { type, title, message },
    })
  )
}
