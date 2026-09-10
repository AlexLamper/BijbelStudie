'use client';

import { SceneSkeleton } from '../../scene/pieces';
import type { Stage } from '../../../lib/levensboom/stages';
import type { LevensboomPayload } from '../../../lib/levensboom/summary';
import { TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';

/**
 * The shared PANEL, one step deeper - for the same reason StudioTiles carries
 * its own tile.
 *
 * This block floats on the reader's own tree rather than on the fixed dusk
 * landscape the other scene pages have, and that sky follows their clock: it
 * runs to #DFF3F7 through the afternoon. On `bg-black/40` over that, the
 * `text-white/70` line under the stage name measures about 3.9:1; on
 * `bg-black/55` it measures 5.5:1. At night the extra black costs the picture
 * nothing.
 */
const STUDIO_PANEL = 'rounded-2xl border border-white/20 bg-black/55 backdrop-blur-md';

/**
 * Where you are, in one look - at the foot of the studio's reading column, with
 * the reader's own tree standing behind it.
 *
 * It carries the stage name and the level, which is why the studio's masthead
 * no longer repeats them: on a page whose whole background is the tree, one
 * block says where the reader stands and everything else is the picture.
 *
 * The old strip was one line of small type ("nog 177 XP -> niveau 6"), which
 * says how far there is to go but never where you stand. This says both: the
 * level as a figure you cannot miss, the bar between this level and the next
 * with the XP written on it, and underneath the two things that are actually
 * coming - the next unlock and the next stage. Every figure is tabular so the
 * numbers do not shuffle when XP lands.
 *
 * Display only: every number comes from the gamification summary as served.
 *
 * It sits on the landscape, so every colour is a literal white or one of the
 * two teals that hold up on a dark ground - never a theme token, which would
 * flip with the reader's light/dark setting while the scene did not. The level
 * badge is TEAL_DEEP because it carries white type.
 */
export default function LevelProgress({
  level,
  xpIntoLevel,
  xpForNextLevel,
  progressPercentage,
  stage,
  nextUnlock,
  className,
}: {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercentage: number;
  stage: Stage;
  nextUnlock: LevensboomPayload['nextUnlock'];
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, progressPercentage));
  const remaining = Math.max(0, xpForNextLevel - xpIntoLevel);
  const nextStage = stage.nextLevel && stage.nextName ? { name: stage.nextName, level: stage.nextLevel } : null;

  return (
    <section aria-label="Jouw voortgang" className={`${STUDIO_PANEL} p-4 sm:p-5 ${className ?? ''}`}>
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-white ring-1 ring-white/20"
          style={{ backgroundColor: TEAL_DEEP }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85">Niveau</span>
          <span className="text-3xl font-bold leading-none tabular-nums">{level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight text-white">{stage.name}</p>
          <p className="mt-1 text-sm leading-snug text-white/70">
            {remaining > 0 ? (
              <>
                Nog <span className="font-semibold tabular-nums text-white">{remaining} XP</span> tot niveau{' '}
                <span className="tabular-nums">{level + 1}</span>
              </>
            ) : (
              <>
                Niveau <span className="tabular-nums">{level + 1}</span> is bereikt bij je volgende sessie
              </>
            )}
          </p>
        </div>
      </div>

      {/* The bar carries its own figures: muted on the empty part, white on the
          filled part. Two clipped copies rather than one, so neither is ever
          read over the wrong background. */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={xpForNextLevel}
          aria-valuenow={xpIntoLevel}
          aria-valuetext={`${xpIntoLevel} van ${xpForNextLevel} XP naar niveau ${level + 1}`}
          className="relative h-7 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%`, backgroundColor: TEAL_DEEP }}
          />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-white/75"
            style={{ clipPath: `inset(0 0 0 ${pct}%)` }}
          >
            {xpIntoLevel} / {xpForNextLevel} XP
          </span>
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-white"
            style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
          >
            {xpIntoLevel} / {xpForNextLevel} XP
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold tabular-nums text-white/60">
          <span>Niveau {level}</span>
          <span>Niveau {level + 1}</span>
        </div>
      </div>

      {(nextUnlock || nextStage) && (
        <dl className="mt-4 space-y-2 border-t border-white/15 pt-3">
          {nextUnlock && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex-shrink-0 text-xs text-white/60">Hierna ontgrendel je</dt>
              <dd className="m-0 min-w-0 truncate text-right text-xs font-semibold" style={{ color: TEAL_ON_DARK }}>
                {nextUnlock.name}{' '}
                <span className="font-normal tabular-nums text-white/60">· niveau {nextUnlock.level}</span>
              </dd>
            </div>
          )}
          {nextStage && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex-shrink-0 text-xs text-white/60">Volgende fase</dt>
              <dd className="m-0 min-w-0 truncate text-right text-xs font-semibold text-white">
                {nextStage.name}{' '}
                <span className="font-normal tabular-nums text-white/60">· niveau {nextStage.level}</span>
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

/** The same box, shimmering, so the block does not pop in at its full height. */
export function LevelProgressSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Voortgang laden"
      className={`${STUDIO_PANEL} p-4 sm:p-5 ${className ?? ''}`}
    >
      <div className="flex items-center gap-4">
        <SceneSkeleton className="h-16 w-16 flex-shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <SceneSkeleton className="h-4 w-32" />
          <SceneSkeleton className="h-3.5 w-48" />
        </div>
      </div>
      <SceneSkeleton className="mt-4 h-7 rounded-full" />
      <div className="mt-1.5 flex items-center justify-between">
        <SceneSkeleton className="h-3 w-16" />
        <SceneSkeleton className="h-3 w-16" />
      </div>
      <div className="mt-4 space-y-2 border-t border-white/15 pt-3">
        <SceneSkeleton className="h-3 w-4/5" />
        <SceneSkeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}
