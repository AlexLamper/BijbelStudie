'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import TreeCanvas from './TreeCanvas';
import { useStableFloor } from './useStableFloor';
import { buildPalette, seasonForMonth } from '../../lib/levensboom/palette';
import { fruitCount } from '../../lib/levensboom/traits';
import { itemsUnlockedAtLevel, type CatalogItem } from '../../lib/levensboom/catalog';
import { phaseForStep } from '../../lib/levensboom/stages';
import type { GrowthFloor } from '../../lib/levensboom/growth';
import { levelUpCopy } from '../../lib/levensboom/growthCopy';
import { playLevelUp } from '../../lib/levensboomSound';
import { track } from '../../lib/analytics';

const TEAL = '#0D9488';

/**
 * The level-up moment. Kept for level-ups and fruit unlocks only - the whole
 * point is that it stays rare enough to feel like something.
 *
 * No reward to collect and no "claim" button: what grew (the copy rules of
 * LEVENSBOOM_GROWTH_PLAN.md §9.3, in `lib/levensboom/growthCopy.ts`), the items
 * the level unlocked, and a way out. The mirror of the app's
 * `levensboom_celebration.dart`.
 *
 * Growth v2: the tree is the reader's own tree growing from where it stood to
 * where it stands now - branches that were there lengthen, new wood grows out
 * of their tips and the camera eases out with it (TreeCanvas `from`). That
 * replaces the depth reveal and the CSS camera push, which replayed a newly
 * generated tree. A jump of several levels is one card, tweened from the
 * level the reader last saw.
 */

export default function LevelUpDialog({
  seed,
  level,
  lastSeenLevel,
  floor: floorProp = null,
  species = 'eik',
  scene = 'waterbeken',
  animal = 'geen',
  reducedMotion = false,
  onClose,
}: {
  seed: string;
  level: number;
  /** The level the reader last saw celebrated; below `level - 1` this is a jump. */
  lastSeenLevel?: number | null;
  /** `levensboom.growth.floor`: the account's head start, if it has one. */
  floor?: GrowthFloor | null;
  species?: string;
  scene?: string;
  animal?: string;
  reducedMotion?: boolean;
  onClose: () => void;
}) {
  const floor = useStableFloor(floorProp);

  // Night, always: the sequence dims to a night sky so the new growth and the
  // rising motes read against something quiet. The reader's own scene keeps
  // its backdrop under that sky.
  const palette = useMemo(
    () => buildPalette(seasonForMonth(new Date().getMonth()), 'night', 1, { scene, species }),
    [scene, species],
  );

  const fromLevel = Math.max(1, Math.min(level - 1, Math.floor(lastSeenLevel ?? level - 1)));
  const copy = levelUpCopy({ level, fromLevel, floor });
  const phase = phaseForStep(copy.step);

  // One level: from the very end of the previous one, so what grows is this
  // level's new wood. A jump: from where the reader last saw it.
  const from = useMemo(
    () => ({ level: fromLevel, frac: fromLevel === level - 1 ? 0.999 : 0, floor }),
    [fromLevel, level, floor],
  );

  // Everything the levels since the last card unlocked, not only the last one.
  const unlocked = useMemo(() => {
    const items: CatalogItem[] = [];
    for (let at = fromLevel + 1; at <= level; at += 1) items.push(...itemsUnlockedAtLevel(at));
    return items;
  }, [fromLevel, level]);

  // The newest fruit is the last one on the tree, and the scene lists them in
  // unlock order - so its ornament index is simply the count minus one.
  const fruitIndex = fruitCount(level) - 1;

  const reportedRef = useRef(false);
  // One impression per open, not per render - guards the dialog against a
  // strict-mode double mount the same way UpgradePrompt does for `paywall_hit`.
  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    track('tree_levelup_seen', {
      level: String(level),
      step: String(copy.step),
      phase: phase.id,
      floored: String(Boolean(floor)),
    });
  }, [level, copy.step, phase.id, floor]);

  useEffect(() => {
    // The sound is what makes this read as a moment rather than a dialog; the
    // growth itself is TreeCanvas's tween. Both are off under reduced motion.
    if (!reducedMotion) playLevelUp();
  }, [level, reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(8,11,26,0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Niveau ${level} bereikt`}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-[#0B1027] shadow-2xl">
        <div className="relative h-64 overflow-hidden">
          <TreeCanvas
            seed={seed}
            level={level}
            frac={0}
            floor={floor}
            from={from}
            species={species}
            scene={scene}
            animal={animal}
            palette={palette}
            reducedMotion={reducedMotion}
            celebration
            bloomFruit={copy.fruit ? fruitIndex : null}
            className="block h-full w-full"
            ariaLabel={`Je boom: ${phase.name.toLowerCase()}`}
          />
        </div>

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-white">{copy.title}</h2>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest tabular-nums" style={{ color: '#8FD694' }}>
            {copy.subtitle}
          </p>
          {copy.line && <p className="mt-3 text-sm leading-relaxed text-white/70">{copy.line}</p>}

          {unlocked.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white/5 p-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
                Nieuw voor je boom
              </p>
              <ul className="mt-1.5 space-y-1">
                {unlocked.map((item) => (
                  <li key={`${item.kind}:${item.id}`} className="flex items-baseline justify-between gap-3 text-sm text-white">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-xs text-white/60">{item.blurb}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/profiel/boom"
                onClick={onClose}
                className="mt-2 inline-block text-xs font-semibold no-underline hover:underline"
                style={{ color: '#8FD694' }}
              >
                Bekijk je boom →
              </Link>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            Verder
          </button>
        </div>
      </div>
    </div>
  );
}
