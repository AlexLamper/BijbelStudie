'use client';

import { useEffect, useRef, useState } from 'react';
import TreeCanvas from '../levensboom/TreeCanvas';
import { maxDepthForLevel } from '../../lib/levensboom/generate';
import { STAGES, stageForLevel } from '../../lib/levensboom/stages';
import { fruitAtLevel, traitAtLevel, TRAIT_LABELS } from '../../lib/levensboom/traits';
import { itemsUnlockedAtLevel } from '../../lib/levensboom/catalog';

const TEAL = '#0D9488';
const MAX_LEVEL = 20;
const AUTO_MS = 1700;
const GROW_MS = 900;

/**
 * "Elk niveau een nieuwe boom": one tree, every level from 1 to 20.
 *
 * It plays by itself once it scrolls into view - a level every 1.7 s, each one
 * growing its new wood in - and hands the controls to the visitor the moment
 * they touch the slider or a stage. What each level brings (a stage, a fruit,
 * an unlock) is written under the stage as it happens. The server's SVG stands
 * in until the block is on screen; reduced motion shows level 8 and no autoplay.
 */
export default function LevensboomGroeiDemo({ seed, initialSvg }: { seed: string; initialSvg: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(false);
  const [level, setLevel] = useState(6);
  const [auto, setAuto] = useState(true);
  const [reveal, setReveal] = useState(1);
  const [still, setStill] = useState(false);
  const previous = useRef(6);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce) {
      setStill(true);
      setAuto(false);
      setLevel(8);
    }
    if (!('IntersectionObserver' in window)) {
      setLive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setLive(true);
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Autoplay: one level at a time, looping back to the kiem.
  useEffect(() => {
    if (!live || !auto) return;
    const id = window.setInterval(() => setLevel((current) => (current >= MAX_LEVEL ? 1 : current + 1)), AUTO_MS);
    return () => window.clearInterval(id);
  }, [live, auto]);

  // A level change grows the new wood in from where the previous level ended.
  useEffect(() => {
    const from = previous.current;
    previous.current = level;
    if (still || level <= from) {
      setReveal(1);
      return;
    }
    const start = Math.min(0.92, maxDepthForLevel(from) / (maxDepthForLevel(level) + 1));
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / GROW_MS);
      setReveal(start + (1 - start) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    setReveal(start);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [level, still]);

  const stage = stageForLevel(level);
  const fruit = fruitAtLevel(level);
  const trait = traitAtLevel(level);
  const unlocked = itemsUnlockedAtLevel(level);
  const newStage = stage.from === level;
  const happening =
    newStage
      ? `Nieuwe fase: ${stage.name.toLowerCase()}. ${stage.blurb}`
      : fruit
        ? `Vrucht van de Geest: ${fruit.name.toLowerCase()} (${fruit.reference}).`
        : trait
          ? TRAIT_LABELS[trait]
          : unlocked.length > 0
            ? `Ontgrendeld: ${unlocked.map((item) => item.name).join(', ')}.`
            : 'Nieuwe takken, meer blad.';

  const take = (next: number) => {
    setAuto(false);
    setLevel(next);
  };

  return (
    <div ref={ref}>
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5" style={{ aspectRatio: '16 / 10' }}>
        {live ? (
          <TreeCanvas
            seed={seed}
            level={level}
            frac={0.6}
            species="eik"
            scene="waterbeken"
            animal={level >= 5 ? 'vogel' : 'geen'}
            framing="scene"
            reveal={reveal}
            reducedMotion={still}
            className="absolute inset-0 block h-full w-full"
            ariaLabel={`Levensboom op niveau ${level}: ${stage.name.toLowerCase()}`}
          />
        ) : (
          <div
            className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: initialSvg }}
          />
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-sm font-bold text-white shadow" style={{ backgroundColor: TEAL }}>
            Niveau {level}
          </span>
          <span className="rounded-full bg-black/45 px-3 py-1 text-sm font-semibold text-white backdrop-blur">{stage.name}</span>
        </div>
        {unlocked.length > 0 && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow" style={{ color: TEAL }}>
            Nieuw: {unlocked.map((item) => item.name).join(', ')}
          </span>
        )}
      </div>

      <p className="mt-4 min-h-[2.75rem] text-sm leading-relaxed" style={{ color: '#4B5563' }}>
        {happening}
      </p>

      <div className="mt-3">
        <label htmlFor="levensboom-niveau" className="sr-only">
          Niveau
        </label>
        <input
          id="levensboom-niveau"
          type="range"
          min={1}
          max={MAX_LEVEL}
          value={level}
          onChange={(event) => take(Number(event.target.value))}
          className="w-full accent-[#0D9488]"
          aria-valuetext={`Niveau ${level}, ${stage.name}`}
        />
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          {STAGES.map((s) => {
            const active = s.id === stage.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => take(s.from)}
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  color: active ? '#FFFFFF' : '#6B7280',
                  backgroundColor: active ? TEAL : 'transparent',
                  borderColor: active ? TEAL : '#E5E7EB',
                }}
                aria-pressed={active}
              >
                {s.name}
                <span className="font-normal"> · {s.from}{s.id === 'eeuwenoude_boom' ? '+' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
