'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';

import type { ReadingPreferences } from '../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

/** Group headings for the translation picker, Dutch first. */
const LANGUAGE_LABELS: Record<string, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  af: 'Afrikaans',
};

const FONT_SIZES: { value: ReadingPreferences['fontSize']; label: string }[] = [
  { value: 'sm', label: 'A' },
  { value: 'base', label: 'A' },
  { value: 'lg', label: 'A' },
  { value: 'xl', label: 'A' },
];

const FONT_FAMILIES: { value: ReadingPreferences['fontFamily']; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Schreefloos' },
];

const LINE_HEIGHTS: { value: ReadingPreferences['lineHeight']; label: string }[] = [
  { value: 'normal', label: 'Compact' },
  { value: 'relaxed', label: 'Ruim' },
  { value: 'loose', label: 'Extra ruim' },
];

/** A row of mutually exclusive choices. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  sizes,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Render the option labels at increasing sizes - for the font-size row. */
  sizes?: string[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-secondary p-1">
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={[
                'flex-1 h-8 rounded-md font-semibold transition-colors',
                sizes ? sizes[index] : 'text-[12px]',
                active
                  ? 'bg-white dark:bg-card shadow-sm'
                  : 'text-gray-500 dark:text-muted-foreground hover:text-foreground',
              ].join(' ')}
              style={active ? { color: TEAL } : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A labelled on/off row. */
function Toggle({
  label,
  hint,
  on,
  onToggle,
  onIcon,
  offIcon,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-secondary"
    >
      <span
        className="h-8 w-8 flex-none rounded-lg flex items-center justify-center"
        style={{ backgroundColor: on ? 'rgba(13,148,136,0.10)' : 'rgba(148,163,184,0.14)' }}
      >
        <span style={{ color: on ? TEAL : undefined }} className={on ? '' : 'text-gray-400'}>
          {on ? onIcon : offIcon}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        {hint && (
          <span className="block text-[11px] text-gray-500 dark:text-muted-foreground">{hint}</span>
        )}
      </span>
      <span
        aria-hidden
        className="flex-none h-5 w-9 rounded-full p-0.5 transition-colors"
        style={{ backgroundColor: on ? TEAL : 'rgba(148,163,184,0.45)' }}
      >
        <span
          className="block h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: on ? 'translateX(16px)' : 'none' }}
        />
      </span>
    </button>
  );
}

/**
 * Everything about HOW this study session is presented, in one place.
 *
 * These controls existed already but were scattered: the translation and the
 * type settings were on the passage step only, sound and full screen were two
 * unlabelled icons in the bar, and nothing said they belonged together. A reader
 * who wanted bigger text on the reflection step had no way to get it without
 * walking back to step 2.
 *
 * Deliberately session settings, not study settings. Nothing here writes
 * StudyEnrollment: the translation is a per-lesson view (see the note on
 * `version` in StudyFlowShell), the reading preferences are the account-wide
 * ones already shared with /lezen, and sound is device-local. The study's own
 * rhythm, depth and default translation stay on the detail page, which is where
 * a decision that governs every future lesson belongs.
 */
export default function StudySettingsMenu({
  open,
  onOpenChange,
  preferences,
  onUpdatePreferences,
  version,
  versions,
  onVersionChange,
  soundOn,
  onToggleSound,
  fullscreen,
  onToggleFullscreen,
  reduceMotion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: ReadingPreferences;
  onUpdatePreferences: (prefs: Partial<ReadingPreferences>) => void;
  version: string;
  versions: { id: string; name: string; language?: string }[];
  onVersionChange: (id: string) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  reduceMotion: boolean | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const groups = new Map<string, { id: string; name: string }[]>();
  for (const option of versions) {
    const key = option.language ?? 'overig';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }
  const languages = [...groups.keys()].sort((a, b) =>
    a === 'nl' ? -1 : b === 'nl' ? 1 : a.localeCompare(b),
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ backgroundColor: 'rgba(2,6,23,0.18)' }}
          />
          <motion.div
            role="dialog"
            aria-label="Instellingen voor deze sessie"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 top-full mt-1.5 right-3 sm:right-5 w-[min(92vw,300px)] max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card shadow-[0_28px_70px_-24px_rgba(2,6,23,0.55)] p-3 space-y-3.5"
          >
            <div>
              <label
                htmlFor="session-translation"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground"
              >
                Vertaling
              </label>
              <select
                id="session-translation"
                value={version}
                onChange={(event) => onVersionChange(event.target.value)}
                data-track="study_settings_version"
                className="w-full h-9 cursor-pointer rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background px-2.5 text-[13px] text-foreground outline-none focus-visible:ring-2"
                style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
              >
                {languages.map((language) => (
                  <optgroup
                    key={language}
                    label={LANGUAGE_LABELS[language] ?? 'Overige vertalingen'}
                  >
                    {groups.get(language)!.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-muted-foreground">
                Alleen voor deze les. Je studie-instelling verandert niet.
              </p>
            </div>

            <Segmented
              label="Tekstgrootte"
              value={preferences.fontSize}
              options={FONT_SIZES}
              onChange={(fontSize) => onUpdatePreferences({ fontSize })}
              sizes={['text-[11px]', 'text-[13px]', 'text-[15px]', 'text-[17px]']}
            />

            <Segmented
              label="Lettertype"
              value={preferences.fontFamily}
              options={FONT_FAMILIES}
              onChange={(fontFamily) => onUpdatePreferences({ fontFamily })}
            />

            <Segmented
              label="Regelafstand"
              value={preferences.lineHeight}
              options={LINE_HEIGHTS}
              onChange={(lineHeight) => onUpdatePreferences({ lineHeight })}
            />

            <div className="border-t border-gray-200 dark:border-border pt-2 -mx-1">
              <Toggle
                label="Versnummers"
                on={preferences.showVerseNumbers}
                onToggle={() =>
                  onUpdatePreferences({ showVerseNumbers: !preferences.showVerseNumbers })
                }
                onIcon={<span className="text-[11px] font-bold">1</span>}
                offIcon={<span className="text-[11px] font-bold">1</span>}
              />
              <Toggle
                label="Geluid"
                hint="Bij het wisselen van stap"
                on={soundOn}
                onToggle={onToggleSound}
                onIcon={<Volume2 size={15} />}
                offIcon={<VolumeX size={15} />}
              />
              <Toggle
                label="Volledig scherm"
                on={fullscreen}
                onToggle={onToggleFullscreen}
                onIcon={<Minimize2 size={15} />}
                offIcon={<Maximize2 size={15} />}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
