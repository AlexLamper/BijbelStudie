"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, BookOpen, Library, Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getBibleAttribution } from "../../lib/bible-attribution"

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

const TOTAL = 3

const TEAL = "#0D9488"
/** #0D9488 is 3.7:1 on white - a fill colour, not a text colour. */
const TEAL_TEXT = "#0F766E"

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

  const [prefs, setPrefs] = useState({
    translation: "statenvertaling",
    commentary: "matthew_henry_nl",
    intent: "light",
  })

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

  const { title, subtitle, options, selected, onSelect, group, loading } = useMemo(() => {
    if (step === 1) {
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
    if (step === 2) {
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

  const iconFor = (code: string) => (step === 3 ? THEME_ICONS[code] ?? Monitor : step === 2 ? Library : BookOpen)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish(false)}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0 rounded-2xl border border-gray-200 dark:border-border shadow-2xl">

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
          className={`px-7 py-5 flex flex-col gap-2.5 transition-all duration-200 ease-out motion-reduce:transition-none ${
            entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
          role="radiogroup"
          aria-label={title}
        >
          {loading
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
                      borderColor: active ? TEAL : "#E5E7EB",
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
