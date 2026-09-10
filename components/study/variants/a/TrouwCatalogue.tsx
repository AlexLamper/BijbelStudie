'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search } from 'lucide-react';

import { CATALOGUE_ENTRIES, type StudyCategory } from '../../../../lib/bookStudies';
import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import { studyArtFor, type StudyArtKind } from '../../../../lib/studyArt';
import HorizonArt from './HorizonArt';
import { ON_ART, ON_ART_FAINT, ON_ART_MUTED, SCRIM_CARD, SCRIM_STRIP, TEAL } from './tint';

/**
 * Ontwerp A — "trouw" — scherm 1 van 3: de catalogus.
 *
 * De basis is ontwerp 2 ("Vensters"), want dat won het overzicht: de kaart ís
 * het beeld. Niets staat naast de plaat in een 96x64 vakje; de titel en de twee
 * feiten die je afweegt liggen op glas over de onderste derde van het venster,
 * waar een scrim witte tekst garandeert boven een middaglucht én een middernacht.
 *
 * Twee dingen zijn veranderd, precies zoals gevraagd:
 *
 *  1. De uitgelichte kaart was te groot. Hij is nu één brede, lage strook —
 *     ongeveer een tiende van het oppervlak dat de hero innam — zodat de eerste
 *     schermvulling studies laat zien in plaats van één studie.
 *  2. Het beeld komt uit `lib/studyArt.ts`, het gedeelde plan, niet uit
 *     `study.image` en niet uit een eigen kopie.
 *
 * En het raster is aangehaald: vijf kolommen op een breed scherm in plaats van
 * vier, met kleinere tussenruimte, zodat er meer studies tegelijk in beeld staan.
 *
 * Geen database, geen sessie: alles komt uit `CATALOGUE_ENTRIES` plus de
 * demovoortgang die de pagina meegeeft.
 */

interface Entry {
  study: CuratedStudy;
  kind: string;
  category: StudyCategory;
  lessonCount: number;
  avgMinutes: number;
  /** Alles waar een zoekopdracht op mag matchen, één keer verkleind bij het laden. */
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

type Tab = 'ontdek' | 'mijn' | 'voltooid';

const TABS: { value: Tab; label: string }[] = [
  { value: 'ontdek', label: 'Ontdek' },
  { value: 'mijn', label: 'Mijn studies' },
  { value: 'voltooid', label: 'Voltooid' },
];

/** De demovoortgang die de pagina meegeeft; zie het paginabestand. */
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

const href = (id: string) => `/studies/versie-a/${encodeURIComponent(id)}`;

/**
 * De focusring, één keer. Teal, met de offsetkleur op de eigen achtergrond van
 * de pagina — `ring-offset-2` valt anders terug op wit en tekent een witte halo
 * op de donkere ondergrond.
 */
const ring: React.CSSProperties = {
  ['--tw-ring-color' as string]: TEAL,
  ['--tw-ring-offset-color' as string]: 'hsl(var(--background))',
};

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

/** Een dunne rail op het glas. Witte baan, teal vulling: leesbaar op elke lucht. */
function GlassProgress({ status }: { status: Status }) {
  return (
    <div className="mt-2">
      <div
        className="h-[3px] w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
      >
        <div className="h-full rounded-full" style={{ width: `${status.pct}%`, backgroundColor: TEAL }} />
      </div>
      <p className="mt-1 text-[11px] tabular-nums" style={{ color: ON_ART_MUTED }}>
        Les {status.resumeDay} van {status.total}
      </p>
    </div>
  );
}

/** Eén studie, als venster. De kaart heeft geen body: het glas ís de body. */
function WindowCard({ entry, status }: { entry: Entry; status: Status }) {
  const art = studyArtFor(entry.study.id, entry.study.type as StudyArtKind);

  return (
    <Link
      href={href(entry.study.id)}
      data-track="study_card"
      className="group block rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={ring}
    >
      <HorizonArt
        art={art}
        ratio={16 / 10}
        className="aspect-[16/10] rounded-xl shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_34px_-18px_rgba(15,23,42,0.55)]"
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_CARD }} />

        {status.completed && (
          <span
            className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: TEAL, color: '#ffffff' }}
          >
            <Check size={10} aria-hidden /> Voltooid
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="line-clamp-2 text-[14.5px] font-bold leading-snug" style={{ color: ON_ART }}>
            {entry.study.title}
          </h3>
          <p className="mt-0.5 truncate text-[11px] tabular-nums" style={{ color: ON_ART_FAINT }}>
            {entry.kind} · {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'} · ±
            {entry.avgMinutes} min
          </p>
          {status.started && !status.completed && <GlassProgress status={status} />}
        </div>
      </HorizonArt>
    </Link>
  );
}

/** Een studie die al loopt. Een lage strook, want hij hoeft maar één ding te zeggen. */
function ResumeStrip({ entry, status }: { entry: Entry; status: Status }) {
  const art = studyArtFor(entry.study.id, entry.study.type as StudyArtKind);

  return (
    <Link
      href={href(entry.study.id)}
      data-track="study_resume"
      className="group block rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={ring}
    >
      <HorizonArt
        art={art}
        ratio={5}
        quiet
        className="h-[96px] rounded-xl shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_34px_-18px_rgba(15,23,42,0.55)]"
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_STRIP }} />
        <div className="absolute inset-0 flex flex-col justify-center px-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ON_ART_FAINT }}>
            Verder waar je was
          </p>
          <h3 className="mt-0.5 truncate text-[15.5px] font-bold" style={{ color: ON_ART }}>
            {entry.study.title}
          </h3>
          <GlassProgress status={status} />
        </div>
      </HorizonArt>
    </Link>
  );
}

// ---------------------------------------------------------------------------

export default function TrouwCatalogue({ demo }: { demo: DemoProgress }) {
  const [tab, setTab] = useState<Tab>('ontdek');
  const [category, setCategory] = useState<StudyCategory | null>(null);
  const [kind, setKind] = useState<CuratedStudy['type'] | ''>('');
  const [query, setQuery] = useState('');

  /**
   * De wachtstand is echt, geen decoratie: zevenenzeventig regels filteren bij
   * elke toetsaanslag is genoeg werk dat React een frame of twee de oude lijst
   * teruggeeft, en dat hardop zeggen is beter dan een lijst die stilletjes
   * achterloopt op het veld.
   */
  const deferredQuery = useDeferredValue(query);
  /** Het veld bepaalt óf de zoekweergave verschijnt, de vertraagde waarde wat erin staat. */
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
      if (tab === 'ontdek') return true;
      const status = statusFor(entry.study);
      if (tab === 'mijn') return status.started && !status.completed;
      return status.completed;
    });
  }, [tab, category, kind, statusFor]);

  /** De uitgelichte studie: de eerste geschreven studie, want die heeft proza. */
  const featured = useMemo(() => ENTRIES.find((entry) => entry.study.type !== 'Boek') ?? ENTRIES[0], []);

  const resuming = useMemo(
    () =>
      Object.keys(demo.started)
        .map((id) => ENTRIES.find((entry) => entry.study.id === id))
        .filter((entry): entry is Entry => !!entry)
        .slice(0, 3),
    [demo],
  );

  const showFurniture = !searching && tab === 'ontdek';
  const featuredArt = studyArtFor(featured.study.id, featured.study.type as StudyArtKind);

  const emptyCopy =
    tab === 'mijn'
      ? 'Je bent nog aan geen enkele studie begonnen. Kies er een bij Ontdek en zet de eerste les op je naam.'
      : tab === 'voltooid'
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
            <label htmlFor="trouw-zoek" className="sr-only">
              Zoek een bijbelboek, persoon of thema
            </label>
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground"
            />
            <input
              id="trouw-zoek"
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
        <section aria-labelledby="trouw-zoekresultaat" className="mt-6 px-5 sm:px-8 xl:px-12">
          <h2 id="trouw-zoekresultaat" className="sr-only">
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
              className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
                pending ? 'opacity-60 transition-opacity' : ''
              }`}
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
            <section aria-labelledby="trouw-uitgelicht" className="mt-6 px-5 sm:px-8 xl:px-12">
              <h2 id="trouw-uitgelicht" className="sr-only">
                Uitgelichte studie
              </h2>
              {/* De uitgelichte studie als strook. Eén regel hoog, over de volle
                  breedte: hij mag zichzelf aanwijzen, maar niet het halve scherm
                  opeten dat aan de zevenenzeventig andere toebehoort. */}
              <Link
                href={href(featured.study.id)}
                data-track="study_featured_card"
                className="group block rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={ring}
              >
                <HorizonArt
                  art={featuredArt}
                  ratio={14}
                  className="h-[92px] rounded-xl shadow-sm transition-shadow duration-300 group-hover:shadow-[0_20px_44px_-22px_rgba(15,23,42,0.6)] sm:h-[104px]"
                >
                  <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_STRIP }} />
                  <div className="absolute inset-0 flex items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: ON_ART_FAINT }}
                      >
                        Uitgelicht · {featured.kind}
                      </p>
                      <h3
                        className="mt-0.5 truncate text-[17px] font-bold leading-tight sm:text-[21px]"
                        style={{ color: ON_ART }}
                      >
                        {featured.study.title}
                      </h3>
                      <p className="mt-0.5 truncate text-[11.5px] tabular-nums" style={{ color: ON_ART_MUTED }}>
                        {featured.lessonCount} lessen · ± {featured.avgMinutes} min per les
                      </p>
                    </div>
                    <span
                      className="press hidden h-9 flex-none items-center rounded-lg px-5 text-[13px] font-semibold text-white transition-transform duration-200 group-hover:translate-x-0.5 sm:inline-flex"
                      style={{ backgroundColor: TEAL }}
                    >
                      Open deze studie
                    </span>
                  </div>
                </HorizonArt>
              </Link>
            </section>
          )}

          {showFurniture && resuming.length > 0 && (
            <section aria-labelledby="trouw-verder" className="mt-8 px-5 sm:px-8 xl:px-12">
              <h2 id="trouw-verder" className="text-[16px] font-bold text-gray-900 dark:text-foreground">
                Je bent hier gebleven
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {resuming.map((entry) => (
                  <ResumeStrip key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 px-5 sm:px-8 xl:px-12">
            {/* Een groep schakelaars, geen `role="tablist"`: er is één lijst
                hieronder en dat is geen tabpanel, en het tabpatroon claimen
                zonder panelen is voor een schermlezer slechter dan het niet
                claimen. */}
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
                    style={active ? { ...ring, backgroundColor: TEAL, borderColor: TEAL } : ring}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={`press rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${chipClass(
                  category === null,
                )}`}
                style={category === null ? { ...ring, ...CHIP_ON } : ring}
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
                    className={`press rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${chipClass(
                      active,
                    )}`}
                    style={active ? { ...ring, ...CHIP_ON } : ring}
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

          <section aria-labelledby="trouw-lijst" className="mt-5 px-5 sm:px-8 xl:px-12">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="trouw-lijst" className="text-[16px] font-bold text-gray-900 dark:text-foreground">
                {category
                  ? CATEGORY_LABELS[category]
                  : tab === 'ontdek'
                    ? 'Alle vensters'
                    : (TABS.find((item) => item.value === tab)?.label ?? 'Studies')}
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
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
