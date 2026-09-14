"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  // Top of the screen below md, bottom-right from md up. The breakpoint is md,
  // not shadcn's sm: below md the app shows the MobileTabBar and the
  // AppPromoBanner along the bottom edge, and a toast there would sit on them.
  // `pointer-events-none` so the empty padding strip never swallows a tap on
  // the header under it; each toast turns pointer events back on.
  <ToastPrimitives.Viewport
    ref={ref}
    label="Meldingen ({hotkey})"
    className={cn(
      "pointer-events-none fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 pt-[max(1rem,env(safe-area-inset-top))] md:bottom-0 md:right-0 md:top-auto md:max-w-[420px] md:flex-col md:pt-4",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// No tailwindcss-animate in this project, so the shadcn `animate-in` /
// `slide-in-from-*` classes resolved to nothing; `animate-slide-up` is the
// app's own entrance (tailwind.config.ts).
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border p-4 pr-9 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-slide-up",
  {
    variants: {
      variant: {
        // Surface and ink tokens flip with `.dark` (app/globals.css).
        default: "border-line bg-surface text-ink",
        // A tinted panel rather than a solid red block: the type stays dark red
        // on a pale ground in light mode and pale red on a deep ground in dark.
        destructive:
          "destructive group border-red-200 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950 dark:text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-line bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-red-300 group-[.destructive]:hover:bg-red-100 group-[.destructive]:focus:ring-red-500 dark:group-[.destructive]:border-red-500/40 dark:group-[.destructive]:hover:bg-red-900",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      // Always visible below md: a phone has no hover to reveal it.
      "absolute right-2 top-2 rounded-md p-1 text-ink-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100 max-md:opacity-100 group-[.destructive]:text-red-700 group-[.destructive]:hover:text-red-900 group-[.destructive]:focus:ring-red-500 dark:group-[.destructive]:text-red-300 dark:group-[.destructive]:hover:text-red-100",
      className
    )}
    toast-close=""
    aria-label="Sluiten"
    {...props}
  >
    <X className="h-4 w-4" aria-hidden />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
