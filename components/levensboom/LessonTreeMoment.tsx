'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import TreeCanvas from './TreeCanvas';
import { useStableFloor } from './useStableFloor';
import { useLevensboom, fracOf } from '../../hooks/useLevensboom';
import { itemsUnlockedAtLevel } from '../../lib/levensboom/catalog';
import { ringColors } from '../../lib/levensboom/ring';
import { track } from '../../lib/analytics';

/** level + frac, cut to three decimals for the analytics beacon. */
function rawPosition(at: { level: number; frac: number }): string {
  return String(Math.round((at.level + at.frac) * 1000) / 1000);
}

/**
 * The tree at the end of a lesson: what the XP just did to it.
 *
 * Growth v2 (LEVENSBOOM_GROWTH_PLAN.md §9.2): the tree grows from where it
 * stood before this lesson's XP to where it stands now - the young wood
 * lengthens and the camera eases out a little. Within a level that is pure
 * size; across a level-up the new wood grows out of its parent's tip, the way
 * the level-up card does it, and the items that level unlocked are named on
 * the stage. Under reduced motion the end state shows at once. No copy: the
 * tree growing is the point.
 *
 * The provider has already applied the grant by the time this mounts, and
 * kept the position from before it (`lastGrowth`). [fallback] is what the card
 * shows when the reader has no tree to show - state not loaded, or switched
 * off.
 */
export default function LessonTreeMoment({
  xpAwarded,
  levelledUp,
  fallback,
}: {
  xpAwarded: number;
  levelledUp: boolean;
  fallback: React.ReactNode;
}) {
  const { data, lastGrowth } = useLevensboom();
  const reduceMotion = useReducedMotion();
  const tree = data?.levensboom ?? null;
  const level = data?.level ?? 1;
  const floor = useStableFloor(tree?.growth?.floor);

  // The grant this card is about. Captured once: a later grant on the same
  // screen (a streak, a note) must not replay the growth under the reader.
  const [moment, setMoment] = useState(() => (xpAwarded > 0 ? lastGrowth : null));
  useEffect(() => {
    if (moment || xpAwarded <= 0 || !lastGrowth) return;
    setMoment(lastGrowth);
  }, [moment, xpAwarded, lastGrowth]);

  const from = useMemo(
    () => (moment ? { level: moment.from.level, frac: moment.from.frac, floor } : null),
    [moment, floor],
  );

  const reportedRef = useRef(false);
  // Fires once, only once the card actually has a tree to show rather than the
  // fallback, with the move it shows (plan §13).
  useEffect(() => {
    if (reportedRef.current) return;
    if (!data || !tree || tree.disabled) return;
    reportedRef.current = true;
    track('tree_growth_moment', moment ? { fromPos: rawPosition(moment.from), toPos: rawPosition(moment.to) } : undefined);
  }, [data, tree, moment]);

  if (!data || !tree || tree.disabled) return <>{fallback}</>;

  const unlocked = levelledUp ? itemsUnlockedAtLevel(level) : [];
  const gold = tree.avatar.ring === 'goud';
  const ring = ringColors(tree.avatar.ring);
  const phaseName = tree.growth?.phase.name ?? tree.stage.name;

  return (
    // The design's scene: 246 px tall, radius 14, and a 3 px GOLD frame around
    // it (design_handoff_web/PAGES-STUDIE-EN-LES.md §15). A reader whose ring is
    // the Pro gold keeps their own stroke, which is the same colour anyway.
    <div
      className="relative mx-auto h-[246px] w-full max-w-[470px] overflow-hidden rounded-[14px]"
      style={{ border: `3px solid ${gold ? ring.stroke : 'var(--gold)'}` }}
    >
      <TreeCanvas
        seed={tree.seed}
        level={level}
        frac={fracOf(data)}
        floor={floor}
        from={from}
        health={tree.health}
        species={tree.avatar.species}
        scene={tree.avatar.scene}
        animal={tree.avatar.animal}
        framing="scene"
        celebration={levelledUp && !reduceMotion && !tree.reducedMotion}
        reducedMotion={tree.reducedMotion || !!reduceMotion}
        className="block h-full w-full"
        ariaLabel={`Je boom, ${phaseName.toLowerCase()} op niveau ${level}`}
      />
      {/* Bottom left: the level on gold with gold ink - never white on gold -
          and the phase on white. */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
        <span className="rounded-full bg-gold px-[10px] py-[3px] text-[11px] font-bold text-gold-ink">
          Niveau {level}
        </span>
        <span className="rounded-full bg-white px-[10px] py-[3px] text-[11px] font-semibold text-[#0F172A]">
          {phaseName}
        </span>
      </div>
      {xpAwarded > 0 && (
        <span
          className="pointer-events-none absolute right-3 top-3 rounded-full px-[10px] py-[3px] text-[11px] font-bold text-white tabular-nums"
          style={{ backgroundColor: 'rgba(6,48,44,.72)' }}
        >
          +{xpAwarded} XP
        </span>
      )}
      {unlocked.length > 0 && (
        <span
          className="pointer-events-none absolute bottom-3 right-3 max-w-[55%] truncate rounded-full px-[10px] py-[3px] text-[11px] font-semibold text-white"
          style={{ backgroundColor: 'rgba(6,48,44,.72)' }}
        >
          Nieuw: {unlocked.map((item) => item.name).join(', ')}
        </span>
      )}
    </div>
  );
}
