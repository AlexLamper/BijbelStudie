"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Check, BookOpen, BookMarked, Library, Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import TreeCanvas from "../levensboom/TreeCanvas"
import { useLevensboom } from "../../hooks/useLevensboom"
import { catalogItem } from "../../lib/levensboom/catalog"
import { getBibleAttribution } from "../../lib/bible-attribution"
import { cn } from "../../lib/utils"
import {
  useStudyStyle,
  normaliseStudyStyle,
  DEFAULT_STUDY_STYLE,
  type StudyStyle,
} from "../providers/study-style-provider"

/**
 * First-run preferences.
 *
 * A full-screen surface, not a dialog over the page. A new account has nothing
 * behind these five questions worth showing, and a card floating over a dimmed
 * dashboard read as an interruption of something the visitor was already
 * doing. The surface is opaque and painted in the app's own colours, so the
 * theme step restyles the whole screen the moment an option is chosen.
 *
 * Radix's Dialog primitives are still underneath - they own the focus trap,
 * the scroll lock and the title/description wiring - but they are composed
 * here rather than through components/ui/dialog.tsx, whose content component
 * puts a close button in the corner. Nothing on this screen closes it
 * implicitly: Escape and pointer-downs outside are cancelled, and there is no
 * open-change handler to call. Skipping is the visible "Overslaan" button,
 * which keeps the defaults; it is never a gate.
 *
 * The translation step used to render a hardcoded array with exactly one entry
 * in it, so the "choice" was a single button the user had to press to continue.
 * The list now comes from `/api/bible/versions` - the same manifest the study
 * page reads - filtered to Dutch, so whatever the deployment actually serves is
 * what the user is offered. The local tables below only carry the one-line
 * descriptions; a translation added to the manifest still appears here without
 * a code change, just without a subtitle.
 */

interface ApiEntry {
  id: string
  name: string
  language?: string
}

interface Choice {
  code: string
  label: string
  desc?: string
  /** Contractual attribution, reproduced verbatim where one exists. */
  attribution?: string | null
}

/** Descriptions only. The set of options is whatever the API returns. */
const TRANSLATION_NOTES: Record<string, string> = {
  statenvertaling: "De klassieke Nederlandse vertaling (1637)",
  nbg51: "Vertrouwde kerkvertaling uit 1951",
  heilige_schrift_1917: "NBG-vertaling, lange tijd standaard in kerken",
  canisiusbijbel: "Rooms-katholieke vertaling met deuterocanonieke boeken",
}

const COMMENTARY_NOTES: Record<string, string> = {
  matthew_henry_nl: "Klassiek commentaar uit 1706, devotionele insteek",
  kingcomments_nl: "Eigentijds Nederlands commentaar, vers-voor-vers",
  dachsel: "Duits piëtistisch commentaar, in het Nederlands",
}

/**
 * Used only when the API cannot be reached. It is the same value the User
 * schema defaults to, so a failed fetch cannot leave someone on a translation
 * the server would not have given them anyway.
 */
const FALLBACK_TRANSLATIONS: Choice[] = [
  {
    code: "statenvertaling",
    label: "Statenvertaling",
    desc: TRANSLATION_NOTES.statenvertaling,
  },
]

const FALLBACK_COMMENTARIES: Choice[] = [
  {
    code: "matthew_henry_nl",
    label: "Matthew Henry (NL)",
    desc: COMMENTARY_NOTES.matthew_henry_nl,
  },
]

const THEMES: Choice[] = [
  { code: "light", label: "Licht", desc: "Helder wit - prettig overdag" },
  { code: "dark", label: "Donker", desc: "Rustgevend donker - minder vermoeiend" },
  { code: "system", label: "Systeem", desc: "Volgt automatisch je apparaatinstelling" },
]

const THEME_ICONS: Record<string, typeof Sun> = { light: Sun, dark: Moon, system: Monitor }

/**
 * Step 1: guided study, or reading on your own.
 *
 * It goes first for two reasons. It is the only answer here that changes the
 * shape of the app rather than its contents - it decides which item sits
 * directly under Dashboard in the sidebar - so it belongs before the settings
 * it frames. And it is the one step that needs nothing from the network, so the
 * first thing a new account sees is a real question instead of the three grey
 * skeletons the translation list used to open on while its fetch resolved.
 *
 * Each card names its own consequence in the footer. A menu that quietly
 * rearranges itself after a dialog closes reads as a glitch; a menu that
 * rearranges itself after you were told it would reads as the product doing
 * what you asked.
 *
 * The icons are the ones these two destinations already carry in the sidebar
 * (BookMarked = Studies, BookOpen = Lezen). That is the entire justification
 * for them being here - they identify where the choice leads, and they are the
 * icons the user will be clicking from tomorrow on. Ornament next to a heading
 * would not have earned its place.
 */
const STUDY_STYLE_OPTIONS: {
  code: StudyStyle
  icon: typeof BookOpen
  label: string
  desc: string
  points: string[]
  result: string
  track: string
}[] = [
  {
    code: "guided",
    icon: BookMarked,
    label: "Begeleide studie",
    desc: "Wij bepalen de route. Je werkt een studie les voor les door, met vragen en uitleg onderweg.",
    points: ["Les voor les door één thema", "Uitleg en vragen bij elke stap"],
    result: "Studies staat vooraan in je menu",
    track: "onboarding_mode_guided",
  },
  {
    code: "self",
    icon: BookOpen,
    label: "Zelf lezen",
    desc: "Jij bepaalt de route. Je kiest zelf je hoofdstuk en leest in je eigen tempo.",
    points: ["Elk bijbelboek meteen open", "Commentaar en notities ernaast"],
    result: "Lezen staat vooraan in je menu",
    track: "onboarding_mode_self",
  },
]

const TOTAL = 5

/**
 * Step 5, "Plant je boom": the two free species. The tree is the face of the
 * account, so the choice is made where the account is set up - and it is the
 * grown tree that is shown, because a kiem looks the same in every species.
 */
type PlantSpecies = "eik" | "olijf"
const PLANT_OPTIONS: { code: PlantSpecies; label: string; desc: string; verse: string }[] = [
  { code: "eik", label: catalogItem("species", "eik")?.name ?? "Eik", desc: catalogItem("species", "eik")?.blurb ?? "", verse: "Genesis 18:1" },
  { code: "olijf", label: catalogItem("species", "olijf")?.name ?? "Olijfboom", desc: catalogItem("species", "olijf")?.blurb ?? "", verse: "Psalm 52:10" },
]

const TEAL = "#0D9488"
/** #0D9488 is 3.7:1 on white - a fill colour, not a text colour. */
const TEAL_TEXT = "#0F766E"
/**
 * Teal as ink, in both themes. teal-700 is TEAL_TEXT; on the dark ground it
 * falls to 3.3:1, so dark mode steps up to teal-400 (9.6:1 on #171717).
 */
const TEAL_INK = "text-teal-700 dark:text-teal-400"

/**
 * The order the translations are offered in.
 *
 * The manifest orders by whatever the sync script wrote last, which put the
 * translation almost nobody picks first. This is the order someone choosing
 * their default would expect: the two in widest use, then the rest. Anything not
 * listed keeps its manifest position, after these.
 */
const TRANSLATION_ORDER = [
  "statenvertaling",
  "nbg51",
  "canisiusbijbel",
  "heilige_schrift_1917",
]

/** Dutch-only product: anything else in the manifest is not offered here. */
function toDutchChoices(
  entries: unknown,
  notes: Record<string, string>,
  withAttribution: boolean,
): Choice[] | null {
  if (!Array.isArray(entries)) return null
  const dutch = (entries as ApiEntry[]).filter(e => e?.language === "nl" && e?.id)
  if (dutch.length === 0) return null

  const rank = (id: string) => {
    const index = TRANSLATION_ORDER.indexOf(id)
    return index === -1 ? TRANSLATION_ORDER.length : index
  }

  return dutch
    .map((e, index) => ({ e, index }))
    // Stable: equal ranks keep the manifest's own order.
    .sort((a, b) => rank(a.e.id) - rank(b.e.id) || a.index - b.index)
    .map(({ e }) => ({
      code: e.id,
      label: e.name || e.id,
      desc: notes[e.id],
      attribution: withAttribution ? getBibleAttribution(e.id) : null,
    }))
}

/**
 * One selectable card, in either theme. At rest it is one of the app's own
 * cards - white on the off-white ground, `card` on the dark one - with the
 * theme's hairline. Selected, it takes the brand border (set inline, see
 * TEAL) and a mint tint that is still visible on near-black. Every colour
 * here is a theme class, so the whole set re-paints when step 4 flips the
 * theme.
 */
function cardClass(active: boolean) {
  return cn(
    "group relative cursor-pointer border-2 text-left transition-all duration-200 motion-reduce:transition-none",
    "ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600 has-[:focus-visible]:ring-offset-2",
    active
      ? "bg-teal-50 shadow-[0_10px_26px_-14px_rgba(13,148,136,0.55)] dark:bg-[rgba(13,148,136,0.14)]"
      : "border-border bg-card shadow-sm hover:border-gray-300 dark:shadow-none dark:hover:border-neutral-600",
  )
}

/** The radio mark every card carries in its corner. Decorative to AT: the real radio is the sr-only input. */
function RadioMark({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 motion-reduce:transition-none",
        !active && "border-gray-300 bg-transparent dark:border-neutral-600",
      )}
      style={active ? { borderColor: TEAL, backgroundColor: TEAL } : undefined}
    >
      {active && <Check className="h-3 w-3 text-white" />}
    </span>
  )
}

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  /**
   * Walk the flow without writing anything.
   *
   * The real run saves in four places - the preferences POST that also sets
   * `onboardingCompleted`, `plant()`, the study-style context and the theme -
   * and every one of them would rewrite the account of whoever is reviewing
   * the flow. In preview all four are suppressed and the theme is put back to
   * what it was on the way out, so the reviewer's own account is exactly as
   * they left it. See components/admin/OnboardingPreviewButton.tsx.
   */
  preview?: boolean
}

export function OnboardingModal({
  isOpen: initialIsOpen,
  onClose,
  onComplete,
  preview = false,
}: OnboardingModalProps) {
  const [open, setOpen] = useState(initialIsOpen)
  const [step, setStep] = useState(1)
  const { setTheme, theme: activeTheme } = useTheme()
  const router = useRouter()

  // The theme the reviewer arrived with, captured once so a preview run can
  // put it back. `useRef` rather than state: reading it must never re-render,
  // and it must not follow the choices made inside the flow.
  const themeOnOpen = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (preview && themeOnOpen.current === undefined && activeTheme) {
      themeOnOpen.current = activeTheme
    }
  }, [preview, activeTheme])

  const [translations, setTranslations] = useState<Choice[] | null>(null)
  const [commentaries, setCommentaries] = useState<Choice[] | null>(null)

  // `intent` is the THEME choice, not a study intent - the field has carried
  // the theme since the first version of this modal and renaming it now would
  // orphan every document that already has one. The study-style answer lives in
  // its own `studyStyle` field for exactly that reason.
  //
  // `studyStyle` starts on the guided default like every other step here starts
  // on a value: the app is a study app before it is a reader, so that is the
  // house answer, and someone who skips onboarding lands on the menu order they
  // would have had anyway.
  const [prefs, setPrefs] = useState<{
    translation: string
    commentary: string
    intent: string
    studyStyle: StudyStyle
  }>({
    translation: "statenvertaling",
    commentary: "matthew_henry_nl",
    intent: "light",
    studyStyle: DEFAULT_STUDY_STYLE,
  })

  const { setStudyStyle } = useStudyStyle()

  // The seed is the account id, which the provider already knows; before it
  // has loaded the preview simply uses a stable stand-in.
  const { data: levensboom, plant } = useLevensboom()
  const [species, setSpecies] = useState<PlantSpecies>("eik")

  useEffect(() => { setOpen(initialIsOpen) }, [initialIsOpen])

  // Both lists are fetched up front so step 2 never shows its own spinner.
  useEffect(() => {
    let cancelled = false

    const load = async (url: string, notes: Record<string, string>, withAttribution: boolean) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        return toDutchChoices(await res.json(), notes, withAttribution)
      } catch {
        return null
      }
    }

    Promise.all([
      load("/api/bible/versions", TRANSLATION_NOTES, true),
      load("/api/commentaries", COMMENTARY_NOTES, false),
    ]).then(([v, c]) => {
      if (cancelled) return
      const nextTranslations = v ?? FALLBACK_TRANSLATIONS
      const nextCommentaries = c ?? FALLBACK_COMMENTARIES
      setTranslations(nextTranslations)
      setCommentaries(nextCommentaries)

      // The schema defaults may not be in what this deployment serves. Falling
      // back to the first option keeps a radio selected, so the user is never
      // looking at a step where nothing is chosen and Volgende saves a
      // translation the server cannot open.
      setPrefs(p => ({
        ...p,
        translation: nextTranslations.some(o => o.code === p.translation)
          ? p.translation
          : nextTranslations[0].code,
        commentary: nextCommentaries.some(o => o.code === p.commentary)
          ? p.commentary
          : nextCommentaries[0].code,
      }))
    })

    return () => { cancelled = true }
  }, [])

  // The step-to-step transition: the question block fades and slides a few
  // pixels in the direction of travel. `goTo` hides the block in the same
  // render that swaps the step, so the new question is never painted at full
  // opacity before it starts; the effect then waits for that hidden frame to
  // be painted (two frames, not one, so the transition cannot be coalesced
  // away) before revealing it. `motion-reduce` keeps the block visible
  // throughout and turns the transition off, so nothing readable waits on it.
  const [entered, setEntered] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [step])

  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1)
    setEntered(false)
    setStep(target)
  }

  // One finish at a time: a double tap on "Planten en beginnen" must not plant
  // twice or post the preferences twice.
  const [busy, setBusy] = useState(false)

  const saveAndClose = async () => {
    // Applied to the live app before the request goes out, not after it comes
    // back. The sidebar reads this from context, so the menu behind the dialog
    // is already in its new order the moment the dialog closes - `router.refresh()`
    // re-runs the server render but next-auth's SessionProvider only reads its
    // `session` prop once, on mount, so waiting for the round trip would leave
    // the nav stale until the next full page load.
    setStudyStyle(prefs.studyStyle)
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefs, onboardingCompleted: true }),
      })
      router.refresh()
    } catch {}
  }

  const finish = async (complete: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (preview) {
        // Nothing is saved and nothing is planted. Hand the reviewer back the
        // theme they came in with, since the theme step changed it live.
        if (themeOnOpen.current) setTheme(themeOnOpen.current)
        setOpen(false)
        if (complete) onComplete()
        else onClose()
        return
      }
      await saveAndClose()
      // Planting is the last step's own save: skipping keeps the eik.
      if (complete) await plant(species)
      setOpen(false)
      if (complete) onComplete()
      else onClose()
    } finally {
      setBusy(false)
    }
  }

  const next = async () => {
    if (step < TOTAL) goTo(step + 1)
    else await finish(true)
  }

  /**
   * Step 1 is the only step rendered as a pair of cards rather than a list of
   * rows, so it is the one branch the options block below has to know about.
   */
  const isStyleStep = step === 1
  const isPlantStep = step === TOTAL

  const { title, subtitle, options, selected, onSelect, group, loading } = useMemo(() => {
    if (step === 1) {
      return {
        title: "Hoe studeer je het liefst?",
        subtitle: "We zetten voorop wat jij het meest gebruikt. Je kunt dit later altijd aanpassen.",
        options: [] as Choice[],
        selected: prefs.studyStyle as string,
        onSelect: (code: string) => setPrefs(p => ({ ...p, studyStyle: normaliseStudyStyle(code) })),
        group: "studyStyle",
        loading: false,
      }
    }
    if (step === 2) {
      return {
        title: "Kies je bijbelvertaling",
        subtitle: "Welke vertaling wil je standaard gebruiken bij het studeren? Je kunt altijd wisselen.",
        options: translations ?? [],
        selected: prefs.translation,
        onSelect: (code: string) => setPrefs(p => ({ ...p, translation: code })),
        group: "translation",
        loading: translations === null,
      }
    }
    if (step === 3) {
      return {
        title: "Kies je commentaar",
        subtitle: "Bij elk hoofdstuk lees je uitleg naast de tekst. Welke uitleg heeft je voorkeur?",
        options: commentaries ?? [],
        selected: prefs.commentary,
        onSelect: (code: string) => setPrefs(p => ({ ...p, commentary: code })),
        group: "commentary",
        loading: commentaries === null,
      }
    }
    if (step === 4) {
      return {
        title: "Kies je weergave",
        subtitle: "Hoe wil je de app weergeven? Je kunt dit later altijd aanpassen.",
        options: THEMES,
        selected: prefs.intent,
        onSelect: (code: string) => { setPrefs(p => ({ ...p, intent: code })); setTheme(code) },
        group: "theme",
        loading: false,
      }
    }
    return {
      title: "Plant je boom",
      subtitle: "Je boom groeit mee met alles wat je leest en bestudeert. Kies waarmee hij begint; meer soorten ontgrendel je onderweg.",
      options: [] as Choice[],
      selected: species as string,
      onSelect: (code: string) => setSpecies(code === "olijf" ? "olijf" : "eik"),
      group: "species",
      loading: false,
    }
  }, [step, translations, commentaries, prefs, setTheme, species])

  const iconFor = (code: string) => (step === 4 ? THEME_ICONS[code] ?? Monitor : step === 3 ? Library : BookOpen)

  return (
    // Controlled, and deliberately without an onOpenChange: the primitives'
    // own dismiss paths (Escape, pointer-down outside) are cancelled on the
    // content below, and even if one slipped through there is no handler for
    // it to close the screen with. The two buttons in the footer are the only
    // way out.
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        {/* Opaque, in the theme's ground colour, so nothing of the page shows
            through - the content below covers the viewport as well, but the
            overlay is what guarantees it on a viewport whose height shifts
            under a mobile browser's toolbars. */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background text-foreground outline-none"
          onEscapeKeyDown={e => e.preventDefault()}
          onPointerDownOutside={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
        >
          {/* `min-h-full` rather than a fixed height: when the question block
              is taller than the viewport (a phone on step 2, with four
              translations and their attributions) the column grows and the
              surface scrolls instead of clipping the centred block. */}
          <div className="flex min-h-full flex-col">

            {/* Top bar: who is asking, and how far along you are. The five
                segments are the visual indicator; the "Stap x van y" line above
                the question is the same information as text, which is what a
                screen reader gets. */}
            <div className="flex items-center justify-between gap-6 px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex items-center gap-2.5">
                <Image src="/images/icon-192.png" alt="" width={28} height={28} className="rounded-lg" />
                <span className="text-[15px] font-bold text-foreground">
                  Bijbel<span style={{ color: "#0F766E" }}>Studie</span>
                </span>
              </div>
              <div aria-hidden="true" className="flex items-center gap-1.5">
                {Array.from({ length: TOTAL }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-6 rounded-full transition-colors duration-300 motion-reduce:transition-none sm:w-10",
                      i >= step && "bg-gray-300 dark:bg-neutral-700",
                    )}
                    style={i < step ? { backgroundColor: TEAL } : undefined}
                  />
                ))}
              </div>
            </div>

            {/* The question, centred in whatever is left. One column width on
                every step - a block that resizes as you page through it draws
                the eye to its edges instead of to the question. */}
            <div className="flex flex-1 flex-col items-center justify-center px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-8">
              <div
                className={cn(
                  "w-full max-w-[640px] transition-all duration-300 ease-out motion-reduce:transition-none 2xl:max-w-[720px]",
                  entered
                    ? "translate-y-0 opacity-100"
                    : cn(
                        "opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
                        direction === 1 ? "translate-y-3" : "-translate-y-3",
                      ),
                )}
              >
                {/* Announced as one unit when the step changes. */}
                <div aria-live="polite" aria-atomic="true">
                  <p className={cn("mb-3 text-xs font-bold uppercase tracking-widest", TEAL_INK)}>
                    Stap {step} van {TOTAL}
                  </p>
                  <DialogPrimitive.Title asChild>
                    <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl 2xl:text-4xl">
                      {title}
                    </h1>
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-gray-600 dark:text-muted-foreground sm:text-base">
                    {subtitle}
                  </DialogPrimitive.Description>
                </div>

                {/* Options */}
                <div
                  className={cn(
                    "mt-8",
                    isStyleStep || isPlantStep
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
                      : "flex flex-col gap-3",
                  )}
                  role="radiogroup"
                  aria-label={title}
                >
                  {isPlantStep
                    ? PLANT_OPTIONS.map(o => {
                        const active = selected === o.code
                        return (
                          <label
                            key={o.code}
                            className={cn(
                              cardClass(active),
                              "flex flex-col overflow-hidden rounded-2xl hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                            )}
                            style={active ? { borderColor: TEAL } : undefined}
                          >
                            <input
                              type="radio"
                              name={group}
                              value={o.code}
                              checked={active}
                              onChange={() => onSelect(o.code)}
                              className="sr-only"
                            />
                            <span className="block aspect-[4/3] w-full overflow-hidden">
                              <TreeCanvas
                                seed={levensboom?.levensboom?.seed ?? "levensboom"}
                                level={7}
                                frac={0.6}
                                species={o.code}
                                scene="waterbeken"
                                framing="scene"
                                still
                                className="block h-full w-full"
                                ariaLabel=""
                              />
                            </span>
                            <span className="flex items-start justify-between gap-3 p-4">
                              <span className="min-w-0">
                                <span className="block text-[15px] font-bold leading-snug text-foreground">
                                  {o.label}
                                </span>
                                <span className="mt-1 block text-[12.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
                                  {o.desc}
                                </span>
                                <span className={cn("mt-2 block text-[11px] font-semibold", TEAL_INK)}>
                                  {o.verse}
                                </span>
                              </span>
                              <RadioMark active={active} />
                            </span>
                          </label>
                        )
                      })
                    : isStyleStep
                    ? STUDY_STYLE_OPTIONS.map(o => {
                        const active = selected === o.code
                        const Icon = o.icon
                        return (
                          // The landing page's feature-card treatment: rounded-2xl
                          // on a hairline border, a teal-tinted icon tile, a bold
                          // title over muted body copy, and a shadow that lifts on
                          // hover. Two boxes with labels would have made the user
                          // read to tell them apart; this makes the difference
                          // visible before the copy is read.
                          <label
                            key={o.code}
                            // Same naming scheme as the rest of the app's instrumented
                            // controls - see CLICK_TARGETS in lib/analyticsRoutes.ts,
                            // where both values are registered. A preview run is
                            // not instrumented: an admin clicking through the flow
                            // must not land in the onboarding funnel on /admin/insights.
                            data-track={preview ? undefined : o.track}
                            className={cn(
                              cardClass(active),
                              "flex flex-col rounded-2xl p-5 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                            )}
                            style={active ? { borderColor: TEAL } : undefined}
                          >
                            <input
                              type="radio"
                              name={group}
                              value={o.code}
                              checked={active}
                              onChange={() => onSelect(o.code)}
                              className="sr-only"
                            />

                            <span className="mb-4 flex items-start justify-between">
                              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-[rgba(13,148,136,0.2)] dark:text-teal-300">
                                <Icon className="h-[18px] w-[18px]" />
                              </span>
                              <RadioMark active={active} />
                            </span>

                            <span className="block text-[15px] font-bold leading-snug text-foreground">
                              {o.label}
                            </span>
                            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
                              {o.desc}
                            </span>

                            <span className="mt-3.5 flex flex-col gap-1.5">
                              {o.points.map(p => (
                                <span
                                  key={p}
                                  className="flex items-start gap-2 text-[11.5px] leading-snug text-gray-600 dark:text-muted-foreground"
                                >
                                  {/* A bullet, not an icon: the two icons in this step
                                      already carry meaning and a second glyph next to
                                      every line would be pure ornament. */}
                                  <span
                                    aria-hidden="true"
                                    className="mt-[5px] h-1 w-1 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: TEAL }}
                                  />
                                  <span>{p}</span>
                                </span>
                              ))}
                            </span>

                            {/* What the choice actually does, spelled out on the card
                                that does it. `mt-auto` keeps the two footers on the
                                same line when the descriptions differ in height. */}
                            <span
                              className={cn(
                                "mt-auto block border-t pt-4 text-[11px] font-semibold leading-snug",
                                active
                                  ? cn("border-[rgba(13,148,136,0.25)] dark:border-[rgba(13,148,136,0.4)]", TEAL_INK)
                                  : "border-border text-gray-500 dark:text-muted-foreground",
                              )}
                            >
                              {o.result}
                            </span>
                          </label>
                        )
                      })
                    : loading
                    ? [0, 1, 2].map(i => (
                        <div
                          key={i}
                          aria-hidden="true"
                          className="h-[74px] animate-pulse rounded-xl border-2 border-border bg-card motion-reduce:animate-none"
                        />
                      ))
                    : options.map(o => {
                        const active = selected === o.code
                        const Icon = iconFor(o.code)
                        return (
                          <label
                            key={o.code}
                            className={cn(cardClass(active), "flex items-center justify-between gap-3 rounded-xl p-4")}
                            style={active ? { borderColor: TEAL } : undefined}
                          >
                            <input
                              type="radio"
                              name={group}
                              value={o.code}
                              checked={active}
                              onChange={() => onSelect(o.code)}
                              className="sr-only"
                            />
                            <span className="flex min-w-0 items-center gap-3.5">
                              {/* The tile follows the theme: `muted` on the card at
                                  rest, a teal tint when selected. The icon takes its
                                  colour from the tile, so the pair always agree. */}
                              <span
                                className={cn(
                                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none",
                                  active
                                    ? "bg-[rgba(13,148,136,0.12)] text-teal-700 dark:bg-[rgba(13,148,136,0.24)] dark:text-teal-300"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                <Icon className="h-[18px] w-[18px]" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[15px] font-semibold text-foreground">
                                  {o.label}
                                </span>
                                {o.desc && (
                                  <span className="mt-0.5 block text-[13px] text-gray-600 dark:text-muted-foreground">
                                    {o.desc}
                                  </span>
                                )}
                                {/* Reproduced exactly as the licence requires. */}
                                {o.attribution && (
                                  <span className="mt-1 block text-[11px] text-gray-600 dark:text-muted-foreground">
                                    {o.attribution}
                                  </span>
                                )}
                              </span>
                            </span>
                            <RadioMark active={active} />
                          </label>
                        )
                      })}
                </div>

                {/* Actions, in the same column as the question so the answer and
                    the button that confirms it stay one movement of the eye
                    apart, on a phone and on a 4K display alike. */}
                <div className="mt-8">
                  <button
                    onClick={next}
                    disabled={busy}
                    className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 motion-reduce:transition-none"
                    style={{ backgroundColor: TEAL_TEXT }}
                  >
                    {step === TOTAL ? "Planten en beginnen" : "Volgende"}
                  </button>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => goTo(step - 1)}
                      disabled={step === 1}
                      className="py-2 text-sm text-gray-600 transition-colors hover:text-gray-900 disabled:invisible motion-reduce:transition-none dark:text-muted-foreground dark:hover:text-foreground"
                    >
                      Terug
                    </button>
                    {/* Onboarding is never a gate: skipping keeps the defaults. */}
                    <button
                      onClick={() => finish(false)}
                      disabled={busy}
                      className="py-2 text-sm text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-60 motion-reduce:transition-none dark:text-muted-foreground dark:hover:text-foreground"
                    >
                      Overslaan
                    </button>
                  </div>

                  {step === TOTAL && (
                    <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-muted-foreground">
                      Lezen is gratis, in elke vertaling. Met{" "}
                      <Link
                        href="/abonnement"
                        className={cn("font-semibold underline underline-offset-2", TEAL_INK)}
                      >
                        Pro
                      </Link>{" "}
                      lees je commentaren volledig, open je de grondtekst en stel je meer vragen aan de
                      AI-assistent.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
