"use client"

import { useToast } from "../../hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"

/**
 * Renders whatever `toast(...)` (hooks/use-toast.ts) has queued. Mounted once,
 * in app/layout.tsx - without it every `toast()` call dispatched into a store
 * nobody drew.
 */
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right" label="Melding">
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
