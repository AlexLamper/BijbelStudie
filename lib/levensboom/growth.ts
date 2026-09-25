import { levelForXp, xpForLevel } from './client';
import { phaseForStep, STAGES, type StageId } from './stages';
import { LEGACY_EQUIV } from './growthRef';
import type { TreeForm } from './species';

/**
 * Growth v2: how far along a tree is, and the table that turns that into wood.
 *
 * Plan: LEVENSBOOM_GROWTH_PLAN.md §4-§5. Contract: docs/levensboom-spec.md.
 * Mirror: `lib/features/levensboom/domain/growth.dart` - every function and
 * every number in this file exists there too (except `LEGACY_EQUIV`, which is
 * server-only: clients get the floor ready-made).
 *
 * Three numbers describe a tree:
 *
 *   raw position  r = level + frac            frac = xpIntoLevel / xpForNextLevel
 *   position      e = taper(r, floor)         = r for an account without a floor
 *   step          k = floor(taper(level))     changes only at a level-up
 *
 * `k` decides the topology (which branches and leaves exist), `e` the
 * continuous size (lengths, widths, the camera). Steps 1-20 are the named
 * growth; past 20 the tree matures and every step is a jaarring.
 *
 * The design numbers (everything in `FORM_TABLES`, `GEOMETRY`, the fill
 * curves) are the designer's; the functions are the engine's. Topology may
 * only ever depend on integers and on these literals combined with plain
 * arithmetic - never on a trig or pow result - so both platforms agree on
 * what exists to the last leaf.
 */

export const GROWTH_MODEL = 2;
export const STEPS_TOTAL = 20;

/** A legacy account's head start: at raw position `from` the tree is at `to`. */
export type GrowthFloor = { from: number; to: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals: number): number {
  const m = 10 ** decimals;
  return Math.round(value * m) / m;
}

/** Floating-point slack for "is this position a whole step". */
const STEP_EPSILON = 1e-9;

// ---------------------------------------------------------------------------
// Position, taper, step
// ---------------------------------------------------------------------------

export function rawPosition(level: number, frac: number): number {
  return Math.max(1, Math.floor(level)) + clamp(Number.isFinite(frac) ? frac : 0, 0, 1);
}

export function isFloor(floor: GrowthFloor | null | undefined): floor is GrowthFloor {
  return (
    !!floor &&
    Number.isFinite(floor.from) &&
    Number.isFinite(floor.to) &&
    floor.from >= 1 &&
    floor.to > floor.from
  );
}

/** Where the head start has fully tapered off: step 20, or three steps past the floor. */
export function floorEnd(floor: GrowthFloor): number {
  return Math.max(STEPS_TOTAL, floor.to + 3);
}

/**
 * Raw position to effective position (plan §5.5).
 *
 * taper(from) = to, continuous, strictly increasing, never below r, and equal
 * to r from `floorEnd` on. Below `from` (XP only ever grows, so this is a
 * defensive branch) the head start is simply added.
 */
export function taper(r: number, floor: GrowthFloor | null | undefined): number {
  if (!isFloor(floor)) return r;
  const end = floorEnd(floor);
  if (r >= end) return r;
  if (r <= floor.from) return r + (floor.to - floor.from);
  return floor.to + ((r - floor.from) * (end - floor.to)) / (end - floor.from);
}

/** The inverse of `taper`: the raw position at which the tree reaches `e`. */
export function untaper(e: number, floor: GrowthFloor | null | undefined): number {
  if (!isFloor(floor)) return e;
  const end = floorEnd(floor);
  if (e >= end) return e;
  if (e <= floor.to) return e - (floor.to - floor.from);
  return floor.from + ((e - floor.to) * (end - floor.from)) / (end - floor.to);
}

export function effectivePosition(level: number, frac: number, floor?: GrowthFloor | null): number {
  return taper(rawPosition(level, frac), floor);
}

/** The structural step: which branches exist. Changes only at a level-up. */
export function structuralStep(level: number, floor?: GrowthFloor | null): number {
  return Math.max(1, Math.floor(taper(Math.max(1, Math.floor(level)), floor) + STEP_EPSILON));
}

/** The first level at which an account with this floor stands on `step`. */
export function levelForStep(step: number, floor?: GrowthFloor | null): number {
  const target = Math.max(1, Math.floor(step));
  let level = Math.max(1, Math.ceil(untaper(target, floor) - STEP_EPSILON));
  // untaper is exact up to rounding; settle the last ulp against the forward map.
  while (level > 1 && structuralStep(level - 1, floor) >= target) level -= 1;
  while (structuralStep(level, floor) < target) level += 1;
  return level;
}

export function ringsForStep(step: number): number {
  return Math.max(0, Math.floor(step) - STEPS_TOTAL);
}

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

/** level + frac under the XP curve (Appendix A). */
export function positionForXp(xp: number): number {
  const safe = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const level = levelForXp(safe);
  const floorXp = xpForLevel(level);
  const span = Math.max(1, xpForLevel(level + 1) - floorXp);
  return level + clamp((safe - floorXp) / span, 0, 1);
}

// ---------------------------------------------------------------------------
// The never-shrink floor (plan §5)
// ---------------------------------------------------------------------------

function interpolate(table: readonly (readonly [number, number])[], x: number): number {
  if (table.length === 0) return x;
  if (x <= table[0][0]) return table[0][1] + (x - table[0][0]);
  for (let i = 1; i < table.length; i += 1) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  const [xl, yl] = table[table.length - 1];
  return yl + (x - xl);
}

/**
 * The v2 position whose reference tree is as tall as a v1 tree was at raw
 * position `p`. Calibrated (median eik, 64 seeds) by `npm run tree:calibrate`.
 */
export function legacyEquivalent(p: number): number {
  return interpolate(LEGACY_EQUIV, p);
}

/** The floor for an account whose XP was `legacyXp` at launch; null when none is needed. */
export function floorForLegacyXp(legacyXp: number | null | undefined): GrowthFloor | null {
  if (legacyXp == null || !Number.isFinite(legacyXp) || legacyXp <= 0) return null;
  const from = round(positionForXp(legacyXp), 3);
  const to = round(legacyEquivalent(from), 3);
  return to > from + 0.001 ? { from, to } : null;
}

// ---------------------------------------------------------------------------
// The growth block the API serves (plan §6.1)
// ---------------------------------------------------------------------------

export type GrowthPhase = {
  id: StageId;
  name: string;
  index: number;
  fromStep: number;
  toStep: number | null;
  blurb: string;
};

export type GrowthInfo = {
  model: typeof GROWTH_MODEL;
  /** Effective position `e`, 4 decimals. */
  position: number;
  step: number;
  stepsTotal: typeof STEPS_TOTAL;
  rings: number;
  phase: GrowthPhase;
  nextPhase: { id: StageId; name: string; fromStep: number } | null;
  floor: GrowthFloor | null;
};

export function growthInfo(level: number, frac: number, floor?: GrowthFloor | null): GrowthInfo {
  const f = isFloor(floor) ? floor : null;
  const step = structuralStep(level, f);
  const phase = phaseForStep(step);
  const next = STAGES[phase.index + 1] ?? null;
  return {
    model: GROWTH_MODEL,
    position: round(effectivePosition(level, frac, f), 4),
    step,
    stepsTotal: STEPS_TOTAL,
    rings: ringsForStep(step),
    phase: {
      id: phase.id,
      name: phase.name,
      index: phase.index,
      fromStep: phase.from,
      toStep: phase.to,
      blurb: phase.blurb,
    },
    nextPhase: next ? { id: next.id, name: next.name, fromStep: next.from } : null,
    floor: f,
  };
}

// ---------------------------------------------------------------------------
// The design table (the design pass, docs/levensboom-spec.md §10)
// ---------------------------------------------------------------------------

export type FormTable = {
  /** Continuous size 0..1 at steps 1..20 (index = step - 1); linear in between. */
  size: readonly number[];
  /** Trunk width 0..1 at steps 1..20, on its own slower curve: a seedling is slender, girth comes late. */
  width: readonly number[];
  /** Where size tends to past step 20 (maturing, asymptotic). */
  sizeMax: number;
  /** Steps past 20 at which half the remaining size is reached. */
  sizeMatureHalf: number;
  /**
   * Base birth step per depth (index = depth). Branching: the depth table;
   * nodes one depth past its end are the maturing twigs (`twigFrom`, by
   * chance), deeper ones never exist. Conical: the leader schedule - segment
   * d of the spine, and the tier (side whorl) at its foot, appear at birth[d].
   */
  birth: readonly number[];
  /** A node is born up to `floor(birthJitter * spread)` steps late, per depth. */
  birthSpread: readonly number[];
  /** Extra steps before a third (middle) child can appear. */
  thirdDelay: number;
  /** Chance of a third child at step k (index = k - 1, the last value holds). Non-decreasing. */
  thirdChance: readonly number[];
  /**
   * Maturing twigs: a tip at the depth past `birth` forks from step `twigFrom`
   * once its parent's reserve draw (slot 8) falls under twigChance[k - twigFrom]
   * (the last value holds). Non-decreasing, so a twig that exists keeps
   * existing. Branching only; a twin at `twinMaxDepth` uses the same rule.
   */
  twigFrom: number;
  twigChance: readonly number[];
  /** Leaves on a tip at step k before `leafCountMul` (index = k - 1, the last value holds). */
  leavesPerTip: readonly number[];
  /** A maturing twig carries this many leaves fewer than a tip (fine outer growth). */
  twigLeafDrop: number;
  /** Steps at which every tip gains one more leaf (maturing density). */
  leafBonusAt: readonly number[];
  /** How far leaves scatter from their tip, as a share of the branching form's reach. */
  leafScatter: number;
  /** Steps a node keeps its full tuft after its first child appears. */
  innerKeep: number;
  /** After that, a forked node at depth `innerMinDepth`..`innerMaxDepth` keeps its first `innerLeaves` leaves for good. */
  innerLeaves: number;
  innerMinDepth: number;
  innerMaxDepth: number;
  /** Seed leaves: how many, and the step at which they are gone. */
  cotyledons: number;
  cotyledonDeath: number;
  /**
   * Seedling leaf whorls on the stem: whorl j (1-based) of `pairLeaves` leaves
   * appears at step j + 1 and is gone at `pairDeath - (seedlingPairs - j)`, so
   * the lowest whorl falls first and the last one at `pairDeath`.
   */
  seedlingPairs: number;
  pairLeaves: number;
  pairDeath: number;
  /** Conical only: each spine segment's length as a share of the one below it. */
  leaderLen: number;
  /** Conical only: a tier's root length as a share of the trunk, and how much it shortens up the spine (times min(1, segment / conicalDepth)). */
  tierLen: number;
  tierTaper: number;
  /** Conical only: a tier branch forks `tierFork[t]` steps after the tier was born (t = its depth inside the tier), up to `tierForkSpread - 1` late. */
  tierFork: readonly number[];
  tierForkSpread: number;
  /** Conical only: a tier born at or before this step forks twice; later tiers fork once (the crown stays pointed). */
  tierDeepUntil: number;
  /** Palm only: the step each trunk segment appears (index = segment). */
  palmSegments: readonly number[];
  /** Palm only: fronds at step k (index = k - 1, the last value holds, before `leafBonusAt`). */
  palmFronds: readonly number[];
};

const SIZE_V2 = [
  0.0, 0.064, 0.115, 0.162, 0.207, 0.251, 0.293, 0.334, 0.374, 0.413, 0.452, 0.49, 0.528, 0.565, 0.602, 0.638,
  0.674, 0.71, 0.745, 0.78,
] as const;

/** About size^1.4: a slender scheut, a young tree that is still slim, and most of the girth after step 12. */
const WIDTH_V2 = [
  0.0, 0.016, 0.04, 0.065, 0.095, 0.125, 0.16, 0.195, 0.23, 0.27, 0.31, 0.35, 0.39, 0.43, 0.47, 0.515, 0.56, 0.605,
  0.65, 0.7,
] as const;

/** Rises through the named growth; flat from step 20 (maturing adds twigs, not limbs). */
const THIRD_CHANCE_V2 = [
  0.15, 0.163, 0.173, 0.182, 0.191, 0.2, 0.209, 0.217, 0.225, 0.233, 0.24, 0.248, 0.256, 0.263, 0.27, 0.278, 0.285,
  0.292, 0.299, 0.306,
] as const;

/** Conifers fork three ways far less often: their tiers are shelves, not crowns. */
const THIRD_CHANCE_CONICAL = [
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1,
] as const;

/**
 * A young tree's few twigs carry big tufts (a sapling is all leaf); a grown
 * tree gets full through more tips, not through more leaves per tip. Step 20
 * adds one more leaf to every tip: the "volgroeid" finale.
 */
const LEAVES_V2 = [2, 2, 2, 2, 4.4, 4.6, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 4.9, 5.85] as const;

/** Needle tufts: fewer per tip, but every forked tier node keeps most of its tuft. */
const LEAVES_CONICAL = [2, 2, 2, 2, 3, 3, 3.2, 3.4, 3.6, 3.8, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4.4] as const;

/** Share of tips that have forked into maturing twigs, from `twigFrom` (index = k - twigFrom): 30 % by step 30, 33 % by 40, 40 % by 60. */
const TWIG_CHANCE_V2 = [
  0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24, 0.27, 0.3, 0.303, 0.306, 0.309, 0.312, 0.315, 0.318, 0.321, 0.324,
  0.327, 0.33, 0.3335, 0.337, 0.3405, 0.344, 0.3475, 0.351, 0.3545, 0.358, 0.3615, 0.365, 0.3685, 0.372, 0.3755, 0.379,
  0.3825, 0.386, 0.3895, 0.393, 0.3965, 0.4,
] as const;

const NO_PALM = { palmSegments: [], palmFronds: [] } as const;
const NO_CONICAL = { leaderLen: 1, tierLen: 0, tierTaper: 0, tierFork: [], tierForkSpread: 1, tierDeepUntil: 0 } as const;

export const FORM_TABLES: Record<TreeForm, FormTable> = {
  branching: {
    size: SIZE_V2,
    width: WIDTH_V2,
    sizeMax: 1.05,
    sizeMatureHalf: 12,
    // Windows: d1 5-6, d2 6-7, d3 8-10, d4 11-13, d5 14-19 - some depth is
    // being born at every step from 5 to 19; step 20 adds a leaf to every tip.
    birth: [1, 5, 6, 8, 11, 14],
    birthSpread: [0, 2, 2, 3, 3, 6],
    thirdDelay: 2,
    thirdChance: THIRD_CHANCE_V2,
    twigFrom: 21,
    twigChance: TWIG_CHANCE_V2,
    leavesPerTip: LEAVES_V2,
    twigLeafDrop: 1,
    leafBonusAt: [],
    leafScatter: 1,
    innerKeep: 3,
    innerLeaves: 2,
    innerMinDepth: 2,
    innerMaxDepth: 4,
    cotyledons: 2,
    cotyledonDeath: 5,
    seedlingPairs: 5,
    pairLeaves: 2,
    pairDeath: 11,
    ...NO_CONICAL,
    ...NO_PALM,
  },
  conical: {
    size: SIZE_V2,
    width: WIDTH_V2,
    sizeMax: 1.05,
    sizeMatureHalf: 12,
    // The leader: a segment and a whorl at each of these steps.
    birth: [1, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 24, 28, 34],
    birthSpread: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    thirdDelay: 2,
    thirdChance: THIRD_CHANCE_CONICAL,
    twigFrom: 99,
    twigChance: [0],
    leavesPerTip: LEAVES_CONICAL,
    twigLeafDrop: 0,
    leafBonusAt: [],
    leafScatter: 0.5,
    innerKeep: 2,
    innerLeaves: 3,
    innerMinDepth: 1,
    innerMaxDepth: 99,
    cotyledons: 5,
    cotyledonDeath: 6,
    seedlingPairs: 3,
    pairLeaves: 4,
    pairDeath: 10,
    leaderLen: 0.82,
    tierLen: 1.1,
    tierTaper: 0.8,
    tierFork: [2, 4],
    tierForkSpread: 2,
    tierDeepUntil: 12,
    ...NO_PALM,
  },
  palm: {
    size: SIZE_V2,
    width: WIDTH_V2,
    sizeMax: 1.05,
    sizeMatureHalf: 12,
    birth: [1],
    birthSpread: [0],
    thirdDelay: 0,
    thirdChance: [0],
    twigFrom: 99,
    twigChance: [0],
    leavesPerTip: [0],
    twigLeafDrop: 0,
    leafBonusAt: [25, 30, 35],
    leafScatter: 1,
    innerKeep: 0,
    innerLeaves: 0,
    innerMinDepth: 0,
    innerMaxDepth: 0,
    cotyledons: 0,
    cotyledonDeath: 1,
    seedlingPairs: 0,
    pairLeaves: 0,
    pairDeath: 1,
    ...NO_CONICAL,
    palmSegments: [1, 7, 8, 9, 10, 12, 14, 16, 18],
    palmFronds: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16],
  },
};

/** Geometry constants shared by every form. */
export const GEOMETRY = {
  /** New wood appears at this share of its length, then elongates over `rampSteps`. */
  minBud: 0.25,
  rampSteps: 1.5,
  /** Trunk: length (4 + 36·size) and width (0.8 + 6.2·width), times the species multipliers. */
  trunkLenBase: 4,
  trunkLenGrow: 36,
  trunkWidthBase: 0.8,
  trunkWidthGrow: 6.2,
  /** Leaf size by the depth of its tip: a sapling's shallow shoots carry big leaves, the outer twigs of a crown small ones. */
  leafSizeDepthBase: 1.5,
  leafSizeDepthDrop: 0.07,
  leafSizeDepthMin: 0.9,
  /** Green stem to bark: the trunk starts turning at `woodStart`, other wood `woodDelay` steps after it appears. */
  woodStart: 3,
  woodDelay: 1,
  woodSteps: 3,
  /** How much of a species' `leafCountMul` reaches the leaves per tip (the rest would blow the leaf budget). */
  leafMulWeight: 0.5,
  /** Degrees of seeded jitter per child slot. */
  slotJitter: 8,
  /** Degrees of seeded trunk lean, times the species' `leanMul`. */
  lean: 6,
  /** A child is born at least this many steps after its parent, so a late limb grows out depth by depth instead of popping in whole. */
  childDelay: 1,
  /** Droop (wilt + weeping) grows with depth up to this depth. */
  droopDepth: 5,
  /** Conical tiers shorten up the spine until this segment. */
  conicalDepth: 12,
  /** Conical: the leader's width share per segment, its angle jitter share, and a tier root's width share of its spine segment. */
  leaderWidth: 0.8,
  leaderJitter: 0.35,
  tierWidth: 0.5,
  /** Conical: a tier leaves the spine at ±spread × tierAngle degrees - the ceder's shelves lie nearly flat, the cipres' narrow spread makes it a column. */
  tierAngle: 2.5,
  /** Conical: a tier branch's children - length and width share, and the fan (share of spread) and jitter share they open with. */
  tierChildLen: 0.66,
  tierChildWidth: 0.66,
  tierChildSpread: 0.55,
  tierChildJitter: 0.6,
  /** Maturing girth: every width grows by this share per step past 20, for this many steps. */
  matureGirth: 0.015,
  matureGirthSteps: 20,
  /** A blossom never outgrows this leaf size (a seedling's leaves are bigger than a crown's). */
  blossomMaxSize: 0.9,
  /** A palm's date bunch, as a fruit size (each is drawn as a cluster of three). */
  dateSize: 0.95,
  /** Twin trunk (trait `twin`): offset, angle, length and width share, and how fast its depths follow. */
  twinOffset: 6,
  twinAngle: 14,
  twinLen: 0.62,
  twinWidth: 0.55,
  twinDepthSteps: 1,
  /** A twin node is born up to `twinBirthSpread - 1` steps late. */
  twinBirthSpread: 2,
  twinMaxDepth: 3,
} as const;

/**
 * The seedling (steps 1-6, plan §4.4). Seed leaves sit where the step-1 stem
 * ended and stay at that height while the stem grows past them; leaf pair j
 * appears at step j + 1, at `pairHeight` of the stem's length at that step.
 * Angles are degrees off the stem's heading.
 */
export const SEEDLING = {
  cotyledonAngle: 58,
  /** More than two seed leaves (a conifer's whorl) fan evenly over ±cotyledonFan. */
  cotyledonFan: 70,
  cotyledonDistance: 1.4,
  cotyledonSize: 1.6,
  /** Seed leaves shrink to `cotyledonFadeMin` of their size over the last `cotyledonFadeSteps` positions before `cotyledonDeath` (they yellow in paint). */
  cotyledonFadeSteps: 2.5,
  cotyledonFadeMin: 0.4,
  /** A whorl's leaves fan evenly over ±pairAngle off the stem, each nudged by its own jitter. */
  pairAngle: 50,
  pairAngleJitter: 15,
  pairDistance: 0.9,
  pairSize: 1.3,
  pairSizeJitter: 0.4,
  pairHeight: 0.92,
  /** A whorl shrinks to `pairFadeMin` over the last `pairFadeSteps` positions before it falls. */
  pairFadeSteps: 2,
  pairFadeMin: 0.45,
  /** A palm's first segment stays a stub (`palmEmergeMin` of its length) until it emerges over these steps. */
  palmEmergeSteps: 6,
  palmEmergeMin: 0.15,
} as const;

/**
 * Where palm frond i sits in the fan, -1..1 (times 95°). A fixed order, so a
 * new frond fills a gap and the fronds already there never re-fan.
 */
export const PALM_FROND_FAN: readonly number[] = [
  -0.3, 0.3, -0.75, 0.75, 0, -0.55, 0.55, -1, 1, -0.15, 0.15, -0.9, 0.9, -0.4, 0.4, 0.05,
];

/** Render-only maturing details, by position (plan §4.5). Girth and twigs are geometry: `girthAt`, `twigChanceAt`. */
export const MATURE = { knotsFrom: 22, mossFrom: 26, flareFrom: 30 } as const;

function tableAt(table: readonly number[], step: number): number {
  if (table.length === 0) return 0;
  return table[clamp(Math.floor(step), 1, table.length) - 1];
}

/** A table that starts at step `from` (index = step - from); 0 before it, the last value after it. */
function tableFrom(table: readonly number[], step: number, from: number): number {
  if (table.length === 0 || step < from) return 0;
  return table[Math.min(table.length - 1, Math.floor(step) - from)];
}

export function twigChanceAt(form: TreeForm, step: number): number {
  const t = FORM_TABLES[form];
  return tableFrom(t.twigChance, step, t.twigFrom);
}

/** Maturing girth: the width factor at position e (1 up to step 20). */
export function girthAt(e: number): number {
  return 1 + GEOMETRY.matureGirth * clamp(e - STEPS_TOTAL, 0, GEOMETRY.matureGirthSteps);
}

/** The step whorl j (1-based) of the seedling falls. */
export function pairDeath(form: TreeForm, j: number): number {
  const t = FORM_TABLES[form];
  return t.pairDeath - (t.seedlingPairs - j);
}

/** Size factor of a temporary leaf that falls at `death`, at position e: 1 until `fadeSteps` before, then down to `fadeMin`. */
export function fadeAt(e: number, death: number, fadeSteps: number, fadeMin: number): number {
  const left = clamp((death - e) / fadeSteps, 0, 1);
  return fadeMin + (1 - fadeMin) * left;
}

function curveWithTail(table: readonly number[], e: number, max: number, half: number): number {
  const n = table.length;
  const p = Math.max(1, e);
  if (p >= n) {
    const top = table[n - 1];
    const past = p - n;
    return top + (max - top) * (past / (past + half));
  }
  const i = Math.floor(p);
  const a = table[i - 1];
  const b = table[i];
  return a + (b - a) * (p - i);
}

/** Continuous size 0..sizeMax at position e. */
export function sizeAt(form: TreeForm, e: number): number {
  const t = FORM_TABLES[form];
  return curveWithTail(t.size, e, t.sizeMax, t.sizeMatureHalf);
}

/** Continuous trunk width share at position e; past step 20 it tends to `sizeMax` like size does (girth on top: `girthAt`). */
export function widthAt(form: TreeForm, e: number): number {
  const t = FORM_TABLES[form];
  return curveWithTail(t.width, e, t.sizeMax, t.sizeMatureHalf);
}

/** Leaf size factor for a tip at `depth`. */
export function leafSizeAtDepth(depth: number): number {
  return Math.max(GEOMETRY.leafSizeDepthMin, GEOMETRY.leafSizeDepthBase - GEOMETRY.leafSizeDepthDrop * depth);
}

/** Size at a whole step: the only size topology may read. A literal, so exact on both platforms. */
export function sizeAtStep(form: TreeForm, step: number): number {
  const t = FORM_TABLES[form];
  return tableAt(t.size, Math.min(step, t.size.length));
}

export function thirdChanceAt(form: TreeForm, step: number): number {
  return tableAt(FORM_TABLES[form].thirdChance, step);
}

export function bonusLeaves(form: TreeForm, step: number): number {
  let n = 0;
  for (const at of FORM_TABLES[form].leafBonusAt) if (step >= at) n += 1;
  return n;
}

export function leavesPerTip(form: TreeForm, step: number, leafCountMul: number, twig = false): number {
  const t = FORM_TABLES[form];
  const base = tableAt(t.leavesPerTip, step);
  const mul = 1 + (leafCountMul - 1) * GEOMETRY.leafMulWeight;
  return Math.max(2, Math.round(base * mul) - (twig ? t.twigLeafDrop : 0)) + bonusLeaves(form, step);
}

export function palmFronds(step: number): number {
  return tableAt(FORM_TABLES.palm.palmFronds, step) + bonusLeaves('palm', step);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** How far a node born at step `birth` has elongated at position e. `minBud` at birth, 1 after `rampSteps`. */
export function ramp(e: number, birth: number): number {
  const t = clamp((e - birth) / GEOMETRY.rampSteps, 0, 1);
  return GEOMETRY.minBud + (1 - GEOMETRY.minBud) * smoothstep(t);
}

// ---------------------------------------------------------------------------
// Camera (plan §4.8)
// ---------------------------------------------------------------------------

/** Scene framing: on-screen tree height as a share of the height above the earth band, steps 1..20. */
export const FILL_SCENE = [
  0.22, 0.279, 0.322, 0.362, 0.398, 0.433, 0.467, 0.499, 0.53, 0.561, 0.591, 0.62, 0.649, 0.678, 0.706, 0.733, 0.76,
  0.787, 0.814, 0.84,
] as const;

/** Portrait framing (discs from 32 px up): the same idea, fuller. */
export const FILL_PORTRAIT = [
  0.6, 0.63, 0.653, 0.673, 0.692, 0.71, 0.727, 0.744, 0.76, 0.776, 0.791, 0.807, 0.822, 0.836, 0.851, 0.865, 0.879,
  0.893, 0.906, 0.92,
] as const;

/** Below this many pixels a portrait keeps fitting its own bounds: legibility beats the growth story. */
export const PORTRAIT_FIT_BELOW_PX = 32;

function curveAt(table: readonly number[], e: number): number {
  const n = table.length;
  const p = clamp(e, 1, n);
  const i = Math.min(n - 1, Math.floor(p));
  const a = table[i - 1];
  const b = table[Math.min(n - 1, i)];
  return a + (b - a) * (p - i);
}

export function fillScene(e: number): number {
  return curveAt(FILL_SCENE, e);
}

export function fillPortrait(e: number): number {
  return curveAt(FILL_PORTRAIT, e);
}
