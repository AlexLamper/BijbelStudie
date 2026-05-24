"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  BookOpen, Sparkles, Type, Sliders, Sun, Moon, Monitor,
  Check, Loader2, RotateCcw, Eye, Minus, Plus, Volume2,
} from "lucide-react"
import { useGeneralSettings } from "../../hooks/useGeneralSettings"
import { useReadingPreferences } from "../../hooks/useReadingPreferences"
import { Switch } from "../../components/ui/switch"
import { CLOUD_VOICES } from "../../lib/cloudVoices"

const TEAL = "#0D9488"

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

export default function SettingsPage() {
  const { settings, updateSettings, loading: settingsLoading } = useGeneralSettings()
  const { preferences, updatePreferences } = useReadingPreferences()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [commentaries, setCommentaries] = useState<OptionItem[]>([])
  const [commentariesLoading, setCommentariesLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [previewVerse, setPreviewVerse] = useState<string>("")
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => setMounted(true), [])

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <h1 className="text-xl font-bold text-foreground">Instellingen</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pas je bijbel-, lees- en weergavevoorkeuren aan
        </p>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

          {/* Left column - main settings */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* Bible defaults */}
            <SectionCard
              icon={BookOpen}
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
                  />
                </PreferenceRow>

                <div className="h-px bg-border" />

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
                  />
                </PreferenceRow>

                {settings.translation === "statenvertaling" && !settingsLoading && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-gray-50 dark:bg-secondary/40 rounded-lg p-3">
                    <Sparkles size={12} style={{ color: TEAL, marginTop: 2, flexShrink: 0 }} />
                    <p>
                      De <strong className="text-foreground">Statenvertaling</strong> is de standaard vertaling.
                      Hierin worden de meeste klassieke commentaren ook geschreven.
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Reading preferences */}
            <SectionCard
              icon={Type}
              title="Leesvoorkeuren"
              subtitle="Hoe de bijbeltekst er voor jou uitziet"
              action={
                <button
                  onClick={resetReadingPrefs}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw size={12} /> Terugzetten
                </button>
              }
            >
              <div className="space-y-5">
                {/* Font size */}
                <PreferenceRow label="Lettergrootte" hint={`Huidig: ${preferences.fontSize}`}>
                  <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-secondary p-1 rounded-lg">
                    <button
                      onClick={() => adjustFontSize(-1)}
                      disabled={preferences.fontSize === FONT_SIZES[0]}
                      className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-white dark:hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-serif text-lg select-none">Aa</span>
                    <button
                      onClick={() => adjustFontSize(1)}
                      disabled={preferences.fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
                      className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-white dark:hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </PreferenceRow>

                {/* Font family */}
                <PreferenceRow label="Lettertype">
                  <SegmentedControl
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
                    value={preferences.lineHeight}
                    onChange={(v) => updatePreferences({ lineHeight: v })}
                    options={LINE_HEIGHTS.map(l => ({ value: l.value, label: l.label }))}
                  />
                </PreferenceRow>

                {/* Letter spacing */}
                <PreferenceRow label="Letterafstand">
                  <SegmentedControl
                    value={preferences.letterSpacing}
                    onChange={(v) => updatePreferences({ letterSpacing: v })}
                    options={LETTER_SPACINGS.map(l => ({ value: l.value, label: l.label }))}
                  />
                </PreferenceRow>

                <div className="h-px bg-border" />

                {/* Toggles */}
                <ToggleRow
                  label="Versnummers tonen"
                  hint="Toon nummering naast elk vers"
                  checked={preferences.showVerseNumbers}
                  onChange={(v) => updatePreferences({ showVerseNumbers: v })}
                />
              </div>
            </SectionCard>

            {/* Voorleesstem */}
            <SectionCard
              icon={Volume2}
              title="Voorlezen"
              subtitle="Welke stem standaard wordt gebruikt om Bijbeltekst en commentaar voor te lezen"
            >
              <PreferenceRow
                label="Standaard stem"
                hint="Wordt gebruikt zodra je op een voorlees-knop klikt"
              >
                <div className="inline-flex bg-gray-100 dark:bg-secondary p-1 rounded-lg">
                  {CLOUD_VOICES.map(v => {
                    const active = settings.ttsVoice === v.id
                    return (
                      <button
                        key={v.id}
                        onClick={() => updateSettings({ ttsVoice: v.id })}
                        disabled={settingsLoading}
                        className={[
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50",
                          active
                            ? "bg-white dark:bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                        style={active ? { color: TEAL } : undefined}
                      >
                        {v.gender === "F" ? "Vrouw" : "Man"}
                      </button>
                    )
                  })}
                </div>
              </PreferenceRow>

              <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-gray-50 dark:bg-secondary/40 rounded-lg p-3">
                <Sparkles size={12} style={{ color: TEAL, marginTop: 2, flexShrink: 0 }} />
                <p>
                  Je kunt de stem altijd per onderdeel wijzigen via het tandwiel-icoon naast de voorlees-knop.
                  Deze keuze is je <strong className="text-foreground">standaard</strong> over alle apparaten waar je inlogt.
                </p>
              </div>
            </SectionCard>

            {/* Appearance */}
            <SectionCard
              icon={Sliders}
              title="Weergave"
              subtitle="Thema en uiterlijk van de applicatie"
            >
              <PreferenceRow label="Thema" hint="Licht, donker of volg je systeem">
                {mounted && (
                  <div className="inline-flex bg-gray-100 dark:bg-secondary p-1 rounded-lg">
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
                          className={[
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            active
                              ? "bg-white dark:bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          ].join(" ")}
                          style={active ? { color: TEAL } : undefined}
                        >
                          <Icon size={12} /> {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </PreferenceRow>
            </SectionCard>
          </div>

          {/* Right sidebar - live preview */}
          <div className="flex flex-col gap-5">
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden xl:sticky xl:top-6">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Eye size={14} style={{ color: TEAL }} />
                </div>
                <p className="text-sm font-bold text-foreground">Voorbeeld</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Johannes 3:16
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    {AVAILABLE_VERSIONS.find(v => v.id === settings.translation)?.name}
                  </p>
                </div>
                {previewLoading ? (
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-full rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                    <div className="h-3.5 w-5/6 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                    <div className="h-3.5 w-4/5 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                  </div>
                ) : (
                  <p
                    className={[
                      "leading-relaxed transition-all",
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
                      <sup className="font-semibold mr-1" style={{ color: TEAL }}>16</sup>
                    )}
                    {previewVerse}
                  </p>
                )}
                {!settingsLoading && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Actieve standaard
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <BookOpen size={11} style={{ color: TEAL }} />
                        <span className="text-foreground">
                          {AVAILABLE_VERSIONS.find(v => v.id === settings.translation)?.name || settings.translation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Sparkles size={11} style={{ color: TEAL }} />
                        <span className="text-foreground truncate">
                          {commentaries.find(c => c.id === settings.commentary)?.name || settings.commentary}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Theme indicator */}
            {mounted && (
              <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Huidig thema
                </p>
                <p className="text-sm font-semibold text-foreground capitalize">
                  {resolvedTheme === "dark" ? "Donker" : "Licht"}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

function SectionCard({
  icon: Icon, title, subtitle, action, children,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
            <Icon size={14} style={{ color: TEAL }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function PreferenceRow({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
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
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SegmentedControl({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; className?: string }[]
}) {
  return (
    <div className="inline-flex bg-gray-100 dark:bg-secondary p-1 rounded-lg">
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              opt.className || "",
              active
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
            style={active ? { color: TEAL } : undefined}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function NativeSelect({
  value, onChange, options, groups, disabled, fallbackLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  groups?: { label: string; options: { value: string; label: string }[] }[]
  disabled?: boolean
  fallbackLabel?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "appearance-none w-full sm:w-60 pl-3 pr-9 py-2 rounded-lg border text-sm",
          "bg-white dark:bg-secondary/40 border-border text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]",
          "disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
        ].join(" ")}
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
        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin pointer-events-none" />
      ) : (
        <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" style={{ color: TEAL }} />
      )}
    </div>
  )
}
