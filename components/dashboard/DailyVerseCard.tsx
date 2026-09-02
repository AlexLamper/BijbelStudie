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
 * The layout is deliberately identical, so the two products read as one:
 * the eyebrow and the reference at the top left, the verse itself set in a
 * serif underneath and left-aligned, and a centred row of three plain icon
 * actions along the bottom. Icons only - no button chrome - because the verse
 * is the content here and a row of filled buttons would compete with it.
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

  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-5 min-w-0 flex flex-col">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
        Tekst van de dag
      </p>

      {loading ? (
        <>
          <div className="h-4 w-32 rounded skeleton-pulse bg-gray-100 dark:bg-secondary mt-2" />
          <div className="space-y-2.5 mt-5">
            <div className="h-3.5 rounded skeleton-pulse bg-gray-100 dark:bg-secondary" />
            <div className="h-3.5 rounded skeleton-pulse w-4/5 bg-gray-100 dark:bg-secondary" />
            <div className="h-3.5 rounded skeleton-pulse w-3/5 bg-gray-100 dark:bg-secondary" />
          </div>
        </>
      ) : verse ? (
        <div className="content-in flex flex-col flex-1">
          {/* "Micha 3:1 SV" - reference and translation on one line, as the
              app prints it. */}
          <p className="text-sm font-bold mt-1.5 text-gray-900 dark:text-foreground">
            {verse.reference}
            {version ? <span className="text-gray-400 dark:text-muted-foreground"> {version}</span> : null}
          </p>

          <p
            className="text-gray-700 dark:text-foreground/80 my-5 flex-1"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "1.05rem",
              lineHeight: 1.65,
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {verse.text}
          </p>

          {/* Centred, per the app. Plain icons, no button styling. */}
          <div className="flex items-center justify-center gap-1 pt-1">
            <IconAction
              label={liked ? "Verwijder uit favorieten" : "Favoriet"}
              onClick={handleLike}
              active={liked}
            >
              <Heart size={17} fill={liked ? TEAL : "none"} />
            </IconAction>

            <IconAction label="Delen" onClick={handleShare}>
              <Share2 size={17} />
            </IconAction>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Meer"
                  className="p-2 rounded-full text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-gray-100 dark:hover:bg-secondary transition-colors"
                >
                  <MoreHorizontal size={17} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
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
          </div>

          <p className="h-4 text-center text-[11px] text-gray-400 dark:text-muted-foreground">
            {shareNote}
          </p>
        </div>
      ) : null}

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

/** One of the three actions. An icon and a hit area, nothing else. */
function IconAction({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-secondary transition-colors text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
      style={active ? { color: TEAL } : undefined}
    >
      {children}
    </button>
  )
}
