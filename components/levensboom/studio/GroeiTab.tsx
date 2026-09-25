'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TreeCanvas from '../TreeCanvas';
import { useStableFloor } from '../useStableFloor';
import { STAGES } from '../../../lib/levensboom/stages';
import { allFruits, TRAIT_LABELS, TRAIT_LEVELS, type TreeTrait } from '../../../lib/levensboom/traits';
import { CATALOG } from '../../../lib/levensboom/catalog';
import { levelForStep, STEPS_TOTAL, type GrowthInfo } from '../../../lib/levensboom/growth';
import {
  FLOOR_EXPLAINER,
  growthPill,
  ladderLevelLabel,
  ladderStatus,
  ladderStepLabel,
  MATURING,
  maturingNextLine,
  phaseRangeLabel,
  ringsLabel,
  showsFloorExplainer,
  stepProgress,
  WHOLE_GROWTH,
  xpToNextStepText,
} from '../../../lib/levensboom/growthCopy';
import { PANEL_DEEP, SCENE_BG, TEAL, TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';
import { track } from '../../../lib/analytics';

/** Ladder thumbnails: a portrait disc, big enough for the portrait camera to show growth (32 px and up). */
const THUMB_PX = 44;

/** What arrives at a level, as one line each: traits, fruit and level-gated catalog items. */
type Arrival = { key: string; level: number; label: string };

function arrivalsBetween(fromLevel: number, toLevel: number): Arrival[] {
  if (toLevel < fromLevel) return [];
  const inRange = (at: number) => at >= fromLevel && at <= toLevel;
  const out: Arrival[] = [];
  for (const trait of Object.keys(TRAIT_LEVELS) as TreeTrait[]) {
    // The fruit trait is the first fruit, which the fruit rows already name.
    if (trait !== 'fruit' && inRange(TRAIT_LEVELS[trait])) {
      out.push({ key: `trait:${trait}`, level: TRAIT_LEVELS[trait], label: TRAIT_LABELS[trait] });
    }
  }
  for (const fruit of allFruits()) {
    if (inRange(fruit.level)) out.push({ key: `fruit:${fruit.name}`, level: fruit.level, label: `Vrucht: ${fruit.name.toLowerCase()}` });
  }
  for (const item of CATALOG) {
    if (item.unlock.kind === 'level' && inRange(item.unlock.level)) {
      out.push({ key: `${item.kind}:${item.id}`, level: item.unlock.level, label: item.name });
    }
  }
  return out.sort((a, b) => a.level - b.level);
}

/**
 * The Groei tab: the step ladder (LEVENSBOOM_GROWTH_PLAN.md §9.4).
 *
 * Twenty steps in four named phases, then the Eeuwenoude boom. Each step is a
 * row with a picture of *this reader's* tree at that step, the level at which
 * this account reaches it - with a head start (a growth floor) that is not the
 * step's own number, which is why the step and the level are two labels - and
 * whatever arrives at that level: traits, fruit and the level-gated items that
 * sat in the old stage bands. The next step is a dimmed preview; the ones after
 * it are an empty disc with a "?", so there is still something to find out.
 *
 * The thumbnails are still portraits and only mount once their row scrolls
 * near the view, so opening the tab does not draw twenty trees at once.
 *
 * Drawn for the landscape: literal whites, the accent teal for what is already
 * behind the reader, and TEAL_DEEP under the one chip that carries white type.
 * The whole tab is one PANEL_DEEP: this is a long block of copy on top of the
 * reader's own tree, whose afternoon sky runs to #DFF3F7, and the muted greys
 * of a timeline do not survive a lighter ground than this. It is also why the
 * XP list inside it has no panel of its own - a panel inside a panel is a box
 * in a box, with a picture behind both.
 */
export default function GroeiTab({
  level,
  xp,
  xpTable,
  growth,
  seed,
  species,
  scene,
  onWatchGrowth,
}: {
  level: number;
  xp: number;
  xpTable: { event: string; value: number; label: string }[];
  growth: GrowthInfo;
  seed: string;
  species: string;
  scene: string;
  /** Opens "Bekijk de hele groei"; left out, the button is not shown. */
  onWatchGrowth?: () => void;
}) {
  const floor = useStableFloor(growth.floor);
  const step = growth.step;
  const progress = stepProgress(xp, level, floor);

  // For every step 1..21, the level at which this account stands on it. With
  // a floor a step can take several levels (or several steps one level), so a
  // step's row owns the levels from its own up to the next step's, exclusive.
  const reachLevels = useMemo(
    () => Array.from({ length: STEPS_TOTAL + 1 }, (_, i) => levelForStep(i + 1, floor)),
    [floor],
  );
  const reach = (n: number) => reachLevels[n - 1];

  const reportedRef = useRef(false);
  // Once per mount (plan §13).
  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    track('tree_groei_opened', { level: String(level), step: String(step) });
  }, [level, step]);

  const ancient = STAGES[STAGES.length - 1];
  const ancientFrom = reach(ancient.from);
  const ancientRows: Arrival[] = [
    ...MATURING.map((m) => ({ key: `mature:${m.step}`, level: levelForStep(m.step, floor), label: m.label })),
    ...arrivalsBetween(ancientFrom, Number.POSITIVE_INFINITY),
  ].sort((a, b) => a.level - b.level);
  const nextMaturing = maturingNextLine(step, floor);

  return (
    <div className={`${PANEL_DEEP} space-y-6 p-5`}>
      {/* Where the tree stands, and how far the next step is. */}
      <div>
        <p className="text-sm font-semibold text-white">{growthPill(step)}</p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,.14)' }}
          role="progressbar"
          aria-valuenow={Math.round(progress.frac * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={xpToNextStepText(step, progress.xpToNextStep)}
        >
          <div className="h-full rounded-full" style={{ width: `${progress.frac * 100}%`, backgroundColor: TEAL }} />
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-white/70">{xpToNextStepText(step, progress.xpToNextStep)}</p>
        {showsFloorExplainer(step, floor) && (
          <p className="mt-2 text-xs leading-relaxed text-white/70">{FLOOR_EXPLAINER}</p>
        )}
        {onWatchGrowth && (
          <button
            type="button"
            onClick={onWatchGrowth}
            aria-haspopup="dialog"
            className="mt-3 inline-flex h-9 items-center rounded-btn px-3.5 text-[13px] font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white max-md:h-10"
            style={{ border: '1px solid rgba(255,255,255,.22)' }}
          >
            {WHOLE_GROWTH.open}
          </button>
        )}
        <details className="mt-4 border-t border-white/15 pt-4">
          <summary className="cursor-pointer rounded-md text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white">
            Wat levert XP op?
          </summary>
          <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
            {xpTable.map((row) => (
              <li key={row.event} className="flex items-center justify-between text-xs">
                <span className="text-white/70">{row.label}</span>
                <span className="font-semibold tabular-nums" style={{ color: TEAL_ON_DARK }}>
                  +{row.value}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-white/65">
            {xp} XP totaal. Blijf je een tijd weg, dan hangt je boom er slap bij - hij gaat nooit dood en
            herstelt na één sessie.
          </p>
        </details>
      </div>

      <ol className="relative m-0 list-none space-y-0 border-l border-white/20 p-0 pl-5">
        {STAGES.map((phase) => {
          const reached = step >= phase.from;
          const current = reached && (phase.to === null || step <= phase.to);
          const steps =
            phase.to === null ? [] : Array.from({ length: phase.to - phase.from + 1 }, (_, i) => phase.from + i);

          return (
            <li key={phase.id} className="relative pb-6 last:pb-0">
              <span
                className="absolute -left-[27px] top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: reached ? TEAL_ON_DARK : 'rgba(255,255,255,0.3)',
                  backgroundColor: current ? TEAL_ON_DARK : SCENE_BG,
                }}
                aria-hidden
              />
              <div className="flex items-baseline justify-between gap-3">
                <p className={`text-sm font-semibold ${reached ? 'text-white' : 'text-white/55'}`}>
                  {phase.name}
                  {current && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: TEAL_DEEP }}>
                      Nu
                    </span>
                  )}
                </p>
                <p className="text-xs tabular-nums text-white/60">{phaseRangeLabel(phase.from, phase.to)}</p>
              </div>
              <p className="mt-0.5 text-xs text-white/70">{phase.blurb}</p>

              {steps.length > 0 && (
                <ul className="m-0 mt-2 list-none space-y-1 p-0">
                  {steps.map((n) => (
                    <StepRow
                      key={n}
                      n={n}
                      step={step}
                      percent={progress.percent}
                      reachLevel={reach(n)}
                      // The last step's row keeps the levels up to the first
                      // jaarring; everything after is the Eeuwenoude section's.
                      arrivals={arrivalsBetween(reach(n), reach(n + 1) - 1)}
                      thumb={{ seed, species, scene, floor, position: n === step ? growth.position : n }}
                    />
                  ))}
                </ul>
              )}

              {phase.to === null && (
                <>
                  {reached && (
                    <p className="mt-2 text-xs text-white">
                      <span className="font-semibold">{ringsLabel(growth.rings)}</span>
                      {nextMaturing && <span className="text-white/70"> · {nextMaturing}</span>}
                    </p>
                  )}
                  <ul className="m-0 mt-2 list-none space-y-1 p-0">
                    {ancientRows.map((row) => (
                      <ArrivalRow key={row.key} at={row.level} level={level} label={row.label} />
                    ))}
                  </ul>
                </>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-xs italic leading-relaxed text-white/70">
        &ldquo;Want hij zal zijn als een boom, geplant aan waterbeken, die zijn vrucht geeft op zijn
        tijd.&rdquo;
        <span className="not-italic"> - Psalm 1:3</span>
      </p>
    </div>
  );
}

type ThumbSpec = {
  seed: string;
  species: string;
  scene: string;
  floor: GrowthInfo['floor'];
  position: number;
};

function StepRow({
  n,
  step,
  percent,
  reachLevel,
  arrivals,
  thumb,
}: {
  n: number;
  step: number;
  percent: number;
  reachLevel: number;
  arrivals: Arrival[];
  thumb: ThumbSpec;
}) {
  const done = n < step;
  const here = n === step;
  const known = n <= step;
  return (
    <li className="flex items-center gap-3 py-1">
      <LadderThumb n={n} step={step} reachLevel={reachLevel} spec={thumb} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 text-xs">
          <span className={`font-semibold ${known ? 'text-white' : 'text-white/60'}`}>{ladderStepLabel(n)}</span>
          {/* A future step's level is its status on the right already. */}
          {known && <span className="tabular-nums text-white/55">{ladderLevelLabel(reachLevel)}</span>}
        </p>
        {arrivals.length > 0 && (
          <p className={`mt-0.5 text-[11.5px] leading-snug ${known ? 'text-white/80' : 'text-white/55'}`}>
            {arrivals
              .map((a) => (a.level === reachLevel ? a.label : `${a.label} (niveau ${a.level})`))
              .join(' · ')}
          </p>
        )}
      </div>
      <span
        className={`flex-shrink-0 text-xs font-semibold tabular-nums ${done || here ? '' : 'text-white/50'}`}
        style={{ color: done || here ? TEAL_ON_DARK : undefined }}
      >
        {ladderStatus(n, { step, percent }, reachLevel)}
      </span>
    </li>
  );
}

/**
 * One rung's picture. Reached steps and the current one are the reader's own
 * tree at that step; the next one is the same tree dimmed to a colourless
 * preview; later ones are an empty disc with a "?".
 *
 * The canvas mounts once the row comes within a screen of the view and stays
 * mounted after, so scrolling back does not redraw it.
 */
function LadderThumb({ n, step, reachLevel, spec }: { n: number; step: number; reachLevel: number; spec: ThumbSpec }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [show, setShow] = useState(false);
  const hidden = n > step + 1;

  useEffect(() => {
    if (hidden || show) return;
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setShow(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setShow(true);
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hidden, show]);

  const here = n === step;
  const next = n === step + 1;
  const ring = here ? TEAL_ON_DARK : 'rgba(255,255,255,0.18)';

  return (
    <span
      ref={ref}
      aria-hidden
      className="relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: THUMB_PX, height: THUMB_PX, boxShadow: `0 0 0 ${here ? 2 : 1}px ${ring}` }}
    >
      {hidden ? (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/45" style={{ border: '1px dashed rgba(255,255,255,0.3)', borderRadius: '9999px' }}>
          ?
        </span>
      ) : show ? (
        <span className="block h-full w-full" style={next ? { filter: 'grayscale(1) brightness(0.6)', opacity: 0.55 } : undefined}>
          <TreeCanvas
            seed={spec.seed}
            level={reachLevel}
            frac={0}
            floor={spec.floor}
            at={{ position: spec.position, step: n }}
            species={spec.species}
            scene={spec.scene}
            framing="portrait"
            still
            className="block h-full w-full"
            ariaLabel=""
          />
        </span>
      ) : (
        <span className="block h-full w-full bg-white/[0.06]" />
      )}
    </span>
  );
}

function ArrivalRow({ at, level, label }: { at: number; level: number; label: string }) {
  const done = level >= at;
  return (
    <li className="flex items-baseline justify-between gap-3 text-xs">
      <span className={done ? 'text-white/90' : 'text-white/55'}>{label}</span>
      <span
        className={`flex-shrink-0 font-semibold tabular-nums ${done ? '' : 'text-white/50'}`}
        style={{ color: done ? TEAL_ON_DARK : undefined }}
      >
        {done ? 'Behaald' : `Niveau ${at}`}
      </span>
    </li>
  );
}
