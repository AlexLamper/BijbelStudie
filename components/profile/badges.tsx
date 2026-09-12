"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  BadgeCheck,
  BookOpen,
  Camera,
  Check,
  CheckCircle,
  Crown,
  Flame,
  FlaskConical,
  Gift,
  Lock,
  MessageCircle,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react"
import { ProgressBar } from "../kit/primitives"
import { BADGE_META } from "../../lib/badgeCatalog"
import type { LucideIcon } from "lucide-react"

/**
 * The badge wall, drawn the way the app draws it.
 *
 * The medallion below is the web reading of the mobile app's `BadgeMedallion`
 * (bijbelstudie-app/lib/features/profile/present/badge_medallion.dart): one
 * shape in two states - a tone ring around a tinted disc with the glyph in the
 * middle, so a shelf of them reads as a collection rather than as two designs.
 * Earned fills the ring, washes the disc in the tone's own tint under a soft
 * sheen and lifts it with a halo of that tint; not-yet-earned is a flat sunken
 * disc behind a hairline ring, the glyph dropped back to `ink-faint`, with a
 * small lock chip in the corner.
 *
 * WHAT DID NOT COME ACROSS: the app's third state. There a medallion can be
 * "underway" - it knows the reader stands at 3 of 7 and draws the ring as an
 * arc over a tinted track, with the count in a pill under it. The web only ever
 * learns which badge ids are already earned (`user.badges`); no endpoint hands
 * out the target or the running total, so there is no arc to draw and the pill
 * has no number to print. Two states, and the tile prints the description in
 * the pill's place.
 */

/**
 * The four tones the app gives a badge, mapped onto tokens that already exist
 * here rather than onto the Dart literals. `flame` is the same orange in both
 * (`--warn`); `teal` is ours; the app's `ai` violet lands on `--badge-ring`,
 * which is already the badge colour on this page's resting ring row; the app's
 * emerald `positive` has no wash token on the web, so the two badges that wore
 * it - the Pro and the anniversary one - take gold, which is what this palette
 * says about both. The glyph is a darker step of the tone wherever the tone
 * itself would be too light on its own wash.
 */
type ToneName = "flame" | "teal" | "violet" | "gold"

const TONES: Record<ToneName, { ring: string; wash: string; glyph: string }> = {
  flame: { ring: "var(--warn)", wash: "var(--warn-wash)", glyph: "var(--warn)" },
  teal: { ring: "var(--teal)", wash: "var(--teal-faint)", glyph: "var(--teal-dark)" },
  violet: { ring: "var(--badge-ring)", wash: "var(--badge-wash)", glyph: "var(--badge-ring)" },
  gold: { ring: "var(--gold)", wash: "var(--pro-soft)", glyph: "var(--gold-badge)" },
}

interface BadgeInfo {
  id: string
  icon: LucideIcon
  tone: ToneName
}

// Order, icon and tone live here; the name and the "what earns it" line live in
// lib/badgeCatalog.ts, because the end-of-lesson card needs the same words and
// two copies of them drift. The `points*` ids date from a quiz that no longer
// exists; they are XP milestones now, and the copy says so.
const badges: BadgeInfo[] = [
  { id: "streak30", icon: Flame, tone: "flame" },
  { id: "streak60", icon: Flame, tone: "flame" },
  { id: "streak90", icon: Flame, tone: "flame" },
  { id: "streak120", icon: Flame, tone: "flame" },
  { id: "verified", icon: BadgeCheck, tone: "violet" },
  { id: "contributor", icon: Star, tone: "violet" },
  { id: "completed1", icon: BookOpen, tone: "teal" },
  { id: "completed5", icon: BookOpen, tone: "teal" },
  { id: "completed10", icon: BookOpen, tone: "teal" },
  { id: "points100", icon: Trophy, tone: "violet" },
  { id: "points500", icon: Trophy, tone: "violet" },
  { id: "points1000", icon: Trophy, tone: "violet" },
  { id: "premium", icon: Crown, tone: "gold" },
  { id: "invite", icon: Users, tone: "violet" },
  { id: "commenter", icon: MessageCircle, tone: "violet" },
  { id: "profilepic", icon: Camera, tone: "violet" },
  { id: "firstlesson", icon: CheckCircle, tone: "teal" },
  { id: "tester", icon: FlaskConical, tone: "violet" },
  { id: "anniversary", icon: Gift, tone: "gold" },
]

interface UserBadgesProps {
  earned: string[]
}

/** How many badges there are to earn. The profile card counts against this. */
export const BADGE_TOTAL = badges.length

/**
 * The first few badges the reader has earned, as overlapping rings - the shape
 * the Badges card wears at rest (design_handoff_web/PAGES.md §6). The last ring
 * is the remainder as a number, so the row says "and this many more" without
 * growing.
 *
 * A span rather than a div: the card it sits in is a button, and a button holds
 * phrasing content only.
 */
export function BadgeRings({ earned, show = 4 }: { earned: string[]; show?: number }) {
  const mine = badges.filter(b => earned.includes(b.id))
  const shown = mine.slice(0, show)
  const rest = BADGE_TOTAL - shown.length

  return (
    <span className="ml-[9px] flex">
      {shown.map(b => {
        const Icon = b.icon
        const label = BADGE_META[b.id]?.label ?? b.id
        return (
          <span
            key={b.id}
            title={label}
            className="-ml-[9px] flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-badgering bg-badgering-wash shadow-[0_0_0_3px_var(--surface)]"
          >
            <Icon size={19} strokeWidth={1.8} className="text-badgering" aria-hidden />
          </span>
        )
      })}
      {rest > 0 && (
        <span className="-ml-[9px] flex h-11 w-11 items-center justify-center rounded-full bg-line text-[12.5px] font-semibold text-ink-muted shadow-[0_0_0_3px_var(--surface)] tabular-nums">
          +{rest}
        </span>
      )}
    </span>
  )
}

/**
 * One badge as a medallion, at the app's proportions: the ring is 5.5 % of the
 * size, the disc sits that much again inside it, the glyph is 40 % and the lock
 * chip 34 %.
 */
function Medallion({
  icon: Icon,
  tone,
  earned,
  size = 56,
}: {
  icon: LucideIcon
  tone: ToneName
  earned: boolean
  size?: number
}) {
  const { ring, wash, glyph } = TONES[tone]
  const stroke = Math.min(4, Math.max(2, Math.round(size * 0.055)))
  const inset = stroke + Math.round(size * 0.055)
  const chip = Math.round(size * 0.34)

  return (
    <span className="relative inline-block flex-none" style={{ width: size, height: size }} aria-hidden>
      {/* The ring. Whole once earned - the app draws the same circle with a
          progress indicator at value 1 - a neutral hairline until then. */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: `${stroke}px solid ${earned ? ring : "var(--line)"}`,
          // The app's tone glow, as a halo of the tone's own tint: a blurred
          // drop shadow reads as dirt under a 56 px disc on white.
          boxShadow: earned ? `0 0 0 4px ${wash}` : undefined,
        }}
      />
      {/* The disc. A sheen easing out of white into the tint once earned - the
          app's RadialGradient off the top-left - flat and sunken until then. */}
      <span
        className="absolute inline-flex items-center justify-center rounded-full"
        style={{
          inset,
          background: earned
            ? `radial-gradient(circle at 32% 30%, var(--surface), ${wash})`
            : "var(--surface-sunken)",
          border: earned
            ? `1.5px solid color-mix(in srgb, ${ring} 45%, var(--surface))`
            : "1px solid var(--line)",
        }}
      >
        <Icon
          size={Math.round(size * 0.4)}
          strokeWidth={1.8}
          style={{ color: earned ? glyph : "var(--ink-faint)" }}
        />
      </span>
      {!earned && (
        <span
          className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full border border-line bg-white"
          style={{ width: chip, height: chip, boxShadow: "var(--shadow-field)" }}
        >
          <Lock size={Math.round(chip * 0.55)} className="text-ink-faint" />
        </span>
      )}
    </span>
  )
}

/** One tile on a shelf: the medallion, its name and what earns it. */
function BadgeTile({ badge, earned }: { badge: BadgeInfo; earned: boolean }) {
  const label = BADGE_META[badge.id]?.label ?? badge.id
  const description = BADGE_META[badge.id]?.description ?? ""

  return (
    <li className="flex flex-col items-center rounded-card border border-line bg-white px-[10px] pb-3 pt-[14px] text-center">
      <Medallion icon={badge.icon} tone={badge.tone} earned={earned} />
      <span className={`mt-[10px] text-[12.5px] font-bold leading-[1.3] ${earned ? "text-ink" : "text-ink-muted"}`}>
        {label}
      </span>
      <span className="mt-[5px] text-[11.5px] leading-[1.4] text-ink-faint">{description}</span>
      {earned && (
        // `mt-auto` is the app tile's `Spacer()`: the state line sits on the
        // floor of the tile, so it lines up across a row of uneven descriptions.
        <span className="mt-auto inline-flex items-center gap-[4px] pt-[9px] text-[11px] font-semibold text-success">
          <Check size={12} aria-hidden /> Verdiend
        </span>
      )}
    </li>
  )
}

/** A section header and its grid - or, with nothing on it, a single line. */
function Shelf({
  title,
  items,
  earned,
  empty,
}: {
  title: string
  items: BadgeInfo[]
  earned: boolean
  empty: string
}) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[14.5px] font-bold text-ink">{title}</h3>
        <span className="text-[12.5px] text-ink-faint tabular-nums">
          {items.length === 1 ? "1 badge" : `${items.length} badges`}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 rounded-card border border-line bg-sunken p-4 text-[13px] leading-[1.55] text-ink-muted">
          {empty}
        </p>
      ) : (
        <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-[10px] p-0 sm:grid-cols-3 md:grid-cols-4">
          {items.map(badge => (
            <BadgeTile key={badge.id} badge={badge} earned={earned} />
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Every badge, on two shelves: what has been earned and what is still to come,
 * the way the app's Badges screen splits them, so the empty places are as
 * visible as the filled ones.
 */
export default function UserBadges({ earned }: UserBadgesProps) {
  const mine = badges.filter(b => earned.includes(b.id))
  const rest = badges.filter(b => !earned.includes(b.id))

  return (
    <>
      <Shelf
        title="Verdiend"
        items={mine}
        earned
        empty="Nog geen badge verdiend. Elke dag die je leest en elke studie die je afrondt telt mee."
      />
      <Shelf
        title="Nog te verdienen"
        items={rest}
        earned={false}
        empty="Alles verdiend. Nieuwe badges volgen."
      />
    </>
  )
}

/**
 * The whole cabinet, over the page.
 *
 * A portal into document.body rather than a panel in the rail: the rail card is
 * 326 px wide and the grid needs the width of the page. Closes on the backdrop,
 * on the close button and on Escape; the close button takes focus when it opens
 * so the dialog is reachable without a mouse.
 */
export function BadgesDialog({
  open,
  onClose,
  earned,
}: {
  open: boolean
  onClose: () => void
  earned: string[]
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // `mounted` guards the portal: document.body does not exist during the server
  // render, and reaching for it there throws.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // `mounted` is in the deps because the portal - and with it the button this
  // reaches for - does not exist on the render where it is still false.
  useEffect(() => {
    if (open && mounted) closeRef.current?.focus()
  }, [open, mounted])

  if (!open || !mounted) return null

  const count = badges.filter(b => earned.includes(b.id)).length

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
      style={{ backgroundColor: "rgba(17,24,39,.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="badges-dialoog-titel"
        onClick={event => event.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col rounded-t-card bg-white sm:max-h-[85vh] sm:max-w-[660px] sm:rounded-card"
      >
        <header className="flex h-14 flex-none items-center gap-3 border-b border-line px-5">
          <h2 id="badges-dialoog-titel" className="flex-1 text-[15px] font-bold text-ink">
            Badges
          </h2>
          <span className="text-[12.5px] text-ink-muted tabular-nums">
            {count} van {BADGE_TOTAL} verdiend
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-btn text-ink-muted transition-colors hover:bg-line-soft hover:text-ink-body"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <ProgressBar value={(count / BADGE_TOTAL) * 100} height={6} className="mb-5" />
          <UserBadges earned={earned} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
