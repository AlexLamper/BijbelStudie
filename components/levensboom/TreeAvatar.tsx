'use client';

import Link from 'next/link';
import TreeCanvas from './TreeCanvas';
import LevelUpDialog from './LevelUpDialog';
import { useLevensboom, fracOf } from '../../hooks/useLevensboom';
import { ringColors } from '../../lib/levensboom/ring';

/** The solid fill under the level badge's white type: 5.5:1, where the brand
 *  fill itself measures 3.74:1. See components/scene/tokens.ts. */
const TEAL_DEEP = '#0F766E';
const TEAL_ON_DARK = '#2DD4BF';

/**
 * Je boom *as* the profile picture, not as a card beside it.
 *
 * The tree fills the round frame the photo used to occupy, with the XP bar bent
 * around it as a ring and the level in the corner badge - so the one thing that
 * says "this is you" is also the thing that grows when you study. The ring is
 * the reader's pick: teal, or the Pro gold.
 *
 * [fallback] is what stands in when the reader has switched the tree off or the
 * state has not arrived yet: the real photo/initials avatar. XP, levels and
 * badges keep accruing either way, so the toggle stays purely visual.
 *
 * [still] draws one frame and starts no loop. /profiel sits on the immersive
 * shell, whose backdrop is already this reader's own tree, animated - and a
 * page may mount exactly one animated canvas (components/scene/README.md). The
 * ring, the level badge, the link and the celebration are untouched by it.
 *
 * The type under the frame is literal white rather than a theme token: this
 * avatar now sits on the landscape, which does not flip with the reader's
 * light/dark setting.
 *
 * This is also the surface the level-up celebration fires from.
 */
export default function TreeAvatar({
  size = 128,
  still = false,
  fallback,
}: {
  size?: number;
  still?: boolean;
  fallback?: React.ReactNode;
}) {
  const { data, loading, celebrate, dismissCelebration } = useLevensboom();

  if (loading || !data?.levensboom || data.levensboom.disabled) {
    return <>{fallback ?? null}</>;
  }

  const { levensboom } = data;
  const remaining = Math.max(0, data.xpForNextLevel - data.xpIntoLevel);
  const frac = fracOf(data);
  const ring = ringColors(levensboom.avatar.ring);

  // The ring is the XP bar, bent. Stroke sits on the circle's own line, so the
  // radius is inset by half the stroke to keep it inside the box.
  const stroke = Math.max(3, Math.round(size * 0.035));
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(1, Math.max(0, data.progressPercentage / 100));
  const gradientId = `levensboom-ring-${levensboom.avatar.ring}`;

  return (
    <>
      <div className="flex flex-col items-center">
        <Link
          href="/profiel/boom"
          className="group relative block rounded-full no-underline outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{ width: size, height: size }}
          aria-label={`Je boom, ${levensboom.stage.name.toLowerCase()} op niveau ${data.level}. Open de studio`}
        >
          <div
            className="absolute overflow-hidden rounded-full ring-1 ring-white/20 transition-transform group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            style={{ inset: stroke + 2 }}
          >
            <TreeCanvas
              seed={levensboom.seed}
              level={data.level}
              frac={frac}
              health={levensboom.health}
              species={levensboom.avatar.species}
              scene={levensboom.avatar.scene}
              animal={levensboom.avatar.animal}
              framing="portrait"
              reducedMotion={levensboom.reducedMotion}
              still={still}
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
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={ring.from} />
                <stop offset="100%" stopColor={ring.to} />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ring.track ?? 'rgba(255,255,255,0.22)'}
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
            />
          </svg>

          <span
            className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full border-2 border-black/40 font-bold tabular-nums text-white"
            style={{
              backgroundColor: levensboom.avatar.ring === 'goud' ? ring.stroke : TEAL_DEEP,
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

        <p className="mt-3 text-sm font-semibold text-white">
          {levensboom.stage.name} · niveau {data.level}
        </p>
        <p className="mt-0.5 text-[11px] tabular-nums text-white/65">
          {levensboom.wilting
            ? `${levensboom.daysSinceActive} dagen niet gelezen`
            : `nog ${remaining} XP`}
        </p>
        <Link
          href="/profiel/boom"
          className="mt-2 rounded-md text-xs font-semibold no-underline underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white"
          style={{ color: TEAL_ON_DARK }}
        >
          Naar je boom →
        </Link>
      </div>

      {celebrate !== null && (
        <LevelUpDialog
          seed={levensboom.seed}
          level={celebrate}
          species={levensboom.avatar.species}
          scene={levensboom.avatar.scene}
          animal={levensboom.avatar.animal}
          reducedMotion={levensboom.reducedMotion}
          onClose={() => void dismissCelebration()}
        />
      )}
    </>
  );
}
