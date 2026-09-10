"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { ChevronDown, Loader2, Minus, Monitor, Moon, Plus, RotateCcw, Sun } from "lucide-react"
import { useGeneralSettings } from "../../hooks/useGeneralSettings"
import { useReadingPreferences } from "../../hooks/useReadingPreferences"
import { Switch } from "../../components/ui/switch"
import { CLOUD_VOICES } from "../../lib/cloudVoices"
import SubscriptionSection from "../../components/settings/SubscriptionSection"
import LevensboomSection from "../../components/settings/LevensboomSection"
import SceneShell from "../../components/scene/SceneShell"
import { Panel } from "../../components/scene/pieces"
import { SKEL, TEAL_ON_DARK } from "../../components/scene/tokens"

interface OptionItem { id: string; name: string; language?: string }

const AVAILABLE_VERSIONS: OptionItem[] = [
  // Nederlands
  { id: 'statenvertaling',      name: 'Statenvertaling',         language: 'nl' },
  { id: 'canisiusbijbel',       name: 'Canisiusvertaling',       language: 'nl' },
  { id: 'heilige_schrift_1917', name: 'De Heilige Schrift',      language: 'nl' },
  // English
  { id: 'kjv',       name: 'King James Version',        language: 'en' },
  { id: 'asv',       name: 'American Standard Version', language: 'en' },
  { id: 'net',       name: 'NET Bible',                 language: 'en' },
  { id: 'web',       name: 'World English Bible',       language: 'en' },
  { id: 'geneva',    name: 'Geneva Bible (1599)',       language: 'en' },
  { id: 'coverdale', name: 'Coverdale Bible (1535)',    language: 'en' },
]

const LANGUAGE_LABELS: Record<string, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  af: 'Afrikaans',
}

const FONT_SIZES = ["sm", "base", "lg", "xl"] as const

/** The stored value is an internal token; the row shows the Dutch word for it. */
const FONT_SIZE_LABELS: Record<string, string> = {
  sm: "Klein",
  base: "Normaal",
  lg: "Groot",
  xl: "Extra groot",
}

const FONT_FAMILIES = [
  { value: "sans", label: "Sans-serif", sample: "Aa" },
  { value: "serif", label: "Serif", sample: "Aa" },
  { value: "mono", label: "Monospaced", sample: "Aa" },
] as const
const LINE_HEIGHTS = [
  { value: "normal", label: "Compact" },
  { value: "relaxed", label: "Normaal" },
  { value: "loose", label: "Ruim" },
] as const
const LETTER_SPACINGS = [
  { value: "tight", label: "Strak" },
  { value: "normal", label: "Normaal" },
  { value: "wide", label: "Breed" },
] as const

// Fallback verse text per translation in case fetch fails
const FALLBACK_VERSE: Record<string, string> = {
  statenvertaling: "Want alzo lief heeft God de wereld gehad, dat Hij Zijn eniggeboren Zoon gegeven heeft, opdat een iegelijk die in Hem gelooft, niet verderve, maar het eeuwige leven hebbe.",
  canisiusbijbel: "Want God had de wereld zo lief, dat Hij zijn eniggeboren Zoon gegeven heeft, opdat ieder die in Hem gelooft niet verloren gaat, maar eeuwig leven heeft.",
  heilige_schrift_1917: "Want alzo lief heeft God de wereld gehad, dat Hij zijn eniggeboren Zoon gegeven heeft, opdat een ieder, die in Hem gelooft, niet verloren ga, maar eeuwig leven hebbe.",
}

/* ── Scene surfaces for the controls ──────────────────────────────
   Every value below is a literal white or black, never a theme token: a token
   flips with the reader's light/dark setting and the landscape does not. See
   components/scene/tokens.ts. */

/** The shared Switch, dressed for a dark panel. Its own defaults are theme
 *  tokens - in dark mode the track and the thumb both went near-black and the
 *  control disappeared. The thumb is the Radix span inside. */
const SCENE_SWITCH =
  "data-[state=unchecked]:bg-white/25 data-[state=checked]:bg-[#0D9488] focus-visible:ring-white focus-visible:ring-offset-transparent [&>span]:bg-white"

/**
 * One control height for the whole page.
 *
 * Every field, segmented track and stepper here is 36px tall and ends at the
 * same right edge of its row, so the column of controls reads as one system
 * rather than as a stack of differently sized boxes.
 */
const CONTROL_H = "h-9"

const SEG_TRACK = `inline-flex ${CONTROL_H} items-center rounded-lg bg-black/40 p-1 ring-1 ring-white/15`
const SEG_ITEM =
  "flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white"
const SEG_ON = "bg-white text-gray-900 shadow-sm"
const SEG_OFF = "text-white/70 hover:bg-white/10 hover:text-white"

/** Solid rather than translucent so the native option list is legible too;
 *  `color-scheme: dark` is what turns the browser's own popup dark. */
const SCENE_FIELD =
  "rounded-lg border border-white/25 bg-[#111827] text-sm text-white outline-none transition-colors hover:border-white/40 focus-visible:border-[#2DD4BF] focus-visible:ring-2 focus-visible:ring-[#2DD4BF]/50 disabled:cursor-not-allowed disabled:opacity-60"

/**
 * A closing line of explanation under a panel's rows.
 *
 * This used to be a tinted box inside the panel - a box drawn inside a box,
 * which is part of what made the panels read as unfinished. A hairline and
 * quieter type say "aside" without adding another surface.
 */
const FOOTNOTE = "mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/65"

/**
 * /instellingen, on the scene.
 *
 * This is a form surface, so it is laid out as one: a short sky, then the
 * panels, grouped, with every row divided by the same hairline and every
 * control ending at the right edge of its own panel.
 *
 * THE DESK SPANS THE WHOLE CONTENT WIDTH - THE SAME WIDTH /dashboard USES.
 *
 * It was a single column capped at 56rem, "so a wide monitor gets more
 * landscape rather than wider rows", and on a wide monitor that read as the
 * page using only its left half. The cap is gone: the desk runs from the
 * shell's gutter to the shell's gutter, exactly as the dashboard's does. Rows
 * of controls should not be a metre wide either, so from `xl` each group lays
 * its panels two abreast. The groups happen to divide evenly - four, two and
 * two - so no row is left with a hole in it, and the Voorbeeld plate closes the
 * first group as the fourth tile. Below `xl` the panels stack in one column,
 * full width, as before.
 *
 * The groups are the reading order:
 *
 *   1. Lezen    - what opens by default, how the text looks, how it sounds,
 *                 closed by the Voorbeeld panel that shows the result of all
 *                 three
 *   2. De app   - the theme and the daily reminder
 *   3. Account  - Voortgang (je boom, the public profile) and Abonnement
 *
 * What was wrong before: the desk was the `1fr / 360px` grid borrowed from
 * /profiel, but only one real thing lived in the side column. Below 1280px that
 * column collapsed and dropped the live reading preview to the very bottom of
 * the page - under the subscription, a screen and a half away from the
 * typography controls it previews. A second, unlabelled black tile ("Huidig
 * thema") floated beneath it with no heading and no section; it is a readout,
 * so it is now a labelled row inside Weergave, where the theme control already
 * was. The sections ran in no particular order, and their rows came in two
 * different shapes, so no two controls on the page started or ended at the
 * same x.
 *
 * Nothing about what this page reads or writes moved: the same
 * /api/v1/preferences GET and PATCH for the reminder, the same
 * /api/commentaries, the same /api/bible/chapter preview fetch, and the same
 * `useGeneralSettings` / `useReadingPreferences` writes behind every control.
 */
export default function SettingsPage() {
  const { settings, updateSettings, loading: settingsLoading } = useGeneralSettings()
  const { preferences, updatePreferences } = useReadingPreferences()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [commentaries, setCommentaries] = useState<OptionItem[]>([])
  const [commentariesLoading, setCommentariesLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [previewVerse, setPreviewVerse] = useState<string>("")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderMinutes, setReminderMinutes] = useState(480)

  useEffect(() => setMounted(true), [])

  // The reminder lives on the server so the phone and the browser agree on it;
  // the notification itself is still scheduled locally by the app.
  useEffect(() => {
    fetch("/api/v1/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.preferences) return
        setReminderEnabled(Boolean(data.preferences.reminderEnabled))
        if (typeof data.preferences.reminderMinutes === "number") {
          setReminderMinutes(data.preferences.reminderMinutes)
        }
      })
      .catch(() => {})
  }, [])

  function saveReminder(next: { reminderEnabled?: boolean; reminderMinutes?: number }) {
    if (next.reminderEnabled !== undefined) setReminderEnabled(next.reminderEnabled)
    if (next.reminderMinutes !== undefined) setReminderMinutes(next.reminderMinutes)

    void fetch("/api/v1/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...next,
        reminderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }).catch(() => {})
  }

  const reminderTime = `${String(Math.floor(reminderMinutes / 60)).padStart(2, "0")}:${String(reminderMinutes % 60).padStart(2, "0")}`

  useEffect(() => {
    fetch("/api/commentaries")
      .then(r => r.ok ? r.json() : [])
      .then((c) => setCommentaries(c))
      .catch(() => {})
      .finally(() => setCommentariesLoading(false))
  }, [])

  // Fetch preview verse when translation changes
  useEffect(() => {
    if (!settings.translation || settingsLoading) return
    setPreviewLoading(true)
    fetch(`/api/bible/chapter?version=${settings.translation}&book=Johannes&chapter=3`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const verse = data?.["16"] || FALLBACK_VERSE[settings.translation] || ""
        setPreviewVerse(verse)
      })
      .catch(() => setPreviewVerse(FALLBACK_VERSE[settings.translation] || ""))
      .finally(() => setPreviewLoading(false))
  }, [settings.translation, settingsLoading])

  function adjustFontSize(delta: number) {
    const idx = FONT_SIZES.indexOf(preferences.fontSize as (typeof FONT_SIZES)[number])
    const next = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))
    updatePreferences({ fontSize: FONT_SIZES[next] })
  }

  function resetReadingPrefs() {
    if (!confirm("Weet je zeker dat je de leesvoorkeuren wilt terugzetten naar standaard?")) return
    updatePreferences({
      fontSize: "base",
      fontFamily: "sans",
      lineHeight: "relaxed",
      letterSpacing: "normal",
      highContrast: false,
      showVerseNumbers: true,
    })
  }

  const activeVersion = AVAILABLE_VERSIONS.find(v => v.id === settings.translation)
  const activeCommentary = commentaries.find(c => c.id === settings.commentary)

  return (
    // The reader's own tree is the landscape here, so `backdrop="reader"`. The
    // shell owns the root, the scene, the scrims, the navbar, the rail and the
    // gutter - see components/scene/README.md.
    <SceneShell backdrop="reader" header rail>
      {/* -- Layer 1: the sky, deliberately short ---------------------- */}
      {/* A settings page is somewhere a reader arrives with a task in mind, so
          the landscape gets a band rather than a screen and the first control is
          never a scroll away. */}
      <section aria-labelledby="instellingen-titel" className="pb-12 pt-6">
        <div className="scene-sky max-w-[46rem]">
          <h1
            id="instellingen-titel"
            className="text-3xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-sm sm:text-4xl"
          >
            Instellingen
          </h1>
          <p className="mt-3 max-w-[34rem] text-sm leading-relaxed text-white/85 sm:text-base">
            Pas je bijbel-, lees- en weergavevoorkeuren aan
          </p>
        </div>
      </section>

      {/* -- Layer 2: the desk ----------------------------------------- */}
      {/* Full content width - the gutter is the shell's, the same as the
          dashboard's. Each Group lays its panels two abreast from `xl`. */}
      <div className="w-full space-y-14 pb-24">

        {/* ═══ Group 1: Lezen ═══════════════════════════════════════ */}
        <Group
          id="instellingen-groep-lezen"
          title="Lezen"
          subtitle="Wat er standaard opent, hoe de tekst eruitziet en hoe hij klinkt."
        >
          {/* Bijbel & commentaren */}
          <SectionCard
            id="instellingen-bijbel"
            title="Bijbel & commentaren"
            subtitle="Welke vertaling en welk commentaar worden standaard geopend"
          >
            <Rows>
              <Row
                label="Standaard bijbelvertaling"
                hint="Wordt geopend als je een nieuw hoofdstuk start"
              >
                <NativeSelect
                  value={settings.translation}
                  onChange={(val) => updateSettings({ translation: val })}
                  disabled={settingsLoading}
                  options={AVAILABLE_VERSIONS.map(v => ({ value: v.id, label: v.name }))}
                  groups={(() => {
                    const byLang = new Map<string, OptionItem[]>()
                    for (const v of AVAILABLE_VERSIONS) {
                      const lang = v.language || 'nl'
                      if (!byLang.has(lang)) byLang.set(lang, [])
                      byLang.get(lang)!.push(v)
                    }
                    const order = ['nl', 'en', 'de', 'af']
                    return [...byLang.keys()]
                      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
                      .map(lang => ({
                        label: LANGUAGE_LABELS[lang] || lang.toUpperCase(),
                        options: byLang.get(lang)!.map(v => ({ value: v.id, label: v.name })),
                      }))
                  })()}
                  fallbackLabel={settingsLoading ? "Laden..." : "Selecteer vertaling"}
                  ariaLabel="Standaard bijbelvertaling"
                />
              </Row>

              <Row
                label="Standaard commentaar"
                hint="Wordt geladen naast de tekst voor uitleg en context"
              >
                <NativeSelect
                  value={settings.commentary}
                  onChange={(val) => updateSettings({ commentary: val })}
                  disabled={settingsLoading || commentariesLoading}
                  options={commentaries.map(c => ({ value: c.id, label: c.name }))}
                  fallbackLabel={settingsLoading || commentariesLoading ? "Laden..." : "Selecteer commentaar"}
                  ariaLabel="Standaard commentaar"
                />
              </Row>
            </Rows>

            {settings.translation === "statenvertaling" && !settingsLoading && (
              <p className={FOOTNOTE}>
                De <strong className="font-semibold text-white">Statenvertaling</strong> is de standaard vertaling.
                Hierin worden de meeste klassieke commentaren ook geschreven.
              </p>
            )}
          </SectionCard>

          {/* Leesvoorkeuren */}
          <SectionCard
            id="instellingen-lezen"
            title="Leesvoorkeuren"
            subtitle="Hoe de bijbeltekst er voor jou uitziet"
            action={
              <button
                onClick={resetReadingPrefs}
                className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-white/75 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
              >
                <RotateCcw size={12} aria-hidden /> Terugzetten
              </button>
            }
          >
            <Rows>
              {/* Font size */}
              <Row
                label="Lettergrootte"
                hint={`Huidig: ${FONT_SIZE_LABELS[preferences.fontSize] || preferences.fontSize}`}
              >
                <div className={`gap-1 ${SEG_TRACK}`}>
                  <button
                    onClick={() => adjustFontSize(-1)}
                    disabled={preferences.fontSize === FONT_SIZES[0]}
                    aria-label="Lettergrootte verkleinen"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <span aria-hidden className="w-10 select-none text-center font-serif text-lg leading-none text-white">Aa</span>
                  <button
                    onClick={() => adjustFontSize(1)}
                    disabled={preferences.fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
                    aria-label="Lettergrootte vergroten"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              </Row>

              {/* Font family */}
              <Row label="Lettertype" hint="Waarin de bijbeltekst wordt gezet">
                <SegmentedControl
                  label="Lettertype"
                  value={preferences.fontFamily}
                  onChange={(v) => updatePreferences({ fontFamily: v })}
                  options={FONT_FAMILIES.map(f => ({
                    value: f.value,
                    label: f.label,
                    className: f.value === "serif" ? "font-serif" : f.value === "mono" ? "font-mono" : "",
                  }))}
                />
              </Row>

              {/* Line height */}
              <Row label="Regelhoogte" hint="Hoeveel ruimte er tussen de regels staat">
                <SegmentedControl
                  label="Regelhoogte"
                  value={preferences.lineHeight}
                  onChange={(v) => updatePreferences({ lineHeight: v })}
                  options={LINE_HEIGHTS.map(l => ({ value: l.value, label: l.label }))}
                />
              </Row>

              {/* Letter spacing */}
              <Row label="Letterafstand" hint="Hoeveel ruimte er tussen de letters staat">
                <SegmentedControl
                  label="Letterafstand"
                  value={preferences.letterSpacing}
                  onChange={(v) => updatePreferences({ letterSpacing: v })}
                  options={LETTER_SPACINGS.map(l => ({ value: l.value, label: l.label }))}
                />
              </Row>

              {/* Verse numbers */}
              <Row label="Versnummers tonen" hint="Toon nummering naast elk vers">
                <Switch
                  checked={preferences.showVerseNumbers}
                  onCheckedChange={(v) => updatePreferences({ showVerseNumbers: v })}
                  aria-label="Versnummers tonen"
                  className={SCENE_SWITCH}
                />
              </Row>
            </Rows>
          </SectionCard>

          {/* Voorleesstem */}
          <SectionCard
            id="instellingen-voorlezen"
            title="Voorlezen"
            subtitle="Welke stem standaard wordt gebruikt om Bijbeltekst en commentaar voor te lezen"
          >
            <Rows>
              <Row
                label="Standaard stem"
                hint="Wordt gebruikt zodra je op een voorlees-knop klikt"
              >
                <div className={SEG_TRACK} role="group" aria-label="Standaard stem">
                  {CLOUD_VOICES.map(v => {
                    const active = settings.ttsVoice === v.id
                    return (
                      <button
                        key={v.id}
                        onClick={() => updateSettings({ ttsVoice: v.id })}
                        disabled={settingsLoading}
                        aria-pressed={active}
                        className={`${SEG_ITEM} disabled:opacity-50 ${active ? SEG_ON : SEG_OFF}`}
                      >
                        {v.gender === "F" ? "Vrouw" : "Man"}
                      </button>
                    )
                  })}
                </div>
              </Row>
            </Rows>

            <p className={FOOTNOTE}>
              Je kunt de stem altijd per onderdeel wijzigen via het tandwiel-icoon naast de voorlees-knop.
              Deze keuze is je <strong className="font-semibold text-white">standaard</strong> over alle apparaten waar je inlogt.
            </p>
          </SectionCard>

          {/* Voorbeeld.
              Closes the group whose three panels it is the result of: the
              translation and the commentary from the first, the typography from
              the second. It sits with the controls it previews at every width:
              fourth in the group's grid, which from `xl` is directly under
              Leesvoorkeuren.

              It used to be the one light PLATE on the page - the last surface
              still drawn for a white reading page, which is why it read as a
              leftover next to its siblings. It is a `SectionCard` now, the same
              component the other panels on this page use, so the surface, the
              radius, the ring, the padding, the heading scale and the rule
              under it are not restated here at all. The reading room it
              previews is dark too (SCENE_BG - see components/scene/tokens.ts),
              so the plate was also no longer showing the reader what they would
              actually see. Every colour inside is still a literal white, never
              a theme token: this panel is dark in both themes. */}
          <SectionCard
            id="instellingen-voorbeeld"
            title="Voorbeeld"
            subtitle="Zo ziet de bijbeltekst er nu voor je uit"
          >
            <div className="grid gap-6 pt-5 md:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    Johannes 3:16
                  </p>
                  <p className="truncate text-[10px] text-white/50">
                    {activeVersion?.name}
                  </p>
                </div>
                {previewLoading ? (
                  <div className="space-y-1.5" role="status" aria-label="Voorbeeld laden">
                    <div className={`skeleton-pulse h-3.5 w-full rounded ${SKEL}`} />
                    <div className={`skeleton-pulse h-3.5 w-5/6 rounded ${SKEL}`} />
                    <div className={`skeleton-pulse h-3.5 w-4/5 rounded ${SKEL}`} />
                  </div>
                ) : (
                  <p
                    className={[
                      "max-w-[38rem] text-white transition-all",
                      preferences.fontFamily === "serif" ? "font-serif" :
                        preferences.fontFamily === "mono" ? "font-mono" : "font-sans",
                      preferences.fontSize === "sm" ? "text-sm" :
                        preferences.fontSize === "lg" ? "text-lg" :
                        preferences.fontSize === "xl" ? "text-xl" : "text-base",
                      preferences.lineHeight === "normal" ? "leading-normal" :
                        preferences.lineHeight === "loose" ? "leading-loose" : "leading-relaxed",
                      preferences.letterSpacing === "tight" ? "tracking-tight" :
                        preferences.letterSpacing === "wide" ? "tracking-wide" : "tracking-normal",
                    ].join(" ")}
                  >
                    {preferences.showVerseNumbers && (
                      <sup className="mr-1 font-semibold" style={{ color: TEAL_ON_DARK }}>16</sup>
                    )}
                    {previewVerse}
                  </p>
                )}
              </div>

              {!settingsLoading && (
                <div className="border-t border-white/10 pt-4 md:border-l md:border-l-white/10 md:border-t-0 md:pl-6 md:pt-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    Actieve standaard
                  </p>
                  <dl className="space-y-2.5 text-xs">
                    <div className="min-w-0">
                      <dt className="text-white/60">Vertaling</dt>
                      <dd className="mt-0.5 truncate font-medium text-white">
                        {activeVersion?.name || settings.translation}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-white/60">Commentaar</dt>
                      <dd className="mt-0.5 truncate font-medium text-white">
                        {activeCommentary?.name || settings.commentary}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </SectionCard>
        </Group>

        {/* ═══ Group 2: De app ══════════════════════════════════════ */}
        <Group
          id="instellingen-groep-app"
          title="De app"
          subtitle="Hoe BijbelStudie eruitziet en wanneer het je aan het lezen herinnert."
        >
          {/* Weergave */}
          <SectionCard
            id="instellingen-weergave"
            title="Weergave"
            subtitle="Thema en uiterlijk van de applicatie"
          >
            <Rows>
              <Row label="Thema" hint="Licht, donker of volg je systeem">
                {mounted && (
                  <div className={SEG_TRACK} role="group" aria-label="Thema">
                    {[
                      { value: "light", label: "Licht", icon: Sun },
                      { value: "dark", label: "Donker", icon: Moon },
                      { value: "system", label: "Systeem", icon: Monitor },
                    ].map(opt => {
                      const active = theme === opt.value
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          aria-pressed={active}
                          className={`${SEG_ITEM} ${active ? SEG_ON : SEG_OFF}`}
                        >
                          <Icon size={12} aria-hidden /> {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </Row>

              {/* A readout, not a control: what the app is showing right now,
                  which is the only way to see what "Systeem" resolved to. It
                  used to be an unlabelled tile floating in the side column. */}
              <Row label="Huidig thema" hint="Wat de app op dit moment toont">
                {mounted && (
                  <p className="text-sm font-semibold text-white">
                    {resolvedTheme === "dark" ? "Donker" : "Licht"}
                  </p>
                )}
              </Row>
            </Rows>
          </SectionCard>

          {/* Dagelijkse herinnering */}
          <SectionCard
            id="instellingen-herinnering"
            title="Dagelijkse herinnering"
            subtitle="Een vast moment om te lezen en te studeren"
          >
            <Rows>
              <Row
                label="Herinnering aan"
                hint="De melding verschijnt op je telefoon in de BijbelStudie-app"
              >
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={(v) => saveReminder({ reminderEnabled: v })}
                  aria-label="Herinnering aan"
                  className={SCENE_SWITCH}
                />
              </Row>

              <Row
                label="Tijdstip"
                labelFor="instellingen-tijdstip"
                hint={reminderEnabled ? `Elke dag om ${reminderTime}` : "Zet de herinnering aan om een tijd te kiezen"}
              >
                <input
                  id="instellingen-tijdstip"
                  type="time"
                  value={reminderTime}
                  disabled={!reminderEnabled}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number)
                    if (Number.isInteger(h) && Number.isInteger(m)) {
                      saveReminder({ reminderMinutes: h * 60 + m })
                    }
                  }}
                  style={{ colorScheme: "dark" }}
                  className={`${CONTROL_H} w-[7.5rem] px-3 ${SCENE_FIELD}`}
                />
              </Row>
            </Rows>

            <p className={FOOTNOTE}>
              De herinnering wordt door de mobiele app op je toestel ingepland. Op de website
              verschijnt er geen melding - deze instelling bepaalt wél welk tijdstip de app gebruikt.
            </p>
          </SectionCard>
        </Group>

        {/* ═══ Group 3: Account ═════════════════════════════════════ */}
        <Group
          id="instellingen-groep-account"
          title="Account"
          subtitle="Je boom, je openbare profiel en je abonnement."
        >
          {/* Voortgang - "je boom", never the internal name. */}
          <SectionCard
            id="instellingen-voortgang"
            title="Voortgang"
            subtitle="Je boom op je profiel"
          >
            <LevensboomSection />
          </SectionCard>

          {/* Abonnement */}
          <SectionCard
            id="instellingen-abonnement"
            title="Abonnement"
            subtitle="Je plan, facturen en opzeggen"
          >
            <SubscriptionSection />
          </SectionCard>
        </Group>
      </div>
    </SceneShell>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

/**
 * A group of panels, with its heading typed straight on the landscape.
 *
 * The shared `SectionHeading` in components/scene/pieces.tsx always renders an
 * h2, and that folder is shared. A settings page needs two heading levels below
 * its h1 - the group and the panel inside it - so both are written out here in
 * exactly that block's vocabulary (title, optional subtitle, hairline rule),
 * with the group as the h2 and the panel below it as an h3. Nothing about the
 * type, the spacing or the rule is new.
 *
 * The panels sit in a grid: one column up to `xl`, two from there. `items-start`
 * so a short panel beside a tall one keeps its own height instead of being
 * stretched into a glass box with a hole at the bottom.
 */
function Group({
  id, title, subtitle, children,
}: {
  id: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <div className="border-b border-white/15 pb-3">
        <h2 id={id} className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-white/70">{subtitle}</p>}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        {children}
      </div>
    </section>
  )
}

/**
 * One block of settings, as a panel on the scene.
 *
 * The old card carried a teal-tinted icon tile next to every title. Those
 * identified nothing a reader could not read in the heading itself, so they are
 * gone - an icon here marks a control or a data type or it does not appear.
 */
function SectionCard({
  id, title, subtitle, action, children,
}: {
  id: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Panel className="p-5 sm:p-6" labelledBy={id}>
      <div className="border-b border-white/15 pb-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={id} className="min-w-0 text-base font-semibold tracking-tight text-white">{title}</h3>
          {action}
        </div>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-white/70">{subtitle}</p>}
      </div>
      {children}
    </Panel>
  )
}

/**
 * The rows of a panel, divided by one hairline each.
 *
 * Every setting on the page sits in one of these lists, so the dividers, the
 * vertical rhythm and the label column are identical in every panel - which is
 * what makes the controls line up down the whole page rather than per section.
 */
function Rows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-white/10">{children}</div>
}

/**
 * One setting: the label and its hint on the left, the control on the right.
 *
 * The control cell is flush to the right edge of the panel from `sm` up, so
 * every field, every segmented track and every switch on the page ends at the
 * same x. Below `sm` the control drops under its label rather than fighting it
 * for the line.
 */
function Row({
  label, labelFor, hint, children,
}: {
  label: string
  /** Set when the control is a single field, so the label actually labels it. */
  labelFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5 py-4 first:pt-5 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 sm:max-w-[26rem]">
        {labelFor ? (
          <label htmlFor={labelFor} className="block text-sm font-medium text-white">{label}</label>
        ) : (
          <p className="text-sm font-medium text-white">{label}</p>
        )}
        {hint && <p className="mt-1 text-xs leading-relaxed text-white/60">{hint}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center sm:justify-end">{children}</div>
    </div>
  )
}

function SegmentedControl({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; className?: string }[]
}) {
  return (
    <div className={SEG_TRACK} role="group" aria-label={label}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`${SEG_ITEM} ${opt.className || ""} ${active ? SEG_ON : SEG_OFF}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The native select, dressed for the scene.
 *
 * `appearance-none` strips the browser's own arrow, so the control has to draw
 * one back: without it the field reads as a line of text on a dark plate and
 * nothing says it opens a list. The marker used to be a teal check, which
 * implied "saved" on a control that had confirmed nothing. The spinner while
 * the options are still loading is unchanged, and so is every option it lists.
 */
function NativeSelect({
  value, onChange, options, groups, disabled, fallbackLabel, ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  groups?: { label: string; options: { value: string; label: string }[] }[]
  disabled?: boolean
  fallbackLabel?: string
  ariaLabel?: string
}) {
  return (
    <div className="relative w-full sm:w-60">
      <select
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        style={{ colorScheme: "dark" }}
        className={`${CONTROL_H} w-full cursor-pointer appearance-none pl-3 pr-9 ${SCENE_FIELD}`}
      >
        {disabled && fallbackLabel ? (
          <option value="">{fallbackLabel}</option>
        ) : groups && groups.length > 0 ? (
          groups.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))
        ) : (
          options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))
        )}
      </select>
      {disabled ? (
        <Loader2 size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/60" />
      ) : (
        <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
      )}
    </div>
  )
}
