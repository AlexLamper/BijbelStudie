'use client';

import { useEffect, useState } from 'react';
import { Panel, SectionHeading } from '../scene/pieces';
import { TEAL_ON_DARK } from '../scene/tokens';

type Summary = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercentage: number;
  lessonsCompleted: number;
  studiesCompleted: number;
  xpTable: { event: string; value: number; label: string }[];
};

/**
 * Level and XP on the profile, on the scene.
 *
 * The XP table is served rather than hardcoded so the "wat levert het op?"
 * list cannot drift from what the server actually awards. Same fetch, same
 * silent failure: the card simply does not appear.
 *
 * Every colour here is a literal white or the teal that reads on a dark
 * ground - a theme token would flip with the reader's light/dark setting and
 * the landscape behind this panel does not.
 */
export default function LevelCard() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/v1/gamification');
        if (!response.ok || cancelled) return;
        setSummary(await response.json());
      } catch { /* the card simply stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!summary) return null;

  const remaining = Math.max(0, summary.xpForNextLevel - summary.xpIntoLevel);
  const pct = Math.min(100, Math.max(0, summary.progressPercentage));
  const stats = [
    { label: 'Lessen bestudeerd', value: summary.lessonsCompleted },
    { label: 'Studies voltooid', value: summary.studiesCompleted },
  ];

  return (
    <Panel className="p-5 sm:p-6" labelledBy="profiel-niveau">
      <SectionHeading
        id="profiel-niveau"
        title={`Niveau ${summary.level}`}
        subtitle={`${summary.xp} XP · nog ${remaining} tot niveau ${summary.level + 1}`}
        rule
      />

      <div className="mt-5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={summary.xpForNextLevel}
          aria-valuenow={summary.xpIntoLevel}
          aria-valuetext={`${summary.xpIntoLevel} van ${summary.xpForNextLevel} XP naar niveau ${summary.level + 1}`}
          className="h-1.5 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%`, backgroundColor: TEAL_ON_DARK }}
          />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dd className="text-lg font-semibold leading-none tabular-nums text-white">{stat.value}</dd>
              <dt className="mt-1 text-[11px] leading-tight text-white/60">{stat.label}</dt>
            </div>
          ))}
        </dl>

        <details className="mt-5 border-t border-white/10 pt-3">
          <summary className="cursor-pointer list-none rounded-md text-xs font-semibold text-white/70 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white">
            Waar verdien je XP mee?
          </summary>
          <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
            {summary.xpTable.map((row) => (
              <li key={row.event} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-white/70">{row.label}</span>
                <span className="flex-shrink-0 font-semibold tabular-nums" style={{ color: TEAL_ON_DARK }}>
                  +{row.value}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Panel>
  );
}
