"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

/**
 * Shell for the group modals.
 *
 * The previous modals were plain `fixed inset-0 z-50` divs rendered inside
 * <main>. The app header is `sticky top-0 z-50` (components/layout/header.tsx),
 * so the overlay and the header sat at the same z-index in sibling stacking
 * contexts, and the header - promoted to its own compositing layer by the
 * sticky+z-index combination - was never part of the overlay's backdrop root.
 * The result was the beam the user reported: the black tint reached the top of
 * the page, but `backdrop-filter: blur()` never sampled the header, so that
 * strip stayed sharp while everything below it blurred.
 *
 * Portalling to <body> makes the overlay a body-level sibling painted after the
 * whole app tree, which puts the header unambiguously inside the backdrop root;
 * the explicit z-[100] removes the tie with the header on top of that. Radix
 * also brings the things a hand-rolled overlay was missing: focus trap, Escape,
 * scroll lock, `aria-modal` and a labelled dialog.
 *
 * The panel wears the app shell's own surface (`rounded-card border-line
 * bg-surface`, ink type) so it matches the cards on the page behind it.
 */
export function GroupDialog({
  open,
  onOpenChange,
  title,
  description,
  className = "max-w-md",
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2
            rounded-card border border-line bg-surface p-6 shadow-2xl focus:outline-none
            max-md:max-h-[calc(100dvh-2rem)] max-md:overflow-y-auto max-md:p-5
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
            motion-reduce:animate-none ${className}`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="max-md:min-w-0">
              <DialogPrimitive.Title className="text-lg font-bold text-ink">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="rounded-md p-1 max-md:-m-2 max-md:flex max-md:h-10 max-md:w-10 max-md:shrink-0 max-md:items-center max-md:justify-center text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              aria-label="Sluiten"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default GroupDialog
