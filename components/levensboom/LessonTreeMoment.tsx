'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import TreeCanvas from './TreeCanvas';
import { useLevensboom, fracOf } from '../../hooks/useLevensboom';
import { maxDepthForLevel } from '../../lib/levensboom/generate';
import { itemsUnlockedAtLevel } from '../../lib/levensboom/catalog';
import { ringColors } from '../../lib/levensboom/ring';

const TEAL = '#0D9488';
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
    <div
      className="relative mx-auto aspect-[16/9] w-full max-w-md overflow-hidden rounded-2xl"
      style={{ boxShadow: `0 0 0 2px ${gold ? ring.stroke : 'rgba(13,148,136,0.35)'}` }}
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
        ariaLabel={`Je levensboom, ${tree.stage.name.toLowerCase()} op niveau ${level}`}
      />
      <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
          style={{ backgroundColor: gold ? ring.stroke : TEAL }}
        >
          Niveau {level}
        </span>
        <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {tree.stage.name}
        </span>
      </div>
      {xpAwarded > 0 && (
        <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold tabular-nums dark:bg-card/90" style={{ color: TEAL }}>
          +{xpAwarded} XP
        </span>
      )}
      {unlocked.length > 0 && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 max-w-[55%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold dark:bg-card/90" style={{ color: TEAL }}>
          Nieuw: {unlocked.map((item) => item.name).join(', ')}
        </span>
      )}
    </div>
  );
}
