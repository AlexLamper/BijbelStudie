import { SkeletonBlock } from "../ui/skeletons"
import { EYEBROW, PANEL, PANEL_DEEP, SKEL, TEAL_ON_DARK, TILE } from "./tokens"

/**
 * The small parts every scene page repeats.
 *
 * Every one of them is drawn to sit ON the landscape, so every colour is a
 * literal white or black and never a theme token - see tokens.ts for why.
 *
 * No "use client": nothing here holds state, so a server component can render
 * these and the copy inside them is in the served HTML. Do not add a hook to
 * this file; put it in the page, or in a component of its own.
 */

/* -- The panel ------------------------------------------------- */

/**
 * A working surface on the scene.
 *
 * Use this when you want a section; use the `PANEL` class string directly when
 * you already have an element to put it on (a `<li>`, an `<article>`, a link).
 * They are the same surface either way.
 */
export function Panel({
  children,
  className = "",
  deep = false,
  labelledBy,
}: {
  children: React.ReactNode
  /** Padding and layout. The surface itself comes from `deep`. */
  className?: string
  /** The heavier black/80 surface, for a long block of copy. Use sparingly. */
  deep?: boolean
  /** id of the heading that names this section. */
  labelledBy?: string
}) {
  return (
    <section aria-labelledby={labelledBy} className={`${deep ? PANEL_DEEP : PANEL} ${className}`}>
      {children}
    </section>
  )
}

/* -- A section's heading block --------------------------------- */

/**
 * Eyebrow, heading, an optional line of subtitle, and an optional action on the
 * far right - "Alle notities", "Bekijk alle".
 *
 * The heading is an h2 and always carries the id its section labels itself by,
 * so a section is never an unlabelled region. A page has exactly one h1, in its
 * first screen, and it is not this.
 *
 * `rule` closes the block with a hairline. That is what lets a section sit
 * straight on the landscape without a panel around it: the rule says where the
 * section starts, and the type does the rest.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  rule = false,
  className = "",
}: {
  id: string
  eyebrow?: string
  title: React.ReactNode
  subtitle?: string
  /** Usually one quiet link. Baseline-aligned with the heading. */
  action?: React.ReactNode
  rule?: boolean
  className?: string
}) {
  return (
    <div className={`${rule ? "border-b border-white/15 pb-2.5" : ""} ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          {eyebrow && (
            <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
              {eyebrow}
            </p>
          )}
          <h2 id={id} className={`${eyebrow ? "mt-2" : ""} text-base font-semibold tracking-tight text-white`}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-white/70">{subtitle}</p>}
    </div>
  )
}

/* -- Waiting --------------------------------------------------- */

/**
 * A skeleton on a scene surface.
 *
 * The shared `SkeletonBlock` carries `dark:bg-secondary`, which is invisible
 * against a panel that is dark in BOTH themes; this is the same block with that
 * branch overridden. Give it the shape of what is coming:
 * `<SceneSkeleton className="h-3.5 w-36" />`.
 *
 * Text on a scene page must never wait on the scene - only on its own data.
 */
export function SceneSkeleton({ className = "" }: { className?: string }) {
  return <SkeletonBlock className={`${SKEL} ${className}`} />
}

/* -- A figure on the horizon ----------------------------------- */

/**
 * One number in a row of numbers, on smoked glass. `value === null` is the
 * waiting state. Put these in a `<dl>`.
 */
export function GlassStat({
  label,
  value,
  unit,
  note,
}: {
  label: string
  value: string | null
  unit: string
  note?: string
}) {
  return (
    <div className={`px-5 py-4 shadow-lg shadow-black/20 ${TILE}`}>
      <dt className={`${EYEBROW} text-white/70`}>{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        {value === null ? (
          <SceneSkeleton className="h-7 w-14" />
        ) : (
          <span className="content-in text-2xl font-semibold tabular-nums text-white xl:text-3xl">{value}</span>
        )}
        <span className="text-xs text-white/75">{unit}</span>
      </dd>
      {note && <p className="mt-0.5 text-[11px] text-white/60">{note}</p>}
    </div>
  )
}

/* -- One running total inside a panel -------------------------- */

/** A label, a figure and a qualifier, for a grid of standing totals. */
export function Total({
  label,
  loading,
  value,
  sub,
}: {
  label: string
  loading: boolean
  value: string
  sub: string
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/60">{label}</dt>
      {loading ? (
        <dd className="mt-1 space-y-1">
          <SceneSkeleton className="h-5 w-10" />
          <SceneSkeleton className="h-2.5 w-16" />
        </dd>
      ) : (
        <dd className="content-in">
          <span className="block text-lg font-semibold leading-none tabular-nums text-white">{value}</span>
          <span className="mt-1 block truncate text-[10px] tabular-nums text-white/60">{sub}</span>
        </dd>
      )}
    </div>
  )
}

/* -- The week -------------------------------------------------- */

/**
 * Seven days as seven bars: filled where something was read, outlined where
 * today is still open.
 *
 * The day is typed structurally rather than imported from the dashboard hook,
 * so any page that can count a week can use it.
 */
export type SceneWeekDay = { label: string; count: number; isToday: boolean }

export function WeekStrip({ days, loading }: { days: SceneWeekDay[]; loading: boolean }) {
  return (
    <ol className="mt-3 flex gap-1.5" aria-label="Deze week">
      {days.map((day, i) => {
        const read = day.count > 0
        return (
          <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              aria-hidden
              className={`block h-7 w-full rounded-md ${
                read ? "" : day.isToday ? "border-2 border-dashed border-white/45" : "bg-white/15"
              } ${loading ? "skeleton-pulse" : ""}`}
              style={read ? { backgroundColor: day.isToday ? TEAL_ON_DARK : "rgba(45,212,191,0.45)" } : undefined}
            />
            <span className={`text-[10px] font-medium ${day.isToday ? "text-white" : "text-white/60"}`}>
              {day.label}
              <span className="sr-only">{read ? `, ${day.count} keer gelezen` : ", niet gelezen"}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
