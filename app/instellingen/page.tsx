"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Check, Loader2, RotateCcw, Minus, Plus } from "lucide-react"
import { useGeneralSettings } from "../../hooks/useGeneralSettings"
import { useReadingPreferences } from "../../hooks/useReadingPreferences"
import { Switch } from "../../components/ui/switch"
import { CLOUD_VOICES } from "../../lib/cloudVoices"
import SubscriptionSection from "../../components/settings/SubscriptionSection"
import LevensboomSection from "../../components/settings/LevensboomSection"
import SceneShell from "../../components/scene/SceneShell"
import { Panel, SectionHeading } from "../../components/scene/pieces"
import { PLATE, TEAL } from "../../components/scene/tokens"

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

const SEG_TRACK = "inline-flex rounded-lg bg-black/40 p-1 ring-1 ring-white/15"
const SEG_ITEM =
  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white"
const SEG_ON = "bg-white text-gray-900 shadow-sm"
const SEG_OFF = "text-white/70 hover:bg-white/10 hover:text-white"

/** Solid rather than translucent so the native option list is legible too;
 *  `color-scheme: dark` is what turns the browser's own popup dark. */
const SCENE_FIELD =
  "rounded-lg border border-white/25 bg-[#111827] text-sm text-white outline-none transition-colors focus-visible:border-[#2DD4BF] focus-visible:ring-2 focus-visible:ring-[#2DD4BF]/50 disabled:cursor-not-allowed disabled:opacity-60"

/** A quiet aside inside a panel: light enough to read, dark enough to keep the
 *  landscape running behind the panel it sits on. */
const NOTE = "rounded-lg bg-white/10 p-3 text-xs leading-relaxed text-white/75 ring-1 ring-white/10"

const HAIRLINE = "h-px bg-white/15"

/**
 * /instellingen, on the scene.
 *
 * Two layers rather than the dashboard's three: this is a page a reader
 * navigates to with a task in mind, so the sky is deliberately short of a full
 * screen - enough landscape to say it is the same world, not so much that the
 * first control is a scroll away - and there are no standing figures to break
 * the fold with.
 *
 * The verse preview is the one light surface on the page: it is drawn for a
 * white reading page and shows the product working, which is exactly what PLATE
 * is for. Everything else is a panel.
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
      {/* -- Layer 1: the sky ------------------------------------------ */}
      <section
        aria-labelledby="instellingen-titel"
        className="flex min-h-[58vh] flex-col justify-end pb-16 pt-5"
      >
        <div className="scene-sky max-w-[46rem]">
          <h1
            id="instellingen-titel"
            className="text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl"
          >
            Instellingen
          </h1>
          <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
            Pas je bijbel-, lees- en weergavevoorkeuren aan
          </p>
        </div>
      </section>

      {/* -- Layer 2: the desk ----------------------------------------- */}
      <div className="grid w-full grid-cols-1 items-start gap-6 pb-20 pt-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">

        {/* --- The work column -------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-6">

          {/* Bible defaults */}
          <SectionCard
            id="instellingen-bijbel"
            title="Bijbel & commentaren"
            subtitle="Welke vertaling en welk commentaar worden standaard geopend"
          >
            <div className="space-y-5">
              <PreferenceRow
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
              </PreferenceRow>

              <div className={HAIRLINE} />

              <PreferenceRow
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
              </PreferenceRow>

              {settings.translation === "statenvertaling" && !settingsLoading && (
                <p className={NOTE}>
                  De <strong className="font-semibold text-white">Statenvertaling</strong> is de standaard vertaling.
                  Hierin worden de meeste klassieke commentaren ook geschreven.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Reading preferences */}
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
            <div className="space-y-5">
              {/* Font size */}
              <PreferenceRow label="Lettergrootte" hint={`Huidig: ${preferences.fontSize}`}>
                <div className={`items-center gap-1 ${SEG_TRACK}`}>
                  <button
                    onClick={() => adjustFontSize(-1)}
                    disabled={preferences.fontSize === FONT_SIZES[0]}
                    aria-label="Lettergrootte verkleinen"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <span aria-hidden className="w-10 select-none text-center font-serif text-lg text-white">Aa</span>
                  <button
                    onClick={() => adjustFontSize(1)}
                    disabled={preferences.fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
                    aria-label="Lettergrootte vergroten"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              </PreferenceRow>

              {/* Font family */}
              <PreferenceRow label="Lettertype">
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
              </PreferenceRow>

              {/* Line height */}
              <PreferenceRow label="Regelhoogte">
                <SegmentedControl
                  label="Regelhoogte"
                  value={preferences.lineHeight}
                  onChange={(v) => updatePreferences({ lineHeight: v })}
                  options={LINE_HEIGHTS.map(l => ({ value: l.value, label: l.label }))}
                />
              </PreferenceRow>

              {/* Letter spacing */}
              <PreferenceRow label="Letterafstand">
                <SegmentedControl
                  label="Letterafstand"
                  value={preferences.letterSpacing}
                  onChange={(v) => updatePreferences({ letterSpacing: v })}
                  options={LETTER_SPACINGS.map(l => ({ value: l.value, label: l.label }))}
                />
              </PreferenceRow>

              <div className={HAIRLINE} />

              {/* Toggles */}
              <ToggleRow
                label="Versnummers tonen"
                hint="Toon nummering naast elk vers"
                checked={preferences.showVerseNumbers}
                onChange={(v) => updatePreferences({ showVerseNumbers: v })}
              />
            </div>
          </SectionCard>

          {/* Dagelijkse herinnering */}
          <SectionCard
            id="instellingen-herinnering"
            title="Dagelijkse herinnering"
            subtitle="Een vast moment om te lezen en te studeren"
          >
            <div className="space-y-5">
              <ToggleRow
                label="Herinnering aan"
                hint="De melding verschijnt op je telefoon in de BijbelStudie-app"
                checked={reminderEnabled}
                onChange={(v) => saveReminder({ reminderEnabled: v })}
              />

              <PreferenceRow
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
                  className={`h-9 px-3 ${SCENE_FIELD}`}
                />
              </PreferenceRow>

              <p className={NOTE}>
                De herinnering wordt door de mobiele app op je toestel ingepland. Op de website
                verschijnt er geen melding - deze instelling bepaalt wél welk tijdstip de app gebruikt.
              </p>
            </div>
          </SectionCard>

          {/* Voorleesstem */}
          <SectionCard
            id="instellingen-voorlezen"
            title="Voorlezen"
            subtitle="Welke stem standaard wordt gebruikt om Bijbeltekst en commentaar voor te lezen"
          >
            <PreferenceRow
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
            </PreferenceRow>

            <p className={`mt-3 ${NOTE}`}>
              Je kunt de stem altijd per onderdeel wijzigen via het tandwiel-icoon naast de voorlees-knop.
              Deze keuze is je <strong className="font-semibold text-white">standaard</strong> over alle apparaten waar je inlogt.
            </p>
          </SectionCard>

          {/* Appearance */}
          <SectionCard
            id="instellingen-weergave"
            title="Weergave"
            subtitle="Thema en uiterlijk van de applicatie"
          >
            <PreferenceRow label="Thema" hint="Licht, donker of volg je systeem">
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
            </PreferenceRow>
          </SectionCard>

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
        </div>

        {/* --- The preview column ----------------------------------- */}
        <div className="flex flex-col gap-5">
          {/* The one light surface on the page: this shows the reading page as
              the reader has just set it up, and it is drawn for a white page -
              which is exactly what PLATE is for. Every colour inside is a
              literal, because a theme token here would flip to white-on-white. */}
          <section aria-labelledby="instellingen-voorbeeld" className={`overflow-hidden xl:sticky xl:top-20 ${PLATE}`}>
            <div className="border-b border-black/10 px-5 py-4">
              <h2 id="instellingen-voorbeeld" className="text-sm font-bold text-gray-900">Voorbeeld</h2>
            </div>
            <div className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Johannes 3:16
                </p>
                <p className="truncate text-[10px] text-gray-400">
                  {activeVersion?.name}
                </p>
              </div>
              {previewLoading ? (
                <div className="space-y-1.5" role="status" aria-label="Voorbeeld laden">
                  <div className="skeleton-pulse h-3.5 w-full rounded bg-black/10" />
                  <div className="skeleton-pulse h-3.5 w-5/6 rounded bg-black/10" />
                  <div className="skeleton-pulse h-3.5 w-4/5 rounded bg-black/10" />
                </div>
              ) : (
                <p
                  className={[
                    "text-gray-900 transition-all",
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
                    <sup className="mr-1 font-semibold" style={{ color: TEAL }}>16</sup>
                  )}
                  {previewVerse}
                </p>
              )}
              {!settingsLoading && (
                <div className="mt-4 border-t border-black/10 pt-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Actieve standaard
                  </p>
                  <dl className="space-y-1 text-xs">
                    <div className="flex items-baseline gap-2">
                      <dt className="w-20 flex-shrink-0 text-gray-500">Vertaling</dt>
                      <dd className="min-w-0 truncate font-medium text-gray-900">
                        {activeVersion?.name || settings.translation}
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="w-20 flex-shrink-0 text-gray-500">Commentaar</dt>
                      <dd className="min-w-0 truncate font-medium text-gray-900">
                        {activeCommentary?.name || settings.commentary}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </section>

          {/* Theme indicator */}
          {mounted && (
            <div className="rounded-2xl border border-white/20 bg-black/40 p-4 backdrop-blur-md">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Huidig thema
              </p>
              <p className="text-sm font-semibold text-white">
                {resolvedTheme === "dark" ? "Donker" : "Licht"}
              </p>
            </div>
          )}
        </div>

      </div>
    </SceneShell>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

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
      <SectionHeading id={id} title={title} subtitle={subtitle} action={action} rule />
      <div className="mt-5">{children}</div>
    </Panel>
  )
}

function PreferenceRow({
  label, labelFor, hint, children,
}: {
  label: string
  /** Set when the control is a single field, so the label actually labels it. */
  labelFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {labelFor ? (
          <label htmlFor={labelFor} className="block text-sm font-medium text-white">{label}</label>
        ) : (
          <p className="text-sm font-medium text-white">{label}</p>
        )}
        {hint && <p className="mt-0.5 text-xs text-white/65">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function ToggleRow({
  label, hint, checked, onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-white/65">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} className={SCENE_SWITCH} />
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
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        style={{ colorScheme: "dark" }}
        className={`w-full appearance-none py-2 pl-3 pr-9 sm:w-60 ${SCENE_FIELD}`}
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
        <Check size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#2DD4BF" }} />
      )}
    </div>
  )
}
