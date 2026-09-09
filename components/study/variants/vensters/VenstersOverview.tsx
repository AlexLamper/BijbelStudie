'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search } from 'lucide-react';

import { CATALOGUE_ENTRIES, type StudyCategory } from '../../../../lib/bookStudies';
import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import StudyWindow from './StudyWindow';
import {
  ON_ART,
  ON_ART_FAINT,
  ON_ART_MUTED,
  SCRIM_CARD,
  SCRIM_HERO,
  studyArtFor,
} from './studyHorizon';

const TEAL = '#0D9488';

/**
 * Variant 2 - "Vensters" - the catalogue.
 *
 * The premise: a study is a window onto a landscape, and choosing one is
 * choosing which window to stand at. So the card IS the picture. Nothing sits
 * beside the art in a 96x64 box; the title and the two facts you weigh live on
 * glass over the lower third of the window itself, where a scrim guarantees
 * white text over a noon sky and a midnight one alike.
 *
 * What that buys, against the current /studies: no second colour system (the
 * `hueOf` HSL hash is gone, every colour comes from `buildPalette`), no
 * decorative corner icon, and no crop - the horizon composes to the box it is
 * given rather than being sliced out of a 16:6 drawing.
 *
 * Browsing furniture is deliberately thin: one row of tabs, one row of
 * categories, one labelled select. The four large topic buttons the current
 * page carries are four more rectangles competing with seventy-seven pictures.
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

const ENTRIES: Entry[] = CATALOGUE_ENTRIES.map(({ study, book, kind, category, lessonCount, avgMinutes }) => ({
  study,
  kind,
  category,
  lessonCount,
  avgMinutes,
  haystack: (book
    ? `${study.title} ${book.name} ${book.genre} ${study.description}`
    : `${study.title} ${study.description} ${study.lessons.map((lesson) => lesson.book).join(' ')}`
  ).toLowerCase(),
}));

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

const href = (id: string) => `/studies/versie-2/${encodeURIComponent(id)}`;

/**
 * The focus ring, once. Teal on the page's own background so the offset ring
 * works in both themes - `ring-offset-2` defaults to white, which draws a white
 * halo on the dark ground.
 */
function ring(): React.CSSProperties {
  return {
    ['--tw-ring-color' as string]: TEAL,
    ['--tw-ring-offset-color' as string]: 'hsl(var(--background))',
  };
}

/** A filter chip. Its "off" state is theme-aware, so it stays a chip at night. */
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

/** One study, as a window. The card has no body: the glass is the body. */
function WindowCard({ entry, status }: { entry: Entry; status: Status }) {
  const art = studyArtFor({ id: entry.study.id, type: entry.study.type, kind: entry.kind });

  return (
    <Link
      href={href(entry.study.id)}
      data-track="study_card"
      className="group block no-underline rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={ring()}
    >
      <StudyWindow
        art={art}
        className="aspect-[16/10] rounded-2xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.55)]"
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_CARD }} />
        {status.completed && <DoneChip />}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3
            className="line-clamp-2 text-[15.5px] font-bold leading-snug"
            style={{ color: ON_ART }}
          >
            {entry.study.title}
          </h3>
          <p className="mt-1 text-[11.5px] tabular-nums" style={{ color: ON_ART_FAINT }}>
            {entry.kind} · {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'} · ±
            {entry.avgMinutes} min
          </p>
          {status.started && !status.completed && <GlassProgress status={status} />}
        </div>
      </StudyWindow>
    </Link>
  );
}

/** A study already under way, given the width to say where you left off. */
function ResumeWindow({ entry, status }: { entry: Entry; status: Status }) {
  const art = studyArtFor({ id: entry.study.id, type: entry.study.type, kind: entry.kind });

  return (
    <Link
      href={href(entry.study.id)}
      data-track="study_resume"
      className="group block no-underline rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={ring()}
    >
      <StudyWindow
        art={art}
        className="aspect-[16/7] rounded-2xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.55)]"
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_CARD }} />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: ON_ART_FAINT }}>
            Verder waar je was
          </p>
          <h3 className="mt-1 truncate text-[17px] font-bold" style={{ color: ON_ART }}>
            {entry.study.title}
          </h3>
          <GlassProgress status={status} />
        </div>
      </StudyWindow>
    </Link>
  );
}

// ---------------------------------------------------------------------------

export default function VenstersOverview({ demo }: { demo: DemoProgress }) {
  const [tab, setTab] = useState<Tab>('discover');
  const [category, setCategory] = useState<StudyCategory | null>(null);
  const [kind, setKind] = useState<CuratedStudy['type'] | ''>('');
  const [query, setQuery] = useState('');

  /**
   * The pending state is real, not decoration: filtering seventy-seven rows on
   * every keystroke is enough work that React will hand back the old list for a
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

  /** The hero: the first authored study, which has prose a large window can fill. */
  const featured = useMemo(
    () => ENTRIES.find((entry) => entry.study.type !== 'Boek') ?? ENTRIES[0],
    [],
  );

  const resuming = useMemo(
    () =>
      Object.keys(demo.started)
        .map((id) => ENTRIES.find((entry) => entry.study.id === id))
        .filter((entry): entry is Entry => !!entry)
        .slice(0, 3),
    [demo],
  );

  const showFurniture = !searching && tab === 'discover';
  const heroArt = studyArtFor({
    id: featured.study.id,
    type: featured.study.type,
    kind: featured.kind,
  });

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
              Elke studie opent op een eigen uitzicht: het landschap, het licht en het uur horen bij
              het boek dat je gaat lezen. Kies het venster waar je naar binnen wilt.
            </p>
          </div>

          <div className="relative w-full flex-none lg:w-80">
            <label htmlFor="vensters-zoek" className="sr-only">
              Zoek een bijbelboek, persoon of thema
            </label>
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground"
            />
            <input
              id="vensters-zoek"
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
        <section aria-labelledby="vensters-zoekresultaat" className="mt-6 px-5 sm:px-8 xl:px-12">
          <h2 id="vensters-zoekresultaat" className="sr-only">
            Zoekresultaten
          </h2>
          <p
            aria-live="polite"
            className="text-[12.5px] text-gray-500 dark:text-muted-foreground tabular-nums"
          >
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
            <section aria-labelledby="vensters-uitgelicht" className="mt-6 px-5 sm:px-8 xl:px-12">
              <h2 id="vensters-uitgelicht" className="sr-only">
                Uitgelichte studie
              </h2>
              <Link
                href={href(featured.study.id)}
                data-track="study_featured_card"
                className="group block no-underline rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={ring()}
              >
                <StudyWindow
                  art={heroArt}
                  className="aspect-[4/3] rounded-3xl shadow-sm transition-shadow duration-300 group-hover:shadow-[0_28px_70px_-32px_rgba(15,23,42,0.65)] sm:aspect-[16/9] lg:aspect-[21/7]"
                >
                  <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_HERO }} />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 lg:p-12">
                    <p
                      className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: ON_ART_FAINT }}
                    >
                      Uitgelicht · {featured.kind}
                    </p>
                    <h3 className="mt-2 max-w-3xl text-[26px] font-bold leading-tight sm:text-[38px] lg:text-[46px]" style={{ color: ON_ART }}>
                      {featured.study.title}
                    </h3>
                    <p
                      className="mt-3 max-w-2xl text-[14px] leading-relaxed sm:text-[15.5px]"
                      style={{ color: ON_ART_MUTED }}
                    >
                      {featured.study.description}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span
                        className="press inline-flex h-11 items-center rounded-xl px-6 text-[14px] font-semibold text-white transition-transform duration-200 group-hover:translate-x-0.5"
                        style={{ backgroundColor: TEAL }}
                      >
                        Open deze studie
                      </span>
                      <span className="text-[12.5px] tabular-nums" style={{ color: ON_ART_MUTED }}>
                        {featured.lessonCount} lessen · ± {featured.avgMinutes} min per les
                      </span>
                    </div>
                  </div>
                </StudyWindow>
              </Link>
            </section>
          )}

          {showFurniture && resuming.length > 0 && (
            <section aria-labelledby="vensters-verder" className="mt-10 px-5 sm:px-8 xl:px-12">
              <h2
                id="vensters-verder"
                className="text-[17px] font-bold text-gray-900 dark:text-foreground"
              >
                Je bent hier gebleven
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {resuming.map((entry) => (
                  <ResumeWindow key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 px-5 sm:px-8 xl:px-12">
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
                    style={
                      active
                        ? { ...ring(), backgroundColor: TEAL, borderColor: TEAL }
                        : ring()
                    }
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
                    {CATEGORY_LABELS[key]}{' '}
                    <span className="tabular-nums opacity-60">{COUNTS[key]}</span>
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

          <section aria-labelledby="vensters-lijst" className="mt-6 px-5 sm:px-8 xl:px-12">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="vensters-lijst"
                className="text-[17px] font-bold text-gray-900 dark:text-foreground"
              >
                {category ? CATEGORY_LABELS[category] : tab === 'discover' ? 'Alle vensters' : TABS.find((item) => item.value === tab)?.label}
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
