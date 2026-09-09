'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

import { Eyebrow, TEAL } from './typography';

/**
 * The catalogue as a register.
 *
 * Every row is one line: an index numeral, the title, what it is about, and the
 * two facts you choose on. No thumbnail, no card, no border box - only a
 * hairline between rows, which is what a well-set list of 76 things looks like.
 *
 * The furniture is typographic on purpose. The groups are a column of text
 * links with tabular counts rather than a pill row; the search is a ruled field
 * with a real label rather than an icon in a box. Both are quieter than the
 * list they filter, which is the correct order of importance.
 *
 * Client only for the two pieces of state that genuinely need it - the query
 * and the chosen group. The rows themselves are computed on the server and
 * arrive as plain data.
 */

export type RustCategory = 'ot' | 'nt' | 'personen' | 'themas';

export interface CatalogueRow {
  id: string;
  title: string;
  description: string;
  /** "Wet", "Evangelie", "Persoon" - the one-word kind, used as a subhead. */
  kind: string;
  category: RustCategory;
  lessons: number;
  /** Average minutes per lesson. */
  minutes: number;
  /** Title, description and book names, lowercased once on the server. */
  haystack: string;
}

/** Demo progress, passed down from the page. Never a real enrollment. */
export interface CatalogueDemoState {
  /** studyId -> lessons finished. */
  inProgress: Record<string, number>;
  /** studyIds that are finished. */
  completed: string[];
}

const CATEGORY_LABEL: Record<RustCategory, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
};

const CATEGORY_ORDER: RustCategory[] = ['ot', 'nt', 'personen', 'themas'];

export default function RustCatalogue({
  rows,
  demo,
}: {
  rows: CatalogueRow[];
  demo: CatalogueDemoState;
}) {
  const [group, setGroup] = useState<RustCategory | null>(null);
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const map: Record<RustCategory, number> = { ot: 0, nt: 0, personen: 0, themas: 0 };
    for (const row of rows) map[row.category] += 1;
    return map;
  }, [rows]);

  const needle = query.trim().toLowerCase();

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (group && row.category !== group) return false;
      if (needle && !row.haystack.includes(needle)) return false;
      return true;
    });
  }, [rows, group, needle]);

  /**
   * The register, in reading order: category sections, and inside them a
   * subhead whenever the genre changes. Searching flattens both - you already
   * said what you were looking for, so the shelf labels are noise.
   */
  const sections = useMemo(() => {
    if (needle) return [{ category: null as RustCategory | null, rows: visible }];
    return CATEGORY_ORDER.filter((category) => visible.some((row) => row.category === category)).map(
      (category) => ({ category, rows: visible.filter((row) => row.category === category) }),
    );
  }, [visible, needle]);

  const completed = useMemo(() => new Set(demo.completed), [demo.completed]);

  // One continuous numbering across the whole visible register, so the list
  // reads as an index rather than as four separate lists.
  let counter = 0;

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-14 xl:gap-x-20">
      {/* The register's own front matter: what you can narrow it to. */}
      <aside className="mb-10 lg:mb-0 lg:sticky lg:top-6 lg:self-start">
        <div>
          <label
            htmlFor="rust-zoek"
            className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Zoeken
          </label>
          <input
            id="rust-zoek"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bijbelboek, persoon of thema"
            className="mt-2 w-full border-0 border-b border-border bg-transparent pb-1.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-[#0D9488] focus:outline-none focus:ring-0"
          />
        </div>

        <nav aria-label="Groepen" className="mt-8">
          <Eyebrow as="h2">Groepen</Eyebrow>
          <ul className="mt-3 space-y-1.5">
            {[null, ...CATEGORY_ORDER].map((key) => {
              const active = key === group;
              const label = key === null ? 'Alles' : CATEGORY_LABEL[key];
              const count = key === null ? rows.length : counts[key];
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => setGroup(key)}
                    aria-pressed={active}
                    className="group flex w-full items-baseline justify-between gap-3 text-left"
                  >
                    <span
                      className={[
                        'text-[14px] transition-colors',
                        active
                          ? 'font-semibold'
                          : 'text-muted-foreground group-hover:text-foreground',
                      ].join(' ')}
                      style={active ? { color: TEAL } : undefined}
                    >
                      {label}
                    </span>
                    <span className="flex-none text-[12px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {(group !== null || needle !== '') && (
          <button
            type="button"
            onClick={() => {
              setGroup(null);
              setQuery('');
            }}
            className="mt-6 text-[12.5px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Toon alles weer
          </button>
        )}
      </aside>

      <div className="min-w-0">
        {/* A live count, so a filtered register still says how big it is. */}
        <p className="text-[12.5px] tabular-nums text-muted-foreground" aria-live="polite">
          {visible.length === rows.length
            ? `${rows.length} studies`
            : `${visible.length} van ${rows.length} studies`}
        </p>

        {visible.length === 0 ? (
          <p className="mt-8 text-[15px] leading-relaxed text-muted-foreground max-w-[52ch]">
            Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek,
            een persoon of een thema &mdash; bijvoorbeeld{' '}
            <button
              type="button"
              onClick={() => setQuery('Johannes')}
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Johannes
            </button>
            .
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.category ?? 'resultaten'} className="mt-9">
              {section.category && (
                <h2 className="font-serif text-[19px] font-normal text-foreground">
                  {CATEGORY_LABEL[section.category]}
                  <span className="ml-3 align-middle text-[12px] font-sans tabular-nums text-muted-foreground">
                    {section.rows.length}
                  </span>
                </h2>
              )}

              <ul className="mt-3 border-t border-border">
                {section.rows.map((row, index) => {
                  counter += 1;
                  const previous = index === 0 ? null : section.rows[index - 1];
                  // A genre subhead only where the genre actually changes.
                  const subhead =
                    section.category && (!previous || previous.kind !== row.kind) ? row.kind : null;

                  return (
                    <React.Fragment key={row.id}>
                      {subhead && (
                        <li className="pt-5 pb-1.5">
                          <Eyebrow as="h3">{subhead}</Eyebrow>
                        </li>
                      )}
                      <li className="border-b border-border">
                        <CatalogueLine
                          row={row}
                          index={counter}
                          done={completed.has(row.id)}
                          progress={demo.inProgress[row.id] ?? null}
                        />
                      </li>
                    </React.Fragment>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/** One line of the register. */
function CatalogueLine({
  row,
  index,
  done,
  progress,
}: {
  row: CatalogueRow;
  index: number;
  done: boolean;
  progress: number | null;
}) {
  const current = progress !== null && !done;
  const nextLesson = Math.min((progress ?? 0) + 1, row.lessons);

  return (
    <Link
      href={`/studies/versie-4/${row.id}`}
      className="group grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-4 py-3.5 no-underline sm:grid-cols-[2.25rem_minmax(0,1fr)_9.5rem] sm:gap-x-6"
    >
      <span
        className="text-[12px] tabular-nums text-muted-foreground transition-colors"
        style={current ? { color: TEAL } : undefined}
        aria-hidden
      >
        {String(index).padStart(2, '0')}
      </span>

      <span className="min-w-0">
        <span className="font-serif text-[17px] leading-snug text-foreground decoration-1 underline-offset-[5px] group-hover:underline">
          {row.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] leading-relaxed text-muted-foreground">
          {row.description}
        </span>
      </span>

      <span className="col-start-2 mt-1 text-[12px] tabular-nums text-muted-foreground sm:col-start-3 sm:mt-0 sm:text-right">
        {done ? (
          'Afgerond'
        ) : current ? (
          <span style={{ color: TEAL }}>
            les {nextLesson} van {row.lessons}
          </span>
        ) : (
          <>
            {row.lessons} {row.lessons === 1 ? 'les' : 'lessen'} &middot; {row.minutes} min
          </>
        )}
      </span>
    </Link>
  );
}
