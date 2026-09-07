'use client';

import { useEffect, useMemo, useState } from 'react';
import TreeCanvas from './TreeCanvas';
import { buildPalette, seasonForMonth } from '../../lib/levensboom/palette';
import { fruitAtLevel, TRAIT_LABELS, TRAIT_LEVELS, type TreeTrait } from '../../lib/levensboom/traits';
import { maxDepthForLevel } from '../../lib/levensboom/generate';

const TEAL = '#0D9488';
const GROW_MS = 1200;

/**
 * The level-up moment. Kept for level-ups and fruit unlocks only - the whole
 * point is that it stays rare enough to feel like something.
 *
 * No reward to collect and no "claim" button: one line about what grew, and a
 * way out. The mirror of the app's `levensboom_celebration.dart`.
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

function traitAtLevel(level: number): TreeTrait | null {
  const entry = (Object.entries(TRAIT_LEVELS) as [TreeTrait, number][]).find(
    ([, at]) => at === level,
  );
  return entry ? entry[0] : null;
}

export default function LevelUpDialog({
  seed,
  level,
  reducedMotion = false,
  onClose,
}: {
  seed: string;
  level: number;
  reducedMotion?: boolean;
  onClose: () => void;
}) {
  const [reveal, setReveal] = useState(reducedMotion ? 1 : 0);

  // Night, always: the sequence dims to a night sky so the new growth and the
  // rising motes read against something quiet.
  const palette = useMemo(
    () => buildPalette(seasonForMonth(new Date().getMonth()), 'night', 1),
    [],
  );

  const fruit = fruitAtLevel(level);
  const trait = traitAtLevel(level);

  useEffect(() => {
    if (reducedMotion) {
      setReveal(1);
      return;
    }
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
    return () => cancelAnimationFrame(frame);
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
        <div className="relative h-64">
          <TreeCanvas
            seed={seed}
            level={level}
            frac={0}
            reveal={reveal}
            palette={palette}
            reducedMotion={reducedMotion}
            className="block h-full w-full"
          />
        </div>

        <div className="p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8FD694' }}>
            Je boom is gegroeid
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Niveau {level}
            {fruit ? ` — ${fruit.name}` : ''}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {fruit
              ? `De ${fruit.name.toLowerCase()} hangt nu aan je boom — een vrucht van de Geest, ${fruit.reference}.`
              : trait
                ? TRAIT_LABELS[trait]
                : encouragement(level)}
          </p>

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
