'use client';

import { useMemo, useState, type ReactNode } from 'react';
import TreeCanvas from '../TreeCanvas';
import { generateTree } from '../../../lib/levensboom/generate';
import { SPECIES_IDS } from '../../../lib/levensboom/species';
import { SCENE_IDS } from '../../../lib/levensboom/scenes';
import { ANIMAL_IDS } from '../../../lib/levensboom/catalog';
import { phaseForStep } from '../../../lib/levensboom/stages';
import { xpForLevel } from '../../../lib/levensboom/client';
import { fnv1a32 } from '../../../lib/levensboom/rng';
import type { TimeOfDay } from '../../../lib/levensboom/palette';

/**
 * The tree lab behind /dev/boom (development only). Everything the PNG
 * sheets cannot show: the animated canvas with its backdrop, animals and
 * wind, the level-up tween and the in-level lesson growth, at the real sizes
 * of every surface.
 *
 * The tree is drawn at a continuous position through `at`; level and frac are
 * passed in step with it (for an account without a floor they are the same
 * thing), so a tween reads the same target either way.
 */

const DEFAULT_SEED = '65f0c1a2b3c4d5e6f7a81000';

const FRAMINGS = [
  { id: 'dashboard', label: 'Dashboard 320×200', width: 320, height: 200, framing: 'scene' },
  { id: 'lesson', label: 'Lesmoment 246×470', width: 246, height: 470, framing: 'scene' },
  { id: 'card', label: 'Publieke kaart 600×375', width: 600, height: 375, framing: 'scene' },
  { id: 'portrait176', label: 'Portret 176', width: 176, height: 176, framing: 'portrait' },
  { id: 'portrait28', label: 'Portret 28', width: 28, height: 28, framing: 'portrait' },
] as const;

type FramingId = (typeof FRAMINGS)[number]['id'];

const TIMES: readonly (TimeOfDay | 'auto')[] = ['day', 'dawn', 'dusk', 'night', 'auto'];

/** XP of one lesson (`study_lesson` in lib/gamification.ts). */
const LESSON_XP = 25;
/** Where a level-up tween starts: late in the old level, as a real level-up does. */
const LEVELUP_FROM_FRAC = 0.9;
const MAX_POSITION = 40;

/** A counter hashed into an ObjectId-shaped seed: reproducible, never Math.random. */
function seedFor(n: number): string {
  const part = (salt: string) => fnv1a32(`boomlab-${n}-${salt}`).toString(16).padStart(8, '0');
  return `${part('a')}${part('b')}${part('c')}`;
}

function levelFrac(position: number): { level: number; frac: number } {
  const level = Math.max(1, Math.floor(position + 1e-9));
  return { level, frac: Math.min(0.9999, Math.max(0, position - level)) };
}

function stepXp(level: number): number {
  return Math.max(1, xpForLevel(level + 1) - xpForLevel(level));
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900';
const buttonClass =
  'rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100 disabled:opacity-50';

export default function TreeLab() {
  const [species, setSpecies] = useState<string>('eik');
  const [scene, setScene] = useState<string>('waterbeken');
  const [animal, setAnimal] = useState<string>('geen');
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [seedCounter, setSeedCounter] = useState(0);
  const [health, setHealth] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | 'auto'>('day');
  const [position, setPosition] = useState(5);
  const [framingId, setFramingId] = useState<FramingId>('dashboard');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lessonXp, setLessonXp] = useState(LESSON_XP);
  /** Empty = TreeCanvas's own default (1600 ms across a step, 1200 within one). */
  const [tweenMs, setTweenMs] = useState('');
  /** A tween in flight; `key` remounts the canvas so every press replays from `from`. */
  const [tween, setTween] = useState<{ from: { level: number; frac: number }; label: string } | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);

  const framing = FRAMINGS.find((f) => f.id === framingId) ?? FRAMINGS[0];
  const { level, frac } = levelFrac(position);
  const at = useMemo(() => ({ position }), [position]);

  const tree = useMemo(
    () => generateTree({ seed, level, frac, health, species, at: { position } }),
    [seed, level, frac, health, species, position],
  );
  const phase = phaseForStep(tree.step);
  const visibleLeaves = tree.leaves.filter((leaf) => leaf.visible).length;
  const xp = Math.round(xpForLevel(level) + frac * stepXp(level));

  const play = (from: { level: number; frac: number }, to: number, label: string) => {
    setPosition(to);
    setTween({ from, label });
    setCanvasKey((k) => k + 1);
  };

  const k = Math.min(MAX_POSITION - 1, level);
  const playLevelUp = () => play({ level: k, frac: LEVELUP_FROM_FRAC }, k + 1, `level-up ${k} → ${k + 1}`);

  const playLesson = () => {
    // One lesson's XP at this level; grows forward, or replays the last
    // lesson when the level is already full.
    const d = Math.max(0, lessonXp) / stepXp(level);
    let fromFrac = frac;
    let toFrac = Math.min(0.999, frac + d);
    if (toFrac - fromFrac < d / 2) {
      toFrac = frac;
      fromFrac = Math.max(0, frac - d);
    }
    play({ level, frac: fromFrac }, level + toFrac, `lesgroei +${lessonXp} XP (${(level + fromFrac).toFixed(3)} → ${(level + toFrac).toFixed(3)})`);
  };

  const nudge = (delta: number) => {
    setTween(null);
    setPosition((p) => Math.min(MAX_POSITION, Math.max(1, Math.round((p + delta) * 4) / 4)));
  };

  const parsedTweenMs = Number(tweenMs);
  const tweenMsProp = tweenMs.trim() !== '' && Number.isFinite(parsedTweenMs) && parsedTweenMs > 0 ? parsedTweenMs : undefined;

  const nextSeed = () => {
    const n = seedCounter + 1;
    setSeedCounter(n);
    setSeed(seedFor(n));
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <h1 className="text-lg font-semibold">Boomlab</h1>
      <p className="text-sm text-slate-500">Alleen in development. Groei v2: positie, tweens en framing op echte grootte.</p>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <aside className="w-full space-y-3 lg:w-80">
          <Field label="Soort">
            <select className={inputClass} value={species} onChange={(e) => setSpecies(e.target.value)}>
              {SPECIES_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Omgeving">
            <select className={inputClass} value={scene} onChange={(e) => setScene(e.target.value)}>
              {SCENE_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dier">
            <select className={inputClass} value={animal} onChange={(e) => setAnimal(e.target.value)}>
              {ANIMAL_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Seed">
            <input className={`${inputClass} font-mono`} value={seed} onChange={(e) => setSeed(e.target.value)} spellCheck={false} />
          </Field>
          <div className="flex gap-2">
            <button type="button" className={buttonClass} onClick={nextSeed}>
              Willekeurige seed
            </button>
            <button type="button" className={buttonClass} onClick={() => setSeed(DEFAULT_SEED)}>
              Standaard
            </button>
          </div>
          <Field label={`Gezondheid ${health.toFixed(2)}`}>
            <input
              type="range"
              className="w-full"
              min={0.3}
              max={1}
              step={0.01}
              value={health}
              onChange={(e) => setHealth(Number(e.target.value))}
            />
          </Field>
          <Field label="Tijd van de dag">
            <select className={inputClass} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay | 'auto')}>
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Positie ${position.toFixed(2)}`}>
            <input
              type="range"
              className="w-full"
              min={1}
              max={MAX_POSITION}
              step={0.01}
              value={position}
              onChange={(e) => {
                setTween(null);
                setPosition(Number(e.target.value));
              }}
            />
          </Field>
          <div className="flex gap-2">
            <input
              type="number"
              className={inputClass}
              min={1}
              max={MAX_POSITION}
              step={0.25}
              value={Number(position.toFixed(3))}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value)) {
                  setTween(null);
                  setPosition(Math.min(MAX_POSITION, Math.max(1, value)));
                }
              }}
            />
            <button type="button" className={buttonClass} onClick={() => nudge(-0.25)}>
              −¼
            </button>
            <button type="button" className={buttonClass} onClick={() => nudge(0.25)}>
              +¼
            </button>
          </div>
          <Field label="Framing">
            <select className={inputClass} value={framingId} onChange={(e) => setFramingId(e.target.value as FramingId)}>
              {FRAMINGS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <button type="button" className={`${buttonClass} w-full`} onClick={playLevelUp}>
              Speel level-up {k} → {k + 1}
            </button>
            <div className="flex items-center gap-2">
              <button type="button" className={`${buttonClass} flex-1`} onClick={playLesson}>
                Speel lesgroei
              </button>
              <input
                type="number"
                aria-label="XP per les"
                className={`${inputClass} w-20`}
                min={1}
                step={1}
                value={lessonXp}
                onChange={(e) => setLessonXp(Math.max(1, Number(e.target.value) || LESSON_XP))}
              />
              <span className="text-sm text-slate-500">XP</span>
            </div>
            <Field label="Tweenduur in ms (leeg = standaard)">
              <input
                type="number"
                className={inputClass}
                min={0}
                step={100}
                placeholder="1600 / 1200"
                value={tweenMs}
                onChange={(e) => setTweenMs(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
              Reduced motion (eindbeeld zonder tween)
            </label>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div
            className={`overflow-hidden border border-slate-200 bg-white ${framing.framing === 'portrait' ? 'rounded-full' : 'rounded-lg'}`}
            style={{ width: framing.width, height: framing.height }}
          >
            <TreeCanvas
              key={canvasKey}
              seed={seed}
              level={level}
              frac={frac}
              at={at}
              from={tween?.from ?? null}
              tweenMs={tweenMsProp}
              onTweenEnd={() => setTween(null)}
              health={health}
              species={species}
              scene={scene}
              animal={animal}
              framing={framing.framing}
              timeOfDay={timeOfDay}
              reducedMotion={reducedMotion}
              className="block h-full w-full"
            />
          </div>

          <dl className="mt-4 grid max-w-xl grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm sm:grid-cols-3">
            <Readout label="positie" value={tree.position.toFixed(3)} />
            <Readout label="stap" value={`${tree.step}${tree.rings > 0 ? ` (+${tree.rings} ringen)` : ''}`} />
            <Readout label="fase" value={`${phase.name} (${phase.id})`} />
            <Readout label="niveau · frac" value={`${level} · ${frac.toFixed(3)}`} />
            <Readout label="xp" value={`${xp}`} />
            <Readout label="grootte" value={tree.growth.toFixed(3)} />
            <Readout label="takken" value={`${tree.branches.length}`} />
            <Readout label="bladeren" value={`${visibleLeaves} / ${tree.leaves.length}`} />
            <Readout label="diepte" value={`${tree.maxDepth}`} />
            <Readout label="bloesem · fruit" value={`${tree.blossoms.length} · ${tree.fruits.length}`} />
            <Readout label="traits" value={tree.traits.join(', ') || '-'} />
            <Readout label="tween" value={tween ? tween.label : '-'} />
          </dl>
        </section>
      </div>
    </main>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
