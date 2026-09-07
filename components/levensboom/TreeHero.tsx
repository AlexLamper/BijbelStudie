'use client';

import Link from 'next/link';
import TreeCanvas from './TreeCanvas';
import LevelUpDialog from './LevelUpDialog';
import { useLevensboom } from '../../hooks/useLevensboom';

const TEAL = '#0D9488';

/**
 * The tree at the top of /profiel, and the way in to /profiel/boom.
 *
 * Renders nothing at all when the user has switched the tree off - XP, levels
 * and badges keep accruing either way, so the toggle is purely visual.
 */
export default function TreeHero() {
  const { data, loading, celebrate, dismissCelebration } = useLevensboom();

  if (loading || !data?.levensboom || data.levensboom.disabled) return null;

  const { levensboom } = data;
  const remaining = Math.max(0, data.xpForNextLevel - data.xpIntoLevel);
  const frac = data.xpForNextLevel > 0 ? data.xpIntoLevel / data.xpForNextLevel : 0;

  return (
    <>
      <Link
        href="/profiel/boom"
        className="group block overflow-hidden rounded-2xl border border-gray-200 no-underline dark:border-border"
        aria-label="Bekijk je levensboom"
      >
        <div className="relative h-56 sm:h-64">
          <TreeCanvas
            seed={levensboom.seed}
            level={data.level}
            frac={frac}
            health={levensboom.health}
            reducedMotion={levensboom.reducedMotion}
            className="block h-full w-full"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                  Mijn boom
                </p>
                <p className="text-lg font-bold text-white">Niveau {data.level}</p>
              </div>
              <p className="text-xs text-white/80 tabular-nums">
                {levensboom.wilting
                  ? `${levensboom.daysSinceActive} dagen niet gelezen`
                  : `nog ${remaining} XP`}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${data.progressPercentage}%`, backgroundColor: TEAL }}
              />
            </div>
          </div>
        </div>
      </Link>

      {celebrate !== null && (
        <LevelUpDialog
          seed={levensboom.seed}
          level={celebrate}
          reducedMotion={levensboom.reducedMotion}
          onClose={() => void dismissCelebration()}
        />
      )}
    </>
  );
}
