'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TreeCanvas from './TreeCanvas';
import { buildPalette, seasonForMonth } from '../../lib/levensboom/palette';
import { fruitAtLevel, fruitCount, TRAIT_LABELS, traitAtLevel } from '../../lib/levensboom/traits';
import { maxDepthForLevel } from '../../lib/levensboom/generate';
import { stageForLevel } from '../../lib/levensboom/stages';
import { itemsUnlockedAtLevel } from '../../lib/levensboom/catalog';
import { playLevelUp } from '../../lib/levensboomSound';

const TEAL = '#0D9488';
const GROW_MS = 1200;

/**
 * The level-up moment. Kept for level-ups and fruit unlocks only - the whole
 * point is that it stays rare enough to feel like something.
 *
 * No reward to collect and no "claim" button: one line about what grew, the
 * items the level just unlocked, and a way out. The mirror of the app's
 * `levensboom_celebration.dart`.
 */

function encouragement(level: number): string {
  const lines = [
    'Je boom staat er sterker bij dan gisteren.',
    'Elke keer dat je leest, groeit er iets.',
    'Rustig doorgaan is wat een boom groot maakt.',
    'Een nieuwe tak - gegroeid uit wat je gelezen hebt.',
  ];
  return lines[level % lines.length];
}

export default function LevelUpDialog({
  seed,
  level,
  species = 'eik',
  scene = 'waterbeken',
  animal = 'geen',
  reducedMotion = false,
  onClose,
}: {
  seed: string;
  level: number;
  species?: string;
  scene?: string;
  animal?: string;
  reducedMotion?: boolean;
  onClose: () => void;
}) {
  const [reveal, setReveal] = useState(reducedMotion ? 1 : 0);
  /** Drives the slow camera push: the tree eases in and scales up a hair. */
  const [pushed, setPushed] = useState(reducedMotion);

  // Night, always: the sequence dims to a night sky so the new growth and the
  // rising motes read against something quiet. The reader's own scene keeps
  // its backdrop under that sky.
  const palette = useMemo(
    () => buildPalette(seasonForMonth(new Date().getMonth()), 'night', 1, { scene, species }),
    [scene, species],
  );

  const fruit = fruitAtLevel(level);
  const trait = traitAtLevel(level);
  const stage = stageForLevel(level);
  const newStage = stage.from === level ? stage : null;
  const unlocked = itemsUnlockedAtLevel(level);
  // The newest fruit is the last one on the tree, and the scene lists them in
  // unlock order - so its ornament index is simply the count minus one.
  const fruitIndex = fruitCount(level) - 1;

  useEffect(() => {
    if (reducedMotion) {
      setReveal(1);
      setPushed(true);
      return;
    }

    // Sound and the camera push are the two things that make this read as a
    // moment rather than a dialog. Both are skipped above under reduced motion.
    playLevelUp();
    // Next frame, so the transition has an initial value to move away from.
    const push = requestAnimationFrame(() => setPushed(true));

    // Start from where the previous level's silhouette ended, so what the user
    // watches grow is the new wood rather than the whole tree replaying.
    const from = Math.min(0.92, maxDepthForLevel(level - 1) / (maxDepthForLevel(level) + 1));
    const started = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - started) / GROW_MS);
      const eased = 1 - (1 - t) ** 3;
      setReveal(from + (1 - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    setReveal(from);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(push);
    };
  }, [level, reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const line = fruit
    ? `De ${fruit.name.toLowerCase()} hangt nu aan je boom — een vrucht van de Geest, ${fruit.reference}.`
    : newStage
      ? `${newStage.blurb} Je boom is nu een ${newStage.name.toLowerCase()}.`
      : trait
        ? TRAIT_LABELS[trait]
        : encouragement(level);

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
          <div
            className="h-full w-full transition-transform duration-[1600ms] ease-out"
            style={{ transform: `scale(${pushed ? 1.08 : 1})` }}
          >
            <TreeCanvas
              seed={seed}
              level={level}
              frac={0}
              species={species}
              scene={scene}
              animal={animal}
              reveal={reveal}
              palette={palette}
              reducedMotion={reducedMotion}
              celebration
              bloomFruit={fruit ? fruitIndex : null}
              className="block h-full w-full"
            />
          </div>
        </div>

        <div className="p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8FD694' }}>
            {newStage ? `Je boom is nu een ${newStage.name.toLowerCase()}` : 'Je boom is gegroeid'}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Niveau {level}
            {fruit ? ` — ${fruit.name}` : ''}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{line}</p>

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
                Bekijk in je levensboom →
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
