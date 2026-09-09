import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Clock } from 'lucide-react';

import RoadRibbon from './RoadRibbon';
import RouteHorizon from './RouteHorizon';
import { TEAL, stopCount, type RouteRow } from './routeArt';

/**
 * A route you could choose.
 *
 * Not "a study with a thumbnail" - the card answers the questions you actually
 * ask before setting out: how long is it, what does it cross, where does it
 * start and where does it come out, and have I walked any of it already. The
 * picture is the route itself, so a study you have started shows the road partly
 * behind you before you have read a single word of the card.
 */
export default function RouteCard({ row }: { row: RouteRow }) {
  const total = row.lessonCount;
  const done = row.walked?.done ?? 0;
  const completed = row.walked?.completed ?? false;
  const walked = total > 0 ? done / total : 0;
  const remaining = Math.max(0, total - done);
  const started = row.walked != null && !completed;

  return (
    <Link
      href={`/studies/versie-3/${row.id}`}
      data-track="study_card"
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card no-underline transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-teal-400 dark:hover:border-teal-700 hover:shadow-[0_16px_36px_-24px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-card motion-reduce:transform-none motion-reduce:transition-none"
    >
      <RouteHorizon
        art={row.art}
        ratio={2.6}
        walked={completed ? 1 : walked}
        marks={started ? [{ t: walked, done: false, current: true }] : []}
        label={`Routebeeld bij ${row.title} — ${row.art.sceneName}`}
      />

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-bold leading-snug text-gray-900 dark:text-foreground transition-colors group-hover:text-teal-700 dark:group-hover:text-teal-400">
          {row.title}
        </h3>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-gray-500 dark:text-muted-foreground tabular-nums">
          <span className="font-semibold text-gray-700 dark:text-foreground/80">
            {stopCount(total)}
          </span>
          <span aria-hidden className="text-gray-300 dark:text-border">
            &middot;
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} className="flex-none" aria-hidden />
            <span>
              <span className="sr-only">Ongeveer </span>
              {row.totalLabel} in totaal
            </span>
          </span>
        </p>

        <p className="mt-2 text-[12px] leading-relaxed text-gray-500 dark:text-muted-foreground">
          <span className="font-medium text-gray-700 dark:text-foreground/80">{row.kind}</span>
          {' — van '}
          {row.from}
          {' tot '}
          {row.to}
        </p>

        <div className="mt-auto pt-3.5">
          {completed ? (
            <p
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
              style={{ color: TEAL }}
            >
              <Check size={13} className="flex-none" aria-hidden />
              Uitgelopen &middot; {stopCount(total)}
            </p>
          ) : started ? (
            <>
              <RoadRibbon progress={walked} thickness={8} />
              <p className="mt-2 flex items-center justify-between gap-2 text-[12px] tabular-nums">
                <span className="font-semibold" style={{ color: TEAL }}>
                  Stop {done + 1} van {total}
                </span>
                <span className="text-gray-500 dark:text-muted-foreground">
                  nog {remaining} te gaan
                </span>
              </p>
            </>
          ) : (
            <p className="flex items-center justify-between gap-2 text-[12px] text-gray-500 dark:text-muted-foreground">
              <span>Nog niet vertrokken</span>
              <span
                className="inline-flex items-center gap-1 font-semibold transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none"
                style={{ color: TEAL }}
              >
                Bekijk de route
                <ArrowRight size={13} className="flex-none" aria-hidden />
              </span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
