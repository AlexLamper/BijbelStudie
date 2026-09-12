'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import TreeCanvas from './TreeCanvas';
import { useLevensboom, fracOf } from '../../hooks/useLevensboom';
import { maxDepthForLevel } from '../../lib/levensboom/generate';
import { itemsUnlockedAtLevel } from '../../lib/levensboom/catalog';
import { ringColors } from '../../lib/levensboom/ring';

const GROW_MS = 1200;

/**
 * The tree at the end of a lesson: what the XP just did to it.
 *
 * The provider has already applied the grant, so the leaves that unfurled are
 * already open and the level, if it moved, is the new one. On a level-up the
 * new wood grows in over a second, the way the level-up dialog does it, and the
 * items that level unlocked are named on the stage. [fallback] is what the card
 * shows when the reader has no tree to show - state not loaded, or switched off.
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
  const { data } = useLevensboom();
  const reduceMotion = useReducedMotion();
  const tree = data?.levensboom ?? null;
  const level = data?.level ?? 1;
  const animate = levelledUp && !reduceMotion && !tree?.reducedMotion;
  const from = Math.min(0.92, maxDepthForLevel(level - 1) / (maxDepthForLevel(level) + 1));
  const [reveal, setReveal] = useState(animate ? from : 1);

  useEffect(() => {
    if (!animate) {
      setReveal(1);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / GROW_MS);
      const eased = 1 - (1 - t) ** 3;
      setReveal(from + (1 - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animate, from]);

  if (!data || !tree || tree.disabled) return <>{fallback}</>;

  const unlocked = levelledUp ? itemsUnlockedAtLevel(level) : [];
  const gold = tree.avatar.ring === 'goud';
  const ring = ringColors(tree.avatar.ring);

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
        health={tree.health}
        species={tree.avatar.species}
        scene={tree.avatar.scene}
        animal={tree.avatar.animal}
        framing="scene"
        reveal={reveal}
        celebration={animate}
        reducedMotion={tree.reducedMotion || !!reduceMotion}
        className="block h-full w-full"
        ariaLabel={`Je boom, ${tree.stage.name.toLowerCase()} op niveau ${level}`}
      />
      {/* Bottom left: the level on gold with gold ink - never white on gold -
          and the stage on white. */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
        <span className="rounded-full bg-gold px-[10px] py-[3px] text-[11px] font-bold text-gold-ink">
          Niveau {level}
        </span>
        <span className="rounded-full bg-white px-[10px] py-[3px] text-[11px] font-semibold text-[#0F172A]">
          {tree.stage.name}
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
