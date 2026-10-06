"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Heart, Share2, MoreHorizontal, BookOpen, History, Users } from "lucide-react"
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
import { useProgressTree } from "../../hooks/useProgressTree"
import { paletteForNow } from "../../lib/progressTree/palette"
import {
  DAILY_VERSE_BACKGROUNDS,
  dailyVersePhoto,
  dayKeyNL,
  dayLabel,
  isLiked as isReferenceLiked,
  parseDayTextArchive,
  previousDays,
  readHistory,
  readDailyVerseBackground,
  readLikes,
  rememberVerse,
  saveDailyVerseBackground,
  toggleLike,
  versionAbbreviation,
  type DailyVerseBackground,
  type StoredVerse,
} from "../../lib/dailyVerseStore"
import { getBibleAttribution } from "../../lib/bible-attribution"
import {
  SHARE_TO_KRING_FEEDBACK,
  SHARE_TO_KRING_LABEL,
  useShareToKring,
} from "../friends/ShareToKring"
import {
  loadImage,
  renderDailyVerseShareImage,
  shareFileName,
  shareOrDownload,
} from "../../lib/dailyVerseShareImage"

const TEAL = "#0D9488"
/** The liked heart: red-600, the same red as the app's heart. Unliked it stays a white outline. */
const HEART_RED = "#DC2626"

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

/** How far a drag may overshoot the first and last page, in pages. */
const PAGE_GIVE = 0.12
/** Travel, in CSS px, before a press counts as a swipe rather than a tap or a scroll. */
const DRAG_SLOP = 8
/** A fling faster than this (px per ms, the app's 300 px/s) turns the page whatever the distance. */
const FLING = 0.3
/**
 * The box the tree is drawn in for the share image: 9:16, so on a 2x screen
 * its canvas is exactly 1080 x 1920. `TreeCanvas` sizes its backdrop from the
 * width and the tree from the height, so any 9:16 box draws the same picture.
 */
const SHARE_TREE_W = 540
const SHARE_TREE_H = 960
/** The app icon in the share image's wordmark. */
const SHARE_LOGO = "/images/icon-192.png"
const BACKGROUND_LABEL: Record<DailyVerseBackground, string> = {
  photo: "Natuurfoto",
  tree: "Jouw voortgang",
}

export type DailyVerse = {
  text: string
  reference: string
  book: string
  chapter: number
  verse?: number
  version?: string
  /** Translation id the text is in; the server falls back to "statenvertaling". */
  versionId?: string
  /** Copyright notice that must be shown with this text, verbatim (NBG51). */
  attribution?: string | null
  /** The translation the reader reads in - where "Lees het hele hoofdstuk" opens. */
  readerVersion?: string
}

/**
 * "Tekst van de dag" - the same card the app shows at the top of its Start tab
 * (`lib/features/dashboard/present/daily_verse_card.dart`).
 *
 * The layout is deliberately identical, so the two products read as one: a
 * full-bleed background, the eyebrow and the reference at the top left,
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
 * The background is one of two pages the reader swipes (or drags, or picks
 * with the two dots top right) between: the day's nature photo, the default
 * and first, and their own ProgressTree. The choice is remembered per account
 * in localStorage (`daytext.background.<userId>`), as the app remembers it.
 * "Delen" draws a 1080 x 1920 status image over the chosen background
 * (`lib/dailyVerseShareImage.ts`).
 *
 * Like the app's card, the heart and the record of each day this browser saw
 * live in localStorage (`/api/bible/daytext` serves today's verse only).
 * "Bekijk voorgaande dagen" merges that record with the shared archive,
 * `GET /api/v1/daytext/history`, fetched only when the dialog is opened. See
 * `lib/dailyVerseStore.ts`.
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
  const menuButton = useRef<HTMLButtonElement>(null)
  const [shareNote, setShareNote] = useState<string | null>(null)
  // The shared archive behind "Voorgaande dagen", and where its request is.
  const [archive, setArchive] = useState<StoredVerse[]>([])
  const [archiveState, setArchiveState] = useState<"idle" | "loading" | "done" | "failed">("idle")
  const archiveRequest = useRef<AbortController | null>(null)

  // The chosen background, per account. "photo" on the server and the first
  // client paint; the stored choice is read after mount.
  const { data: session } = useSession()
  const userId = session?.user?.id ?? null
  const [background, setBackground] = useState<DailyVerseBackground>("photo")
  // Where the pages are mid-drag (0 = photo, 1 = tree), or null when at rest.
  const [dragPage, setDragPage] = useState<number | null>(null)
  // No slide on the first paint: a stored "tree" shows at once.
  const [animated, setAnimated] = useState(false)
  const drag = useRef<{
    id: number
    x: number
    y: number
    lastX: number
    lastT: number
    vx: number
    width: number
    swiping: boolean
  } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const verseRef = useRef<HTMLParagraphElement>(null)
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([])
  // The off-screen tree the share image copies, mounted only while sharing.
  const [shareTree, setShareTree] = useState(false)
  const shareTreeRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  // Sharing the verse itself with the vriendenkring, which is a different act
  // from "Delen" above: that one hands the reader an image for anywhere.
  const kringShare = useShareToKring()
  // The last image drawn, so a second tap (after the browser refused a share
  // that came too long after the first) shares at once.
  const lastShare = useRef<{ key: string; blob: Blob } | null>(null)

  useEffect(() => {
    setBackground(readDailyVerseBackground(userId))
  }, [userId])

  const pageIndex = DAILY_VERSE_BACKGROUNDS.indexOf(background)
  const lastPage = DAILY_VERSE_BACKGROUNDS.length - 1
  const pagePos = dragPage ?? pageIndex

  function selectBackground(value: DailyVerseBackground) {
    setAnimated(true)
    setBackground(value)
    saveDailyVerseBackground(userId, value)
  }

  // The id first: it is exact, where the display name ("De Heilige Schrift
  // 1917") has no abbreviation of its own.
  const version = versionAbbreviation(verse?.versionId ?? verse?.version)
  const attribution = verse?.attribution ?? null

  // Whether there is a tree to draw at all. `disabled` is the reader's own
  // "verberg mijn boom" setting, and it has to be honoured here too.
  const { data: progressTree } = useProgressTree()
  // `levensboom` is the payload key, kept for installed app builds.
  const tree = progressTree?.levensboom
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
        // Amsterdam's day, the one the verse and the server archive belong to.
        date: dayKeyNL(),
        text: verse.text,
        reference: verse.reference,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        version,
        versionId: verse.versionId,
      }),
    )
  }, [verse, version])

  // The shared archive, from the same public route the app reads
  // (`?limit=60` as the app asks, so both share one cached copy). Only once
  // the dialog is opened, and at most once per mount: most dashboard visits
  // never open it, and a request on every load would spend Active CPU for
  // nothing. A failure leaves the device's own days on screen.
  useEffect(() => {
    if (!historyOpen || archiveRequest.current) return
    const controller = new AbortController()
    archiveRequest.current = controller
    setArchiveState("loading")
    fetch("/api/v1/daytext/history?limit=60", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((body) => {
        setArchive(parseDayTextArchive(body))
        setArchiveState("done")
      })
      .catch(() => {
        if (!controller.signal.aborted) setArchiveState("failed")
      })
  }, [historyOpen])

  // Cancelled on unmount, and forgotten, so a remount (Fast Refresh in dev)
  // asks again instead of waiting on a request that was aborted.
  useEffect(() => () => {
    archiveRequest.current?.abort()
    archiveRequest.current = null
  }, [])

  // Earlier days only: today is on the card itself. Worked out on every render
  // (a merge of at most 120 short rows) rather than memoised, so the clock is
  // read afresh: a dashboard left open past midnight moves yesterday's verse
  // into the list when the dialog is next opened.
  const earlierDays = previousDays(history, archive, dayKeyNL())

  // A short confirmation after a copy, since the clipboard gives no feedback
  // of its own.
  useEffect(() => {
    if (!shareNote) return
    const timer = setTimeout(() => setShareNote(null), 2500)
    return () => clearTimeout(timer)
  }, [shareNote])

  // Draws the tree off screen at 9:16 and copies its pixels. Null when there
  // is no canvas to copy (no tree yet, or it did not paint in time).
  async function captureShareTree(): Promise<HTMLCanvasElement | null> {
    flushSync(() => setShareTree(true))
    try {
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
        const canvas = shareTreeRef.current?.querySelector("canvas")
        // Until TreeCanvas measures its box the bitmap is the default 300 x 150.
        if (canvas && canvas.height >= SHARE_TREE_H * 0.5) {
          const copy = document.createElement("canvas")
          copy.width = canvas.width
          copy.height = canvas.height
          copy.getContext("2d")?.drawImage(canvas, 0, 0)
          return copy
        }
      }
      return null
    } finally {
      setShareTree(false)
    }
  }

  async function buildShareImage(useTree: boolean, label: string): Promise<Blob> {
    const logo = loadImage(SHARE_LOGO).catch(() => null)
    let source: CanvasImageSource | null = null
    let width = 0
    let height = 0
    let isPhoto = false
    if (useTree) {
      const tree = await captureShareTree()
      if (tree) {
        source = tree
        width = tree.width
        height = tree.height
      }
    }
    if (!source) {
      // The tree page falls back to the day's photo, here as on the card.
      const img = await loadImage(photo).catch(() => null)
      if (img) {
        source = img
        width = img.naturalWidth
        height = img.naturalHeight
        isPhoto = true
      }
    }
    // The page's own fonts (next/font's Lora and Inter), resolved.
    const serifFamily = verseRef.current
      ? getComputedStyle(verseRef.current).fontFamily
      : "Georgia, serif"
    const sansFamily = cardRef.current
      ? getComputedStyle(cardRef.current).fontFamily
      : "system-ui, sans-serif"
    return renderDailyVerseShareImage({
      background: source,
      backgroundWidth: width,
      backgroundHeight: height,
      photoWash: isPhoto,
      text: verse?.text ?? "",
      label,
      // A licensed translation's notice travels with its text, off the site too.
      attribution,
      logo: await logo,
      serifFamily,
      sansFamily,
    })
  }

  async function deliverShare(blob: Blob, title: string) {
    const result = await shareOrDownload(blob, shareFileName(), title)
    if (result === "blocked") setShareNote("Afbeelding klaar, tik nogmaals op delen")
    else if (result === "downloaded") setShareNote("Afbeelding gedownload")
  }

  // A 1080 x 1920 image of the verse over the chosen background: through the
  // share sheet where the browser can share files, else as a download.
  async function handleShare() {
    if (!verse || sharing) return
    const label = version ? `${verse.reference} ${version}` : verse.reference
    const title = `Tekst van de dag - ${verse.reference}`
    const useTree = background === "tree" && hasTree
    const key = `${photo}|${label}|${verse.text}|${useTree ? "tree" : "photo"}`
    const cached = lastShare.current
    if (cached && cached.key === key) {
      await deliverShare(cached.blob, title)
      return
    }
    setSharing(true)
    try {
      const blob = await buildShareImage(useTree, label)
      lastShare.current = { key, blob }
      await deliverShare(blob, title)
    } catch {
      setShareNote("Delen lukte niet")
    } finally {
      setSharing(false)
    }
  }

  // --- paging: swipe, drag, the dots and the arrow keys ---

  function isControl(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      Boolean(target.closest("button, a, input, textarea, select, [role='menu'], [role='dialog']"))
    )
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || isControl(event.target)) return
    const width = cardRef.current?.clientWidth ?? 0
    if (width <= 0) return
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
      width,
      swiping: false,
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    // Released outside the card before it became a swipe: forget it.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      drag.current = null
      return
    }
    const dx = event.clientX - d.x
    const dy = event.clientY - d.y
    if (!d.swiping) {
      if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return
      // Mostly vertical: a scroll, or a text selection going down - not ours.
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null
        return
      }
      d.swiping = true
      event.currentTarget.setPointerCapture(event.pointerId)
      window.getSelection()?.removeAllRanges()
      setAnimated(true)
    }
    const dt = event.timeStamp - d.lastT
    if (dt > 0) d.vx = (event.clientX - d.lastX) / dt
    d.lastX = event.clientX
    d.lastT = event.timeStamp
    let at = pageIndex - dx / d.width
    // Resistance past the first and last page, like a scroll's overscroll.
    if (at < 0) at *= 0.3
    else if (at > lastPage) at = lastPage + (at - lastPage) * 0.3
    setDragPage(Math.min(lastPage + PAGE_GIVE, Math.max(-PAGE_GIVE, at)))
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    if (!d.swiping) return
    const at = pageIndex - (event.clientX - d.x) / d.width
    // A fling turns the page in its direction; otherwise the nearest page.
    let target = d.vx < -FLING ? Math.ceil(at) : d.vx > FLING ? Math.floor(at) : Math.round(at)
    target = Math.min(lastPage, Math.max(0, target))
    setDragPage(null)
    selectBackground(DAILY_VERSE_BACKGROUNDS[target])
  }

  function onPointerCancel() {
    drag.current = null
    setDragPage(null)
  }

  function onDotKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let next = pageIndex
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(lastPage, pageIndex + 1)
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, pageIndex - 1)
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = lastPage
    else return
    event.preventDefault()
    selectBackground(DAILY_VERSE_BACKGROUNDS[next])
    dotRefs.current[next]?.focus()
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

  /**
   * Put today's verse in the reader's vriendenkring, as a copy: the reference
   * and the words travel with the request, so the post stands on its own even
   * after the day rolls over. `sourceId` is the day, which is what a later
   * "you already shared this" check would key on.
   */
  async function shareWithKring() {
    if (!verse) return
    await kringShare.share({
      kind: "verse",
      body: verse.text,
      reference: version ? `${verse.reference} ${version}` : verse.reference,
      sourceId: `daytext:${dayKeyNL()}`,
    })
  }

  const chapterHref = verse
    ? `/lezen?book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}&version=${encodeURIComponent(verse.readerVersion ?? verse.versionId ?? "statenvertaling")}`
    : "/lezen"

  const photo = dailyVersePhoto()

  return (
    // `min-h`, not `h`: 218 px is the design's height, but a long verse at a
    // phone's width (or four lines at the 680 px measure) needs more, and a
    // fixed height clipped it under the action row.
    //
    // The whole card takes the swipe (`touch-pan-y` leaves vertical scrolling
    // to the browser); presses on its buttons and links are left alone.
    <div
      ref={cardRef}
      className={`relative flex min-h-[218px] min-w-0 flex-none touch-pan-y flex-col overflow-hidden rounded-card ${dragPage !== null ? "cursor-grabbing select-none" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* TWO PAGES, SIDE BY SIDE, slid by `pagePos` (0 = photo, 1 = tree).

          The photo page is the day's nature photograph, the same file the app
          shows today (`dailyVersePhoto`), under a light wash of its own: the
          photos are mid-bright, and the wash is what keeps white text readable
          on the lightest skies and dunes.

          The tree page is the reader's own tree. `ProgressTreeScene` draws the
          landscape they built in the studio - their species, their scene,
          their animal, at their level - which is the same picture
          /profiel/boom and the navbar avatar show, from the provider the root
          layout already mounts. So it costs no request. `still`: one frame, no
          loop. A landscape moving behind the verse is the one thing atmosphere
          must not do on a screen someone is reading. The photograph stays
          underneath as its ground: it is what a reader with no tree yet, or
          one who switched the tree off, keeps there.

          Either way the same two scrims go over it: a flat layer that
          guarantees contrast over a bright sky, and a gradient that keeps the
          eyebrow and the action row readable over a light patch at either edge.
          Both are copied from the app's _PhotoScrim. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {DAILY_VERSE_BACKGROUNDS.map((kind, i) => (
          <div
            key={kind}
            className={`absolute inset-0 ${animated && dragPage === null ? "transition-transform duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" : ""}`}
            style={{ transform: `translateX(${(i - pagePos) * 100}%)` }}
          >
            <DayPhoto src={photo} />
            {kind === "tree" && hasTree && (
              // Over the photograph rather than instead of it, and faded in: the
              // provider answers a beat after the first paint, and a hard cut from
              // one landscape to another reads as a glitch.
              <div
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
          </div>
        ))}
      </div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0,0,0,0.34)",
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0.52) 100%)",
        }}
      />

      {/* The page indicator, top right: the current page's dot white, the
          other a faint white, following the drag. Each dot is a radio with a
          24 px target; the arrow keys move between them. */}
      <div
        role="radiogroup"
        aria-label="Achtergrond"
        onKeyDown={onDotKeyDown}
        className="absolute right-[18px] top-[14px] z-[2] flex items-center max-md:right-3"
      >
        {DAILY_VERSE_BACKGROUNDS.map((kind, i) => {
          const selected = kind === background
          const alpha = 1 - 0.6 * Math.min(1, Math.abs(i - Math.min(lastPage, Math.max(0, pagePos))))
          return (
            <button
              key={kind}
              ref={(el) => {
                dotRefs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={BACKGROUND_LABEL[kind]}
              title={BACKGROUND_LABEL[kind]}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectBackground(kind)}
              className="group flex h-6 w-[17px] items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <span
                className="block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: `rgba(255,255,255,${alpha})`,
                  boxShadow: "0 0 3px rgba(0,0,0,0.25)",
                }}
              />
            </button>
          )
        })}
      </div>

      <div className="relative z-[1] flex flex-1 flex-col px-[26px] pb-5 pt-[22px] max-md:px-5">
        {/* One eyebrow carries both the label and the reference, so the verse
            itself is the next thing the eye lands on. Kept clear of the dots. */}
        <p className="pr-12 text-[10.5px] font-semibold uppercase tracking-[1.5px] text-white/[0.82]">
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
            ref={verseRef}
            className="content-in mt-3 max-w-[680px] font-serif text-[21px] font-normal leading-[1.45] text-white sm:text-[25px]"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,.28)", overflowWrap: "break-word" }}
          >
            {verse.text}
          </p>
        ) : null}

        {/* The licensing line, verbatim - the NBG51 notice is a contractual
            string, so nothing here may reword or truncate it. Public-domain
            translations have none and render nothing. */}
        {!loading && verse && attribution && (
          <p className="mt-2 text-[11px] leading-snug text-white/[0.78]">{attribution}</p>
        )}

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
              <Heart
                size={19}
                color={liked ? HEART_RED : "currentColor"}
                fill={liked ? HEART_RED : "none"}
              />
            </span>
          </RoundAction>

          <RoundAction label="Delen" onClick={handleShare} disabled={!verse || sharing}>
            <Share2 size={19} />
          </RoundAction>

          {/* NOT MODAL, because an item here opens a Dialog. A modal menu and a
              modal Dialog both freeze the page by setting `pointer-events:
              none` on <body> and later put back the value they found. But
              react-menu and react-dialog each bundle their own copy of Radix's
              DismissableLayer (1.1.5 and 1.1.4), so neither sees the other.
              onSelect mounts the Dialog while the menu is still open, so the
              Dialog records the menu's "none" as the value to restore; the menu
              then closes and restores "", and closing the Dialog writes "none"
              back for good - nothing on the page could be clicked until a
              reload. A non-modal menu never touches <body>, so there is nothing
              to leave behind. Escape, an outside click and the arrow keys still
              work as before. The same fix is on the notes menu
              (app/notities/page.tsx). */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                ref={menuButton}
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
              {/* The kring gets the words, not the picture: "Delen" above
                  builds a 1080 x 1920 image for anywhere else, while this
                  posts the verse itself so a friend can tap through to the
                  chapter. Explicit, per plan section 8 - nothing about the
                  daily verse posts on its own. */}
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={!verse || kringShare.busy}
                onSelect={() => void shareWithKring()}
              >
                <Users size={14} className="mr-2" />
                {SHARE_TO_KRING_LABEL}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {kringShare.state !== "idle" && (
            <span role="status" className="text-[11px] text-white/85">
              {kringShare.message || SHARE_TO_KRING_FEEDBACK[kringShare.state]}
            </span>
          )}

          {sharing && (
            <span role="status" className="text-[11px] text-white/85">
              Afbeelding maken...
            </span>
          )}
          {!sharing && shareNote && (
            <span role="status" className="text-[11px] text-white/85">
              {shareNote}
            </span>
          )}
        </div>
      </div>

      {/* The tree for the share image, off screen at 9:16, only while a
          share is being drawn. */}
      {shareTree && (
        <div
          ref={shareTreeRef}
          aria-hidden
          className="pointer-events-none fixed top-0"
          style={{ left: -10_000, width: SHARE_TREE_W, height: SHARE_TREE_H }}
        >
          <ProgressTreeScene still className="h-full w-full" />
        </div>
      )}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        {/* The Dialog has no trigger of its own (it opens from a menu item
            that is gone by then), so without this focus would drop to the top
            of the page on close. Back to the "…" button it came from. */}
        <DialogContent
          className="max-w-lg max-h-[72vh] overflow-y-auto"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            menuButton.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>Voorgaande dagen</DialogTitle>
          </DialogHeader>

          {/* The device's own days show at once; the archive's join them when
              it answers. "idle" counts as waiting: it is the one render
              between opening and the request going out. */}
          {earlierDays.length === 0 ? (
            archiveState === "idle" || archiveState === "loading" ? (
              <p role="status" className="text-sm text-gray-500 dark:text-muted-foreground">
                Eerdere dagen laden…
              </p>
            ) : archiveState === "failed" ? (
              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                De eerdere dagen konden nu niet worden geladen. Probeer het later nog eens.
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                Er zijn nog geen eerdere dagen. De tekst van vandaag staat hier vanaf morgen.
              </p>
            )
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-border">
              {earlierDays.map((entry) => (
                <li key={entry.date} className="py-3.5">
                  <Link
                    href={`/lezen?book=${encodeURIComponent(entry.book)}&chapter=${entry.chapter}&version=${encodeURIComponent(entry.versionId ?? "statenvertaling")}`}
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
                    {getBibleAttribution(entry.versionId) && (
                      <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-muted-foreground">
                        {getBibleAttribution(entry.versionId)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {earlierDays.length > 0 && (archiveState === "idle" || archiveState === "loading") && (
            <p role="status" className="pt-1 text-xs text-gray-400 dark:text-muted-foreground">
              Meer dagen laden…
            </p>
          )}
          {earlierDays.length > 0 && archiveState === "failed" && (
            <p className="pt-1 text-xs text-gray-400 dark:text-muted-foreground">
              Alleen de dagen die in deze browser bewaard zijn; de rest kon nu niet worden geladen.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** The day's photo, cover-cropped, under a light wash of its own. */
function DayPhoto({ src }: { src: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/[0.18]" />
    </>
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
