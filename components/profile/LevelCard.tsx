'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const TEAL = '#0D9488';

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
 * Level and XP on the profile.
 *
 * The XP table is served rather than hardcoded so the "wat levert het op?"
 * list cannot drift from what the server actually awards.
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

  const stats = [
    { label: 'Lessen bestudeerd', value: summary.lessonsCompleted },
    { label: 'Studies voltooid', value: summary.studiesCompleted },
  ];

  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(13,148,136,0.08)' }}
        >
          <Sparkles size={14} style={{ color: TEAL }} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Niveau {summary.level}</p>
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            {summary.xp} XP · nog {Math.max(0, summary.xpForNextLevel - summary.xpIntoLevel)} tot niveau{' '}
            {summary.level + 1}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${summary.progressPercentage}%`, backgroundColor: TEAL }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-lg font-bold text-foreground tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <details className="mt-4 group">
          <summary className="text-xs text-muted-foreground cursor-pointer list-none hover:text-foreground">
            Waar verdien je XP mee?
          </summary>
          <ul className="mt-2 space-y-1">
            {summary.xpTable.map((row) => (
              <li key={row.event} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold tabular-nums" style={{ color: TEAL }}>
                  +{row.value}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
