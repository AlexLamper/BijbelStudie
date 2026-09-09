'use client';

import React, { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import RouteCard from './RouteCard';
import {
  BAND_LABELS,
  TEAL,
  type RouteBand,
  type RouteRow,
} from './routeArt';

/**
 * Choosing a route, the way you would plan a walk: by how long it is, what
 * terrain it crosses and where in the Bible it starts.
 *
 * The controls are the whole browsing model here - there is no featured
 * carousel and no topic grid, because both answer "what is popular" rather than
 * "what am I up for". The sections are honest groupings of length, not
 * marketing: seven stops or fewer is a week, thirty-one or fewer is a month,
 * more than that is a book you walk through end to end.
 *
 * Filtering collapses the sections into one list on purpose. Sections that empty
 * out one by one under a filter read as a broken page.
 */

type Where = 'ot' | 'nt' | 'personen' | 'themas';
type Sort = 'kort' | 'lang' | 'bijbel' | 'naam';

const WHERE_LABELS: Record<Where, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
};

const SORTS: { value: Sort; label: string }[] = [
  { value: 'bijbel', label: 'Bijbelvolgorde' },
  { value: 'kort', label: 'Kortste tocht eerst' },
  { value: 'lang', label: 'Langste tocht eerst' },
  { value: 'naam', label: 'Op naam' },
];

const BANDS: RouteBand[] = ['kort', 'maand', 'lang'];

/** How many cards a section opens with before "toon alle". */
const PREVIEW = 8;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-1"
      style={{
        borderColor: active ? TEAL : 'rgb(203 213 225 / 0.9)',
        backgroundColor: active ? 'rgba(13,148,136,0.10)' : 'transparent',
        color: active ? '#0f766e' : 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <span
        id={id}
        className="w-[9.5rem] flex-none text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground"
      >
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-1 flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

function Section({
  title,
  blurb,
  rows,
  count,
}: {
  title: string;
  blurb?: string;
  rows: RouteRow[];
  count?: string;
}) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  const shown = open ? rows : rows.slice(0, PREVIEW);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold text-gray-900 dark:text-foreground">{title}</h2>
        <p className="text-[12px] text-gray-400 dark:text-muted-foreground tabular-nums">
          {count ?? `${rows.length} routes`}
        </p>
      </div>
      {blurb && (
        <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-gray-500 dark:text-muted-foreground">
          {blurb}
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {shown.map((row) => (
          <RouteCard key={row.id} row={row} />
        ))}
      </div>

      {rows.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-4 rounded-lg border border-gray-200 dark:border-border px-3.5 py-2 text-[12.5px] font-semibold text-gray-600 dark:text-muted-foreground transition-colors hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          {open ? 'Toon er minder' : `Toon alle ${rows.length}`}
        </button>
      )}
    </section>
  );
}

export default function RoutePlanner({ rows }: { rows: RouteRow[] }) {
  const [query, setQuery] = useState('');
  const [band, setBand] = useState<RouteBand | null>(null);
  const [terrain, setTerrain] = useState<string | null>(null);
  const [where, setWhere] = useState<Where | null>(null);
  const [sort, setSort] = useState<Sort>('bijbel');
  const searchId = useId();
  const sortId = useId();

  const terrains = useMemo(() => {
    const seen: string[] = [];
    for (const row of rows) if (!seen.includes(row.kind)) seen.push(row.kind);
    return seen;
  }, [rows]);

  const filtersOn = query.trim() !== '' || band !== null || terrain !== null || where !== null;

  const clear = () => {
    setQuery('');
    setBand(null);
    setTerrain(null);
    setWhere(null);
  };

  const sorted = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = rows.filter((row) => {
      if (needle && !row.haystack.includes(needle)) return false;
      if (band && row.band !== band) return false;
      if (terrain && row.kind !== terrain) return false;
      if (where && row.category !== where) return false;
      return true;
    });

    const byName = (a: RouteRow, b: RouteRow) => a.title.localeCompare(b.title, 'nl');
    return [...matched].sort((a, b) => {
      if (sort === 'kort') return a.lessonCount - b.lessonCount || byName(a, b);
      if (sort === 'lang') return b.lessonCount - a.lessonCount || byName(a, b);
      if (sort === 'naam') return byName(a, b);
      return a.order - b.order;
    });
  }, [rows, query, band, terrain, where, sort]);

  const onderweg = useMemo(
    () => sorted.filter((row) => row.walked != null && !row.walked.completed),
    [sorted],
  );
  const uitgelopen = useMemo(
    () => sorted.filter((row) => row.walked?.completed),
    [sorted],
  );
  const rest = useMemo(() => sorted.filter((row) => row.walked == null), [sorted]);

  return (
    <>
      {/* Planning the trip. One panel, four decisions, and a way back out of
          all of them. */}
      <section
        aria-label="Routes filteren en sorteren"
        className="mt-6 rounded-2xl border border-gray-200 dark:border-border bg-gray-50/70 dark:bg-card/40 p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <label
              htmlFor={searchId}
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground"
            >
              Zoek een route
            </label>
            <div className="relative mt-1.5 w-full sm:max-w-sm">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Bijbelboek, persoon of thema"
                className="h-10 w-full rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40"
              />
            </div>
          </div>

          <div className="flex-none">
            <label
              htmlFor={sortId}
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground"
            >
              Volgorde
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="mt-1.5 h-10 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-border pt-4">
          <Group label="Hoe lang">
            {BANDS.map((value) => (
              <Chip
                key={value}
                active={band === value}
                onClick={() => setBand(band === value ? null : value)}
              >
                {BAND_LABELS[value].title.replace(/ —.*$/, '')}
              </Chip>
            ))}
          </Group>

          <Group label="Waar hij begint">
            {(Object.keys(WHERE_LABELS) as Where[]).map((value) => (
              <Chip
                key={value}
                active={where === value}
                onClick={() => setWhere(where === value ? null : value)}
              >
                {WHERE_LABELS[value]}
              </Chip>
            ))}
          </Group>

          <Group label="Terrein">
            {terrains.map((value) => (
              <Chip
                key={value}
                active={terrain === value}
                onClick={() => setTerrain(terrain === value ? null : value)}
              >
                {value}
              </Chip>
            ))}
          </Group>
        </div>

        {filtersOn && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-200 dark:border-border pt-3">
            <p className="text-[12.5px] text-gray-500 dark:text-muted-foreground tabular-nums">
              {sorted.length === 0
                ? 'Geen route past bij deze keuzes'
                : `${sorted.length} ${sorted.length === 1 ? 'route past' : 'routes passen'} bij deze keuzes`}
            </p>
            <button
              type="button"
              onClick={clear}
              className="text-[12.5px] font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded"
              style={{ color: TEAL }}
            >
              Alles wissen
            </button>
          </div>
        )}
      </section>

      {filtersOn ? (
        sorted.length === 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-foreground">
              Niets gevonden
            </h2>
            <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              Geen route past bij deze keuzes. Zet een filter uit, of zoek op de naam van een
              bijbelboek, een persoon of een thema.
            </p>
          </section>
        ) : (
          <Section
            title="Routes die passen"
            rows={sorted}
            count={`${sorted.length} ${sorted.length === 1 ? 'route' : 'routes'}`}
          />
        )
      ) : (
        <>
          {onderweg.length > 0 ? (
            <Section
              title="Onderweg"
              blurb="Hier ben je gebleven. De weg achter je is teal; de rest wacht nog."
              rows={onderweg}
              count={`${onderweg.length} ${onderweg.length === 1 ? 'route' : 'routes'}`}
            />
          ) : (
            <section className="mt-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-foreground">Onderweg</h2>
              <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                Je bent nog nergens vertrokken. Kies hieronder een route — een korte is een prima
                begin.
              </p>
            </section>
          )}

          {BANDS.map((value) => (
            <Section
              key={value}
              title={BAND_LABELS[value].title}
              blurb={BAND_LABELS[value].blurb}
              rows={rest.filter((row) => row.band === value)}
            />
          ))}

          <Section
            title="Uitgelopen"
            blurb="Van begin tot eind gelopen. Je kunt een route altijd opnieuw lopen."
            rows={uitgelopen}
            count={`${uitgelopen.length} ${uitgelopen.length === 1 ? 'route' : 'routes'}`}
          />
        </>
      )}
    </>
  );
}
