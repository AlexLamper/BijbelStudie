'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Layers,
  Loader2,
  Play,
  Settings2,
  X,
} from 'lucide-react';
import type { StudyDepth, StudyRhythm } from '../../../lib/data/curated-studies';

const TEAL = '#0D9488';

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
        'text-left rounded-xl border p-3 transition-colors',
        active
          ? 'border-transparent'
          : 'border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-secondary',
      ].join(' ')}
      style={active ? { backgroundColor: 'rgba(13,148,136,0.08)', borderColor: TEAL }: undefined}
    >
      <span className="block text-sm font-semibold text-foreground">{label}</span>
      <span className="block text-xs text-gray-500 dark:text-muted-foreground mt-0.5">{hint}</span>
    </button>
  );
}

/** What both bars read, and the only way either of them changes anything. */
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
  /** The bottom bar stays quiet about an error the dialog is already showing. */
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
 * This was a single right-rail component that stacked the settings, the lesson
 * list and the start button itself, because those blocks share one piece of
 * state but do not render next to each other. That trick stopped working when
 * the two controls moved into opposite bars: the settings summary now sits in
 * the header and the start/resume button in a full-width bar below both panes,
 * with the panes in between. No component can contain both without owning the
 * entire page layout.
 *
 * So the state moved up and the layout moved out. The provider renders nothing
 * of its own except the dialog - which is `fixed`, so where it sits in the tree
 * does not matter - and each bar pulls what it needs out of the context. There
 * is still exactly one copy of the settings and one POST: `start` and the
 * dialog's save button both call `submit`.
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
  /** The page itself: both bars and both panes. */
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Studie-instellingen"
            onClick={(event) => event.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-white dark:bg-card rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-border shadow-2xl"
          >
            <header className="flex-none flex items-center justify-between px-5 h-14 border-b border-gray-200 dark:border-border">
              <h2 className="text-sm font-bold text-foreground">
                {enrolled ? 'Je instellingen' : 'Stel je studie in'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Sluiten"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-secondary text-muted-foreground"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground mb-2.5">
                  <CalendarDays size={13} /> Studieritme
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                            'h-9 w-11 rounded-lg text-xs font-semibold border transition-colors',
                            active
                              ? 'text-white border-transparent'
                              : 'border-gray-200 dark:border-border text-foreground hover:bg-gray-50 dark:hover:bg-secondary',
                          ].join(' ')}
                          style={active ? { backgroundColor: TEAL } : undefined}
                        >
                          {weekday.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground mb-2.5">
                  <Layers size={13} /> Type uitleg
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground mb-2.5"
                >
                  <BookOpen size={13} /> Bijbelvertaling
                </label>
                <select
                  id="translation"
                  value={translation}
                  onChange={(event) => setTranslation(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background px-3 py-2.5 text-sm text-foreground"
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

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <footer className="flex-none flex gap-2.5 p-5 border-t border-gray-200 dark:border-border">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 h-10 rounded-lg text-sm font-medium border border-gray-200 dark:border-border bg-white dark:bg-card text-foreground hover:bg-gray-50 dark:hover:bg-secondary"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void submit(enrolled ? 'save' : 'start')}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
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
 * The settings, as they sit in the header bar.
 *
 * This replaces the three static facts that used to hold the right edge of the
 * bar - lesson count, total minutes, starting chapter - which said nothing that
 * changed and nothing you could act on. Those facts moved into the left pane;
 * the bar now carries the one thing up here that is yours and adjustable.
 *
 * Summary and entry point in one control. The rail spent a whole card on three
 * dt/dd rows plus a separate "Instellingen wijzigen" button, and a header bar
 * has room for neither: one line of values, the same dialog behind it.
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
      className="press flex-none inline-flex items-center gap-2 h-9 pl-2.5 pr-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-500 dark:text-muted-foreground transition-colors hover:text-foreground hover:bg-gray-50 dark:hover:bg-secondary hover:border-gray-300 dark:hover:border-muted-foreground/40"
    >
      <Settings2 size={14} className="flex-none" style={{ color: TEAL }} />
      {/* Below md the three values would push the title out of the bar, so the
          control falls back to its own name there. Either way the values are on
          the button as its accessible name and as a tooltip. */}
      <span className="hidden md:inline max-w-[340px] truncate text-[11.5px] font-medium">
        {summary}
      </span>
      <span className="md:hidden text-[11.5px] font-medium">Instellingen</span>
      <ChevronRight size={13} className="flex-none" />
    </button>
  );
}

/**
 * The bar along the bottom of the page: where you are, and the one way on.
 *
 * It spans both panes on purpose. Pinned inside the right rail it was a block
 * the width of the lesson list, competing with the lessons directly above it.
 * Full width it mirrors the h-14 header bar, and the page reads as chrome,
 * content, chrome - while still doing what pinning it was for: staying put
 * while both panes scroll.
 *
 * Laid out along the bar instead of stacked. The sentence, the meter, the count
 * and the button share one row, and the parts that only restate the meter drop
 * out as the bar narrows.
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
    <div className="flex-none h-14 border-t border-gray-200 dark:border-border bg-white dark:bg-card">
      <div className="h-full px-3 sm:px-5 flex items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-2.5 sm:gap-3.5">
          {enrolled ? (
            <>
              <p className="hidden sm:block flex-none text-[12.5px] font-semibold text-foreground">
                Je bent bezig met deze studie
              </p>
              <div className="h-1.5 flex-1 min-w-[56px] max-w-[200px] rounded-full bg-gray-200 dark:bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: TEAL }}
                />
              </div>
              <span
                className="flex-none text-[11.5px] font-bold tabular-nums"
                style={{ color: TEAL }}
              >
                {pct}%
              </span>
              <span className="hidden md:block flex-none text-[11.5px] text-gray-500 dark:text-muted-foreground">
                {lessonsCompleted} van {lessonsTotal} lessen afgerond
              </span>
            </>
          ) : (
            <>
              <p className="flex-none text-[12.5px] font-semibold text-foreground">
                Je bent nog niet begonnen
              </p>
              <span className="hidden sm:block flex-none text-[11.5px] text-gray-500 dark:text-muted-foreground">
                {lessonsTotal} lessen
              </span>
            </>
          )}

          {/* Suppressed while the dialog is open - it shows the same error. */}
          {error && !settingsOpen && (
            <p className="min-w-0 truncate text-[11.5px] text-destructive">{error}</p>
          )}
        </div>

        {enrolled ? (
          <a
            href={resumeHref}
            data-track="study_resume"
            className="press flex-none inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <Play size={14} /> Verder met les {resumeDay}
          </a>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy}
            data-track="study_start"
            className="press flex-none inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Start deze studie
          </button>
        )}
      </div>
    </div>
  );
}
