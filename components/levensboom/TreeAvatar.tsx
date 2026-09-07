'use client';

import Link from 'next/link';
import TreeCanvas from './TreeCanvas';
import LevelUpDialog from './LevelUpDialog';
import { useLevensboom } from '../../hooks/useLevensboom';

const TEAL = '#0D9488';

/**
 * The Levensboom *as* the profile picture, not as a card beside it.
 *
 * The tree fills the round frame the photo used to occupy, with the XP bar bent
 * around it as a ring and the level in the corner badge - so the one thing that
 * says "this is you" is also the thing that grows when you study.
 *
 * [fallback] is what stands in when the reader has switched the tree off or the
 * state has not arrived yet: the real photo/initials avatar. XP, levels and
 * badges keep accruing either way, so the toggle stays purely visual.
 *
 * This is also the surface the level-up celebration fires from - it replaced the
 * card that used to own that.
 */
export default function TreeAvatar({
  size = 128,
  fallback,
}: {
  size?: number;
  fallback?: React.ReactNode;
}) {
  const { data, loading, celebrate, dismissCelebration } = useLevensboom();

  if (loading || !data?.levensboom || data.levensboom.disabled) {
    return <>{fallback ?? null}</>;
  }

  const { levensboom } = data;
  const remaining = Math.max(0, data.xpForNextLevel - data.xpIntoLevel);
  const frac = data.xpForNextLevel > 0 ? data.xpIntoLevel / data.xpForNextLevel : 0;

  // The ring is the XP bar, bent. Stroke sits on the circle's own line, so the
  // radius is inset by half the stroke to keep it inside the box.
  const stroke = Math.max(3, Math.round(size * 0.035));
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(1, Math.max(0, data.progressPercentage / 100));

  return (
    <>
      <div className="flex flex-col items-center">
        <Link
          href="/profiel/boom"
          className="group relative block no-underline"
          style={{ width: size, height: size }}
          aria-label={`Je levensboom, niveau ${data.level}. Bekijk je boom`}
        >
          <div
            className="absolute overflow-hidden rounded-full ring-1 ring-black/5 transition-transform group-hover:scale-[1.02] dark:ring-white/10"
            style={{ inset: stroke + 2 }}
          >
            <TreeCanvas
              seed={levensboom.seed}
              level={data.level}
              frac={frac}
              health={levensboom.health}
              reducedMotion={levensboom.reducedMotion}
              className="block h-full w-full"
            />
          </div>

          <svg
            className="absolute inset-0 -rotate-90"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            aria-hidden="true"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-gray-200 dark:text-secondary"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={TEAL}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
            />
          </svg>

          <span
            className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full border-2 border-white font-bold tabular-nums text-white dark:border-card"
            style={{
              backgroundColor: TEAL,
              minWidth: Math.round(size * 0.28),
              height: Math.round(size * 0.28),
              fontSize: Math.round(size * 0.13),
              paddingLeft: 6,
              paddingRight: 6,
            }}
            title={`Niveau ${data.level}`}
          >
            {data.level}
          </span>
        </Link>

        <p className="mt-3 text-sm font-bold text-foreground">Niveau {data.level}</p>
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {levensboom.wilting
            ? `${levensboom.daysSinceActive} dagen niet gelezen`
            : `nog ${remaining} XP`}
        </p>
        <Link
          href="/profiel/boom"
          className="mt-2 text-xs font-semibold no-underline hover:underline"
          style={{ color: TEAL }}
        >
          Bekijk je boom →
        </Link>
      </div>

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
