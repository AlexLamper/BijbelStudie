'use client';

import { useEffect, useRef, useState } from 'react';
import TreeCanvas from '../levensboom/TreeCanvas';
import { STAGES, phaseForStep } from '../../lib/levensboom/stages';
import { fruitAtLevel, traitAtLevel, TRAIT_LABELS } from '../../lib/levensboom/traits';
import { itemsUnlockedAtLevel } from '../../lib/levensboom/catalog';

const TEAL = '#0D9488';
const MAX_LEVEL = 20;
const AUTO_MS = 2200;
const GROW_MS = 1300;

type Shown = { level: number; from: { level: number; frac: number } | null };

/** Forward moves grow from the previous level; a jump back (the loop, the slider) just shows the tree. */
function moveTo(current: Shown, next: number, animate: boolean): Shown {
  return { level: next, from: animate && next > current.level ? { level: current.level, frac: 0 } : null };
}

/**
 * "Elk niveau groeit je boom verder": one tree, every level from 1 to 20.
 *
 * Growth v2 (LEVENSBOOM_GROWTH_PLAN.md §9): it is the same tree all the way -
 * each level lengthens the wood that is there and grows new wood out of its
 * tips (TreeCanvas `from`), where it used to reveal a newly drawn tree.
 *
 * It plays by itself once it scrolls into view - a level every 2.2 s - and
 * hands the controls to the visitor the moment they touch the slider or a
 * phase. What each level brings (a phase, a fruit, an unlock) is written under
 * the stage as it happens. The server's SVG stands in until the block is on
 * screen; reduced motion shows level 8 and no autoplay.
 */
export default function LevensboomGroeiDemo({ seed, initialSvg }: { seed: string; initialSvg: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(false);
  const [shown, setShown] = useState<Shown>({ level: 6, from: null });
  const [auto, setAuto] = useState(true);
  const [still, setStill] = useState(false);
  const level = shown.level;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce) {
      setStill(true);
      setAuto(false);
      setShown({ level: 8, from: null });
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
    const id = window.setInterval(
      () => setShown((current) => moveTo(current, current.level >= MAX_LEVEL ? 1 : current.level + 1, true)),
      AUTO_MS,
    );
    return () => window.clearInterval(id);
  }, [live, auto]);

  // No floor here, so the step is the level.
  const stage = phaseForStep(level);
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
            : 'Er is nieuw hout bijgekomen.';

  const take = (next: number) => {
    setAuto(false);
    setShown((current) => moveTo(current, next, !still));
  };

  return (
    <div ref={ref}>
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5" style={{ aspectRatio: '16 / 10' }}>
        {live ? (
          <TreeCanvas
            seed={seed}
            level={level}
            frac={0}
            from={shown.from}
            tweenMs={GROW_MS}
            species="eik"
            scene="waterbeken"
            animal={level >= 5 ? 'vogel' : 'geen'}
            framing="scene"
            reducedMotion={still}
            className="absolute inset-0 block h-full w-full"
            ariaLabel={`Je boom op niveau ${level}: ${stage.name.toLowerCase()}`}
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
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow max-md:left-3 max-md:w-fit max-md:ml-auto max-md:text-[11px]" style={{ color: TEAL }}>
            Nieuw: {unlocked.map((item) => item.name).join(', ')}
          </span>
        )}
      </div>

      <p className="mt-4 min-h-[2.75rem] text-sm leading-relaxed" style={{ color: 'var(--lp-muted, #4B5563)' }}>
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
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors max-md:min-h-9 max-md:px-3 max-md:text-xs"
                style={{
                  color: active ? '#FFFFFF' : 'var(--ink-muted)',
                  backgroundColor: active ? TEAL : 'transparent',
                  borderColor: active ? TEAL : 'var(--line)',
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
