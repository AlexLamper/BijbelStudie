import { fnv1a32, nodeDraws } from './rng';
import { fruitCount, fruitLevel, hasTrait, traitsForLevel, TRAIT_LEVELS, type TreeTrait } from './traits';
import { DEFAULT_SPECIES, isSpeciesId, SPECIES, type SpeciesId, type SpeciesParams, type TreeForm } from './species';
import {
  effectivePosition,
  fadeAt,
  FORM_TABLES,
  GEOMETRY,
  girthAt,
  GROWTH_MODEL,
  isFloor,
  leafSizeAtDepth,
  leavesPerTip,
  pairDeath,
  PALM_FROND_FAN,
  palmFronds,
  ramp,
  ringsForStep,
  SEEDLING,
  sizeAt,
  sizeAtStep,
  structuralStep,
  thirdChanceAt,
  twigChanceAt,
  widthAt,
  type GrowthFloor,
} from './growth';
import { phaseForStep, type StageId } from './stages';

/**
 * The tree generator, growth v2: seed, position and species in, a scene graph out.
 *
 * Pure. No DOM, no canvas, no clock - the renderers (`TreeCanvas.tsx`,
 * `svg.ts`) turn this into pixels and the app's `tree_generator.dart` produces
 * the identical graph from the identical inputs. Season, time of day, scene
 * and animal are deliberately *not* inputs.
 *
 * What makes it grow instead of morph (plan §4.3):
 * - Every node draws from its own seeded stream (`nodeRng(seed, path)`), a
 *   fixed vector of `DRAWS` values whether it uses them or not.
 * - A node exists from its birth step on and never disappears; it only gets
 *   longer and thicker. Only seed leaves, seedling leaf pairs and a tip's own
 *   leaves (after it has grown children for `innerKeep` steps) are temporary.
 * - Topology (what exists) depends only on the structural step `k`, integers,
 *   table literals and draws. The position `e` and `frac` only feed arithmetic.
 * - Angles are fixed per path; health droops them on top.
 *
 * Contract: docs/levensboom-spec.md §3-§4. Growth table: `growth.ts`.
 */

export type Branch = {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  w0: number;
  w1: number;
  depth: number;
  /** Stable id ("T", "T01", "W2" ...): a branch keeps its path, angle and anchor for life. */
  path: string;
  /** The step this branch appeared at. */
  birth: number;
  /** 0 = green stem, 1 = bark: the share of the branch, from its base up, that has turned woody. */
  wood: number;
};

export type LeafKind = 'leaf' | 'cotyledon' | 'seedling' | 'frond';

export type Leaf = {
  x: number;
  y: number;
  angle: number;
  size: number;
  /** 0..1 wind offset, so the canopy shimmers instead of pulsing as one block. */
  phase: number;
  /** 0..1; the leaves with the highest values are the ones a wilting tree sheds. */
  hardiness: number;
  /** Rank by (birth, path): older leaves open first as `frac` rises. */
  bloomOrder: number;
  /** The branch depth this leaf hangs from. */
  depth: number;
  visible: boolean;
  /** False while the leaf is still a bud - the in-level XP progress made visual. */
  open: boolean;
  /** Stable id ("T01L2", "C0", "S2L1", "PF3"), for tweening between two positions. */
  path: string;
  /** The step this leaf appeared at. */
  birth: number;
  kind: LeafKind;
  /**
   * 1 = fresh, 0 = about to fall: seed leaves and seedling whorls run this
   * down over their last positions (their size shrinks with it; a renderer
   * fades them too, `leafFadeAlpha` in paint.ts). Always 1 on crown leaves.
   */
  fade: number;
};

export type Ornament = { x: number; y: number; size: number; index: number; path: string };

/**
 * What the tree actually occupies, so a renderer can guard its frame.
 * Always includes the ground line plus a band of earth under it.
 */
export type TreeBounds = { minX: number; maxX: number; minY: number; maxY: number };

export type TreeScene = {
  model: typeof GROWTH_MODEL;
  branches: Branch[];
  leaves: Leaf[];
  blossoms: Ornament[];
  fruits: Ornament[];
  /** Where a bird or a dove sits; null while the crown has no twig that can hold one. */
  perch: { x: number; y: number } | null;
  bounds: TreeBounds;
  traits: TreeTrait[];
  /** Continuous size 0..~0.95 at `position` (the v1 name, kept for the renderers). */
  growth: number;
  /** The deepest branch depth that exists. */
  maxDepth: number;
  level: number;
  frac: number;
  health: number;
  species: SpeciesId;
  form: TreeForm;
  /** Effective position e (size). */
  position: number;
  /** Structural step k (topology). */
  step: number;
  phase: StageId;
  rings: number;
  floor: GrowthFloor | null;
};

export type TreeInput = {
  seed: string;
  level: number;
  /** xpIntoLevel / xpForNextLevel, 0..1. */
  frac: number;
  /** 0.3..1 from lib/levensboom/health.ts. */
  health?: number;
  /** Defaults to `eik`, which is the shape every account had before species existed. */
  species?: SpeciesId | string | null;
  /** A legacy account's growth floor (plan §5), from the API. */
  floor?: GrowthFloor | null;
  /**
   * Render at this position (and step, default floor(position)) instead of the
   * one level/frac/floor give. For the Groei ladder and the design tooling;
   * traits and fruit still follow `level`.
   */
  at?: { position: number; step?: number } | null;
};

export const GROUND_Y = 88;
export const TRUNK_X = 50;

/** How much earth the bounds include under the ground line. */
export const GROUND_PAD = 8;

/** @deprecated v1 camera minimums; the v2 camera (`camera.ts`) frames by position. */
export const MIN_SCENE_HEIGHT = 26;
/** @deprecated see MIN_SCENE_HEIGHT. */
export const MIN_SCENE_WIDTH = 34;

/** Fruit hangs from a twig but must not inherit a frond's or a fig leaf's size. */
export const MAX_FRUIT_SIZE = 1.6;

/**
 * Safety nets. The growth table keeps every species, seed and step up to 60
 * under 80 % of these (tested); if one ever binds, the traversal is
 * breadth-first by path, so it cuts the newest wood and never old wood.
 */
export const MAX_BRANCHES = 900;
export const MAX_LEAVES = 1400;

/** Values per node stream: 0 curve · 1 spread · 2 thirdU · 3-5 jitter per child slot · 6 lenJitter · 7 birthJitter · 8 twigU · 9 reserve. */
export const DRAWS = 10;
/** Values per leaf stream: 0 angle · 1 distance · 2 size · 3 phase · 4 hardiness. */
export const LEAF_DRAWS = 5;

const CURVE = 0;
const SPREAD = 1;
const THIRD = 2;
const JITTER = 3;
const LEN = 6;
/** Birth jitter. The trunk has no birth to jitter, so its slot 7 is the lean; the twin root's is its side. */
const BIRTH = 7;
/** Reserve slot 8, taken by growth v2's maturing twigs: whether (and when) this tip forks once past step 20. */
const TWIG = 8;

const DEG = Math.PI / 180;
const SLOT_OFFSET = [-1, 1, 0];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * @deprecated v1 curve. Continuous size at a whole step for the branching form;
 * kept only until every caller reads `scene.growth` / `growthInfo`.
 */
export function growthForLevel(level: number): number {
  return sizeAtStep('branching', Math.max(1, Math.floor(level)));
}

/** @deprecated v1. The deepest branching depth whose base birth has passed at this step. */
export function maxDepthForLevel(level: number): number {
  const births = FORM_TABLES.branching.birth;
  let depth = 0;
  for (let i = 0; i < births.length; i += 1) if (births[i] <= level) depth = i;
  return depth;
}

type Node = {
  path: string;
  depth: number;
  /** Depth inside its own trunk (the twin counts from 0 again), for the birth table. */
  rel: number;
  twin: boolean;
  /** Conical spine: keeps going up and always forks three ways. */
  leader: boolean;
  /** Conical: depth inside a side tier (0 = the tier's root), -1 on the spine and in other forms. */
  tier: number;
  /** Conical: the step the tier this node belongs to was born; its forks are timed from it. */
  tierBirth: number;
  /** A maturing twig (the fork past the depth table): carries a smaller tuft. */
  twig: boolean;
  d: number[];
  appear: number;
  /** Index of this node's branch in `branches`. */
  bi: number;
  baseLen: number;
  baseWidth: number;
  x0: number;
  y0: number;
  angle: number;
  endAngle: number;
  len: number;
  x1: number;
  y1: number;
};

export function generateTree(input: TreeInput): TreeScene {
  const level = Math.max(1, Math.floor(input.level));
  const frac = clamp(Number.isFinite(input.frac) ? input.frac : 0, 0, 1);
  const health = clamp(input.health ?? 1, 0, 1);
  const species: SpeciesId = isSpeciesId(input.species) ? input.species : DEFAULT_SPECIES;
  const sp: SpeciesParams = SPECIES[species];
  const form = sp.form;
  const table = FORM_TABLES[form];
  const floor = isFloor(input.floor) ? input.floor : null;
  const seed = input.seed;

  const e = input.at ? Math.max(1, input.at.position) : effectivePosition(level, frac, floor);
  const k = input.at
    ? Math.max(1, Math.floor(input.at.step ?? e + 1e-9))
    : structuralStep(level, floor);
  const size = sizeAt(form, e);
  const droopT = (1 - health) * 0.25;
  /** The step a level-gated feature arrived at, never later than now. */
  const stepOfLevel = (lvl: number) => Math.min(k, input.at ? lvl : structuralStep(lvl, floor));

  const branches: Branch[] = [];
  const leaves: Leaf[] = [];
  const nodes: Node[] = [];
  const byPath = new Map<string, Node>();

  const draws = (path: string) => nodeDraws(seed, path, DRAWS);
  const woodOf = (appear: number, trunk: boolean) =>
    trunk
      ? clamp((e - GEOMETRY.woodStart) / GEOMETRY.woodSteps, 0, 1)
      : clamp((e - appear - GEOMETRY.woodDelay) / GEOMETRY.woodSteps, 0, 1);

  const pushLeaf = (leaf: Omit<Leaf, 'bloomOrder' | 'visible' | 'open' | 'fade'> & { fade?: number }) => {
    if (leaves.length >= MAX_LEAVES) return;
    leaves.push({ fade: 1, ...leaf, bloomOrder: 0, visible: true, open: true });
  };
  /** A temporary leaf's `fade` from its size factor: 1 while whole, 0 at `fadeMin`. */
  const fadeShare = (shrink: number, fadeMin: number) => clamp((shrink - fadeMin) / (1 - fadeMin), 0, 1);

  /** Lay a node out at the current position and emit its branch. */
  const place = (node: Node, grow: number, w1Ratio: number, trunk: boolean, curveOverride?: number) => {
    const curve = curveOverride ?? (node.d[CURVE] * 2 - 1) * sp.curveAmp;
    node.endAngle = node.angle + curve;
    const midAngle = node.angle + curve * 0.5;
    node.len = node.baseLen * grow;
    const width = node.baseWidth * grow;
    node.x1 = node.x0 + Math.cos(node.endAngle * DEG) * node.len;
    node.y1 = node.y0 + Math.sin(node.endAngle * DEG) * node.len;
    node.bi = branches.length;
    nodes.push(node);
    byPath.set(node.path, node);
    branches.push({
      x0: node.x0,
      y0: node.y0,
      cx: node.x0 + Math.cos(midAngle * DEG) * node.len * 0.5,
      cy: node.y0 + Math.sin(midAngle * DEG) * node.len * 0.5,
      x1: node.x1,
      y1: node.y1,
      w0: width,
      w1: width * w1Ratio,
      depth: node.depth,
      path: node.path,
      birth: node.appear,
      wood: woodOf(node.appear, trunk),
    });
  };

  /**
   * The leaves on a tip: the full tuft, kept for `innerKeep` steps after it
   * forks; then (when `inner`) the first `innerLeaves` of them for good, as the
   * foliage inside the crown. Leaves fall from the top of the index down, so
   * the ones that stay are the oldest.
   */
  const tipLeaves = (node: Node, firstChild: number, inner: boolean) => {
    const full = firstChild > k || k < firstChild + table.innerKeep;
    const tuft = leavesPerTip(form, k, sp.leafCountMul, node.twig);
    let count: number;
    if (full) count = tuft;
    else if (inner && node.depth >= table.innerMinDepth && node.depth <= table.innerMaxDepth) count = Math.min(table.innerLeaves, tuft);
    else return;
    const sizeMul = sp.leafSizeMul * leafSizeAtDepth(node.depth);
    for (let i = 0; i < count; i += 1) {
      let born = node.appear;
      while (born < k && leavesPerTip(form, born, sp.leafCountMul, node.twig) <= i) born += 1;
      const path = `${node.path}L${i}`;
      if (!full) innerLeaves.add(path);
      const ld = nodeDraws(seed, path, LEAF_DRAWS);
      const grow = ramp(e, born);
      const a = node.endAngle + (ld[0] * 2 - 1) * 70;
      const distance = ld[1] * 2.6 * (0.5 + size) * grow * table.leafScatter;
      pushLeaf({
        x: node.x1 + Math.cos(a * DEG) * distance,
        y: node.y1 + Math.sin(a * DEG) * distance,
        angle: a,
        size: (0.8 + ld[2] * 0.7) * sizeMul * grow,
        phase: ld[3],
        hardiness: ld[4],
        depth: node.depth,
        path,
        birth: born,
        kind: 'leaf',
      });
    }
  };

  /** A point and heading at share t of a placed node's length (the curve read as a heading blend). */
  const along = (node: Node, t: number) => {
    const u = clamp(t, 0, 1);
    const b = branches[node.bi];
    const x = (1 - u) * (1 - u) * b.x0 + 2 * (1 - u) * u * b.cx + u * u * b.x1;
    const y = (1 - u) * (1 - u) * b.y0 + 2 * (1 - u) * u * b.cy + u * u * b.y1;
    return { x, y, heading: node.angle + (node.endAngle - node.angle) * u };
  };

  const trunkBaseLen = (p: number, lenJitter: number) =>
    (GEOMETRY.trunkLenBase + GEOMETRY.trunkLenGrow * sizeAt(form, p)) * sp.trunkLenMul * (0.9 + 0.2 * lenJitter);
  // Girth keeps growing past step 20 (maturing), and every width hangs off it.
  const trunkBaseWidth = () =>
    (GEOMETRY.trunkWidthBase + GEOMETRY.trunkWidthGrow * widthAt(form, e)) * sp.trunkWidthMul * girthAt(e);
  /** Leaves reduced to a forked node's inner keep; blossom never lands on them. */
  const innerLeaves = new Set<string>();

  const tD = draws('T');
  const lean = (tD[BIRTH] * 2 - 1) * GEOMETRY.lean * sp.leanMul;

  /**
   * One trunk and its subtree, breadth-first by path so a cap cuts the newest
   * wood. `twinStep` is null for the main tree.
   */
  const growBranching = (root: Node, twinStep: number | null) => {
    const queue: Node[] = [];
    place(root, twinStep === null ? 1 : ramp(e, root.appear), sp.childWidthRatio, twinStep === null);
    queue.push(root);
    for (let q = 0; q < queue.length; q += 1) {
      const parent = queue[q];
      const childRel = parent.rel + 1;
      const spine = form === 'conical' && parent.leader;
      const inTier = parent.tier >= 0;
      // The trunk forks in two (the house-style Y), a maturing twig forks in
      // two (fine outer growth), everything else may grow a third, middle child.
      const slots = spine ? [0, 1, 2] : parent.depth === 0 || parent.twig ? [0, 1] : [0, 1, 2];
      let firstChild = Number.POSITIVE_INFINITY;
      const spread = sp.spreadBase + parent.d[SPREAD] * sp.spreadJitter;

      for (const slot of slots) {
        if (branches.length >= MAX_BRANCHES) break;
        const chance = slot === 2 && !spine;
        let base: number;
        let spreadSteps: number;
        /** A maturing twig: the fork past the depth table, gated by the parent's reserve draw. */
        let twig = false;
        if (inTier) {
          // A conical tier forks on its own clock, from the step the tier was
          // born, and only as deep as its age allows: the top stays pointed.
          const t = parent.tier + 1;
          const deep = parent.tierBirth <= table.tierDeepUntil ? table.tierFork.length : Math.min(1, table.tierFork.length);
          if (t > deep) continue;
          base = parent.tierBirth + table.tierFork[t - 1];
          spreadSteps = table.tierForkSpread;
        } else if (twinStep === null) {
          if (childRel > table.birth.length) continue;
          twig = childRel === table.birth.length;
          if (twig && form !== 'branching') continue;
          base = twig ? table.twigFrom : table.birth[childRel];
          spreadSteps = twig ? 1 : table.birthSpread[childRel];
        } else {
          if (childRel > GEOMETRY.twinMaxDepth + 1) continue;
          twig = childRel === GEOMETRY.twinMaxDepth + 1;
          if (twig && form !== 'branching') continue;
          base = twig ? table.twigFrom : twinStep + childRel * GEOMETRY.twinDepthSteps;
          spreadSteps = twig ? 1 : GEOMETRY.twinBirthSpread;
        }
        const delay = chance ? table.thirdDelay : 0;
        if (base + delay > k) continue;
        const path = `${parent.path}${slot}`;
        const cd = draws(path);
        let appear = Math.max(parent.appear + GEOMETRY.childDelay, base + delay + Math.floor(cd[BIRTH] * spreadSteps));
        if (twig) {
          // The parent's reserve draw decides; the chance only rises with the
          // step, so a twig that exists keeps existing.
          const u = parent.d[TWIG];
          while (appear <= k && !(u < twigChanceAt(form, appear))) appear += 1;
        }
        if (chance) {
          // The parent's draw decides; the chance only rises with the step, so
          // once a third child exists it keeps existing.
          const u = parent.d[THIRD];
          while (appear <= k && !(u < thirdChanceAt(form, appear) + sp.thirdChildBias)) appear += 1;
        }
        if (appear > k) continue;
        firstChild = Math.min(firstChild, appear);

        const offset = SLOT_OFFSET[slot];
        const jitter = (parent.d[JITTER + slot] * 2 - 1) * GEOMETRY.slotJitter;
        const lenJitter = 0.9 + 0.2 * cd[LEN];
        let raw: number;
        let baseLen: number;
        let widthRatio: number;
        let leader = false;
        let tier = -1;
        let tierBirth = 0;
        if (spine) {
          if (slot === 2) {
            // The leader keeps going up; that is the whole cedar silhouette.
            raw = parent.endAngle + jitter * GEOMETRY.leaderJitter;
            baseLen = parent.baseLen * table.leaderLen * lenJitter;
            widthRatio = GEOMETRY.leaderWidth;
            leader = true;
          } else {
            // A tier leaves the spine nearly flat, sized to the trunk and
            // shorter the higher up the spine it sits.
            raw = parent.endAngle + offset * spread * GEOMETRY.tierAngle + jitter;
            baseLen =
              root.baseLen *
              sp.childLenRatio *
              table.tierLen *
              (1 - table.tierTaper * Math.min(1, parent.rel / GEOMETRY.conicalDepth)) *
              lenJitter;
            widthRatio = GEOMETRY.tierWidth;
            tier = 0;
            tierBirth = appear;
          }
        } else if (inTier) {
          // A tier keeps going outward with only a slight fan: layered shelves.
          raw = parent.endAngle + offset * spread * GEOMETRY.tierChildSpread + jitter * GEOMETRY.tierChildJitter;
          baseLen = parent.baseLen * GEOMETRY.tierChildLen * lenJitter;
          widthRatio = GEOMETRY.tierChildWidth;
          tier = parent.tier + 1;
          tierBirth = parent.tierBirth;
        } else {
          raw = parent.endAngle + offset * spread + jitter;
          baseLen = parent.baseLen * sp.childLenRatio * lenJitter;
          widthRatio = sp.childWidthRatio;
        }
        // Wilt rotates the tip toward straight down, more the further out it
        // is; a weeping species hangs the same way when perfectly healthy.
        const droop = Math.min(1, (droopT + sp.droopBase) * ((parent.depth + 1) / GEOMETRY.droopDepth));
        const child: Node = {
          path,
          depth: parent.depth + 1,
          rel: childRel,
          twin: parent.twin,
          leader,
          tier,
          tierBirth,
          twig,
          d: cd,
          appear,
          bi: 0,
          baseLen,
          baseWidth: parent.baseWidth * widthRatio,
          x0: parent.x1,
          y0: parent.y1,
          angle: raw + (90 - raw) * droop,
          endAngle: 0,
          len: 0,
          x1: 0,
          y1: 0,
        };
        place(child, ramp(e, appear), sp.childWidthRatio, false);
        queue.push(child);
      }

      // The main stem carries seed leaves and whorls instead of a tuft. A
      // leader (the conical spine, a twin's root) carries a tuft only while it
      // is the top; every other node keeps inner foliage after it forks.
      if (parent.path !== 'T' && (!parent.leader || firstChild > k)) tipLeaves(parent, firstChild, !parent.leader);
    }
  };

  /** Seed leaves and seedling whorls along the main stem (plan §4.4). */
  const growSeedling = (trunk: Node) => {
    if (k < table.cotyledonDeath && table.cotyledons > 0) {
      const at = along(trunk, trunkBaseLen(1, trunk.d[LEN]) / Math.max(1e-6, trunk.len));
      const n = table.cotyledons;
      const shrink = fadeAt(e, table.cotyledonDeath, SEEDLING.cotyledonFadeSteps, SEEDLING.cotyledonFadeMin);
      for (let i = 0; i < n; i += 1) {
        const path = `C${i}`;
        const ld = nodeDraws(seed, path, LEAF_DRAWS);
        const off =
          n === 2 ? (i === 0 ? -SEEDLING.cotyledonAngle : SEEDLING.cotyledonAngle) : -SEEDLING.cotyledonFan + (2 * SEEDLING.cotyledonFan * i) / (n - 1);
        const a = at.heading + off;
        pushLeaf({
          x: at.x + Math.cos(a * DEG) * SEEDLING.cotyledonDistance,
          y: at.y + Math.sin(a * DEG) * SEEDLING.cotyledonDistance,
          angle: a,
          size: SEEDLING.cotyledonSize * sp.leafSizeMul * shrink,
          phase: ld[3],
          hardiness: ld[4],
          depth: 0,
          path,
          birth: 1,
          kind: 'cotyledon',
          fade: fadeShare(shrink, SEEDLING.cotyledonFadeMin),
        });
      }
    }
    // Whorl j sits where the stem's top was at its birth and stays there as
    // the stem grows past it; the lowest whorl falls first, shrinking before it goes.
    for (let j = 1; j <= table.seedlingPairs && j + 1 <= k; j += 1) {
      const born = j + 1;
      const death = pairDeath(form, j);
      if (k >= death) continue;
      const at = along(trunk, (SEEDLING.pairHeight * trunkBaseLen(born, trunk.d[LEN])) / Math.max(1e-6, trunk.len));
      const shrink = fadeAt(e, death, SEEDLING.pairFadeSteps, SEEDLING.pairFadeMin);
      const grow = ramp(e, born) * shrink;
      const fade = fadeShare(shrink, SEEDLING.pairFadeMin);
      const n = table.pairLeaves;
      for (let side = 0; side < n; side += 1) {
        const path = `S${j}L${side}`;
        const ld = nodeDraws(seed, path, LEAF_DRAWS);
        const fan = n < 2 ? 0 : (2 * side) / (n - 1) - 1;
        const a = at.heading + fan * SEEDLING.pairAngle + (ld[0] * 2 - 1) * SEEDLING.pairAngleJitter;
        pushLeaf({
          x: at.x + Math.cos(a * DEG) * SEEDLING.pairDistance * grow,
          y: at.y + Math.sin(a * DEG) * SEEDLING.pairDistance * grow,
          angle: a,
          size: (SEEDLING.pairSize + ld[2] * SEEDLING.pairSizeJitter) * sp.leafSizeMul * grow,
          phase: ld[3],
          hardiness: ld[4],
          depth: 0,
          path,
          birth: born,
          kind: 'seedling',
          fade,
        });
      }
    }
  };

  /**
   * A palm: a chain of trunk segments and a crown of fronds. Real palms
   * establish crown first, trunk later - the first segment is a stub until
   * `palmEmergeSteps`, the others appear from step 8.
   */
  const growPalm = (prefix: 'T' | 'W', x0: number, angle0: number, lenShare: number, widthShare: number, firstStep: number) => {
    const segBirths = table.palmSegments;
    let parent: Node | null = null;
    for (let i = 0; i < segBirths.length; i += 1) {
      if (branches.length >= MAX_BRANCHES) break;
      const appear = prefix === 'T' ? segBirths[i] : firstStep + i;
      if (appear > k) break;
      const path = prefix + '2'.repeat(i);
      const d = i === 0 && prefix === 'T' ? tD : draws(path);
      const grow =
        i === 0 && prefix === 'T'
          ? SEEDLING.palmEmergeMin + (1 - SEEDLING.palmEmergeMin) * clamp((e - 1) / SEEDLING.palmEmergeSteps, 0, 1)
          : ramp(e, appear);
      let widthShare9 = widthShare;
      for (let j = 0; j < i; j += 1) widthShare9 *= 0.9;
      const node: Node = {
        path,
        depth: (prefix === 'T' ? 0 : 1) + i,
        rel: i,
        twin: prefix === 'W',
        leader: true,
        tier: -1,
        tierBirth: 0,
        twig: false,
        d,
        appear,
        bi: 0,
        baseLen: (trunkBaseLen(e, tD[LEN]) / segBirths.length) * lenShare,
        baseWidth: trunkBaseWidth() * widthShare9,
        x0: parent ? parent.x1 : x0,
        y0: parent ? parent.y1 : GROUND_Y,
        angle: parent ? parent.endAngle : angle0,
        endAngle: 0,
        len: 0,
        x1: 0,
        y1: 0,
      };
      // Bends onward in the direction of its own lean, segment after segment.
      const curve = (d[CURVE] * 2 - 1) * sp.curveAmp + (angle0 + 90) * 0.35;
      place(node, grow, 0.9, prefix === 'T', curve);
      parent = node;
    }
    if (!parent) return;
    const top = parent;
    const count = prefix === 'T' ? palmFronds(k) : Math.max(2, Math.round(palmFronds(k) * 0.6));
    for (let i = 0; i < count; i += 1) {
      let born = prefix === 'T' ? 1 : firstStep;
      while (born < k && (prefix === 'T' ? palmFronds(born) : Math.max(2, Math.round(palmFronds(born) * 0.6))) <= i) born += 1;
      const path = `${prefix === 'T' ? 'PF' : 'WF'}${i}`;
      const ld = nodeDraws(seed, path, LEAF_DRAWS);
      const t = PALM_FROND_FAN[i % PALM_FROND_FAN.length];
      let a = angle0 + t * 95 + (ld[0] * 2 - 1) * 8;
      // Wilt lets the fronds hang.
      a += (90 - a) * droopT * 0.6;
      const frondSize = (2.2 + 2.6 * size) * (0.85 + ld[2] * 0.3) * sp.leafSizeMul * ramp(e, born) * Math.sqrt(lenShare);
      pushLeaf({
        x: top.x1 + Math.cos(a * DEG) * frondSize * 0.3,
        y: top.y1 + Math.sin(a * DEG) * frondSize * 0.3,
        angle: a,
        size: frondSize,
        phase: ld[3],
        hardiness: ld[4],
        depth: top.depth,
        path,
        birth: born,
        kind: 'frond',
      });
    }
  };

  // --- The main tree -------------------------------------------------------

  const angle0 = -90 + lean;
  if (form === 'palm') {
    growPalm('T', TRUNK_X, angle0, 1, 1, 1);
  } else {
    const trunk: Node = {
      path: 'T',
      depth: 0,
      rel: 0,
      twin: false,
      leader: true,
      tier: -1,
      tierBirth: 0,
      twig: false,
      d: tD,
      appear: 1,
      bi: 0,
      baseLen: trunkBaseLen(e, tD[LEN]),
      baseWidth: trunkBaseWidth(),
      x0: TRUNK_X,
      y0: GROUND_Y,
      angle: angle0,
      endAngle: 0,
      len: 0,
      x1: 0,
      y1: 0,
    };
    growBranching(trunk, null);
    growSeedling(trunk);
  }
  const mainCount = nodes.length;

  // --- The twin trunk (trait `twin`): sprouts at its level and grows in ----

  if (hasTrait(level, 'twin')) {
    const twinStep = stepOfLevel(TRAIT_LEVELS.twin);
    const wD = draws('W');
    const side = wD[BIRTH] < 0.5 ? -1 : 1;
    const x0 = TRUNK_X + side * GEOMETRY.twinOffset;
    const angle = -90 + lean + side * GEOMETRY.twinAngle;
    if (form === 'palm') {
      growPalm('W', x0, angle, GEOMETRY.twinLen, GEOMETRY.twinWidth, twinStep);
    } else {
      growBranching(
        {
          path: 'W',
          depth: 1,
          rel: 0,
          twin: true,
          leader: true,
          tier: -1,
          tierBirth: 0,
          twig: false,
          d: wD,
          appear: twinStep,
          bi: 0,
          baseLen: trunkBaseLen(e, tD[LEN]) * GEOMETRY.twinLen,
          baseWidth: trunkBaseWidth() * GEOMETRY.twinWidth,
          x0,
          y0: GROUND_Y,
          angle,
          endAngle: 0,
          len: 0,
          x1: 0,
          y1: 0,
        },
        twinStep,
      );
    }
  }

  // --- Open, visible ---------------------------------------------------------

  // Wilt sheds a scatter rather than a block, and the same leaves return on
  // recovery because `hardiness` is seeded. Older leaves open first.
  const visibleCut = 0.55 + 0.45 * health;
  const order = leaves.map((_, i) => i);
  order.sort((a, b) => {
    const la = leaves[a];
    const lb = leaves[b];
    if (la.birth !== lb.birth) return la.birth - lb.birth;
    return la.path < lb.path ? -1 : la.path > lb.path ? 1 : 0;
  });
  const openCut = Math.ceil(leaves.length * (0.5 + 0.5 * frac));
  order.forEach((index, rank) => {
    const leaf = leaves[index];
    leaf.bloomOrder = rank;
    leaf.open = rank < openCut;
    leaf.visible = leaf.hardiness <= visibleCut;
  });

  const visible = leaves.filter((leaf) => leaf.visible);

  // --- Blossom: anchored to leaves by a ranking whose prefix never changes ---

  const blossoms: Ornament[] = [];
  const blossoming = sp.blossom === 'always' || (sp.blossom === 'seasonal' && hasTrait(level, 'blossom'));
  if (blossoming) {
    // On the outer canopy only (never on a forked node's inner keep); a
    // species that always blooms flowers on its seedling whorls too.
    const candidates = visible
      .filter((leaf) =>
        leaf.kind === 'leaf' ? !innerLeaves.has(leaf.path) : leaf.kind === 'seedling' && sp.blossom === 'always',
      )
      .map((leaf) => ({ leaf, h: fnv1a32(`${seed}|B|${leaf.path}`) }))
      .sort((a, b) => {
        if (a.leaf.birth !== b.leaf.birth) return a.leaf.birth - b.leaf.birth;
        if (a.h !== b.h) return a.h - b.h;
        return a.leaf.path < b.leaf.path ? -1 : 1;
      });
    const cap = Math.min(Math.round(6 + 10 * sizeAtStep(form, k)), Math.ceil(candidates.length / 6));
    for (let i = 0; i < cap && i < candidates.length; i += 1) {
      const { leaf } = candidates[i];
      blossoms.push({ x: leaf.x, y: leaf.y, size: Math.min(leaf.size, GEOMETRY.blossomMaxSize), index: i, path: leaf.path });
    }
  }

  // --- Fruit: fruit i is hung, once, on a twig chosen at the step it arrived --

  const fruits: Ornament[] = [];
  const wanted = fruitCount(level);
  if (wanted > 0) {
    if (form === 'palm') {
      const trunk = nodes.filter((n) => !n.twin);
      const top = trunk.length > 0 ? trunk[trunk.length - 1] : null;
      if (top) {
        for (let i = 0; i < wanted; i += 1) {
          const dx = (i % 2 === 0 ? 1 : -1) * (0.6 + 0.5 * Math.floor(i / 2));
          const dy = 1.6 + 0.4 * (i % 3);
          // Dates hang under whatever is the crown now; the path names the
          // bunch, not the segment. Small: a renderer draws each as a cluster.
          fruits.push({ x: top.x1 + dx, y: top.y1 + dy, size: GEOMETRY.dateSize, index: i, path: `PD${i}` });
        }
      }
    } else {
      const main = nodes.slice(0, mainCount);
      const used = new Set<string>();
      for (let i = 0; i < wanted; i += 1) {
        const at = stepOfLevel(fruitLevel(i));
        let deepest = 0;
        for (const n of main) if (n.appear <= at && n.depth > deepest) deepest = n.depth;
        let pick: Node | null = null;
        let pickHash = 0;
        for (const n of main) {
          if (n.appear > at || n.depth < Math.max(1, deepest - 1) || used.has(n.path)) continue;
          const h = fnv1a32(`${seed}|F|${n.path}`);
          if (!pick || h < pickHash || (h === pickHash && n.path < pick.path)) {
            pick = n;
            pickHash = h;
          }
        }
        if (!pick) continue;
        used.add(pick.path);
        const hang = (60 + (pickHash % 60)) * DEG;
        const fruitSize = Math.min((1 + ((pickHash >>> 8) % 100) / 200) * sp.leafSizeMul, MAX_FRUIT_SIZE);
        fruits.push({
          x: pick.x1 + Math.cos(hang) * 0.9,
          y: pick.y1 + Math.sin(hang) * 0.9,
          size: fruitSize,
          index: i,
          path: pick.path,
        });
      }
    }
  }

  // --- Perch: a fixed chain of paths, never "the leaf nearest a point" ------

  let perch: { x: number; y: number } | null = null;
  if (form === 'palm') {
    const segments = nodes.filter((n) => !n.twin);
    if (segments.length >= 3) {
      const top = segments[segments.length - 1];
      perch = { x: top.x1 + 1.2, y: top.y1 + 0.6 };
    }
  } else {
    let path = 'T1';
    let best: Node | null = null;
    for (let node = byPath.get(path); node; node = byPath.get(path)) {
      if (node.depth >= 2 && e - node.appear >= 1) best = node;
      path += '1';
    }
    if (best) perch = { x: best.x1, y: best.y1 };
  }

  // --- Bounds ----------------------------------------------------------------

  // Padded by a leaf's worth so the outermost canopy is never clipped; a frond
  // is drawn well past its anchor, so it pads by its own length. Wilted leaves
  // count too: the camera frames by these bounds, so shedding leaves never
  // zooms it (wilt droop still moves the branches a little).
  const bounds: TreeBounds = { minX: TRUNK_X, maxX: TRUNK_X, minY: GROUND_Y, maxY: GROUND_Y + GROUND_PAD };
  for (const branch of branches) {
    bounds.minX = Math.min(bounds.minX, branch.x0, branch.x1);
    bounds.maxX = Math.max(bounds.maxX, branch.x0, branch.x1);
    bounds.minY = Math.min(bounds.minY, branch.y0, branch.y1);
  }
  for (const leaf of leaves) {
    const pad = sp.leafShape === 'frond' ? leaf.size * 2.8 : 3 * Math.min(1, leaf.size / sp.leafSizeMul);
    bounds.minX = Math.min(bounds.minX, leaf.x - pad);
    bounds.maxX = Math.max(bounds.maxX, leaf.x + pad);
    bounds.minY = Math.min(bounds.minY, leaf.y - pad);
  }

  let maxDepth = 0;
  for (const branch of branches) if (branch.depth > maxDepth) maxDepth = branch.depth;

  return {
    model: GROWTH_MODEL,
    branches,
    leaves,
    blossoms,
    fruits,
    perch,
    bounds,
    traits: traitsForLevel(level),
    growth: size,
    maxDepth,
    level,
    frac,
    health,
    species,
    form,
    position: e,
    step: k,
    phase: phaseForStep(k).id,
    rings: ringsForStep(k),
    floor,
  };
}
