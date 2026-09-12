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
/** The eyebrow over a group of controls in the settings dialog. */
const EYEBROW = 'text-[10px] font-semibold uppercase tracking-[1.1px] text-ink-faint';

/** The dialog's save button, and the page's one primary action. */
const DIALOG_SAVE =
  'press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-btn bg-teal text-[13.5px] font-semibold text-white outline-none transition-opacity hover:opacity-90 disabled:opacity-60';

const CTA_PRIMARY =
  'press inline-flex items-center justify-center gap-2 rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline outline-none transition-opacity hover:opacity-90';

const CTA_QUIET =
  'press inline-flex items-center justify-center gap-2 rounded-btn border border-line px-4 text-[13px] font-semibold text-ink-body no-underline outline-none transition-colors hover:bg-line-soft';

const ERROR_INK = '#DC2626';

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
        active ? 'border-teal bg-[var(--teal-wash-2)]' : 'border-line hover:bg-line-soft',
      ].join(' ')}
    >
      <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
      <span className="mt-0.5 block text-[12px] text-ink-muted">{hint}</span>
    </button>
  );
}

/** What the action block reads, and the only way it changes anything. */
interface StudySetup {
  enrolled: boolean;
  /** No session. Starting opens lesson one directly; nothing is written. */
  guest: boolean;
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
  guest = false,
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
  /**
   * The visitor has no account. A guest may run a study - the lesson page
   * renders without a session and keeps its state in the browser - so `start`
   * goes straight to lesson one instead of POSTing an enrollment that would
   * only 401. Saving progress is the moment the lesson asks them to sign in.
   */
  guest?: boolean;
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
    // Nothing to save for a guest: no enrollment exists and the API would
    // refuse to create one. The chosen translation travels in the URL so the
    // lesson opens in it; rhythm and depth are account settings and wait.
    if (guest) {
      setOpen(false);
      const params = new URLSearchParams();
      if (translation && translation !== defaultTranslation) params.set('vertaling', translation);
      const query = params.toString();
      router.push(`/studie/${studyId}/1${query ? `?${query}` : ''}`);
      return;
    }

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
        router.push(`/inloggen?next=${encodeURIComponent(`/studies/${studyId}`)}`);
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
        guest,
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
            className="flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-line bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            <header className="flex h-14 flex-none items-center justify-between border-b border-line px-5">
              <h2 className="text-[14.5px] font-bold text-ink">
                {enrolled ? 'Je instellingen' : 'Stel je studie in'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Sluiten"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted outline-none transition-colors hover:bg-line-soft hover:text-ink"
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
                              ? 'border-transparent bg-teal text-white'
                              : 'border-line text-ink-body hover:bg-line-soft',
                          ].join(' ')}
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
                  className="w-full rounded-btn border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink outline-none focus-visible:border-teal"
                >
                  {/* Two groups, not one flat list. `optgroup` is used rather
                      than a fake disabled `<option>` separator because it is the
                      native construct for this: screen readers announce the
                      group, and the label cannot be selected by accident. The
                      groups are only rendered when non-empty - an empty
                      `optgroup` still draws its label in most browsers. */}
                  {dutchTranslations.length > 0 && (
                    <optgroup label="Nederlandse vertalingen">
                      {dutchTranslations.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherTranslations.length > 0 && (
                    <optgroup label="Overige vertalingen">
                      {otherTranslations.map((option) => (
                        <option key={option.id} value={option.id}>
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

            <footer className="flex flex-none gap-2.5 border-t border-line p-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 flex-1 rounded-btn border border-line text-[13.5px] font-medium text-ink-body outline-none transition-colors hover:bg-line-soft"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void submit(enrolled ? 'save' : 'start')}
                disabled={busy}
                className={DIALOG_SAVE}
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
    guest,
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
    // The design's "Verder waar je was" card, from the inside out: the eyebrow,
    // where you are, the bar, then the one primary button with the quiet one
    // under it (design_handoff_web/PAGES-STUDIE-EN-LES.md §10).
    <div className="flex flex-col">
      <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal">
        {enrolled ? 'Verder waar je was' : 'Nog niet begonnen'}
      </p>
      <p className="mt-[5px] text-[17px] font-bold text-ink">
        {enrolled ? `Les ${resumeDay} van ${lessonsTotal}` : 'Begin bij les 1'}
      </p>

      {enrolled && (
        <div className="mt-[13px] flex items-center gap-3">
          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-teal transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold text-ink-muted tabular-nums">{pct} %</span>
        </div>
      )}

      <div className="mt-[14px] flex flex-col gap-[9px]">
        {enrolled ? (
          <a href={resumeHref} data-track="study_resume" className={`${CTA_PRIMARY} h-11 w-full`}>
            <Play size={16} aria-hidden /> Verder met les {resumeDay}
          </a>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy}
            data-track="study_start"
            className={`${CTA_PRIMARY} h-11 w-full disabled:opacity-60`}
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

      {/* A guest is told up front where the account comes in, so the ask at
          the end of the lesson is expected rather than a wall. */}
      {guest && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
          Je kunt deze studie zonder account beginnen. Aan het einde van de les kun je een
          gratis account maken om je voortgang te bewaren.
        </p>
      )}

      {/* Suppressed while the dialog is open - it shows the same error. */}
      {error && !settingsOpen && (
        <p className="mt-3 text-[13px]" style={{ color: ERROR_INK }}>
          {error}
        </p>
      )}
    </div>
  );
}
