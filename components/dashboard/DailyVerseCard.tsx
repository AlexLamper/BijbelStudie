"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart, Share2, MoreHorizontal, BookOpen, History } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import {
  dailyVersePhoto,
  dayLabel,
  isLiked as isReferenceLiked,
  readHistory,
  readLikes,
  rememberVerse,
  todayKey,
  toggleLike,
  versionAbbreviation,
  type StoredVerse,
} from "../../lib/dailyVerseStore"

const TEAL = "#0D9488"

export type DailyVerse = {
  text: string
  reference: string
  book: string
  chapter: number
  verse?: number
  version?: string
}

/**
 * "Tekst van de dag" - the same card the app shows at the top of its Start tab
 * (`lib/features/dashboard/present/daily_verse_card.dart`).
 *
 * The layout is deliberately identical, so the two products read as one: a
 * full-bleed nature photograph, the eyebrow and the reference at the top left,
 * the verse itself set in a serif underneath and left-aligned, and a centred
 * row of three plain icon actions along the bottom. Icons only - no button
 * chrome - because the verse is the content here and a row of filled buttons
 * would compete with it.
 *
 * Everything drawn over the photograph is literal white rather than a theme
 * token, and it sits on a scrim: the colours have to hold up over any of the
 * photographs, in either light or dark mode, and a token that flips with the
 * theme would go invisible on half of them.
 *
 * Like the app's card, everything it remembers is local: `/api/bible/daytext`
 * serves one verse and keeps no archive, so the heart and "Bekijk voorgaande
 * dagen" are backed by localStorage. See `lib/dailyVerseStore.ts`.
 */
export default function DailyVerseCard({
  verse,
  loading,
}: {
  verse: DailyVerse | null
  loading: boolean
}) {
  const [liked, setLiked] = useState(false)
  const [history, setHistory] = useState<StoredVerse[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)

  const version = versionAbbreviation(verse?.version)

  // Read the archive after mount, never during render: localStorage does not
  // exist on the server, and touching it in the render pass would make the
  // first client paint disagree with the server's HTML.
  useEffect(() => {
    setHistory(readHistory())
  }, [])

  // Record today's verse, and pick up whether it was already hearted.
  useEffect(() => {
    if (!verse) return
    setLiked(isReferenceLiked(verse.reference, readLikes()))
    setHistory(
      rememberVerse({
        date: todayKey(),
        text: verse.text,
        reference: verse.reference,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        version,
      }),
    )
  }, [verse, version])

  // A short confirmation after a copy, since the clipboard gives no feedback
  // of its own.
  useEffect(() => {
    if (!shareNote) return
    const timer = setTimeout(() => setShareNote(null), 2500)
    return () => clearTimeout(timer)
  }, [shareNote])

  async function handleShare() {
    if (!verse) return
    const attribution = version ? `${verse.reference} (${version})` : verse.reference
    const payload = `"${verse.text}"\n\n${attribution}`

    // The Web Share sheet where the browser has one (mostly mobile), the
    // clipboard everywhere else. A share the user cancels is not a failure.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: verse.reference, text: payload })
        return
      } catch {
        return
      }
    }
    try {
      await navigator.clipboard.writeText(payload)
      setShareNote("Gekopieerd")
    } catch {
      setShareNote("Kopiëren lukte niet")
    }
  }

  function handleLike() {
    if (!verse) return
    const next = toggleLike(verse.reference)
    setLiked(next.includes(verse.reference))
  }

  const chapterHref = verse
    ? `/lezen?book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}&version=statenvertaling`
    : "/lezen"

  const photo = dailyVersePhoto()

  return (
    <div className="relative flex h-[218px] min-w-0 flex-none flex-col overflow-hidden rounded-card">
      {/* The photograph, and the wash that makes text legible over it. A flat
          layer guarantees contrast over a bright sky; the gradient keeps the
          eyebrow and the action row readable over a light patch at either
          edge. Both are copied from the app's _PhotoScrim.

          The handoff draws a mauve-to-amber gradient with two hills here. That
          is a placeholder for server imagery, like every other gradient plate
          in the prototype (design_handoff_web/RULES.md §4) - the real picture
          is one of the 76 curated landscapes, so the structure and the
          measurements below are the design's and the illustration is not. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${photo})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0,0,0,0.34)",
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0.52) 100%)",
        }}
      />

      <div className="relative z-[1] flex flex-1 flex-col px-[26px] pb-5 pt-[22px]">
        {/* One eyebrow carries both the label and the reference, so the verse
            itself is the next thing the eye lands on. */}
        <p className="text-[10.5px] font-semibold uppercase tracking-[1.5px] text-white/[0.82]">
          Tekst van de dag
          {verse ? ` · ${verse.reference}${version ? ` ${version}` : ""}` : ""}
        </p>

        {loading ? (
          <div className="mt-3 space-y-2.5">
            <div className="skeleton-pulse h-4 rounded bg-white/25" />
            <div className="skeleton-pulse h-4 w-4/5 rounded bg-white/25" />
          </div>
        ) : verse ? (
          <p
            className="content-in mt-3 max-w-[680px] font-serif text-[25px] font-normal leading-[1.45] text-white"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,.28)", overflowWrap: "break-word" }}
          >
            {verse.text}
          </p>
        ) : null}

        <div className="flex-1" />

        {/* Three round actions along the foot of the card, in the design's
            order: heart, share, overflow. */}
        <div className="flex items-center gap-[10px]">
          <RoundAction
            label={liked ? "Verwijder uit favorieten" : "Favoriet"}
            onClick={handleLike}
            disabled={!verse}
          >
            <Heart size={19} fill={liked ? "currentColor" : "none"} />
          </RoundAction>

          <RoundAction label="Delen" onClick={handleShare} disabled={!verse}>
            <Share2 size={19} />
          </RoundAction>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Meer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.32] text-white transition-colors hover:bg-white/20"
                style={{ backgroundColor: "rgba(17,24,39,.45)" }}
              >
                <MoreHorizontal size={19} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={chapterHref} className="cursor-pointer">
                  <BookOpen size={14} className="mr-2" />
                  Lees het hele hoofdstuk
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => setHistoryOpen(true)}
              >
                <History size={14} className="mr-2" />
                Bekijk voorgaande dagen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {shareNote && <span className="text-[11px] text-white/85">{shareNote}</span>}
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[72vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voorgaande dagen</DialogTitle>
          </DialogHeader>

          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-muted-foreground">
              Nog geen eerdere teksten bewaard. Vanaf vandaag wordt de tekst van de dag hier
              verzameld.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-border">
              {history.map((entry) => (
                <li key={entry.date} className="py-3.5">
                  <Link
                    href={`/lezen?book=${encodeURIComponent(entry.book)}&chapter=${entry.chapter}&version=statenvertaling`}
                    className="block group no-underline"
                    onClick={() => setHistoryOpen(false)}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
                      {dayLabel(entry.date)}
                    </p>
                    <p className="text-sm font-semibold mt-1.5" style={{ color: TEAL }}>
                      {entry.reference}
                      {entry.version ? ` ${entry.version}` : ""}
                    </p>
                    <p
                      className="text-sm text-gray-600 dark:text-muted-foreground mt-1 line-clamp-3"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {entry.text}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * One of the three actions: a 40 px disc of smoked glass with a white glyph,
 * so the row reads as controls over a photograph rather than as three icons
 * floating on it.
 */
function RoundAction({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.32] text-white transition-colors hover:bg-white/20 disabled:opacity-50"
      style={{ backgroundColor: "rgba(17,24,39,.45)" }}
    >
      {children}
    </button>
  )
}
