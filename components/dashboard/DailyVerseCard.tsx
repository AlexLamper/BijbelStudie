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
 * six images, in either light or dark mode, and a token that flips with the
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
    <div className="relative overflow-hidden rounded-xl min-w-0 flex flex-col min-h-[330px]">
      {/* The photograph, and the wash that makes text legible over it. A flat
          layer guarantees contrast over a bright sky; the gradient keeps the
          eyebrow and the action row readable over a light patch at either
          edge. Both are copied from the app's _PhotoScrim. */}
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

      <div className="relative flex flex-col flex-1 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          Tekst van de dag
        </p>

        {loading ? (
          <>
            <div className="h-4 w-32 rounded skeleton-pulse bg-white/25 mt-2" />
            <div className="space-y-2.5 mt-5">
              <div className="h-3.5 rounded skeleton-pulse bg-white/25" />
              <div className="h-3.5 rounded skeleton-pulse w-4/5 bg-white/25" />
              <div className="h-3.5 rounded skeleton-pulse w-3/5 bg-white/25" />
            </div>
          </>
        ) : verse ? (
          <div className="content-in flex flex-col flex-1">
            {/* "Micha 3:1 SV" - reference and translation on one line, as the
                app prints it. */}
            <p className="text-[15px] font-bold mt-1 text-white">
              {verse.reference}
              {version ? <span className="text-white/75"> {version}</span> : null}
            </p>

            <p
              className="my-5 flex-1 text-white"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "1.15rem",
                lineHeight: 1.5,
                fontWeight: 500,
                wordBreak: "break-word",
                overflowWrap: "break-word",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
            >
              {verse.text}
            </p>

            {/* Centred, per the app. Plain icons, no button styling. */}
            <div className="flex items-center justify-center gap-1">
              <IconAction
                label={liked ? "Verwijder uit favorieten" : "Favoriet"}
                onClick={handleLike}
                active={liked}
              >
                <Heart size={19} fill={liked ? "currentColor" : "none"} />
              </IconAction>

              <IconAction label="Delen" onClick={handleShare}>
                <Share2 size={19} />
              </IconAction>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Meer"
                    className="p-2 rounded-full text-white/85 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <MoreHorizontal size={19} />
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

            <p className="h-4 text-center text-[11px] text-white/75">{shareNote}</p>
          </div>
        ) : null}
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
      className={`p-2 rounded-full transition-colors hover:bg-white/20 ${
        active ? "text-white" : "text-white/85 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}
