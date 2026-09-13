"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { ProgressTreeScene } from "./ProgressTree"
import { useLevensboom } from "../../hooks/useLevensboom"
import { paletteForNow } from "../../lib/levensboom/palette"
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

/**
 * Half of the heart's beat: it swells for this long and settles back over the
 * same interval, so the whole thing is 260 ms - the far end of the 120-260 ms
 * the rest of the vocabulary works in (app/globals.css, "Arrival and
 * micro-interaction vocabulary"). One number, read by both the timer that ends
 * the beat and the transition that draws it.
 */
const BEAT_MS = 130

/**
 * The widest the tree's landscape is ever drawn, in CSS pixels.
 *
 * The scene framing of `TreeCanvas` places its backdrop in fractions of the
 * canvas width - the moon, the boat, the tower, the stones and the hill waves
 * are all sized from `w` - while the tree itself is sized from the height. In
 * a card that is 218 px tall and, on a 2560 px screen, close to 1900 px wide,
 * that drew a thumbnail tree under a moon the size of the card and hills
 * pulled out into a flat line. Past this width the landscape stops growing:
 * it stays anchored to the right, away from the verse, and the sky and earth
 * carry on to the left as plain colour.
 */
const SCENE_MAX_W = 880
/** How far into the landscape its left edge dissolves into that plain colour. */
const SCENE_FADE_W = 280
const sceneMask = `linear-gradient(to right, transparent calc(100% - ${SCENE_MAX_W}px), #000 calc(100% - ${SCENE_MAX_W - SCENE_FADE_W}px))`

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
  const [beating, setBeating] = useState(false)
  const beatTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [history, setHistory] = useState<StoredVerse[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)

  const version = versionAbbreviation(verse?.version)

  // Whether there is a tree to draw at all. `disabled` is the reader's own
  // "verberg mijn boom" setting, and it has to be honoured here too.
  const { data: levensboom } = useLevensboom()
  const tree = levensboom?.levensboom
  const hasTree = Boolean(tree && !tree.disabled)

  // The sky and earth the landscape continues into on a card wider than
  // SCENE_MAX_W: the same palette call TreeCanvas makes, laid out the way it
  // paints them (sky down to the earth band's top at 88 %, then the band).
  const treeHealth = tree?.health
  const treeScene = tree?.avatar.scene
  const treeSpecies = tree?.avatar.species
  const sceneGround = useMemo(() => {
    if (!hasTree) return undefined
    const p = paletteForNow(treeHealth, new Date(), { scene: treeScene, species: treeSpecies })
    return `linear-gradient(to bottom, ${p.skyTop} 0%, ${p.skyBottom} 88%, ${p.ground} 88%, ${p.groundDeep} 100%)`
  }, [hasTree, treeHealth, treeScene, treeSpecies])

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

  // A beat left running past unmount would set state on a gone component.
  useEffect(() => () => {
    if (beatTimer.current) clearTimeout(beatTimer.current)
  }, [])

  function handleLike() {
    if (!verse) return
    const next = toggleLike(verse.reference)
    const nowLiked = next.includes(verse.reference)
    setLiked(nowLiked)

    // The beat plays on the way in only. Taking a verse back out of the
    // favourites is a correction, and a flourish on it would be celebrating
    // the wrong half of the toggle.
    if (!nowLiked) return
    if (beatTimer.current) clearTimeout(beatTimer.current)
    setBeating(true)
    beatTimer.current = setTimeout(() => setBeating(false), BEAT_MS)
  }

  const chapterHref = verse
    ? `/lezen?book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}&version=statenvertaling`
    : "/lezen"

  const photo = dailyVersePhoto()

  return (
    // `min-h`, not `h`: 218 px is the design's height, but a long verse at a
    // phone's width (or four lines at the 680 px measure) needs more, and a
    // fixed height clipped it under the action row.
    <div className="relative flex min-h-[218px] min-w-0 flex-none flex-col overflow-hidden rounded-card">
      {/* THE PICTURE IS THE READER'S OWN TREE.
          `ProgressTreeScene` draws the landscape they built in the studio -
          their species, their scene, their animal, at their level - which is
          the same picture /profiel/boom and the navbar avatar show, from the
          provider the root layout already mounts. So it costs no request.

          `still`: one frame, no loop. A landscape moving behind the verse is
          the one thing atmosphere must not do on a screen someone is reading,
          and it is the rule the reading room follows for the same reason.

          The curated photograph stays underneath as the ground: it is what a
          reader with no tree yet, or one who switched the tree off, keeps - and
          it is what fills the card in the beat before the provider answers.
          The handoff's mauve-to-amber gradient with two hills was a placeholder
          for exactly this (design_handoff_web/RULES.md §4) - the structure and
          the measurements below are the design's, the illustration is not.

          Either way the same two scrims go over it: a flat layer that
          guarantees contrast over a bright sky, and a gradient that keeps the
          eyebrow and the action row readable over a light patch at either edge.
          Both are copied from the app's _PhotoScrim. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${photo})` }}
      />
      {hasTree && (
        // Over the photograph rather than instead of it, and faded in: the
        // provider answers a beat after the first paint, and a hard cut from
        // one landscape to another reads as a glitch.
        <div
          aria-hidden
          className="absolute inset-0 motion-safe:animate-fade-in"
          style={{ backgroundImage: sceneGround }}
        >
          {/* The canvas never gets wider than SCENE_MAX_W, so its backdrop
              keeps the proportions it was drawn for (the tree itself is always
              drawn at one uniform scale, so it never distorts). The mask sits
              on the full-card layer so its stops follow the card: on a card
              narrower than SCENE_MAX_W - SCENE_FADE_W both stops fall left of
              the card and nothing is faded; wider, the landscape's left edge
              dissolves over SCENE_FADE_W into the plain sky and earth. */}
          <div
            className="absolute inset-0"
            style={{
              WebkitMaskImage: sceneMask,
              maskImage: sceneMask,
            }}
          >
            <div className="absolute inset-y-0 right-0 w-full" style={{ maxWidth: SCENE_MAX_W }}>
              <ProgressTreeScene still className="h-full w-full" />
            </div>
          </div>
        </div>
      )}
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
            className="content-in mt-3 max-w-[680px] font-serif text-[21px] font-normal leading-[1.45] text-white sm:text-[25px]"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,.28)", overflowWrap: "break-word" }}
          >
            {verse.text}
          </p>
        ) : null}

        <div className="flex-1" />

        {/* Three round actions along the foot of the card, in the design's
            order: heart, share, overflow. */}
        <div className="mt-4 flex items-center gap-[10px]">
          <RoundAction
            label={liked ? "Verwijder uit favorieten" : "Favoriet"}
            onClick={handleLike}
            disabled={!verse}
          >
            {/* The moment of the tap: the heart swells and settles on the same
                ease-out curve `.content-in` uses, and that is all - what liked
                LOOKS like is still the fill.

                A transition between two states rather than a keyframe, because
                app/globals.css owns the keyframes and this one is needed in a
                single place. The scale is the half that carries `motion-safe:`,
                so a reader who asked for less motion never gets a transform at
                all and the transition below has nothing to draw - the same
                opt-in the rest of the vocabulary uses. */}
            <span
              className={`block ${beating ? "motion-safe:scale-[1.32]" : "motion-safe:scale-100"}`}
              style={{ transition: `transform ${BEAT_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` }}
            >
              <Heart size={19} fill={liked ? "currentColor" : "none"} />
            </span>
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
