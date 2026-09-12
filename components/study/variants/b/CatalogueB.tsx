'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search } from 'lucide-react';

import { CATALOGUE_ENTRIES, type StudyCategory } from '../../../../lib/bookStudies';
import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import { studyArtFor, type StudyArt } from '../../../../lib/studyArt';
import { Horizon, ON_ART, ON_ART_FAINT, ON_ART_MUTED, sceneName, scrimFor, TEAL } from './art';

/**
 * Ontwerp B - "Dichter" - scherm 1 van 3: de catalogus.
 *
 * Het venster van ontwerp 2 blijft: de kaart ís het beeld, de titel en de
 * feiten staan op glas over de onderrand, en elke kleur komt uit
 * `lib/studyArt.ts` - geen tweede HSL-systeem, geen bijgesneden tekening, geen
 * decoratief hoekicoon.
 *
 * Wat anders is dan ontwerp 2, en waarom:
 *
 *  - De uitgelichte studie is een strook van ongeveer 120 pixels in plaats van
 *    een beeld van 21:7. Precies wat er gevraagd werd, en de ruimte die dat
 *    oplevert gaat naar de lijst.
 *  - Elke kaart draagt vier feiten in plaats van twee: waar in de Bijbel je
 *    begint, wat voor soort studie het is, hoe lang hij is, en welk uitzicht
 *    erbij hoort. Dat laatste is geen sier - het uitzicht wordt per soort
 *    getrokken, dus wie een tijdje bladert leest de soort af aan het licht.
 *  - Klein en herhaald in plaats van groot en zeldzaam: vijf kolommen op een
 *    breed scherm, dus je ziet er twintig tegelijk in plaats van zes.
 *  - Een begonnen studie ziet er anders uit dan een onbegonnen: een volle
 *    voortgangsbalk over de onderrand van de kaart, over de hele breedte, ook
 *    als je niet leest wat eronder staat.
 */

interface Row {
  study: CuratedStudy;
  kind: string;
  category: StudyCategory;
  lessonCount: number;
  avgMinutes: number;
  /** "Johannes 20–21", "Genesis 1–50", "Mattheüs · Handelingen e.a." */
  reference: string;
  art: StudyArt;
  scene: string;
  /** Alles waar een zoekopdracht op mag raken, één keer verkleind. */
  haystack: string;
}

/** Waar in de Bijbel deze studie staat, in één regel. */
function referenceOf(study: CuratedStudy): string {
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];
  if (books.length === 0) return `${study.startBook} ${study.startChapter}`;
  if (books.length === 1) {
    const chapters = study.lessons.map((lesson) => lesson.chapter);
    const first = Math.min(...chapters);
    const last = Math.max(...chapters);
    return first === last ? `${books[0]} ${first}` : `${books[0]} ${first}–${last}`;
  }
  if (books.length === 2) return `${books[0]} · ${books[1]}`;
  return `${books[0]} · ${books[1]} e.a.`;
}

const ROWS: Row[] = CATALOGUE_ENTRIES.map(({ study, book, kind, category, lessonCount, avgMinutes }) => {
  const art = studyArtFor(study.id, study.type);
  return {
    study,
    kind,
    category,
    lessonCount,
    avgMinutes,
    reference: referenceOf(study),
    art,
    scene: sceneName(art),
    haystack: (book
      ? `${study.title} ${book.name} ${book.genre} ${study.description}`
      : `${study.title} ${kind} ${study.description} ${study.lessons.map((lesson) => lesson.book).join(' ')}`
    ).toLowerCase(),
  };
});

const CATEGORY_LABELS: Record<StudyCategory, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
};

const COUNTS: Record<StudyCategory, number> = {
  ot: ROWS.filter((row) => row.category === 'ot').length,
  nt: ROWS.filter((row) => row.category === 'nt').length,
  personen: ROWS.filter((row) => row.category === 'personen').length,
  themas: ROWS.filter((row) => row.category === 'themas').length,
};

const KINDS: { value: CuratedStudy['type'] | ''; label: string }[] = [
  { value: '', label: 'Alle soorten' },
  { value: 'Boek', label: 'Bijbelboeken' },
  { value: 'Persoon', label: 'Personen' },
  { value: 'Gedeelte', label: 'Gedeelten' },
  { value: 'Onderwerp', label: "Thema's" },
];

type Sort = 'canon' | 'kort' | 'lang' | 'az';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'canon', label: 'Bijbelvolgorde' },
  { value: 'kort', label: 'Kortste eerst' },
  { value: 'lang', label: 'Langste eerst' },
  { value: 'az', label: 'Alfabetisch' },
];

type Tab = 'ontdek' | 'mijn' | 'voltooid';

const TABS: { value: Tab; label: string }[] = [
  { value: 'ontdek', label: 'Ontdek' },
  { value: 'mijn', label: 'Mijn studies' },
  { value: 'voltooid', label: 'Voltooid' },
];

/** De demovoortgang die de pagina meegeeft; de waarden staan in het paginabestand. */
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

const href = (id: string) => `/studies/versie-b/${encodeURIComponent(id)}`;

/**
 * De focusring, één keer. Teal op de eigen achtergrond van de pagina, want
 * `ring-offset-2` valt terug op wit en tekent dan een witte halo op de donkere
 * grond.
 */
const RING: React.CSSProperties = {
  ['--tw-ring-color' as string]: TEAL,
  ['--tw-ring-offset-color' as string]: 'hsl(var(--background))',
};

const CHIP_ON: React.CSSProperties = {
  borderColor: TEAL,
  backgroundColor: 'rgba(13,148,136,0.10)',
  color: TEAL,
};

const CHIP_OFF =
  'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-border dark:text-muted-foreground dark:hover:border-muted-foreground/50';

// ---------------------------------------------------------------------------

/** De rail over de onderrand: het teken dat een studie loopt. */
function ProgressRail({ pct }: { pct: number }) {
  return (
    <span
      aria-hidden
      className="absolute inset-x-0 bottom-0 h-[3px]"
      style={{ backgroundColor: 'rgba(255,255,255,0.24)' }}
    >
      <span className="block h-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
    </span>
  );
}

function DoneChip() {
  return (
    <span
      className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: TEAL, color: '#ffffff' }}
    >
      <Check size={10} strokeWidth={3} aria-hidden /> Voltooid
    </span>
  );
}

/**
 * Eén studie als venster. Vier feiten op glas, en niets ernaast: de kaart heeft
 * geen body, het glas ís de body.
 */
function WindowCard({ row, status }: { row: Row; status: Status }) {
  return (
    <Link
      href={href(row.study.id)}
      data-track="study_card"
      className="group block rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={RING}
    >
      <Horizon
        art={row.art}
        ratio={[210, 140]}
        className="aspect-[3/2] min-h-[172px] rounded-xl shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_34px_-18px_rgba(15,23,42,0.55)]"
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: scrimFor(row.art) }} />
        {status.completed ? <DoneChip /> : null}

        <div className="absolute inset-x-0 bottom-0 p-3.5 pb-4">
          <h3 className="line-clamp-2 text-[14.5px] font-bold leading-snug" style={{ color: ON_ART }}>
            {row.study.title}
          </h3>
          <p className="mt-1 truncate text-[11.5px]" style={{ color: ON_ART_MUTED }}>
            {row.reference} · {row.kind}
          </p>
          <p className="mt-0.5 truncate text-[11px] tabular-nums" style={{ color: ON_ART_FAINT }}>
            {row.lessonCount} {row.lessonCount === 1 ? 'les' : 'lessen'} · ± {row.avgMinutes} min ·{' '}
            {row.scene}
          </p>
          {status.started && !status.completed ? (
            <p className="mt-1.5 text-[11px] font-semibold tabular-nums" style={{ color: ON_ART }}>
              Les {status.resumeDay} van {status.total}
            </p>
          ) : null}
        </div>

        {status.started ? <ProgressRail pct={status.pct} /> : null}
      </Horizon>
    </Link>
  );
}

/** Een lopende studie, als regel: merk, titel, rail, en waar je stond. */
function ResumeRow({ row, status }: { row: Row; status: Status }) {
  return (
    <Link
      href={href(row.study.id)}
      data-track="study_resume"
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 no-underline transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-border dark:bg-card dark:hover:border-muted-foreground/50"
      style={RING}
    >
      <Horizon
        art={row.art}
        ratio={[72, 48]}
        quiet
        className="h-11 w-[68px] flex-none rounded-lg"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-gray-900 transition-colors group-hover:text-[#0D9488] dark:text-foreground dark:group-hover:text-teal-400">
          {row.study.title}
        </span>
        <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
          <span
            className="block h-full rounded-full"
            style={{ width: `${status.pct}%`, backgroundColor: TEAL }}
          />
        </span>
        <span className="mt-1 block text-[11px] tabular-nums text-gray-500 dark:text-muted-foreground">
          Les {status.resumeDay} van {status.total} · {status.pct}% gedaan
        </span>
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------

export default function CatalogueB({ demo }: { demo: DemoProgress }) {
  const [tab, setTab] = useState<Tab>('ontdek');
  const [category, setCategory] = useState<StudyCategory | null>(null);
  const [kind, setKind] = useState<CuratedStudy['type'] | ''>('');
  const [sort, setSort] = useState<Sort>('canon');
  const [query, setQuery] = useState('');

  /**
   * De wachtstand is echt, geen sier: zevenenzeventig regels filteren bij elke
   * toetsaanslag is genoeg werk dat React een frame of twee de oude lijst
   * teruggeeft, en dat hardop zeggen is beter dan een lijst die stilletjes
   * achterloopt op het veld.
   */
  const deferredQuery = useDeferredValue(query);
  const searching = query.trim().length > 0;
  const pending = deferredQuery !== query;

  const statusFor = useMemo(() => {
    const completed = new Set(demo.completed);
    return (study: CuratedStudy): Status => {
      const entry = demo.started[study.id];
      const total = entry?.total ?? study.lessons.length;
      const done = completed.has(study.id) ? total : (entry?.done ?? 0);
      return {
        started: !!entry || completed.has(study.id),
        completed: completed.has(study.id),
        done,
        total,
        resumeDay: entry?.resumeDay ?? 1,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    };
  }, [demo]);

  const sortRows = useMemo(() => {
    return (rows: Row[]): Row[] => {
      if (sort === 'canon') return rows;
      const copy = [...rows];
      if (sort === 'az') return copy.sort((a, b) => a.study.title.localeCompare(b.study.title, 'nl'));
      if (sort === 'kort') return copy.sort((a, b) => a.lessonCount - b.lessonCount);
      return copy.sort((a, b) => b.lessonCount - a.lessonCount);
    };
  }, [sort]);

  const searchResults = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return [];
    return sortRows(ROWS.filter((row) => row.haystack.includes(needle)));
  }, [deferredQuery, sortRows]);

  const listRows = useMemo(() => {
    const filtered = ROWS.filter((row) => {
      if (category && row.category !== category) return false;
      if (kind && row.study.type !== kind) return false;
      if (tab === 'ontdek') return true;
      const status = statusFor(row.study);
      if (tab === 'mijn') return status.started && !status.completed;
      return status.completed;
    });
    return sortRows(filtered);
  }, [tab, category, kind, statusFor, sortRows]);

  /** De uitgelichte studie: de eerste geschreven studie, die eigen proza heeft. */
  const featured = useMemo(() => ROWS.find((row) => row.study.type !== 'Boek') ?? ROWS[0], []);

  const resuming = useMemo(
    () =>
      Object.keys(demo.started)
        .map((id) => ROWS.find((row) => row.study.id === id))
        .filter((row): row is Row => !!row)
        .slice(0, 3),
    [demo],
  );

  const showFurniture = !searching && tab === 'ontdek';
  const featuredStatus = statusFor(featured.study);

  const emptyCopy =
    tab === 'mijn'
      ? 'Je bent nog aan geen enkele studie begonnen. Kies er een bij Ontdek en zet de eerste les op je naam.'
      : tab === 'voltooid'
        ? 'Nog niets afgerond. Zodra je alle lessen van een studie doet, komt die hier te staan.'
        : 'Geen studie past bij deze keuze. Zet de filters terug op alles.';

  const grid = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

  return (
    <div className="pb-16">
      <header className="px-4 pt-5 sm:px-6 xl:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
              Bijbelstudies
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight text-gray-900 sm:text-[30px] dark:text-foreground">
              Kies je volgende studie
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              Elke studie heeft een eigen uitzicht. Het landschap hoort bij de soort studie, het licht
              en het seizoen liggen vast bij de studie zelf - zo herken je een studie aan zijn kleur
              voordat je de titel leest.
            </p>
          </div>

          <div className="relative w-full flex-none lg:w-[19rem]">
            <label htmlFor="b-zoek" className="sr-only">
              Zoek een bijbelboek, persoon of thema
            </label>
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground"
            />
            <input
              id="b-zoek"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoek een bijbelboek, persoon of thema"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-[13.5px] text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:border-border dark:bg-background"
              style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
            />
          </div>
        </div>
      </header>

      {searching ? (
        <section aria-labelledby="b-zoekresultaat" className="mt-5 px-4 sm:px-6 xl:px-10">
          <h2 id="b-zoekresultaat" className="sr-only">
            Zoekresultaten
          </h2>
          <p
            aria-live="polite"
            className="text-[12.5px] tabular-nums text-gray-500 dark:text-muted-foreground"
          >
            {pending
              ? 'Zoeken…'
              : `${searchResults.length} ${searchResults.length === 1 ? 'studie' : 'studies'} gevonden voor “${deferredQuery.trim()}”`}
          </p>

          {searchResults.length === 0 && !pending ? (
            <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              Niets gevonden. Probeer de naam van een bijbelboek (Ruth, Openbaring), een persoon
              (Mozes) of een thema (gebed).
            </p>
          ) : (
            <div className={`mt-3 ${grid} ${pending ? 'opacity-60 transition-opacity' : ''}`}>
              {searchResults.map((row) => (
                <WindowCard key={row.study.id} row={row} status={statusFor(row.study)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {showFurniture ? (
            <section aria-labelledby="b-uitgelicht" className="mt-5 px-4 sm:px-6 xl:px-10">
              <h2 id="b-uitgelicht" className="sr-only">
                Uitgelichte studie
              </h2>
              {/* De strook. Eén beeld van 176 breed naast drie regels tekst:
                  genoeg om op te vallen, te weinig om het overzicht op te eten. */}
              <Link
                href={href(featured.study.id)}
                data-track="study_featured_card"
                className="group grid grid-cols-[112px_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border border-gray-200 bg-white no-underline transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:grid-cols-[176px_minmax(0,1fr)] dark:border-border dark:bg-card dark:hover:border-muted-foreground/50"
                style={RING}
              >
                <Horizon art={featured.art} ratio={[176, 118]} className="h-full min-h-[104px] w-full" />
                <span className="min-w-0 px-4 py-3 sm:px-5">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-muted-foreground">
                    Uitgelicht · {featured.kind}
                  </span>
                  <span className="mt-0.5 block truncate text-[17px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#0D9488] dark:text-foreground dark:group-hover:text-teal-400">
                    {featured.study.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block max-w-[70ch] text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                    {featured.study.description}
                  </span>
                  <span className="mt-1.5 block text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                    {featured.reference} · {featured.lessonCount} lessen · ± {featured.avgMinutes} min
                    per les
                    {featuredStatus.started ? ` · les ${featuredStatus.resumeDay} is aan de beurt` : ''}
                  </span>
                </span>
              </Link>
            </section>
          ) : null}

          {showFurniture && resuming.length > 0 ? (
            <section aria-labelledby="b-verder" className="mt-6 px-4 sm:px-6 xl:px-10">
              <h2 id="b-verder" className="text-[13px] font-bold uppercase tracking-[0.14em] text-gray-900 dark:text-foreground">
                Je bent hier gebleven
              </h2>
              <div className="mt-2.5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {resuming.map((row) => (
                  <ResumeRow key={row.study.id} row={row} status={statusFor(row.study)} />
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-6 px-4 sm:px-6 xl:px-10">
            {/* Een groep schakelaars, geen `role="tablist"`: er staat één lijst
                onder en dat is geen tabpanel, en het tabpatroon claimen zonder
                panelen is voor een schermlezer slechter dan het niet claimen. */}
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
                    className={`press rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${active ? 'text-white' : CHIP_OFF}`}
                    style={active ? { ...RING, backgroundColor: TEAL, borderColor: TEAL } : RING}
                  >
                    {item.label}
                  </button>
                );
              })}

              <span aria-hidden className="mx-1 hidden h-5 w-px bg-gray-200 sm:block dark:bg-border" />

              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={`press rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${category === null ? '' : CHIP_OFF}`}
                style={category === null ? { ...RING, ...CHIP_ON } : RING}
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
                    className={`press rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${active ? '' : CHIP_OFF}`}
                    style={active ? { ...RING, ...CHIP_ON } : RING}
                  >
                    {CATEGORY_LABELS[key]} <span className="tabular-nums opacity-60">{COUNTS[key]}</span>
                  </button>
                );
              })}

              <span aria-hidden className="mx-1 hidden h-5 w-px bg-gray-200 sm:block dark:bg-border" />

              <label
                htmlFor="b-soort"
                className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-muted-foreground"
              >
                Soort
              </label>
              <select
                id="b-soort"
                value={kind}
                onChange={(event) => setKind(event.target.value as CuratedStudy['type'] | '')}
                className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-[12px] font-medium text-foreground focus:outline-none focus:ring-2 dark:border-border dark:bg-background"
                style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
              >
                {KINDS.map((item) => (
                  <option key={item.label} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <label
                htmlFor="b-sortering"
                className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-muted-foreground"
              >
                Volgorde
              </label>
              <select
                id="b-sortering"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-[12px] font-medium text-foreground focus:outline-none focus:ring-2 dark:border-border dark:bg-background"
                style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
              >
                {SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section aria-labelledby="b-lijst" className="mt-4 px-4 sm:px-6 xl:px-10">
            <div className="flex items-baseline justify-between gap-3 border-b border-gray-200 pb-1.5 dark:border-border">
              <h2
                id="b-lijst"
                className="text-[13px] font-bold uppercase tracking-[0.14em] text-gray-900 dark:text-foreground"
              >
                {category
                  ? CATEGORY_LABELS[category]
                  : tab === 'ontdek'
                    ? 'Alle studies'
                    : (TABS.find((item) => item.value === tab)?.label ?? 'Studies')}
              </h2>
              <p className="text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                {listRows.length} {listRows.length === 1 ? 'studie' : 'studies'}
              </p>
            </div>

            {listRows.length === 0 ? (
              <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                {emptyCopy}
              </p>
            ) : (
              <div className={`mt-3 ${grid}`}>
                {listRows.map((row) => (
                  <WindowCard key={row.study.id} row={row} status={statusFor(row.study)} />
                ))}
              </div>
            )}

            <p className="mt-4 max-w-2xl text-[11.5px] leading-relaxed text-gray-400 dark:text-muted-foreground">
              Het uitzicht op een kaart wordt getekend uit de naam van de studie: hetzelfde landschap,
              hetzelfde seizoen en hetzelfde uur, elke keer dat je hem terugziet. Een balk over de
              onderrand betekent dat je die studie al bent begonnen.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
