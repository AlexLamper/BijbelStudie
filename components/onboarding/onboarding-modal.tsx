"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, BookOpen, BookMarked, Library, Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getBibleAttribution } from "../../lib/bible-attribution"
import {
  useStudyStyle,
  normaliseStudyStyle,
  DEFAULT_STUDY_STYLE,
  type StudyStyle,
} from "../providers/study-style-provider"

/**
 * First-run preferences.
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

const TOTAL = 4

const TEAL = "#0D9488"
/** #0D9488 is 3.7:1 on white - a fill colour, not a text colour. */
const TEAL_TEXT = "#0F766E"
/** The landing page's feature-card icon tile, reused at modal scale. */
const TEAL_TILE = "#CCFBF1"
const BORDER = "#E5E7EB"

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

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function OnboardingModal({ isOpen: initialIsOpen, onClose, onComplete }: OnboardingModalProps) {
  const [open, setOpen] = useState(initialIsOpen)
  const [step, setStep] = useState(1)
  const { setTheme } = useTheme()
  const router = useRouter()

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

  // A one-frame fade as the panel swaps. `motion-reduce` turns it off, and the
  // dialog is client-only by construction, so nothing readable waits on it.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    setEntered(false)
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [step])

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
    await saveAndClose()
    setOpen(false)
    if (complete) onComplete()
    else onClose()
  }

  const next = async () => {
    if (step < TOTAL) setStep(s => s + 1)
    else await finish(true)
  }

  /**
   * Step 1 is the only step rendered as a pair of cards rather than a list of
   * rows, so it is the one branch the options block below has to know about.
   */
  const isStyleStep = step === 1

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
    return {
      title: "Kies je weergave",
      subtitle: "Hoe wil je de app weergeven? Je kunt dit later altijd aanpassen.",
      options: THEMES,
      selected: prefs.intent,
      onSelect: (code: string) => { setPrefs(p => ({ ...p, intent: code })); setTheme(code) },
      group: "theme",
      loading: false,
    }
  }, [step, translations, commentaries, prefs, setTheme])

  const iconFor = (code: string) => (step === 4 ? THEME_ICONS[code] ?? Monitor : step === 3 ? Library : BookOpen)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish(false)}>
      {/* 560px rather than the old 440: step 1 puts two option cards next to
          each other, and the width is constant across steps because a dialog
          that resizes as you page through it draws the eye to the frame instead
          of to the question. Below the sm breakpoint the cards stack and the
          base max-w-lg takes over. */}
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden gap-0 rounded-2xl border border-gray-200 dark:border-border shadow-2xl">

        {/* Header */}
        <div className="px-7 pt-7 pb-2">
          <div className="flex items-center gap-2 mb-6">
            <Image src="/images/icon-192.png" alt="" width={22} height={22} className="rounded-md" />
            <span className="font-bold text-sm text-gray-900 dark:text-foreground">BijbelStudie</span>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: TEAL_TEXT }}>
            Stap {step} van {TOTAL}
          </p>

          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-foreground leading-snug">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-muted-foreground mt-1">
            {subtitle}
          </DialogDescription>
        </div>

        {/* Options */}
        <div
          className={`px-7 py-5 transition-all duration-200 ease-out motion-reduce:transition-none ${
            isStyleStep ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "flex flex-col gap-2.5"
          } ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          role="radiogroup"
          aria-label={title}
        >
          {isStyleStep
            ? STUDY_STYLE_OPTIONS.map(o => {
                const active = selected === o.code
                const Icon = o.icon
                return (
                  // The landing page's feature-card treatment at modal scale:
                  // rounded-2xl on a hairline border, a teal-tinted icon tile,
                  // a bold title over muted body copy, and the same 1px shadow
                  // that lifts on hover. Two boxes with labels would have made
                  // the user read to tell them apart; this makes the difference
                  // visible before the copy is read.
                  <label
                    key={o.code}
                    // Same naming scheme as the rest of the app's instrumented
                    // controls - see CLICK_TARGETS in lib/analyticsRoutes.ts,
                    // where both values are registered.
                    data-track={o.track}
                    className="group relative flex flex-col rounded-2xl border-2 p-5 text-left cursor-pointer transition-all duration-200 motion-reduce:transition-none hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600 has-[:focus-visible]:ring-offset-2"
                    style={{
                      borderColor: active ? TEAL : BORDER,
                      backgroundColor: active ? "rgba(13,148,136,0.05)" : "transparent",
                      boxShadow: active
                        ? "0 10px 26px -14px rgba(13,148,136,0.55)"
                        : "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <input
                      type="radio"
                      name={group}
                      value={o.code}
                      checked={active}
                      onChange={() => onSelect(o.code)}
                      className="sr-only"
                    />

                    <span className="flex items-start justify-between mb-4">
                      <span
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: TEAL_TILE,
                          backgroundImage: `linear-gradient(135deg, ${TEAL_TILE}, rgba(13,148,136,0.05))`,
                        }}
                      >
                        <Icon className="h-[18px] w-[18px]" style={{ color: TEAL }} />
                      </span>
                      <span
                        className="flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 motion-reduce:transition-none"
                        style={{
                          borderColor: active ? TEAL : "#D1D5DB",
                          backgroundColor: active ? TEAL : "transparent",
                        }}
                      >
                        {active && <Check className="h-3 w-3 text-white" />}
                      </span>
                    </span>

                    <span className="block font-bold text-[15px] leading-snug text-gray-900 dark:text-foreground">
                      {o.label}
                    </span>
                    <span className="block text-[12.5px] leading-relaxed text-gray-600 dark:text-muted-foreground mt-1.5">
                      {o.desc}
                    </span>

                    <span className="flex flex-col gap-1.5 mt-3.5">
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
                            className="mt-[5px] h-1 w-1 rounded-full flex-shrink-0"
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
                      className="block mt-auto pt-4 border-t text-[11px] font-semibold leading-snug"
                      style={{
                        borderColor: active ? "rgba(13,148,136,0.25)" : BORDER,
                        color: active ? TEAL_TEXT : "#6B7280",
                      }}
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
                  className="h-[68px] rounded-xl border-2 border-gray-100 dark:border-border bg-gray-50 dark:bg-secondary/40"
                />
              ))
            : options.map(o => {
                const active = selected === o.code
                const Icon = iconFor(o.code)
                return (
                  <label
                    key={o.code}
                    className="group flex items-center justify-between p-4 rounded-xl border-2 text-left cursor-pointer transition-all duration-200 motion-reduce:transition-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600 has-[:focus-visible]:ring-offset-2"
                    style={{
                      borderColor: active ? TEAL : BORDER,
                      backgroundColor: active ? "rgba(13,148,136,0.05)" : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name={group}
                      value={o.code}
                      checked={active}
                      onChange={() => onSelect(o.code)}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: active ? "rgba(13,148,136,0.12)" : "#F3F4F6" }}
                      >
                        <Icon className="h-4 w-4" style={{ color: active ? TEAL_TEXT : "#6B7280" }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-sm text-gray-900 dark:text-foreground">
                          {o.label}
                        </span>
                        {o.desc && (
                          <span className="block text-xs text-gray-600 dark:text-muted-foreground mt-0.5">
                            {o.desc}
                          </span>
                        )}
                        {/* Reproduced exactly as the licence requires. */}
                        {o.attribution && (
                          <span className="block text-[11px] text-gray-600 dark:text-muted-foreground mt-1">
                            {o.attribution}
                          </span>
                        )}
                      </span>
                    </span>
                    <span
                      className="flex-shrink-0 ml-3 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 motion-reduce:transition-none"
                      style={{
                        borderColor: active ? TEAL : "#D1D5DB",
                        backgroundColor: active ? TEAL : "transparent",
                      }}
                    >
                      {active && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </label>
                )
              })}
        </div>

        {/* Footer */}
        <div className="px-7 pb-7">
          <button
            onClick={next}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80 motion-reduce:transition-none"
            style={{ backgroundColor: TEAL_TEXT }}
          >
            {step === TOTAL ? "Begin met studeren" : "Volgende"}
          </button>

          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="py-2 text-xs text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground transition-colors motion-reduce:transition-none disabled:invisible"
            >
              Terug
            </button>
            {/* Onboarding is never a gate: skipping keeps the defaults. */}
            <button
              onClick={() => finish(false)}
              className="py-2 text-xs text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground transition-colors motion-reduce:transition-none"
            >
              Overslaan
            </button>
          </div>

          {step === TOTAL && (
            <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-muted-foreground">
              Lezen is gratis, in elke vertaling. Met{" "}
              <Link
                href="/abonnement"
                className="font-semibold underline underline-offset-2"
                style={{ color: TEAL_TEXT }}
              >
                Pro
              </Link>{" "}
              lees je commentaren volledig, open je de grondtekst en stel je meer vragen aan de
              AI-assistent.
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-gray-100 dark:bg-secondary">
          <div
            className="h-1 transition-all duration-300 motion-reduce:transition-none"
            style={{ width: `${(step / TOTAL) * 100}%`, backgroundColor: TEAL }}
          />
        </div>

      </DialogContent>
    </Dialog>
  )
}
