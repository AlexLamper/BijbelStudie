"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Lock } from "lucide-react"
import TreeAvatar from "../kit/TreeAvatar"
import { Skeleton } from "../kit/primitives"

/**
 * The Activiteit card's contents (design_handoff_web/PAGES.md §6).
 *
 * The web records no activity stream of its own - there is no feed table and no
 * endpoint that returns one - so the one real record of what the reader has been
 * doing is what they wrote down. This reads the SAME GET /api/notes the
 * /notities page reads, newest first, and draws each note as an activity line.
 * Nothing here writes.
 *
 * One request for the whole card: the three tabs narrow the eight rows that
 * already arrived rather than asking the server again, because `type` on
 * /api/notes matches exactly and would drop every "both" note from both of the
 * narrowed tabs.
 */

/** Only the fields this card draws; /api/notes returns the whole note. */
interface ActivityNote {
  _id: string
  verseReference: string
  book: string
  chapter: number
  noteText?: string
  verseText?: string
  translation?: string
  type: "note" | "highlight" | "both"
  highlightColor?: string
  createdAt: string
  isPrivate?: boolean
}

export type ActivityFilter = "all" | "highlights" | "notes"

/** How many rows the card asks for. Eight fills the column without a scrollbar. */
const ROW_LIMIT = 8

/**
 * "2 dagen geleden", the way the design writes a timestamp. Counted in calendar
 * days rather than in 24-hour blocks, so a note written last night reads
 * "gisteren" and not "vandaag". Past a month the relative form stops helping and
 * the date itself is clearer.
 */
function whenWritten(iso: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ""
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((midnight(new Date()) - midnight(then)) / 86_400_000)
  if (days <= 0) return "vandaag"
  if (days === 1) return "gisteren"
  if (days < 30) return `${days} dagen geleden`
  return then.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
}

/** What the reader did, in the design's own words. */
function whatHappened(type: ActivityNote["type"]): string {
  if (type === "highlight") return "markeerde een vers"
  if (type === "both") return "markeerde een vers en schreef er een notitie bij"
  return "schreef een notitie"
}

export default function ActivityFeed({
  filter,
  name,
}: {
  filter: ActivityFilter
  /** The reader's own name - every row is theirs. */
  name?: string | null
}) {
  const [notes, setNotes] = useState<ActivityNote[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/notes?limit=${ROW_LIMIT}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error())))
      .then(data => {
        if (cancelled) return
        setNotes(Array.isArray(data?.notes) ? data.notes : [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div role="status" aria-label="Activiteit laden">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-[11px] border-b border-line px-[18px] py-[15px] last:border-b-0">
            <Skeleton className="h-8 w-8 flex-none rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-[14px] w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (failed) {
    return (
      <div className="px-[18px] py-10">
        <p className="text-[13.5px] text-danger">Je activiteit kon niet worden geladen.</p>
      </div>
    )
  }

  const rows = notes.filter(note =>
    filter === "highlights"
      ? note.type === "highlight" || note.type === "both"
      : filter === "notes"
        ? note.type === "note" || note.type === "both"
        : true,
  )

  if (rows.length === 0) {
    const empty =
      filter === "highlights"
        ? "Je hebt nog geen vers gemarkeerd."
        : filter === "notes"
          ? "Je hebt nog geen notitie geschreven."
          : "Je hebt nog geen notities of markeringen."
    return (
      <div className="flex flex-col items-start gap-2 px-[18px] py-10">
        <p className="text-[13.5px] text-ink-body">{empty}</p>
        <Link
          href="/notities"
          className="mt-1 text-[13px] font-semibold text-teal no-underline hover:text-teal-dark"
        >
          Bekijk je notities →
        </Link>
      </div>
    )
  }

  const who = name?.trim() || "Jij"

  return (
    <ul className="m-0 list-none p-0">
      {rows.map(note => {
        // The quote block belongs to the note kind: a highlight's own record is
        // the verse reference, which the teal line above already names.
        const quoted = note.type !== "highlight" ? note.verseText : null
        return (
          <li key={note._id} className="flex gap-[11px] border-b border-line px-[18px] py-[15px] last:border-b-0">
            <TreeAvatar size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-[1.5] text-ink-body">
                <span className="font-bold text-ink">{who}</span> {whatHappened(note.type)}
              </p>

              <p className="mt-[3px] flex flex-wrap items-center gap-[7px] text-[11.5px] text-ink-faint">
                <time dateTime={note.createdAt}>{whenWritten(note.createdAt)}</time>
                {note.isPrivate && (
                  <>
                    <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-line-strong" />
                    <span className="inline-flex items-center gap-[5px]">
                      <Lock size={12} aria-hidden /> Alleen jij
                    </span>
                  </>
                )}
              </p>

              {/* Which verse, in the same teal the /notities rows use. The design
                  prints it above the quote; a marked verse gets it too, because
                  "markeerde een vers" without naming the vers says nothing. */}
              {note.verseReference && (
                <p className="mt-[9px] text-[12.5px] font-semibold text-teal">{note.verseReference}</p>
              )}

              {/* The reader's own words. Not in the §6 mock, which had none to
                  show, but a feed that says "schreef een notitie" and then hides
                  the notitie is not activity. */}
              {note.noteText && (
                <p className="mt-[6px] max-w-[600px] break-words text-[13.5px] leading-[1.6] text-ink">
                  {note.noteText}
                </p>
              )}

              {quoted && (
                <p className="mt-[8px] line-clamp-3 max-w-[600px] rounded-[10px] bg-line-soft p-[11px] text-[13px] leading-[1.6] text-ink-body">
                  {quoted}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
