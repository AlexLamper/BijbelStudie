'use client';

import { SkeletonBlock } from '../../ui/skeletons';
import type { Stage } from '../../../lib/levensboom/stages';
import type { LevensboomPayload } from '../../../lib/levensboom/summary';

const TEAL = '#0D9488';

/**
 * The block under the stage: where you are, in one look.
 *
 * The old strip was one line of small type ("nog 177 XP -> niveau 6"), which
 * says how far there is to go but never where you stand. This says both: the
 * level as a figure you cannot miss, the bar between this level and the next
 * with the XP written on it, and underneath the two things that are actually
 * coming - the next unlock and the next stage. Every figure is tabular so the
 * numbers do not shuffle when XP lands.
 *
 * Display only: every number comes from the gamification summary as served.
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
    <section
      aria-label="Jouw voortgang"
      className={`rounded-2xl border border-border bg-card p-4 sm:p-5 ${className ?? ''}`}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-white shadow-sm"
          style={{ backgroundColor: TEAL }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85">Niveau</span>
          <span className="text-3xl font-bold leading-none tabular-nums">{level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-tight text-foreground">{stage.name}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {remaining > 0 ? (
              <>
                Nog <span className="font-semibold tabular-nums text-foreground">{remaining} XP</span> tot niveau{' '}
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
          className="relative h-7 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%`, backgroundColor: TEAL }}
          />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-muted-foreground"
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
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold tabular-nums text-muted-foreground">
          <span>Niveau {level}</span>
          <span>Niveau {level + 1}</span>
        </div>
      </div>

      {(nextUnlock || nextStage) && (
        <dl className="mt-4 space-y-2 border-t border-border pt-3">
          {nextUnlock && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex-shrink-0 text-xs text-muted-foreground">Hierna ontgrendel je</dt>
              <dd className="min-w-0 truncate text-right text-xs font-semibold text-foreground">
                {nextUnlock.name}{' '}
                <span className="font-normal tabular-nums text-muted-foreground">· niveau {nextUnlock.level}</span>
              </dd>
            </div>
          )}
          {nextStage && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex-shrink-0 text-xs text-muted-foreground">Volgende fase</dt>
              <dd className="min-w-0 truncate text-right text-xs font-semibold text-foreground">
                {nextStage.name}{' '}
                <span className="font-normal tabular-nums text-muted-foreground">· niveau {nextStage.level}</span>
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
      className={`rounded-2xl border border-border bg-card p-4 sm:p-5 ${className ?? ''}`}
    >
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-16 w-16 flex-shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3.5 w-48" />
        </div>
      </div>
      <SkeletonBlock className="mt-4 h-7 rounded-full" />
      <div className="mt-1.5 flex items-center justify-between">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <SkeletonBlock className="h-3 w-4/5" />
        <SkeletonBlock className="h-3 w-3/5" />
      </div>
    </div>
  );
}
