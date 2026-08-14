"use client"

import { cn } from "../../lib/utils"

/**
 * Shared loading skeletons.
 *
 * These replace the old spinners for *content* that is being fetched: a skeleton
 * mirrors the shape of what is coming, so the layout does not jump and the wait
 * feels shorter. Spinners are still fine inside buttons, where they signal
 * "your click is being processed" rather than "content is loading".
 *
 * The grey tone matches the inline skeletons already used on the dashboard
 * (`bg-gray-100 dark:bg-secondary`).
 */

export function SkeletonBlock({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-gray-100 dark:bg-secondary", className)}
      {...props}
    />
  )
}

/** A paragraph of shimmering text lines; the last line is shortened. */
export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: {
  lines?: number
  className?: string
  lineClassName?: string
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={cn("h-3.5", i === lines - 1 && "w-3/5", lineClassName)}
        />
      ))}
    </div>
  )
}

/** Card-shaped rows, for lists of notes, plans, members, … */
export function SkeletonList({
  count = 3,
  className,
  itemClassName,
}: {
  count?: number
  className?: string
  itemClassName?: string
}) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Laden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border border-gray-200 dark:border-border p-4 space-y-2.5",
            itemClassName
          )}
        >
          <SkeletonBlock className="h-3 w-1/3" />
          <SkeletonBlock className="h-3.5" />
          <SkeletonBlock className="h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  )
}

/**
 * Bible-chapter shaped placeholder: a heading plus verse-length lines with a
 * teal accent rail, matching how a chapter actually renders.
 */
export function SkeletonChapter({ verses = 8, className }: { verses?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-label="Bijbeltekst laden">
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-48" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: verses }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <SkeletonBlock className="h-3.5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3.5" />
              <SkeletonBlock className={i % 3 === 0 ? "h-3.5 w-2/3" : "h-3.5 w-5/6"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Full-page placeholder used where a route used to render a centred spinner
 * while it decided what to show.
 */
export function SkeletonPage({
  fullHeight = false,
  className,
}: {
  fullHeight?: boolean
  className?: string
}) {
  return (
    <div
      role="status"
      aria-label="Laden"
      className={cn(
        "w-full max-w-4xl mx-auto px-4 py-10 space-y-8",
        fullHeight && "min-h-screen",
        className
      )}
    >
      <div className="space-y-3">
        <SkeletonBlock className="h-7 w-2/5" />
        <SkeletonBlock className="h-4 w-3/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-border p-5 space-y-3">
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-3.5" />
            <SkeletonBlock className="h-3.5 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
