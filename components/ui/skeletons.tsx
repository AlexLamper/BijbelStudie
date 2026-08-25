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
      className={cn("skeleton-pulse rounded-md bg-gray-100 dark:bg-secondary", className)}
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

/** A bordered card placeholder - the shape most panels in the app resolve to. */
export function SkeletonCard({
  lines = 3,
  className,
  children,
}: {
  lines?: number
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 dark:border-border p-5 space-y-3",
        className
      )}
    >
      {children ?? (
        <>
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonText lines={lines} />
        </>
      )}
    </div>
  )
}

/**
 * The dashboard's figure tiles: a small label over a large number. Sized to the
 * real tile so the numbers do not shift into place when they land.
 */
export function SkeletonStats({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Statistieken laden"
      className={cn("grid grid-cols-2 md:grid-cols-4 gap-5", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-7 w-16" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Note rows as they appear in the dashboard card and the notes list: a short
 * reference line above two lines of body text.
 */
export function SkeletonNotes({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-label="Notities laden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBlock className="h-3 w-2/5" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

/**
 * Media-card grid used by the studies and plans overviews: image band, title,
 * two lines of description.
 */
export function SkeletonCardGrid({
  count = 6,
  className,
  imageClassName = "h-36",
}: {
  count?: number
  className?: string
  imageClassName?: string
}) {
  return (
    <div
      role="status"
      aria-label="Laden"
      className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 dark:border-border overflow-hidden"
        >
          <SkeletonBlock className={cn("rounded-none", imageClassName)} />
          <div className="p-5 space-y-2.5">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * A settings or preference row: label and description on the left, control on
 * the right. Matches the row height in /instellingen so the panel does not
 * resize when the saved values arrive.
 */
export function SkeletonRows({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-gray-100 dark:divide-border", className)} role="status" aria-label="Laden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-6 py-4">
          <div className="space-y-2 min-w-0 flex-1">
            <SkeletonBlock className="h-3.5 w-1/3" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
          <SkeletonBlock className="h-9 w-28 flex-shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/**
 * Page-level placeholder for a route's `loading.tsx`: masthead, a stat strip
 * and a content grid. This is what fills the gap between a navigation click
 * and the client component's first fetch resolving.
 */
export function SkeletonRoute({
  stats = true,
  cards = 4,
  className,
}: {
  stats?: boolean
  cards?: number
  className?: string
}) {
  return (
    <div
      role="status"
      aria-label="Pagina laden"
      className={cn("px-6 xl:px-10 pt-7 pb-10 space-y-8", className)}
    >
      <div className="space-y-2.5">
        <SkeletonBlock className="h-6 w-64" />
        <SkeletonBlock className="h-3.5 w-44" />
      </div>
      {stats && <SkeletonStats />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} className={i === 0 ? "lg:col-span-2" : undefined} />
        ))}
      </div>
    </div>
  )
}
