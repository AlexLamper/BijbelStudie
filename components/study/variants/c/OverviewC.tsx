'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search } from 'lucide-react';

import { CATALOGUE_ENTRIES, type StudyCategory } from '../../../../lib/bookStudies';
import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import { studyArtFor } from '../../../../lib/studyArt';
import { sceneSpec } from '../../../../lib/levensboom/scenes';
import Horizon from './Horizon';
import { ON_ART, ON_ART_FAINT, ON_ART_MUTED, SCRIM_CARD, TEAL } from './place';

/**
 * Ontwerp C - "Doorlopend" - screen 1 of 3: the catalogue.
 *
 * The base is ontwerp 2: the card IS the picture, no second colour system, no
 * decorative corner icon, no crop. Two things changed on the owner's verdict.
 *
 * 1. The featured card is a CARD again. It was a full-bleed 21:7 hero that ate
 *    the fold and pushed everything a reader actually browses below it; here it
 *    is a single row - a small window beside two lines of prose - a little over
 *    a third of its old height, and it sits on the page ground rather than
 *    replacing it.
 * 2. The pictures come from `lib/studyArt.ts` (STUDY_VISUAL_PLAN.md), not from
 *    `study.image` and not from a copy of the generator living next to this
 *    file. There is exactly one art module and this is a caller of it.
 *
 * What "doorlopend" adds: every window here is the FAR view of that study's
 * world - the whole horizon, small, seen from the road. Opening a study steps
 * in toward the same ridge, and a lesson stands on it. Hovering a card takes
 * half a step forward, which is the only honest preview of that movement a page
 * can give without a navigation animation library.
 */

interface Entry {
  study: CuratedStudy;
  kind: string;
  category: StudyCategory;
  lessonCount: number;
  avgMinutes: number;
  /** Everything a search should match, lowercased once at module load. */
  haystack: string;
}

const ENTRIES: Entry[] = CATALOGUE_ENTRIES.map(
  ({ study, book, kind, category, lessonCount, avgMinutes }) => ({
    study,
    kind,
    category,
    lessonCount,
    avgMinutes,
    haystack: (book
      ? `${study.title} ${book.name} ${book.genre} ${study.description}`
      : `${study.title} ${study.description} ${study.lessons.map((lesson) => lesson.book).join(' ')}`
    ).toLowerCase(),
  }),
);

const CATEGORY_LABELS: Record<StudyCategory, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
};

const COUNTS: Record<StudyCategory, number> = {
  ot: ENTRIES.filter((entry) => entry.category === 'ot').length,
  nt: ENTRIES.filter((entry) => entry.category === 'nt').length,
  personen: ENTRIES.filter((entry) => entry.category === 'personen').length,
  themas: ENTRIES.filter((entry) => entry.category === 'themas').length,
};

const KINDS: { value: CuratedStudy['type'] | ''; label: string }[] = [
  { value: '', label: 'Alle soorten' },
  { value: 'Boek', label: 'Bijbelboeken' },
  { value: 'Persoon', label: 'Personen' },
  { value: 'Gedeelte', label: 'Gedeelten' },
  { value: 'Onderwerp', label: "Thema's" },
];

type Tab = 'discover' | 'mine' | 'completed';

const TABS: { value: Tab; label: string }[] = [
  { value: 'discover', label: 'Ontdek' },
  { value: 'mine', label: 'Mijn studies' },
  { value: 'completed', label: 'Voltooid' },
];

/** The demo progress the page hands down; see the page file for the values. */
export interface DemoProgress {
  started: Record<string, { done: number; total: number; resumeDay: number }>;
  completed: string[];
}

interface Status {
  started: boolean;
  completed: boolean;
  done: number;
  total: number;
  resumeDay: number;
  pct: number;
}

const href = (id: string) => `/studies/versie-c/${encodeURIComponent(id)}`;

/**
 * The focus ring, once. Teal on the page's own background, so the offset works
 * in both themes - `ring-offset-2` defaults to white, which draws a white halo
 * on the dark ground.
 */
function ring(): React.CSSProperties {
  return {
    ['--tw-ring-color' as string]: TEAL,
    ['--tw-ring-offset-color' as string]: 'hsl(var(--background))',
  };
}

const CHIP_ON: React.CSSProperties = {
  borderColor: TEAL,
  backgroundColor: 'rgba(13,148,136,0.10)',
  color: TEAL,
};

function chipClass(active: boolean): string {
  return active
    ? ''
    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-border dark:text-muted-foreground dark:hover:border-muted-foreground/50';
}

/**
 * Half a step forward on hover.
 *
 * The only movement in the catalogue, and it is transform-only so it composites
 * and cannot reflow the grid. `motion-safe:` keeps it off a reduced-motion
 * machine entirely, where the card still lifts nothing and simply changes
 * shadow.
 */
const APPROACH =
  'motion-safe:transition-transform motion-safe:duration-[600ms] motion-safe:ease-out group-hover:scale-[1.055] group-focus-visible:scale-[1.055]';

// ---------------------------------------------------------------------------

/** A thin rail on the glass. White track, teal fill: readable on any sky. */
function GlassProgress({ status }: { status: Status }) {
  return (
    <div className="mt-2.5">
      <div
        className="h-[3px] w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
      >
        <div className="h-full rounded-full" style={{ width: `${status.pct}%`, backgroundColor: TEAL }} />
      </div>
      <p className="mt-1.5 text-[11px] tabular-nums" style={{ color: ON_ART_MUTED }}>
        Les {status.resumeDay} van {status.total}
      </p>
    </div>
  );
}

function DoneChip() {
  return (
    <span
      className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: TEAL, color: '#ffffff' }}
    >
      <Check size={11} aria-hidden /> Voltooid
    </span>
  );
}

/** One study, as the far view of its world. The glass is the body of the card. */
function WindowCard({ entry, status }: { entry: Entry; status: Status }) {
  const art = studyArtFor(entry.study.id, entry.study.type);

  return (
    <Link
      href={href(entry.study.id)}
      data-track="study_card"
      className="group block rounded-2xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={ring()}
    >
      <Horizon
        art={art}
        distance="ver"
        artClassName={APPROACH}
        className="aspect-[16/10] rounded-2xl shadow-sm transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.55)]"
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_CARD }} />
        {status.completed && <DoneChip />}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-2 text-[15.5px] font-bold leading-snug" style={{ color: ON_ART }}>
            {entry.study.title}
          </h3>
          <p className="mt-1 text-[11.5px] tabular-nums" style={{ color: ON_ART_FAINT }}>
            {entry.kind} · {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'} · ±
            {entry.avgMinutes} min
          </p>
          {status.started && !status.completed && <GlassProgress status={status} />}
        </div>
      </Horizon>
    </Link>
  );
}

/** A study under way. A row, not a banner: it is a shortcut, not an offer. */
function ResumeRow({ entry, status }: { entry: Entry; status: Status }) {
  const art = studyArtFor(entry.study.id, entry.study.type);

  return (
    <Link
      href={href(entry.study.id)}
      data-track="study_resume"
      className="group flex items-stretch gap-3.5 rounded-2xl border border-gray-200 bg-white p-2.5 no-underline transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-border dark:bg-card dark:hover:border-muted-foreground/40"
      style={ring()}
    >
      <Horizon
        art={art}
        distance="ver"
        quiet
        artClassName={APPROACH}
        className="w-[104px] flex-none rounded-xl sm:w-[124px]"
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5 pr-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-muted-foreground">
          Verder waar je was
        </span>
        <span className="mt-0.5 truncate text-[15px] font-bold text-gray-900 dark:text-foreground">
          {entry.study.title}
        </span>
        <span
          className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-gray-100 dark:bg-secondary"
          role="progressbar"
          aria-valuenow={status.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Voortgang in ${entry.study.title}`}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${status.pct}%`, backgroundColor: TEAL }}
          />
        </span>
        <span className="mt-1.5 text-[11.5px] tabular-nums text-gray-500 dark:text-muted-foreground">
          Les {status.resumeDay} van {status.total}
        </span>
      </span>
    </Link>
  );
}

/**
 * The featured study, at card size.
 *
 * A window, a title, one sentence and the facts you weigh - side by side, on
 * the page ground. The old hero put all four of those on the picture, which is
 * why it needed to be 21:7 and why it pushed the catalogue itself off screen.
 */
function FeaturedCard({ entry, status }: { entry: Entry; status: Status }) {
  const art = studyArtFor(entry.study.id, entry.study.type);

  return (
    <Link
      href={href(entry.study.id)}
      data-track="study_featured_card"
      className="group grid overflow-hidden rounded-2xl border border-gray-200 bg-white no-underline transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:grid-cols-[minmax(0,236px)_minmax(0,1fr)] dark:border-border dark:bg-card dark:hover:border-muted-foreground/40"
      style={ring()}
    >
      <Horizon
        art={art}
        distance="ver"
        artClassName={APPROACH}
        className="aspect-[16/9] sm:aspect-auto sm:min-h-[152px]"
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_CARD }} />
        <span
          className="absolute inset-x-0 bottom-0 px-3.5 pb-2.5 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: ON_ART_MUTED }}
        >
          {sceneSpec(art.scene).name}
        </span>
      </Horizon>

      <div className="flex min-w-0 flex-col justify-center p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
          Uitgelicht · {entry.kind}
        </p>
        <h3 className="mt-1.5 text-[19px] font-bold leading-tight text-gray-900 dark:text-foreground sm:text-[22px]">
          {entry.study.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 max-w-[62ch] text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
          {entry.study.description}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] tabular-nums text-gray-500 dark:text-muted-foreground">
          <span
            className="inline-flex h-8 items-center rounded-lg px-3.5 text-[12.5px] font-semibold text-white transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
            style={{ backgroundColor: TEAL }}
          >
            {status.started ? `Verder met les ${status.resumeDay}` : 'Open deze studie'}
          </span>
          <span>
            {entry.lessonCount} lessen · ± {entry.avgMinutes} min per les
          </span>
        </p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------

export default function OverviewC({ demo }: { demo: DemoProgress }) {
  const [tab, setTab] = useState<Tab>('discover');
  const [category, setCategory] = useState<StudyCategory | null>(null);
  const [kind, setKind] = useState<CuratedStudy['type'] | ''>('');
  const [query, setQuery] = useState('');

  /**
   * The pending state is real, not decoration: filtering seventy-seven rows on
   * every keystroke is enough work that React hands back the old list for a
   * frame or two, and saying so beats a list that silently lags the field.
   */
  const deferredQuery = useDeferredValue(query);
  /** The field decides WHETHER the search view shows; the deferred value decides
   *  what is in it. Gating both on the deferred value made the first keystroke
   *  flash the whole browsing furniture before the results arrived. */
  const searching = query.trim().length > 0;
  const pending = deferredQuery !== query;

  const statusFor = useMemo(() => {
    const completed = new Set(demo.completed);
    return (study: CuratedStudy): Status => {
      const row = demo.started[study.id];
      const total = row?.total ?? study.lessons.length;
      const done = completed.has(study.id) ? total : (row?.done ?? 0);
      return {
        started: !!row,
        completed: completed.has(study.id),
        done,
        total,
        resumeDay: row?.resumeDay ?? 1,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    };
  }, [demo]);

  const searchResults = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return [];
    return ENTRIES.filter((entry) => entry.haystack.includes(needle));
  }, [deferredQuery]);

  const listEntries = useMemo(() => {
    return ENTRIES.filter((entry) => {
      if (category && entry.category !== category) return false;
      if (kind && entry.study.type !== kind) return false;
      if (tab === 'discover') return true;
      const status = statusFor(entry.study);
      if (tab === 'mine') return status.started && !status.completed;
      return status.completed;
    });
  }, [tab, category, kind, statusFor]);

  /** The featured study: the first authored one, which has prose to show. */
  const featured = useMemo(() => ENTRIES.find((entry) => entry.study.type !== 'Boek') ?? ENTRIES[0], []);

  const resuming = useMemo(
    () =>
      Object.keys(demo.started)
        .map((id) => ENTRIES.find((entry) => entry.study.id === id))
        .filter((entry): entry is Entry => !!entry)
        .slice(0, 3),
    [demo],
  );

  const showFurniture = !searching && tab === 'discover';

  const emptyCopy =
    tab === 'mine'
      ? 'Je bent nog geen studie begonnen. Kies er een bij Ontdek en zet de eerste les op je naam.'
      : tab === 'completed'
        ? 'Nog niets afgerond. Zodra je alle lessen van een studie doet, komt die hier te staan.'
        : 'Geen studie past bij deze keuze. Zet de filters terug op alles.';

  return (
    <div className="pb-20">
      <header className="px-5 pt-6 sm:px-8 xl:px-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
              Bijbelstudies
            </p>
            <h1 className="mt-1.5 text-[28px] font-bold leading-tight text-gray-900 dark:text-foreground sm:text-[34px]">
              Wat is je volgende studie?
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              Elke studie heeft een eigen landschap: het uitzicht, het licht en het jaargetijde horen
              bij het boek dat je gaat lezen. Van hieraf zie je ze alle op afstand — je loopt er pas
              naar binnen als je er een opent.
            </p>
          </div>

          <div className="relative w-full flex-none lg:w-80">
            <label htmlFor="pc-zoek" className="sr-only">
              Zoek een bijbelboek, persoon of thema
            </label>
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground"
            />
            <input
              id="pc-zoek"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoek een bijbelboek, persoon of thema"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:border-border dark:bg-background"
              style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
            />
          </div>
        </div>
      </header>

      {searching ? (
        <section aria-labelledby="pc-zoekresultaat" className="mt-6 px-5 sm:px-8 xl:px-12">
          <h2 id="pc-zoekresultaat" className="sr-only">
            Zoekresultaten
          </h2>
          <p aria-live="polite" className="text-[12.5px] tabular-nums text-gray-500 dark:text-muted-foreground">
            {pending
              ? 'Zoeken…'
              : `${searchResults.length} ${searchResults.length === 1 ? 'studie' : 'studies'} gevonden voor “${deferredQuery.trim()}”`}
          </p>

          {searchResults.length === 0 && !pending ? (
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-gray-500 dark:text-muted-foreground">
              Niets gevonden. Probeer de naam van een bijbelboek (Ruth, Openbaring), een persoon
              (Mozes) of een thema (gebed).
            </p>
          ) : (
            <div
              className={`mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${pending ? 'opacity-60 transition-opacity' : ''}`}
            >
              {searchResults.map((entry) => (
                <WindowCard key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {showFurniture && (
            <div
              className={`mt-6 grid gap-4 px-5 sm:px-8 xl:px-12 ${
                resuming.length > 0 ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]' : ''
              }`}
            >
              <section aria-labelledby="pc-uitgelicht" className="min-w-0">
                <h2 id="pc-uitgelicht" className="sr-only">
                  Uitgelichte studie
                </h2>
                <FeaturedCard entry={featured} status={statusFor(featured.study)} />
              </section>

              {resuming.length > 0 && (
                <section aria-labelledby="pc-verder" className="min-w-0">
                  <h2
                    id="pc-verder"
                    className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-muted-foreground"
                  >
                    Je bent hier gebleven
                  </h2>
                  <div className="mt-2 space-y-2">
                    {resuming.map((entry) => (
                      <ResumeRow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <div className="mt-9 px-5 sm:px-8 xl:px-12">
            {/* A group of toggles, not `role="tablist"`: there is one list below
                and it is not a tabpanel, and claiming the tab pattern without
                panels is worse for a screen reader than not claiming it. */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Welke studies">
              {TABS.map((item) => {
                const active = item.value === tab;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTab(item.value)}
                    data-track={`study_tab_${item.value}`}
                    className={[
                      'press rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      active
                        ? 'text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-border dark:text-muted-foreground dark:hover:border-muted-foreground/50',
                    ].join(' ')}
                    style={active ? { ...ring(), backgroundColor: TEAL, borderColor: TEAL } : ring()}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={`press rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${chipClass(category === null)}`}
                style={category === null ? { ...ring(), ...CHIP_ON } : ring()}
              >
                Alles
              </button>
              {(Object.keys(CATEGORY_LABELS) as StudyCategory[]).map((key) => {
                const active = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(active ? null : key)}
                    aria-pressed={active}
                    data-track={`study_topic_${key}`}
                    className={`press rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${chipClass(active)}`}
                    style={active ? { ...ring(), ...CHIP_ON } : ring()}
                  >
                    {CATEGORY_LABELS[key]} <span className="tabular-nums opacity-60">{COUNTS[key]}</span>
                  </button>
                );
              })}

              <span aria-hidden className="mx-1 hidden h-5 w-px bg-gray-200 dark:bg-border sm:block" />

              <label className="inline-flex items-center gap-2 text-[12.5px] text-gray-500 dark:text-muted-foreground">
                <span>Soort</span>
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as CuratedStudy['type'] | '')}
                  className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-[12.5px] font-medium text-foreground focus:outline-none focus:ring-2 dark:border-border dark:bg-background"
                  style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
                >
                  {KINDS.map((item) => (
                    <option key={item.label} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <section aria-labelledby="pc-lijst" className="mt-6 px-5 sm:px-8 xl:px-12">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="pc-lijst" className="text-[17px] font-bold text-gray-900 dark:text-foreground">
                {category
                  ? CATEGORY_LABELS[category]
                  : tab === 'discover'
                    ? 'Alle landschappen'
                    : TABS.find((item) => item.value === tab)?.label}
              </h2>
              <p className="text-[12px] tabular-nums text-gray-400 dark:text-muted-foreground">
                {listEntries.length} {listEntries.length === 1 ? 'studie' : 'studies'}
              </p>
            </div>

            {listEntries.length === 0 ? (
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-gray-500 dark:text-muted-foreground">
                {emptyCopy}
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {listEntries.map((entry) => (
                  <WindowCard key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
