'use client';

import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import TreeCanvas, { type TreeCanvasProps } from '../TreeCanvas';
import { useStableFloor } from '../useStableFloor';
import { catalogItem } from '../../../lib/levensboom/catalog';
import { levelForStep, structuralStep, type GrowthFloor } from '../../../lib/levensboom/growth';
import { growthPill, WHOLE_GROWTH, wholeGrowthLine, wholeGrowthTitle } from '../../../lib/levensboom/growthCopy';
import { TEAL, TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';

/** The playback runs to here (ten jaarringen), or to the reader's own step when that is further. */
const LAST_STEP = 30;
/** One step per this many ms while playing. */
const STEP_MS = 700;
/** The growth between two steps; the tree rests for what is left of STEP_MS. */
const TWEEN_MS = 600;

/** What TreeCanvas draws a step from: its `level`, `frac` and `floor`, or a `from` of the same three. */
type StepInputs = { level: number; frac: number; floor: GrowthFloor | null };

/**
 * The inputs that draw this account's tree on step `n`.
 *
 * Why not `at`, as the Groei ladder does: the tween's start (`from`) can only
 * be a level, a frac and a floor, and `at` hangs fruit by a different rule than
 * a floored tree does - so a tween from one to the other would drop and regrow
 * fruit on every step. Every step is drawn the way `from` is, which makes the
 * start of each tween exactly the picture that was on screen before it.
 *
 * - The step the reader is on: their own level, frac and floor, the stage's
 *   picture exactly.
 * - Any other step the account stands on at some level: the level it first
 *   stands on it (`levelForStep`), at the start of that level. Its fruit and
 *   traits are the ones the account had, or will have, there.
 * - The steps a head start skipped (a floor lifts level 1 past them): level 1,
 *   lifted to step n by a floor of its own. Level 1 carries no traits or fruit,
 *   so nothing but the wood differs between them.
 */
function inputsForStep(n: number, floor: GrowthFloor | null, now: { step: number; level: number; frac: number }): StepInputs {
  if (n === now.step) return { level: now.level, frac: now.frac, floor };
  if (n >= structuralStep(1, floor)) return { level: levelForStep(n, floor), frac: 0, floor };
  return { level: 1, frac: 0, floor: n > 1 ? { from: 1, to: n } : null };
}

/** The account's setting or the OS one, read on the first render so a reduced-motion reader never sees autoplay start. */
function useReducedMotion(preference: boolean): boolean {
  const [os, setOs] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setOs(query.matches);
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
  return preference || os;
}

const BUTTON =
  'inline-flex h-10 items-center gap-2 rounded-btn px-3.5 text-[13.5px] font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1027]';
const QUIET = 'hover:bg-white/10';
const QUIET_STYLE = { border: '1px solid rgba(255,255,255,.22)' } as const;

/**
 * "Bekijk de hele groei": the reader's own tree - their seed, the species on
 * the stage, their scene and floor - from step 1 to step 30, on request only.
 *
 * Playing, it moves one step every 700 ms with TreeCanvas's growth tween from
 * the step before. The slider, "Naar nu" and "Opnieuw" jump straight to a
 * step's end state. Under reduced motion (the account's setting or the OS)
 * nothing plays by itself: it opens on the reader's own step, and "Afspelen"
 * steps through end states only.
 *
 * Mounted by the studio only while open. Radix Dialog traps focus, closes on
 * Escape and outside clicks, and hides the page from assistive tech; the dark
 * card is the level-up card's, so the two moments look like one family.
 */
export default function WholeGrowthDialog({
  seed,
  species,
  scene,
  timeOfDay,
  level,
  frac,
  step: currentStep,
  floor: floorProp,
  reducedMotion: reducedPreference,
  onClose,
}: {
  seed: string;
  /** The species on the stage right now. */
  species: string;
  scene: string;
  timeOfDay?: string;
  /** The account's level and its progress through it: the "Nu" step is drawn from these. */
  level: number;
  frac: number;
  /** `levensboom.growth.step`. */
  step: number;
  /** `levensboom.growth.floor`. */
  floor: GrowthFloor | null;
  /** The account's stored preference; the OS setting is read here as well. */
  reducedMotion: boolean;
  onClose: () => void;
}) {
  const floor = useStableFloor(floorProp);
  const reduced = useReducedMotion(reducedPreference);
  const last = Math.max(LAST_STEP, currentStep);

  const [shown, setShown] = useState(() => (reduced ? currentStep : 1));
  const [playing, setPlaying] = useState(() => !reduced);
  /** The step the running tween grows from; null shows `shown` as it stands. */
  const [tweenFrom, setTweenFrom] = useState<number | null>(null);

  // Radix hands focus back to a Dialog.Trigger, and this dialog has none (the
  // studio mounts it on a click), so it remembers the button that opened it.
  const [returnFocus] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));
  const playRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!playing || shown >= last) return;
    const id = window.setTimeout(() => {
      setTweenFrom(shown);
      setShown(shown + 1);
      if (shown + 1 >= last) setPlaying(false);
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [playing, shown, last]);

  const now = { step: currentStep, level, frac };
  const target = inputsForStep(shown, floor, now);
  const from = tweenFrom !== null && !reduced ? inputsForStep(tweenFrom, floor, now) : null;

  const jump = (n: number) => {
    setPlaying(false);
    setTweenFrom(null);
    setShown(Math.min(last, Math.max(1, Math.round(n))));
  };
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (shown >= last) {
      setTweenFrom(null);
      setShown(1);
    }
    setPlaying(true);
  };
  const restart = () => {
    setTweenFrom(null);
    setShown(1);
    setPlaying(true);
  };

  const title = wholeGrowthTitle(catalogItem('species', species)?.name ?? 'boom');
  const pill = growthPill(shown);
  const isNow = shown === currentStep;
  // The native thumb travels between half its width from either end; 8 px is
  // half of the 16 px thumb browsers draw for an accent-coloured range.
  const nowAt = last > 1 ? (currentStep - 1) / (last - 1) : 0;

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100]" style={{ backgroundColor: 'rgba(8,11,26,0.72)' }} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            playRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus instanceof HTMLElement) returnFocus.focus();
          }}
          className="fixed left-1/2 top-1/2 z-[100] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-3xl bg-[#0B1027] shadow-2xl outline-none"
        >
          <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-5">
            <DialogPrimitive.Title className="min-w-0 text-xl font-bold leading-tight text-white">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={WHOLE_GROWTH.close}
              className="-mr-2 -mt-1 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <div className="relative h-64 overflow-hidden sm:h-72">
            <TreeCanvas
              seed={seed}
              level={target.level}
              frac={target.frac}
              floor={target.floor}
              from={from}
              tweenMs={TWEEN_MS}
              species={species}
              scene={scene}
              framing="scene"
              reducedMotion={reduced}
              timeOfDay={timeOfDay as TreeCanvasProps['timeOfDay']}
              className="block h-full w-full"
              ariaLabel={`Je boom: ${pill}`}
            />
          </div>

          <div className="px-6 pb-6 pt-5">
            {/* Read out when the reader moves the tree themselves; while it plays,
                a step every 700 ms would drown everything else. */}
            <div aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
              <p
                className="inline-flex max-w-full rounded-full px-3 py-1 text-[12.5px] font-semibold tabular-nums text-white"
                style={{ backgroundColor: 'rgba(255,255,255,.1)' }}
              >
                {pill}
              </p>
              <p
                className={`mt-2 text-sm leading-relaxed ${isNow ? 'font-semibold' : 'text-white/75'}`}
                style={isNow ? { color: TEAL_ON_DARK } : undefined}
              >
                {wholeGrowthLine(shown, currentStep, floor)}
              </p>
            </div>

            <div className="mt-5">
              <input
                type="range"
                min={1}
                max={last}
                step={1}
                value={shown}
                onChange={(event) => jump(Number(event.target.value))}
                aria-label="Stap"
                aria-valuetext={pill}
                className="block h-5 w-full cursor-pointer"
                style={{ accentColor: TEAL }}
              />
              <div className="relative mt-1 h-6" aria-hidden>
                <span
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `calc(8px + (100% - 16px) * ${nowAt})` }}
                >
                  <span className="h-1.5 w-0.5 rounded-full" style={{ backgroundColor: TEAL_ON_DARK }} />
                  <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: TEAL_ON_DARK }}>
                    {WHOLE_GROWTH.now}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* teal-dark, not teal: this fill carries white type (5.5:1 against 3.7:1). */}
              <button ref={playRef} type="button" onClick={togglePlay} className={`${BUTTON} hover:opacity-90`} style={{ backgroundColor: TEAL_DEEP }}>
                {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
                {playing ? WHOLE_GROWTH.pause : WHOLE_GROWTH.play}
              </button>
              <button type="button" onClick={restart} className={`${BUTTON} ${QUIET}`} style={QUIET_STYLE}>
                <RotateCcw size={15} aria-hidden />
                {WHOLE_GROWTH.restart}
              </button>
              <button type="button" onClick={() => jump(currentStep)} className={`${BUTTON} ${QUIET} ml-auto`} style={QUIET_STYLE}>
                {WHOLE_GROWTH.toNow}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
