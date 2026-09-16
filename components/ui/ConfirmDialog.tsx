"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

interface ConfirmDialogProps {
  open: boolean
  /** Called when the dialog asks to close (Annuleren, Escape, backdrop). Ignored while pending. */
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Label on the confirm button while the action runs. */
  pendingLabel?: string
  pending?: boolean
  destructive?: boolean
  /** Extra content between the description and the buttons, e.g. confirmation fields. */
  children?: React.ReactNode
  /** Keeps the confirm button disabled, e.g. until a typed confirmation matches. */
  confirmDisabled?: boolean
}

/**
 * In-app replacement for window.confirm().
 *
 * Built on the Radix dialog primitives (like components/ui/dialog.tsx) so focus
 * is trapped, Escape and a backdrop click close it, the page behind does not
 * scroll and assistive tech is told it is modal. Focus lands on Annuleren, so
 * an accidental Enter never confirms a destructive action. While `pending`
 * the dialog cannot be dismissed and both buttons are disabled.
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Bevestigen",
  cancelLabel = "Annuleren",
  pendingLabel,
  pending = false,
  destructive = false,
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={next => { if (!next && !pending) onCancel() }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          role="alertdialog"
          aria-modal="true"
          onOpenAutoFocus={e => { e.preventDefault(); cancelRef.current?.focus() }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="text-[16px] font-semibold text-ink">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}

          {children ? <div className="mt-4">{children}</div> : null}

          <div className="mt-6 flex justify-end gap-2 max-sm:flex-col-reverse">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-btn border border-line px-4 py-2 text-[13.5px] font-semibold text-ink-body transition-colors hover:bg-line-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 disabled:opacity-40 max-md:min-h-11"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => { void onConfirm() }}
              disabled={pending || confirmDisabled}
              aria-busy={pending}
              className={[
                "inline-flex items-center justify-center rounded-btn px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 max-md:min-h-11",
                destructive ? "bg-danger focus-visible:ring-danger" : "focus-visible:ring-[#0D9488]",
              ].join(" ")}
              style={destructive ? undefined : { backgroundColor: "#0D9488" }}
            >
              {pending && pendingLabel ? pendingLabel : confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default ConfirmDialog
