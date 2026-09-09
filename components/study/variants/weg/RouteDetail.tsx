'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Clock } from 'lucide-react';

import RoadRibbon from './RoadRibbon';
import RouteHorizon, { type RouteMark } from './RouteHorizon';
import { TEAL, stopCount, type RouteArt } from './routeArt';
import type { StudyDepth, StudyRhythm } from '../../../../lib/data/curated-studies';

/**
 * Ontwerp 3 - "Weg". The itinerary.
 *
 * Everything on this screen is the same road the overview card showed, opened
 * up: the hero is that route in perspective with a marker per stop, the rail on
 * the right is the same road seen from above with the stops written out, and the
 * bar at the foot says where you would set off from.
 *
 * The settings are not a settings panel. "Hoe je wilt reizen" is three
 * questions a walker actually answers before leaving - how often, how far to
 * look, which map - and they are radio groups with real inputs so a keyboard
 * behaves the way a keyboard should.
 *
 * This is a design preview: nothing here posts, and the progress is demo data
 * handed down from the page.
 */

export interface StopRow {
  day: number;
  title: string;
  reference: string;
  minutes: number;
  focus: string;
}

const RHYTHMS: { value: StudyRhythm; label: string; hint: string }[] = [
  { value: 'dagelijks', label: 'Elke dag', hint: 'Eén stop per dag' },
  { value: 'drie-per-week', label: '3x per week', hint: 'Ma, wo, vr' },
  { value: 'wekelijks', label: 'Wekelijks', hint: 'Eén stop per week' },
  { value: 'eigen', label: 'Eigen dagen', hint: 'Kies zelf je dagen' },
  { value: 'vrij', label: 'Geen ritme', hint: 'Zonder herinneringen' },
];

const DEPTHS: { value: StudyDepth; label: string; hint: string }[] = [
  { value: 'kort', label: 'Kort & praktisch', hint: 'Wat het vandaag betekent' },
  { value: 'diep', label: 'Diepgaand historisch', hint: 'Achtergrond en uitleg' },
];

function OptionCard({
  name,
  value,
  active,
  label,
  hint,
  onSelect,
}: {
  name: string;
  value: string;
  active: boolean;
  label: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <label
      className="cursor-pointer rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-[#0D9488] focus-within:ring-offset-1"
      style={{
        borderColor: active ? TEAL : 'rgb(203 213 225 / 0.9)',
        backgroundColor: active ? 'rgba(13,148,136,0.08)' : 'transparent',
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={active}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="block text-[13.5px] font-semibold text-foreground">{label}</span>
      <span className="mt-0.5 block text-[11.5px] text-gray-500 dark:text-muted-foreground">
        {hint}
      </span>
    </label>
  );
}

function Field({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 text-[12px] font-semibold text-foreground">{legend}</legend>
      {children}
    </fieldset>
  );
}

export default function RouteDetail({
  studyId,
  title,
  art,
  kind,
  sceneName,
  about,
  totalLabel,
  avgMinutes,
  from,
  to,
  stops,
  reading,
  translations,
  defaultTranslation,
  suggestedRhythm,
  suggestedDepth,
  demoDone,
}: {
  studyId: string;
  title: string;
  art: RouteArt;
  kind: string;
  sceneName: string;
  about: string[];
  totalLabel: string;
  avgMinutes: number;
  from: string;
  to: string;
  stops: StopRow[];
  reading: { book: string; chapters: string }[];
  translations: { id: string; name: string; language: string }[];
  defaultTranslation: string;
  suggestedRhythm: StudyRhythm;
  suggestedDepth: StudyDepth;
  /** Demo data from the page: how many stops are behind you once you set out. */
  demoDone: number;
}) {
  const [started, setStarted] = useState(true);
  const [rhythm, setRhythm] = useState<StudyRhythm>(suggestedRhythm);
  const [depth, setDepth] = useState<StudyDepth>(suggestedDepth);
  // The manifest may not carry the study's suggested version at all, and a
  // <select> whose value matches no option renders as blank.
  const [translation, setTranslation] = useState(
    translations.some((entry) => entry.id === defaultTranslation)
      ? defaultTranslation
      : (translations[0]?.id ?? defaultTranslation),
  );
  const [openStop, setOpenStop] = useState<number | null>(null);

  const total = stops.length;
  const done = started ? Math.min(demoDone, Math.max(0, total - 1)) : 0;
  const currentIndex = done;
  const current = stops[currentIndex] ?? stops[0];
  const walked = total > 0 ? done / total : 0;

  const marks = useMemo<RouteMark[]>(() => {
    if (total === 0) return [];
    const every = Math.max(1, Math.ceil(total / 12));
    const list: RouteMark[] = [];
    for (let index = 0; index < total; index += 1) {
      const isCurrent = started && index === currentIndex;
      if (index % every !== 0 && !isCurrent) continue;
      list.push({ t: (index + 0.5) / total, done: index < done, current: isCurrent });
    }
    return list;
  }, [total, done, currentIndex, started]);

  const dutch = translations.filter((entry) => entry.language === 'nl');
  const other = translations.filter((entry) => entry.language !== 'nl');
  const lessonHref = `/studie/versie-3/${studyId}/${current?.day ?? 1}`;

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto lg:flex lg:flex-row lg:overflow-hidden">
        {/* Left: what this road is, and how you want to walk it. */}
        <div className="lg:flex-1 lg:min-w-0 lg:overflow-y-auto">
          <div className="px-5 sm:px-8 py-6 lg:max-w-[760px]">
            <RouteHorizon
              art={art}
              ratio={16 / 5}
              walked={walked}
              marks={marks}
              label={`Routebeeld bij ${title} — ${sceneName}, ${stopCount(total)}`}
              className="rounded-2xl border border-gray-200 dark:border-border"
            />

            {/* Vertrek en aankomst, plus the two numbers you weigh before you
                commit: how many stops, and how long the whole thing takes. */}
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                { label: 'Vertrek', value: from },
                { label: 'Eindpunt', value: to },
                { label: 'Stops', value: `${total}` },
                { label: 'Looptijd', value: `± ${totalLabel}` },
              ].map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 text-[14px] font-semibold text-foreground tabular-nums">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-7 text-sm font-bold text-foreground">Waar deze weg langs gaat</h2>
            <div className="mt-2 space-y-3">
              {about.map((paragraph, index) => (
                <p key={index} className="text-[15px] leading-relaxed text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </div>

            <p className="mt-4 text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              <span className="font-semibold text-foreground/80">Terrein:</span> {kind} &middot;{' '}
              <span className="font-semibold text-foreground/80">Je leest:</span>{' '}
              {reading.map((entry) => `${entry.book} ${entry.chapters}`).join(' · ')} &middot;{' '}
              <span className="font-semibold text-foreground/80">Per stop:</span> ± {avgMinutes} min
            </p>

            <section className="mt-8 rounded-2xl border border-gray-200 dark:border-border bg-gray-50/70 dark:bg-card/40 p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground">Hoe je wilt reizen</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                Drie keuzes, en je kunt ze onderweg altijd bijstellen.
              </p>

              <div className="mt-4 space-y-5">
                <Field legend="Hoe vaak wil je lopen?">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                    {RHYTHMS.map((option) => (
                      <OptionCard
                        key={option.value}
                        name="weg-rhythm"
                        value={option.value}
                        active={rhythm === option.value}
                        label={option.label}
                        hint={option.hint}
                        onSelect={() => setRhythm(option.value)}
                      />
                    ))}
                  </div>
                </Field>

                <Field legend="Hoe ver wil je kijken?">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {DEPTHS.map((option) => (
                      <OptionCard
                        key={option.value}
                        name="weg-depth"
                        value={option.value}
                        active={depth === option.value}
                        label={option.label}
                        hint={option.hint}
                        onSelect={() => setDepth(option.value)}
                      />
                    ))}
                  </div>
                </Field>

                <div>
                  <label
                    htmlFor="weg-translation"
                    className="mb-2 block text-[12px] font-semibold text-foreground"
                  >
                    Welke vertaling neem je mee?
                  </label>
                  <select
                    id="weg-translation"
                    value={translation}
                    onChange={(event) => setTranslation(event.target.value)}
                    className="h-10 w-full max-w-sm rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40"
                  >
                    {dutch.length > 0 && (
                      <optgroup label="Nederlandse vertalingen">
                        {dutch.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {other.length > 0 && (
                      <optgroup label="Overige vertalingen">
                        {other.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {translations.length === 0 && (
                      <option value={defaultTranslation}>{defaultTranslation}</option>
                    )}
                  </select>
                </div>
              </div>
            </section>

            <div className="h-6" aria-hidden />
          </div>
        </div>

        {/* Right: the road itself, stop by stop. */}
        <aside className="flex w-full min-h-0 flex-col border-t border-gray-200 dark:border-border bg-gray-50/60 dark:bg-card/40 lg:w-[420px] lg:flex-none lg:border-l lg:border-t-0">
          <header className="flex-none border-b border-gray-200 dark:border-border px-4 sm:px-5 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold text-foreground">De routekaart</h2>
              <p className="text-[11px] font-semibold tabular-nums text-gray-500 dark:text-muted-foreground">
                {started ? `${done} van ${total} gelopen` : `${stopCount(total)}`}
              </p>
            </div>
          </header>

          <ol className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {stops.map((stop, index) => {
              const isDone = index < done;
              const isCurrent = started && index === currentIndex;
              const isOpen = openStop === stop.day;
              // The segment of road behind this row: full when the stop is
              // walked, half when this is where you stand, empty ahead.
              const segment = isDone ? 1 : isCurrent ? 0.5 : 0;

              return (
                <li
                  key={stop.day}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="relative pl-12"
                >
                  <span
                    aria-hidden
                    className="absolute left-[19px] top-0 h-full w-2.5 overflow-hidden bg-gray-200 dark:bg-border"
                  >
                    <span
                      className="absolute inset-x-0 top-0 block"
                      style={{ height: `${segment * 100}%`, backgroundColor: TEAL }}
                    />
                    <span
                      className="absolute inset-y-0 left-1/2 block w-0.5 -translate-x-1/2"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(180deg, rgba(255,255,255,0.8) 0 5px, rgba(255,255,255,0) 5px 13px)',
                      }}
                    />
                  </span>

                  <span
                    aria-hidden
                    className={[
                      'absolute left-3 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10.5px] font-bold tabular-nums',
                      isDone || isCurrent
                        ? 'bg-white dark:bg-card'
                        : 'bg-white dark:bg-card border-gray-300 dark:border-border text-gray-400 dark:text-muted-foreground',
                    ].join(' ')}
                    style={
                      isDone
                        ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' }
                        : isCurrent
                          ? { borderColor: TEAL, color: TEAL }
                          : undefined
                    }
                  >
                    {isDone ? <Check size={12} /> : stop.day}
                  </span>

                  <div className="pb-2">
                    <button
                      type="button"
                      onClick={() => setOpenStop(isOpen ? null : stop.day)}
                      aria-expanded={isOpen}
                      className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-white dark:hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                          {stop.title}
                        </span>
                        {isCurrent && (
                          <span
                            className="flex-none rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }}
                          >
                            Hier sta je
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-gray-500 dark:text-muted-foreground">
                        <span className="truncate">{stop.reference}</span>
                        <span className="inline-flex flex-none items-center gap-0.5 tabular-nums">
                          <Clock size={10} aria-hidden /> {stop.minutes} min
                        </span>
                      </span>
                    </button>

                    <div
                      className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
                      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-2 pb-2">
                          <p className="text-[12px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                            {stop.focus}
                          </p>
                          {started ? (
                            <Link
                              href={`/studie/versie-3/${studyId}/${stop.day}`}
                              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
                              style={{ backgroundColor: TEAL }}
                            >
                              {isDone ? 'Nog eens lopen' : 'Naar deze stop'}
                              <ArrowRight size={12} aria-hidden />
                            </Link>
                          ) : (
                            <p className="mt-2 text-[12px] text-gray-400 dark:text-muted-foreground">
                              Vertrek eerst; daarna staat deze stop voor je open.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>

      {/* Foot: where you set off from, across both panes. */}
      <footer className="flex-none border-t border-gray-200 dark:border-border bg-white dark:bg-card">
        <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="min-w-0 flex-1">
            <RoadRibbon progress={walked} thickness={8} />
            <p className="mt-1.5 text-[11.5px] text-gray-500 dark:text-muted-foreground tabular-nums">
              {started
                ? `${done} van ${total} stops gelopen · nog ${total - done} te gaan`
                : `Nog niet vertrokken · ${stopCount(total)} voor je`}
            </p>
          </div>

          {/* Review control, not product: it flips the invented progress so both
              states of this screen can be judged in one sitting. */}
          <div className="flex flex-none items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
              Demostatus
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-border p-0.5">
              {[
                { value: true, label: 'Onderweg' },
                { value: false, label: 'Nog niet' },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setStarted(option.value)}
                  aria-pressed={started === option.value}
                  className="rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                  style={
                    started === option.value
                      ? { backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }
                      : { color: 'inherit' }
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href={lessonHref}
            className="press inline-flex h-11 flex-none items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
            style={{ backgroundColor: TEAL }}
          >
            {started
              ? `Verder bij stop ${current?.day ?? 1} — ${current?.reference ?? ''}`
              : `Vertrek bij stop ${stops[0]?.day ?? 1} — ${stops[0]?.reference ?? ''}`}
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </footer>
    </>
  );
}
