'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  Layers,
  Loader2,
  Play,
  Settings2,
  X,
} from 'lucide-react';
import type { StudyDepth, StudyRhythm } from '../../../lib/data/curated-studies';
import {
  CTA_PRIMARY,
  CTA_QUIET,
  EYEBROW,
  PANEL_DEEP,
  SCENE_BG,
  TEAL_DEEP,
  TEAL_ON_DARK,
} from '../../../components/scene/tokens';

/**
 * The dialog's save button.
 *
 * Written out rather than `CTA_BRAND` plus overrides: two Tailwind utilities
 * for the same property have equal specificity, so a `py-0` next to the token's
 * `py-3` would be settled by stylesheet order rather than by intent. The fill
 * is still TEAL_DEEP - white on #0D9488 measures 3.74:1 and fails.
 */
const DIALOG_SAVE =
  'press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60';

/**
 * A message the reader must not miss, on a dark ground.
 *
 * `text-destructive` is a theme token and flips with the reader's light/dark
 * setting; the scene behind this dialog does not. Red-300 is the literal that
 * clears 4.5:1 on the panel underneath it in either setting.
 */
const ERROR_INK = '#FCA5A5';

const RHYTHMS: { value: StudyRhythm; label: string; hint: string }[] = [
  { value: 'dagelijks', label: 'Elke dag', hint: 'Eén les per dag' },
  { value: 'drie-per-week', label: '3x per week', hint: 'Maandag, woensdag, vrijdag' },
  { value: 'wekelijks', label: 'Wekelijks', hint: 'Eén les per week' },
  { value: 'eigen', label: 'Eigen dagen', hint: 'Kies zelf welke dagen' },
  { value: 'vrij', label: 'Geen ritme', hint: 'Zonder herinneringen' },
];

const DEPTHS: { value: StudyDepth; label: string; hint: string }[] = [
  { value: 'kort', label: 'Kort & praktisch', hint: 'Toepassing op vandaag' },
  { value: 'diep', label: 'Diepgaand historisch', hint: 'Achtergrond en uitleg' },
];

const WEEKDAYS = [
  { value: 1, label: 'ma' },
  { value: 2, label: 'di' },
  { value: 3, label: 'wo' },
  { value: 4, label: 'do' },
  { value: 5, label: 'vr' },
  { value: 6, label: 'za' },
  { value: 0, label: 'zo' },
];

function Choice({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white',
        active ? 'border-transparent' : 'border-white/20 hover:bg-white/[0.06]',
      ].join(' ')}
      style={active ? { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: TEAL_ON_DARK } : undefined}
    >
      <span className="block text-sm font-semibold text-white">{label}</span>
      <span className="mt-0.5 block text-xs text-white/65">{hint}</span>
    </button>
  );
}

/** What the action block reads, and the only way it changes anything. */
interface StudySetup {
  enrolled: boolean;
  resumeHref: string;
  resumeDay: number;
  lessonsTotal: number;
  lessonsCompleted: number;
  /** The current settings, already resolved to the labels the summary shows. */
  rhythmLabel: string;
  depthLabel: string;
  translationName: string;
  busy: boolean;
  error: string | null;
  /** The action block stays quiet about an error the dialog is already showing. */
  settingsOpen: boolean;
  openSettings: () => void;
  /** Creates the enrollment with the current settings and opens lesson one. */
  start: () => void;
}

const SetupContext = createContext<StudySetup | null>(null);

function useStudySetup(component: string) {
  const setup = useContext(SetupContext);
  if (!setup) throw new Error(`<${component}> must be rendered inside <StudySetupProvider>.`);
  return setup;
}

/**
 * The study's settings, its dialog and the enrollment POST - held above the
 * whole page rather than inside one panel.
 *
 * The state sits up here because the controls that read it are not siblings:
 * the start button lives in the scene's first screen and the dialog is `fixed`
 * over everything. The provider renders nothing of its own except that dialog,
 * so the page's layers are unaffected, and there is still exactly one copy of
 * the settings and one POST: `start` and the dialog's save button both call
 * `submit`.
 *
 * `children` is the whole page, handed in by a server component, so the
 * description and the lesson list stay server-rendered and crawlable. This is a
 * client boundary around that markup, not a client replacement for it.
 *
 * The settings live in a dialog rather than on the page. They are a one-time
 * decision that someone changes rarely, and a permanently open form of five
 * radio groups competed with the only control that matters here. What stays
 * visible is a summary of what those settings currently are.
 *
 * The browser's own timezone is sent along on purpose. `preferences.reminderTimezone`
 * defaults to Europe/Amsterdam and is only ever written when a client supplies
 * it, so without this every reminder for a user who never opened settings would
 * be scheduled in the wrong zone - which means arriving in the middle of their
 * night, not merely being late.
 */
export default function StudySetupProvider({
  studyId,
  translations,
  defaultTranslation,
  suggestedRhythm,
  suggestedDepth,
  enrolled,
  resumeHref,
  resumeDay,
  lessonsTotal,
  lessonsCompleted,
  children,
}: {
  studyId: string;
  translations: { id: string; name: string; language?: string }[];
  defaultTranslation: string;
  suggestedRhythm: StudyRhythm;
  suggestedDepth: StudyDepth;
  enrolled: boolean;
  resumeHref: string;
  resumeDay: number;
  lessonsTotal: number;
  lessonsCompleted: number;
  /** The page itself: every layer of it. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [rhythm, setRhythm] = useState<StudyRhythm>(suggestedRhythm);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [depth, setDepth] = useState<StudyDepth>(suggestedDepth);
  const [translation, setTranslation] = useState(defaultTranslation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const translationName =
    translations.find((option) => option.id === translation)?.name ?? defaultTranslation;
  // A version with no `language` counts as "overig" rather than Dutch: guessing
  // wrong the other way would put an English text under the Dutch heading.
  const dutchTranslations = translations.filter((option) => option.language === 'nl');
  const otherTranslations = translations.filter((option) => option.language !== 'nl');
  const rhythmLabel = RHYTHMS.find((option) => option.value === rhythm)?.label ?? '';
  const depthLabel = DEPTHS.find((option) => option.value === depth)?.label ?? '';

  async function submit(mode: 'start' | 'save') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/study-enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId,
          rhythm,
          reminderDays: rhythm === 'eigen' ? days : [],
          depth,
          translation,
          remindersEnabled: rhythm !== 'vrij',
          reminderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (res.status === 401) {
        router.push(`/inloggen?callbackUrl=${encodeURIComponent(`/studies/${studyId}`)}`);
        return;
      }
      if (!res.ok) {
        setError('Opslaan is niet gelukt. Probeer het opnieuw.');
        return;
      }

      const data = await res.json();
      if (mode === 'save') {
        setOpen(false);
        router.refresh();
        return;
      }

      const day = data?.enrollment?.currentLessonDay ?? 1;
      router.push(`/studie/${studyId}/${day}`);
    } catch {
      setError('Geen verbinding. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SetupContext.Provider
      value={{
        enrolled,
        resumeHref,
        resumeDay,
        lessonsTotal,
        lessonsCompleted,
        rhythmLabel,
        depthLabel,
        translationName,
        busy,
        error,
        settingsOpen: open,
        openSettings: () => setOpen(true),
        start: () => void submit('start'),
      }}
    >
      {children}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Studie-instellingen"
            onClick={(event) => event.stopPropagation()}
            className={`flex max-h-[88vh] w-full flex-col rounded-t-2xl shadow-2xl sm:max-w-lg sm:rounded-2xl ${PANEL_DEEP}`}
          >
            <header className="flex h-14 flex-none items-center justify-between border-b border-white/10 px-5">
              <h2 className="text-sm font-semibold text-white">
                {enrolled ? 'Je instellingen' : 'Stel je studie in'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Sluiten"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
              >
                <X size={16} aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
              <div>
                <p className={`${EYEBROW} mb-2.5 flex items-center gap-1.5`}>
                  <CalendarDays size={13} aria-hidden /> Studieritme
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {RHYTHMS.map((option) => (
                    <Choice
                      key={option.value}
                      active={rhythm === option.value}
                      onClick={() => setRhythm(option.value)}
                      label={option.label}
                      hint={option.hint}
                    />
                  ))}
                </div>

                {rhythm === 'eigen' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((weekday) => {
                      const active = days.includes(weekday.value);
                      return (
                        <button
                          key={weekday.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setDays((current) =>
                              current.includes(weekday.value)
                                ? current.filter((day) => day !== weekday.value)
                                : [...current, weekday.value],
                            )
                          }
                          className={[
                            'h-9 w-11 rounded-lg border text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white',
                            active
                              ? 'border-transparent text-white'
                              : 'border-white/20 text-white/80 hover:bg-white/[0.06]',
                          ].join(' ')}
                          style={active ? { backgroundColor: TEAL_DEEP } : undefined}
                        >
                          {weekday.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className={`${EYEBROW} mb-2.5 flex items-center gap-1.5`}>
                  <Layers size={13} aria-hidden /> Type uitleg
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DEPTHS.map((option) => (
                    <Choice
                      key={option.value}
                      active={depth === option.value}
                      onClick={() => setDepth(option.value)}
                      label={option.label}
                      hint={option.hint}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="translation"
                  className={`${EYEBROW} mb-2.5 flex items-center gap-1.5`}
                >
                  <BookOpen size={13} aria-hidden /> Bijbelvertaling
                </label>
                <select
                  id="translation"
                  value={translation}
                  onChange={(event) => setTranslation(event.target.value)}
                  className="w-full rounded-lg border border-white/20 px-3 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{ backgroundColor: SCENE_BG }}
                >
                  {/* Two groups, not one flat list. `optgroup` is used rather
                      than a fake disabled `<option>` separator because it is the
                      native construct for this: screen readers announce the
                      group, and the label cannot be selected by accident. The
                      groups are only rendered when non-empty - an empty
                      `optgroup` still draws its label in most browsers.

                      The options carry their own colours: a native popup does
                      not inherit the control's, and unset it can land as dark
                      text on a dark list. */}
                  {dutchTranslations.length > 0 && (
                    <optgroup label="Nederlandse vertalingen" style={{ backgroundColor: SCENE_BG, color: '#fff' }}>
                      {dutchTranslations.map((option) => (
                        <option key={option.id} value={option.id} style={{ backgroundColor: SCENE_BG, color: '#fff' }}>
                          {option.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherTranslations.length > 0 && (
                    <optgroup label="Overige vertalingen" style={{ backgroundColor: SCENE_BG, color: '#fff' }}>
                      {otherTranslations.map((option) => (
                        <option key={option.id} value={option.id} style={{ backgroundColor: SCENE_BG, color: '#fff' }}>
                          {option.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {error && (
                <p className="text-sm" style={{ color: ERROR_INK }}>
                  {error}
                </p>
              )}
            </div>

            <footer className="flex flex-none gap-2.5 border-t border-white/10 p-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 flex-1 rounded-lg border border-white/25 text-sm font-medium text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void submit(enrolled ? 'save' : 'start')}
                disabled={busy}
                className={DIALOG_SAVE}
                style={{ backgroundColor: TEAL_DEEP }}
              >
                {busy && <Loader2 size={15} aria-hidden className="animate-spin" />}
                {enrolled ? 'Opslaan' : 'Opslaan en starten'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </SetupContext.Provider>
  );
}

/**
 * The settings, as the quiet action beside the primary one.
 *
 * Summary and entry point in one control: one line of values, the dialog behind
 * it. Below md the three values would run past the measure, so the control
 * falls back to its own name there - the values stay on the button as its
 * accessible name and as a tooltip either way.
 */
export function StudySettingsButton() {
  const { rhythmLabel, depthLabel, translationName, openSettings } =
    useStudySetup('StudySettingsButton');

  const summary = [rhythmLabel, depthLabel, translationName].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={openSettings}
      data-track="study_settings_open"
      aria-haspopup="dialog"
      title={`Instellingen: ${summary}`}
      aria-label={`Studie-instellingen wijzigen. Nu: ${summary}`}
      className={CTA_QUIET}
    >
      <Settings2 size={14} aria-hidden className="flex-none" />
      <span className="hidden max-w-[340px] truncate md:inline">{summary}</span>
      <span className="md:hidden">Instellingen</span>
    </button>
  );
}

/**
 * Where you are in this study, and the one way on.
 *
 * This used to be a fixed bar across the foot of a page that never scrolled.
 * The page scrolls now - the scene's depth engine needs it to - so the action
 * moved to where the dashboard puts its own: into the first screen, under the
 * title, as the white pill that is the only fill guaranteed to separate from
 * whatever the landscape is doing behind it. Same state, same handlers, same
 * two outcomes: resume the lesson you were on, or create the enrollment.
 *
 * The progress line is white rather than teal for the same reason: on a sky
 * that can be noon or midnight, white is the one ink that always reads.
 */
export function StudyActionBar() {
  const {
    enrolled,
    resumeHref,
    resumeDay,
    lessonsTotal,
    lessonsCompleted,
    busy,
    error,
    settingsOpen,
    start,
  } = useStudySetup('StudyActionBar');

  const pct = lessonsTotal > 0 ? Math.round((lessonsCompleted / lessonsTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {enrolled && (
        <div className="max-w-[30rem]">
          <div className="flex items-baseline justify-between text-xs font-medium tabular-nums text-white/75">
            <span>
              Les {resumeDay} van {lessonsTotal}
            </span>
            <span>{lessonsCompleted} afgerond</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%`, boxShadow: '0 0 18px rgba(255,255,255,0.85)' }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {enrolled ? (
          <a href={resumeHref} data-track="study_resume" className={CTA_PRIMARY}>
            <Play size={16} aria-hidden /> Verder met les {resumeDay}
          </a>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy}
            data-track="study_start"
            className={`${CTA_PRIMARY} disabled:opacity-60`}
          >
            {busy ? (
              <Loader2 size={16} aria-hidden className="animate-spin" />
            ) : (
              <Play size={16} aria-hidden />
            )}
            Start deze studie
          </button>
        )}

        <StudySettingsButton />
      </div>

      {/* Suppressed while the dialog is open - it shows the same error. */}
      {error && !settingsOpen && (
        <p className="text-sm" style={{ color: ERROR_INK }}>
          {error}
        </p>
      )}
    </div>
  );
}
