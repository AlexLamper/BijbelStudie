"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { ChevronDown, Loader2, Minus, Monitor, Moon, Plus, Sun } from "lucide-react"
import { useGeneralSettings } from "../../hooks/useGeneralSettings"
import { useReadingPreferences } from "../../hooks/useReadingPreferences"
import { Switch } from "../../components/ui/switch"
import { CLOUD_VOICES } from "../../lib/cloudVoices"
import SubscriptionSection from "../../components/settings/SubscriptionSection"
import LevensboomSection from "../../components/settings/LevensboomSection"
import AppShell from "../../components/shell/AppShell"
import { Card, Skeleton } from "../../components/kit/primitives"
import { APP_STORE_URL } from "../../lib/appStore"

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
  { value: "serif", label: "Schreef" },
  { value: "sans", label: "Schreefloos" },
  { value: "mono", label: "Monospaced" },
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

/**
 * The design's toggle: a 46 x 27 track with a 21 px knob, teal when on and
 * `line-strong` when off. The shared Switch is 44 x 24 with a 20 px knob and its
 * own theme tokens, so the size and both states are set here; the travel follows
 * from the box (46 - 6 - 21 = 19).
 */
const TOGGLE =
  "h-[27px] w-[46px] border-0 px-[3px] data-[state=checked]:bg-teal data-[state=unchecked]:bg-line-strong focus-visible:ring-teal focus-visible:ring-offset-0 [&>span]:h-[21px] [&>span]:w-[21px] [&>span]:bg-white [&>span]:shadow-none [&>span[data-state=checked]]:translate-x-[19px]"

/** One control height for the whole page: 36 px, radius 9, hairline border. */
const CONTROL_H = "h-9"
const FIELD =
  "rounded-[9px] border border-line bg-white text-[13px] font-medium text-ink-body outline-none transition-colors hover:border-line-strong focus-visible:border-teal disabled:cursor-not-allowed disabled:opacity-60"

const SEG_TRACK = `inline-flex ${CONTROL_H} items-center rounded-[9px] border border-line bg-white p-[3px]`
const SEG_ITEM =
  "flex h-[28px] items-center gap-1.5 rounded-[7px] px-3 text-[12.5px] font-medium outline-none transition-colors"
const SEG_ON = "bg-teal font-semibold text-white"
const SEG_OFF = "text-ink-muted hover:bg-line-soft hover:text-ink-body"

/** A closing line of explanation under a panel's rows. */
const FOOTNOTE = "mt-4 border-t border-line-soft pt-4 text-[12px] leading-relaxed text-ink-muted"

type Section = "weergave" | "lezen" | "meldingen" | "account" | "abonnement" | "over"

/**
 * The section buttons across the top of the page.
 *
 * The design draws seven: Weergave · Leesweergave · Meldingen · Account ·
 * Abonnement · Privacy · Over. Six are here. Privacy has no settings of its own
 * on the web - the one privacy control that exists is "Openbaar profiel", which
 * belongs to the tree and therefore sits under Account with it, and the policy
 * itself is a page, which is under Over with the other documents. Say the word
 * and it can become a seventh button that repeats those two.
 */
const SECTIONS: { id: Section; label: string }[] = [
  { id: "weergave", label: "Weergave" },
  { id: "lezen", label: "Leesweergave" },
  { id: "meldingen", label: "Meldingen" },
  { id: "account", label: "Account" },
  { id: "abonnement", label: "Abonnement" },
  { id: "over", label: "Over" },
]

/**
 * /instellingen (design_handoff_web/PAGES.md §8).
 *
 * The sections are a row of buttons ABOVE the panels rather than a list down the
 * left, and only the chosen one is drawn. Beside them is a 330 px rail with the
 * live reading preview and the reset - the preview is a result, not a setting,
 * so it belongs next to the controls rather than among them.
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
  const [section, setSection] = useState<Section>("weergave")
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
      fontFamily: "serif",
      lineHeight: "relaxed",
      letterSpacing: "normal",
      highContrast: false,
      showVerseNumbers: true,
    })
  }

  const activeVersion = AVAILABLE_VERSIONS.find(v => v.id === settings.translation)
  const activeCommentary = commentaries.find(c => c.id === settings.commentary)

  return (
    <AppShell title="Instellingen">
      <div className="flex min-h-full flex-col gap-[18px]">
        {/* The sections, as a row of buttons above the panels. */}
        <div
          className="flex flex-none items-center gap-1 self-start rounded-[12px] border border-line bg-white p-[5px]"
          role="tablist"
          aria-label="Instellingen"
        >
          {SECTIONS.map(item => {
            const active = item.id === section
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(item.id)}
                className={[
                  "flex h-9 items-center rounded-[9px] px-[14px] text-[13.5px] transition-colors",
                  active ? "bg-teal font-semibold text-white" : "font-medium text-ink-muted hover:bg-line-soft hover:text-ink-body",
                ].join(" ")}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="flex min-h-0 flex-1 gap-[18px]">
          {/* ── The panels ───────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
            {section === "weergave" && (
              <SectionCard title="Weergave">
                <Row label="Thema" hint="Volgt je systeem als je 'Systeem' kiest.">
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
                <Row label="Huidig thema" hint="Wat de app op dit moment toont" last>
                  {mounted && (
                    <p className="text-[13px] font-semibold text-ink">
                      {resolvedTheme === "dark" ? "Donker" : "Licht"}
                    </p>
                  )}
                </Row>
              </SectionCard>
            )}

            {section === "lezen" && (
              <>
                <SectionCard title="Bijbel & commentaren">
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
                    last
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

                  {settings.translation === "statenvertaling" && !settingsLoading && (
                    <p className={FOOTNOTE}>
                      De <strong className="font-semibold text-ink">Statenvertaling</strong> is de standaard vertaling.
                      Hierin worden de meeste klassieke commentaren ook geschreven.
                    </p>
                  )}
                </SectionCard>

                <SectionCard title="Leesweergave">
                  <Row label="Tekstgrootte" hint={`Huidig: ${FONT_SIZE_LABELS[preferences.fontSize] || preferences.fontSize}`}>
                    <div className={`gap-1 ${SEG_TRACK}`}>
                      <button
                        onClick={() => adjustFontSize(-1)}
                        disabled={preferences.fontSize === FONT_SIZES[0]}
                        aria-label="Tekstgrootte verkleinen"
                        className="flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-body transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus size={14} aria-hidden />
                      </button>
                      <span aria-hidden className="w-10 select-none text-center font-serif text-lg leading-none text-ink">Aa</span>
                      <button
                        onClick={() => adjustFontSize(1)}
                        disabled={preferences.fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
                        aria-label="Tekstgrootte vergroten"
                        className="flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-body transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus size={14} aria-hidden />
                      </button>
                    </div>
                  </Row>

                  <Row label="Regelafstand">
                    <SegmentedControl
                      label="Regelafstand"
                      value={preferences.lineHeight}
                      onChange={(v) => updatePreferences({ lineHeight: v })}
                      options={LINE_HEIGHTS.map(l => ({ value: l.value, label: l.label }))}
                    />
                  </Row>

                  <Row label="Lettertype" hint="Schreef voor bijbeltekst, schreefloos voor de rest.">
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

                  <Row label="Letterafstand">
                    <SegmentedControl
                      label="Letterafstand"
                      value={preferences.letterSpacing}
                      onChange={(v) => updatePreferences({ letterSpacing: v })}
                      options={LETTER_SPACINGS.map(l => ({ value: l.value, label: l.label }))}
                    />
                  </Row>

                  <Row label="Versnummers tonen" last>
                    <Switch
                      checked={preferences.showVerseNumbers}
                      onCheckedChange={(v) => updatePreferences({ showVerseNumbers: v })}
                      aria-label="Versnummers tonen"
                      className={TOGGLE}
                    />
                  </Row>
                </SectionCard>

                <SectionCard title="Voorlezen">
                  <Row
                    label="Standaard stem"
                    hint="Wordt gebruikt zodra je op een voorlees-knop klikt"
                    last
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

                  <p className={FOOTNOTE}>
                    Je kunt de stem altijd per onderdeel wijzigen via het tandwiel-icoon naast de voorlees-knop.
                    Deze keuze is je <strong className="font-semibold text-ink">standaard</strong> over alle apparaten waar je inlogt.
                  </p>
                </SectionCard>
              </>
            )}

            {section === "meldingen" && (
              <SectionCard title="Meldingen">
                <Row
                  label="Herinneringen"
                  hint="Hooguit één per dag, op jouw moment."
                >
                  <Switch
                    checked={reminderEnabled}
                    onCheckedChange={(v) => saveReminder({ reminderEnabled: v })}
                    aria-label="Herinneringen"
                    className={TOGGLE}
                  />
                </Row>

                <Row
                  label="Studieherinnering"
                  labelFor="instellingen-tijdstip"
                  hint={reminderEnabled ? `Elke dag om ${reminderTime}` : "Zet de herinnering aan om een tijd te kiezen"}
                  last
                >
                  <div className="flex items-center gap-[14px]">
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
                      className={`${CONTROL_H} w-[7.5rem] px-3 ${FIELD}`}
                    />
                  </div>
                </Row>

                <p className={FOOTNOTE}>
                  De herinnering wordt door de mobiele app op je toestel ingepland. Op de website
                  verschijnt er geen melding - deze instelling bepaalt wél welk tijdstip de app gebruikt.
                </p>
              </SectionCard>
            )}

            {section === "account" && (
              <SectionCard title="Voortgang" subtitle="Je boom op je profiel, en wie hem mag zien">
                <LevensboomSection />
              </SectionCard>
            )}

            {section === "abonnement" && (
              <SectionCard title="Abonnement" subtitle="Je plan, facturen en opzeggen">
                <SubscriptionSection />
              </SectionCard>
            )}

            {section === "over" && (
              <SectionCard title="Over BijbelStudie">
                <div className="divide-y divide-line-soft">
                  <AboutRow href="/privacybeleid" label="Privacybeleid" />
                  <AboutRow href="/algemene-voorwaarden" label="Algemene voorwaarden" />
                  <AboutRow href="/help" label="Help" />
                  <AboutRow href="/contact" label="Contact" />
                  <AboutRow href={APP_STORE_URL} label="Ook als iPhone-app" external last />
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── The rail ─────────────────────────────────────────── */}
          <aside className="flex w-[330px] flex-none flex-col gap-[18px]">
            <Card className="flex-none p-[18px]">
              <div className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">Voorbeeld</div>
              <div className="mt-[11px] rounded-[12px] border border-line bg-sunken px-[18px] py-4">
                {previewLoading ? (
                  <div className="space-y-2" role="status" aria-label="Voorbeeld laden">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-5/6" />
                    <Skeleton className="h-3.5 w-4/5" />
                  </div>
                ) : (
                  <p
                    className={[
                      "text-ink transition-all",
                      preferences.fontFamily === "sans" ? "font-sans" :
                        preferences.fontFamily === "mono" ? "font-mono" : "font-serif",
                      preferences.fontSize === "sm" ? "text-[15px]" :
                        preferences.fontSize === "lg" ? "text-[19px]" :
                        preferences.fontSize === "xl" ? "text-[21px]" : "text-[17px]",
                      preferences.lineHeight === "normal" ? "leading-[1.55]" :
                        preferences.lineHeight === "loose" ? "leading-[2.05]" : "leading-[1.9]",
                      preferences.letterSpacing === "tight" ? "tracking-tight" :
                        preferences.letterSpacing === "wide" ? "tracking-wide" : "tracking-normal",
                    ].join(" ")}
                  >
                    {preferences.showVerseNumbers && (
                      <sup className="mr-1 align-super font-sans text-[11px] font-semibold text-ink-faint">16</sup>
                    )}
                    {previewVerse}
                  </p>
                )}
              </div>
              <p className="mt-[10px] text-[12px] leading-[1.55] text-ink-faint">
                Het voorbeeld verandert mee met de instellingen hiernaast.
              </p>
              {!settingsLoading && (
                <div className="mt-3 border-t border-line-soft pt-3 text-[12px] text-ink-muted">
                  <p className="truncate">Vertaling · <span className="font-semibold text-ink">{activeVersion?.name || settings.translation}</span></p>
                  <p className="mt-1 truncate">Commentaar · <span className="font-semibold text-ink">{activeCommentary?.name || settings.commentary}</span></p>
                </div>
              )}
            </Card>

            <Card className="flex-none p-[18px]">
              <div className="text-[14.5px] font-bold text-ink">Snel terugzetten</div>
              <p className="mt-[6px] text-[12.5px] leading-[1.6] text-ink-muted">
                Zet de leesweergave terug naar de standaardinstellingen.
              </p>
              <button
                type="button"
                onClick={resetReadingPrefs}
                className="mt-3 flex h-[38px] w-full items-center justify-center rounded-[9px] border border-line text-[13px] font-semibold text-ink-body transition-colors hover:bg-line-soft"
              >
                Standaard herstellen
              </button>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

/** One panel: a heading, an optional lead, then the rows. */
function SectionCard({
  title, subtitle, children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="flex-none px-[22px] py-5">
      <h2 className="text-[16.5px] font-bold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{subtitle}</p>}
      <div className="mt-1">{children}</div>
    </Card>
  )
}

/**
 * One setting: the label and its hint on the left, the control on the right,
 * with a hairline between rows. Every control on the page is 36 px tall and ends
 * at the same right edge.
 */
function Row({
  label, labelFor, hint, last = false, children,
}: {
  label: string
  /** Set when the control is a single field, so the label actually labels it. */
  labelFor?: string
  hint?: string
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 py-[14px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
        last ? "" : "border-b border-line-soft"
      }`}
    >
      <div className="min-w-0 flex-1">
        {labelFor ? (
          <label htmlFor={labelFor} className="block text-[14.5px] text-ink">{label}</label>
        ) : (
          <p className="text-[14.5px] text-ink">{label}</p>
        )}
        {hint && <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">{hint}</p>}
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
 * The native select, dressed for the page.
 *
 * `appearance-none` strips the browser's own arrow, so the control draws one
 * back: without it the field reads as a line of text on a plate and nothing says
 * it opens a list.
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
    <div className="relative w-full min-w-[148px] sm:w-56">
      <select
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL_H} w-full cursor-pointer appearance-none truncate pl-3 pr-9 ${FIELD}`}
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
        <Loader2 size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-muted" />
      ) : (
        <ChevronDown size={15} strokeWidth={2} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      )}
    </div>
  )
}

/** One row in the Over section: a name and where it goes. */
function AboutRow({
  href, label, external = false, last = false,
}: {
  href: string
  label: string
  external?: boolean
  last?: boolean
}) {
  const className = `flex items-center justify-between py-[14px] text-[14.5px] text-ink no-underline transition-colors hover:text-teal ${
    last ? "" : ""
  }`
  const arrow = <span className="text-[13px] font-semibold text-teal">→</span>
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
      {arrow}
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
      {arrow}
    </Link>
  )
}
