'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, Layers, Loader2 } from 'lucide-react';
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
 * The settings someone picks before starting a study.
 *
 * The browser's own timezone is sent along on purpose. `preferences.reminderTimezone`
 * defaults to Europe/Amsterdam and is only ever written when a client supplies
 * it, so without this every reminder for a user who never opened settings would
 * be scheduled in the wrong zone - which means arriving in the middle of their
 * night, not merely being late.
 */
export default function StudyOnboardingForm({
  studyId,
  translations,
  defaultTranslation,
  suggestedRhythm,
  suggestedDepth,
  enrolled,
  resumeHref,
}: {
  studyId: string;
  translations: { id: string; name: string }[];
  defaultTranslation: string;
  suggestedRhythm: StudyRhythm;
  suggestedDepth: StudyDepth;
  enrolled: boolean;
  resumeHref: string;
}) {
  const router = useRouter();
  const [rhythm, setRhythm] = useState<StudyRhythm>(suggestedRhythm);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [depth, setDepth] = useState<StudyDepth>(suggestedDepth);
  const [translation, setTranslation] = useState(defaultTranslation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
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
        setError('Starten is niet gelukt. Probeer het opnieuw.');
        return;
      }

      const data = await res.json();
      const day = data?.enrollment?.currentLessonDay ?? 1;
      router.push(`/studie/${studyId}/${day}`);
    } catch {
      setError('Geen verbinding. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-border p-5 sm:p-6 bg-white dark:bg-card">
      <h2 className="text-base font-bold text-foreground mb-5">
        {enrolled ? 'Je instellingen' : 'Stel je studie in'}
      </h2>

      <div className="space-y-6">
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
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {enrolled ? 'Instellingen opslaan en verder' : 'Start deze studie'}
        </button>

        {enrolled && (
          <a
            href={resumeHref}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary"
          >
            Verder waar je was
          </a>
        )}
      </div>
    </section>
  );
}
