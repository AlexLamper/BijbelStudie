'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  Layers,
  Loader2,
  Play,
  Settings2,
  Sparkles,
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
      style={active ? { backgroundColor: 'rgba(13,148,136,0.08)', borderColor: TEAL } : undefined}
    >
      <span className="block text-sm font-semibold text-foreground">{label}</span>
      <span className="block text-xs text-gray-500 dark:text-muted-foreground mt-0.5">{hint}</span>
    </button>
  );
}

/**
 * Start button, progress and settings for one study.
 *
 * The settings live in a dialog rather than in the rail. They are a one-time
 * decision that someone changes rarely, and a permanently open form of five
 * radio groups competed with the only control that matters on this page - the
 * button that starts the study. What stays visible is a one-line summary of
 * what those settings currently are.
 *
 * The browser's own timezone is sent along on purpose. `preferences.reminderTimezone`
 * defaults to Europe/Amsterdam and is only ever written when a client supplies
 * it, so without this every reminder for a user who never opened settings would
 * be scheduled in the wrong zone - which means arriving in the middle of their
 * night, not merely being late.
 */
export default function StudyStartPanel({
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
}: {
  studyId: string;
  translations: { id: string; name: string }[];
  defaultTranslation: string;
  suggestedRhythm: StudyRhythm;
  suggestedDepth: StudyDepth;
  enrolled: boolean;
  resumeHref: string;
  resumeDay: number;
  lessonsTotal: number;
  lessonsCompleted: number;
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
  const rhythmLabel = RHYTHMS.find((option) => option.value === rhythm)?.label ?? '';
  const depthLabel = DEPTHS.find((option) => option.value === depth)?.label ?? '';
  const pct = lessonsTotal > 0 ? Math.round((lessonsCompleted / lessonsTotal) * 100) : 0;

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
    <>
      {enrolled && (
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="h-9 w-9 flex-none rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
          >
            <Sparkles size={15} style={{ color: TEAL }} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-tight">
              Je bent bezig met deze studie
            </p>
            <p className="text-[11px] text-gray-500 dark:text-muted-foreground">
              {lessonsCompleted} van {lessonsTotal} lessen afgerond &middot; {pct}%
            </p>
          </div>
        </div>
      )}

      {enrolled ? (
        <a
          href={resumeHref}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          <Play size={15} /> Verder met les {resumeDay}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => void submit('start')}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          Start deze studie
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full inline-flex items-center justify-between gap-2 h-10 px-3 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card text-left hover:bg-gray-50 dark:hover:bg-secondary transition-colors"
      >
        <span className="min-w-0 flex items-center gap-2">
          <Settings2 size={14} className="flex-none text-gray-400 dark:text-muted-foreground" />
          <span className="text-[12px] text-gray-600 dark:text-muted-foreground truncate">
            {rhythmLabel} &middot; {depthLabel} &middot; {translationName}
          </span>
        </span>
        <span className="text-[12px] font-semibold flex-none" style={{ color: TEAL }}>
          Wijzig
        </span>
      </button>

      {error && !open && <p className="mt-2 text-xs text-destructive">{error}</p>}

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
                  {translations.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
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
    </>
  );
}
