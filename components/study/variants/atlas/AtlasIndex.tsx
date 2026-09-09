'use client';

import React, { useDeferredValue, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search } from 'lucide-react';

import { CATALOGUE_ENTRIES, type StudyCategory } from '../../../../lib/bookStudies';
import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';
import { studyArtFor, type StudyArt } from './art';
import { HorizonMark } from './AtlasHorizon';

const TEAL = '#0D9488';

/**
 * Ontwerp 1 - Atlas. Het overzicht als register.
 *
 * De catalogus is geen winkel met kaarten maar een index: papierkleurige grond,
 * haarlijnen in plaats van randen en schaduwen, en per studie een regel in
 * plaats van een tegel. Zevenenzeventig studies passen zo in twee schermen op
 * een breed scherm, met de gegevens die een keuze bepalen - gedeelte, aantal
 * lessen, tijd per les - in kolommen die je kunt aflezen.
 *
 * De horizon uit `art.ts` staat er als merk van 34x22 naast: op die maat doet
 * de kleur het herkennen, niet de vorm (STUDY_VISUAL_PLAN.md 2d).
 */

export interface AtlasProgressEntry {
  /** Aantal afgeronde lessen. */
  done: number;
  /** Expliciet afgerond, ook als `done` de laatste les niet haalt. */
  completed?: boolean;
}

export type AtlasProgressMap = Record<string, AtlasProgressEntry>;

interface Row {
  id: string;
  title: string;
  kind: string;
  category: StudyCategory;
  type: CuratedStudy['type'];
  lessonCount: number;
  avgMinutes: number;
  reference: string;
  description: string;
  haystack: string;
  art: StudyArt;
}

interface Section {
  key: string;
  /** Het `key` zonder spaties of accenten, want het wordt een `id` en een `#`-link. */
  anchor: string;
  category: StudyCategory;
  kind: string;
  rows: Row[];
}

/** "Johannes 20-21", "Genesis 1-50", "Mattheüs · Handelingen e.a." */
function referenceOf(study: CuratedStudy): string {
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];
  if (books.length === 0) return study.startBook;
  if (books.length === 1) {
    const chapters = study.lessons.map((lesson) => lesson.chapter);
    const first = Math.min(...chapters);
    const last = Math.max(...chapters);
    return first === last ? `${books[0]} ${first}` : `${books[0]} ${first}–${last}`;
  }
  if (books.length === 2) return `${books[0]} · ${books[1]}`;
  return `${books[0]} · ${books[1]} e.a.`;
}

const ROWS: Row[] = CATALOGUE_ENTRIES.map(({ study, book, kind, category, lessonCount, avgMinutes }) => ({
  id: study.id,
  title: study.title,
  kind,
  category,
  type: study.type,
  lessonCount,
  avgMinutes,
  reference: referenceOf(study),
  description: study.description,
  haystack: (book
    ? `${study.title} ${book.name} ${book.genre} ${study.description}`
    : `${study.title} ${kind} ${study.description} ${study.lessons.map((lesson) => lesson.book).join(' ')}`
  ).toLowerCase(),
  art: studyArtFor({ id: study.id, kind, type: study.type }),
}));

/**
 * De registerdelen, in de volgorde waarin de catalogus ze aanlevert - dat is de
 * canonieke boekvolgorde, dus Wet komt voor Geschiedenis en Evangelie voor
 * Brief zonder dat daar een tweede lijst voor nodig is.
 */
const SECTIONS: Section[] = (() => {
  const byKey = new Map<string, Section>();
  for (const row of ROWS) {
    const key = `${row.category}-${row.kind}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      byKey.set(key, {
        key,
        anchor: key
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        category: row.category,
        kind: row.kind,
        rows: [row],
      });
    }
  }
  return [...byKey.values()];
})();

const DIVISIONS: { key: StudyCategory; label: string }[] = [
  { key: 'ot', label: 'Oude Testament' },
  { key: 'nt', label: 'Nieuwe Testament' },
  { key: 'personen', label: 'Personen' },
  { key: 'themas', label: 'Gedeelten en thema’s' },
];

type Shown = 'alles' | 'bezig' | 'afgerond';

const SHOWN: { key: Shown; label: string }[] = [
  { key: 'alles', label: 'Alles' },
  { key: 'bezig', label: 'Begonnen' },
  { key: 'afgerond', label: 'Afgerond' },
];

/** Vijf sporen vanaf sm, drie eronder: het merk en "per les" vallen dan weg. */
const ROW_GRID =
  'grid items-center gap-x-3 grid-cols-[0.875rem_minmax(0,1fr)_3rem] ' +
  'sm:grid-cols-[0.875rem_2.125rem_minmax(0,1fr)_3rem_3.75rem]';

interface Status {
  state: 'nieuw' | 'bezig' | 'afgerond';
  done: number;
}

function statusOf(row: Row, progress: AtlasProgressMap): Status {
  const entry = progress[row.id];
  if (!entry) return { state: 'nieuw', done: 0 };
  const done = Math.max(0, Math.min(entry.done, row.lessonCount));
  const completed = entry.completed ?? done >= row.lessonCount;
  if (completed) return { state: 'afgerond', done: row.lessonCount };
  if (done > 0) return { state: 'bezig', done };
  return { state: 'nieuw', done: 0 };
}

function StudyLine({ row, status }: { row: Row; status: Status }) {
  const busy = status.state === 'bezig';
  const done = status.state === 'afgerond';

  return (
    <li className="break-inside-avoid">
      <Link
        href={`/studies/versie-1/${row.id}`}
        data-track="study_card"
        title={row.description}
        className={`group ${ROW_GRID} -mx-2 rounded-[3px] px-2 py-[5px] no-underline transition-colors hover:bg-[#0D9488]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60`}
      >
        <span className="flex h-3.5 w-3.5 flex-none items-center justify-center" aria-hidden>
          {done ? (
            <Check size={12} strokeWidth={2.5} style={{ color: TEAL }} />
          ) : busy ? (
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TEAL }} />
          ) : null}
        </span>

        <HorizonMark
          art={row.art}
          className="hidden h-[22px] w-[34px] flex-none rounded-[2px] ring-1 ring-slate-900/10 transition-shadow group-hover:ring-slate-900/25 dark:ring-white/10 sm:block"
        />

        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[13.5px] font-medium text-slate-800 transition-colors group-hover:text-[#0D9488] dark:text-foreground dark:group-hover:text-teal-400">
            {row.title}
          </span>
          <span
            aria-hidden
            className="hidden min-w-[1.5rem] flex-1 translate-y-[-0.2em] self-center border-t border-dotted border-slate-300 opacity-80 md:block dark:border-slate-700"
          />
          <span className="hidden flex-none text-[11.5px] tabular-nums text-slate-500 md:block dark:text-muted-foreground">
            {row.reference}
          </span>
          <span className="sr-only">
            . {row.reference}. {row.lessonCount} lessen, ongeveer {row.avgMinutes} minuten per les
            {done ? ', afgerond' : busy ? `, les ${status.done + 1} is aan de beurt` : ''}.
          </span>
        </span>

        <span
          className="text-right text-[11.5px] tabular-nums text-slate-500 dark:text-muted-foreground"
          style={busy || done ? { color: TEAL } : undefined}
          aria-hidden
        >
          {busy ? `${status.done}/${row.lessonCount}` : row.lessonCount}
        </span>

        <span
          aria-hidden
          className="hidden text-right text-[11.5px] tabular-nums text-slate-400 sm:block dark:text-muted-foreground"
        >
          {row.avgMinutes} min
        </span>
      </Link>
    </li>
  );
}

export default function AtlasIndex({ progress }: { progress: AtlasProgressMap }) {
  const searchId = useId();
  const [division, setDivision] = useState<StudyCategory | null>(null);
  const [shown, setShown] = useState<Shown>('alles');
  const [query, setQuery] = useState('');

  // Het filteren van 77 regels is goedkoop, maar de invoer moet nooit op de
  // lijst hoeven wachten. `useDeferredValue` laat het veld voorlopen en markeert
  // het register als bezig zolang het achterloopt.
  const deferredQuery = useDeferredValue(query);
  const filtering = query !== deferredQuery;

  const needle = deferredQuery.trim().toLowerCase();

  const sections = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      rows: section.rows.filter((row) => {
        if (division && row.category !== division) return false;
        if (needle && !row.haystack.includes(needle)) return false;
        if (shown === 'alles') return true;
        const status = statusOf(row, progress);
        return shown === 'bezig' ? status.state === 'bezig' : status.state === 'afgerond';
      }),
    })).filter((section) => section.rows.length > 0);
  }, [division, needle, shown, progress]);

  const visible = sections.reduce((total, section) => total + section.rows.length, 0);

  const tally = useMemo(() => {
    let started = 0;
    let finished = 0;
    for (const row of ROWS) {
      const status = statusOf(row, progress);
      if (status.state === 'bezig') started += 1;
      if (status.state === 'afgerond') finished += 1;
    }
    return { started, finished };
  }, [progress]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of ROWS) map[row.category] = (map[row.category] ?? 0) + 1;
    return map;
  }, []);

  const filtered = division !== null || shown !== 'alles' || needle.length > 0;
  const clear = () => {
    setDivision(null);
    setShown('alles');
    setQuery('');
  };

  const tab =
    'relative -mb-px border-b-2 px-1 pb-2 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60';

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-[#FAF8F4] dark:bg-background">
      <div className="mx-auto w-full max-w-[1560px] px-5 py-6 sm:px-8 xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-slate-200 pb-2 dark:border-border">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-muted-foreground">
            Ontwerpvoorstel · Atlas
          </p>
          <StudyFlowVariantSwitcher />
        </div>

        {/* Titelblok. Links de aanhef, rechts het register in cijfers - het soort
            colofon dat boven een index hoort en dat meteen vertelt hoe groot
            het ding is dat je voor je hebt. */}
        <header className="mt-7 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[54ch]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
              Register
            </p>
            <h1 className="mt-1.5 font-serif text-[30px] leading-[1.1] tracking-tight text-slate-900 xl:text-[38px] dark:text-foreground">
              De studies
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-600 dark:text-muted-foreground">
              Zevenenzeventig studies: elk bijbelboek van Genesis tot Openbaring, en daarnaast de
              personen, gedeelten en thema’s die er dwars doorheen lopen. Zoek op naam, of loop het
              register af.
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-200 pt-4 xl:border-t-0 xl:pt-0 dark:border-border">
            {[
              { label: 'Studies', value: ROWS.length },
              { label: 'Bijbelboeken', value: counts.ot + counts.nt },
              { label: 'Begonnen', value: tally.started, teal: true },
              { label: 'Afgerond', value: tally.finished, teal: true },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
                  {stat.label}
                </dt>
                <dd
                  className="mt-0.5 font-serif text-[24px] leading-none tabular-nums text-slate-900 dark:text-foreground"
                  style={stat.teal ? { color: TEAL } : undefined}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {/* Tabstrook. Duimtabs van een atlas: onderstreping in plaats van pillen,
            zodat de strook een rand van de pagina is en geen rij knoppen. */}
        <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-slate-300 dark:border-border">
          <nav aria-label="Delen van het register" className="flex flex-wrap items-end gap-x-6">
            <button
              type="button"
              onClick={() => setDivision(null)}
              aria-pressed={division === null}
              className={`${tab} ${division === null ? '' : 'text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground'}`}
              style={
                division === null
                  ? { borderBottomColor: TEAL, color: TEAL }
                  : { borderBottomColor: 'transparent' }
              }
            >
              Alles
              <span className="ml-1.5 text-[11px] tabular-nums opacity-60">{ROWS.length}</span>
            </button>
            {DIVISIONS.map((item) => {
              const active = division === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDivision(active ? null : item.key)}
                  aria-pressed={active}
                  data-track={`study_topic_${item.key}`}
                  className={`${tab} ${active ? '' : 'text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground'}`}
                  style={
                    active ? { borderBottomColor: TEAL, color: TEAL } : { borderBottomColor: 'transparent' }
                  }
                >
                  {item.label}
                  <span className="ml-1.5 text-[11px] tabular-nums opacity-60">{counts[item.key]}</span>
                </button>
              );
            })}
          </nav>

          <div className="relative mb-2 w-full flex-none sm:w-72">
            <label htmlFor={searchId} className="sr-only">
              Zoek een studie
            </label>
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoek een bijbelboek, persoon of thema"
              className="h-9 w-full rounded-[3px] border border-slate-300 bg-white pl-8 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/40 dark:border-border dark:bg-background dark:text-foreground"
            />
          </div>
        </div>

        {/* Tweede laag filters: wat er van jouw kant al mee gebeurd is. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
            Toon
          </span>
          {SHOWN.map((item) => {
            const active = shown === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setShown(item.key)}
                aria-pressed={active}
                data-track={`study_tab_${item.key}`}
                className="text-[12.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60"
                style={
                  active
                    ? { color: TEAL, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '4px' }
                    : undefined
                }
              >
                <span className={active ? '' : 'text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground'}>
                  {item.label}
                </span>
              </button>
            );
          })}

          <span className="ml-auto text-[11.5px] tabular-nums text-slate-500 dark:text-muted-foreground">
            {visible} van {ROWS.length} studies
            {filtered ? (
              <button
                type="button"
                onClick={clear}
                className="ml-3 underline underline-offset-4 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 dark:hover:text-foreground"
              >
                Wis het filter
              </button>
            ) : null}
          </span>
        </div>

        <div className="mt-6 flex items-start gap-10 pb-20">
          <div className="min-w-0 flex-1">
            {sections.length === 0 ? (
              <div className="max-w-[52ch] border-t border-slate-300 pt-6 dark:border-border">
                <h2 className="font-serif text-[18px] text-slate-900 dark:text-foreground">
                  Niets in het register
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-muted-foreground">
                  {needle
                    ? `Geen studie komt overeen met “${deferredQuery.trim()}”. Probeer de naam van een bijbelboek, een persoon of een thema.`
                    : shown === 'bezig'
                      ? 'Je bent nog aan geen enkele studie begonnen. Kies er een uit het register en begin bij les 1.'
                      : shown === 'afgerond'
                        ? 'Nog niets afgerond. Zodra je alle lessen van een studie hebt gedaan, staat die hier.'
                        : 'Geen studie past bij deze combinatie van filters.'}
                </p>
                <button
                  type="button"
                  onClick={clear}
                  className="press mt-4 inline-flex h-9 items-center rounded-[3px] px-3.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60"
                  style={{ backgroundColor: TEAL }}
                >
                  Toon het hele register
                </button>
              </div>
            ) : (
              <div
                aria-busy={filtering}
                className={`gap-x-12 transition-opacity xl:columns-2 2xl:columns-3 ${filtering ? 'opacity-60' : 'opacity-100'}`}
              >
                {sections.map((section) => (
                  <section key={section.key} id={`deel-${section.anchor}`} className="mb-7">
                    <div className="break-after-avoid">
                      <div className="flex items-baseline justify-between gap-3 border-b border-slate-900/70 pb-1 dark:border-foreground/40">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900 dark:text-foreground">
                          {section.kind}
                        </h2>
                        <span className="text-[10.5px] tabular-nums text-slate-500 dark:text-muted-foreground">
                          {DIVISIONS.find((item) => item.key === section.category)?.label}
                          {' · '}
                          {section.rows.length}
                        </span>
                      </div>

                      {/* Kolomkoppen, eenmaal per deel. Ze maken de twee getallen
                          rechts leesbaar zonder dat elke regel ze hoeft te
                          herhalen. */}
                      <div
                        aria-hidden
                        className={`${ROW_GRID} -mx-2 border-b border-slate-200 px-2 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:border-border dark:text-muted-foreground`}
                      >
                        <span />
                        <span className="hidden sm:block" />
                        <span>Studie</span>
                        <span className="text-right">Lessen</span>
                        <span className="hidden text-right sm:block">Per les</span>
                      </div>
                    </div>

                    <ul className="mt-1">
                      {section.rows.map((row) => (
                        <StudyLine key={row.id} row={row} status={statusOf(row, progress)} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* Duimindex. Alleen waar er ruimte voor is; op smallere schermen doet
              de tabstrook hetzelfde werk. */}
          {sections.length > 1 ? (
            <nav
              aria-label="Snel naar een deel"
              className="sticky top-4 hidden w-[184px] flex-none border-l border-slate-200 pl-5 2xl:block dark:border-border"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
                Inhoud
              </p>
              <ul className="mt-2 space-y-1">
                {sections.map((section) => (
                  <li key={section.key}>
                    <a
                      href={`#deel-${section.anchor}`}
                      className="flex items-baseline justify-between gap-2 text-[12px] text-slate-600 no-underline transition-colors hover:text-[#0D9488] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 dark:text-muted-foreground dark:hover:text-teal-400"
                    >
                      <span className="truncate">{section.kind}</span>
                      <span className="flex-none tabular-nums opacity-60">{section.rows.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
