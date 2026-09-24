import type { Branch, Leaf, Ornament, TreeBounds, TreeScene } from './generate';

/**
 * Growth v2: one tree between two positions (plan §9.2, §9.3).
 *
 * The level-up and the in-level lesson growth both hold scene A (before) and
 * scene B (after) of the same seed and species, and render
 * `lerpScenes(A, B, tweenEase(u))` for u running 0 → 1 over the tween. Since
 * v2 a node keeps its path, angle and anchor for life, "the same branch in both
 * scenes" is a path lookup, and the in-between is plain interpolation:
 *
 * - Wood in both scenes (by `path`): every coordinate and width lerps.
 * - Newborn wood (only in B): grows out of its parent's *lerped* tip. The start
 *   point is the parent's lerped end (parent = path minus its last character;
 *   the roots `T` and `W` anchor at their own start), and its vector (control
 *   and end relative to the start) and widths scale by `sprout(t)`.
 * - Leaves in both: lerp x, y, size and angle, carried by their owner node's
 *   lerped tip (owner = the path before the last `L`; a palm frond's owner is
 *   the top segment of its chain). New leaves ride on the owner's lerped tip
 *   and scale in with `unfurl(t)`. Leaves only in A (seed leaves, leaf pairs,
 *   inner foliage falling) shrink out with `fall(t)`. Seed leaves and leaf
 *   pairs have no owner node and lerp in place.
 * - Blossoms (by path) sit on their leaf's lerped position; fruit (by path and
 *   index) rides its twig's lerped tip; both follow the same in / out rules.
 * - Bounds, position, growth and health lerp, so a renderer that measures its
 *   camera on the lerped scene gets the camera ease for free. Topology fields
 *   (`step`, `phase`, `rings`, `traits`, `maxDepth`) and everything else come
 *   from B.
 *
 * At t = 1 the result is B itself; at t = 0 every shared path has A's geometry
 * and newborn wood is a zero-length bud at its parent's tip.
 *
 * Pure: no DOM, no clock, no random. Mirror: `lib/features/levensboom/domain/
 * tween.dart` - plain arithmetic, so it ports line for line. The only
 * non-arithmetic piece is the per-scene path index, memoised in a WeakMap here;
 * the Dart side may rebuild it per call.
 */

/** Timing shape of a tween. Design numbers (CP6). */
export const TWEEN = {
  /** Newborn wood waits this share of the (eased) tween, then grows out of its parent's tip. */
  sproutDelay: 0.15,
  /** New leaves, blossom and fruit unfurl after the wood, from this share on. */
  unfurlDelay: 0.35,
  /** Leaves and ornaments that leave (seed leaves, inner foliage) are gone by this share. */
  fallEnd: 0.6,
  /** Default length when the step changes (a level-up). */
  levelUpMs: 1600,
  /** Default length for growth within a level (after a lesson or a chapter). */
  growMs: 1200,
} as const;

function clamp01(x: number): number {
  return x <= 0 ? 0 : x >= 1 ? 1 : x;
}

function smoothstep(x: number): number {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Time to tween progress: ease-out cubic, so the camera settles instead of stopping. */
export function tweenEase(u: number): number {
  const v = 1 - clamp01(u);
  return 1 - v * v * v;
}

/** How far newborn wood has grown at tween progress t. */
export function sprout(t: number): number {
  return smoothstep((t - TWEEN.sproutDelay) / (1 - TWEEN.sproutDelay));
}

/** How far a new leaf, blossom or fruit has opened at tween progress t. */
export function unfurl(t: number): number {
  return smoothstep((t - TWEEN.unfurlDelay) / (1 - TWEEN.unfurlDelay));
}

/** How much of a leaving leaf or ornament is left at tween progress t. */
export function fall(t: number): number {
  return 1 - smoothstep(t / TWEEN.fallEnd);
}

/** The default tween length for a pair of scenes. */
export function tweenMsFor(a: Pick<TreeScene, 'step'>, b: Pick<TreeScene, 'step'>): number {
  return a.step !== b.step ? TWEEN.levelUpMs : TWEEN.growMs;
}

// ---------------------------------------------------------------------------
// Path index
// ---------------------------------------------------------------------------

type Point = { x: number; y: number };

type SceneIndex = {
  branches: Map<string, Branch>;
  leaves: Map<string, Leaf>;
  blossoms: Map<string, Ornament>;
  fruits: Map<string, Ornament>;
  /** Top segment of each palm chain ('T', 'W'), by path. */
  tops: Map<string, string>;
};

const indexes = new WeakMap<TreeScene, SceneIndex>();

function fruitKey(o: Ornament): string {
  return `${o.path}#${o.index}`;
}

function indexOf(scene: TreeScene): SceneIndex {
  const hit = indexes.get(scene);
  if (hit) return hit;
  const branches = new Map<string, Branch>();
  const tops = new Map<string, string>();
  for (const b of scene.branches) {
    branches.set(b.path, b);
    // Branches come parents first, so the last one of each root is its top
    // segment; only a palm reads this.
    tops.set(b.path.charAt(0), b.path);
  }
  const leaves = new Map<string, Leaf>();
  for (const l of scene.leaves) leaves.set(l.path, l);
  const blossoms = new Map<string, Ornament>();
  for (const o of scene.blossoms) blossoms.set(o.path, o);
  const fruits = new Map<string, Ornament>();
  for (const o of scene.fruits) fruits.set(fruitKey(o), o);
  const index = { branches, leaves, blossoms, fruits, tops };
  indexes.set(scene, index);
  return index;
}

/** The branch whose tip a leaf rides, or null (seed leaves, leaf pairs). */
function leafOwner(path: string, kind: string | undefined, index: SceneIndex): string | null {
  if (kind === 'frond' || path.startsWith('PF') || path.startsWith('WF')) {
    return index.tops.get(path.charAt(0) === 'W' ? 'W' : 'T') ?? null;
  }
  const at = path.lastIndexOf('L');
  if (at <= 0) return null;
  const owner = path.slice(0, at);
  return index.branches.has(owner) ? owner : null;
}

/** The branch whose tip a fruit hangs from, or null. Palm dates hang under the crown. */
function fruitOwner(path: string, index: SceneIndex): string | null {
  if (path.startsWith('PD')) return index.tops.get('T') ?? null;
  return index.branches.has(path) ? path : null;
}

function tipOf(index: SceneIndex, path: string | null): Point | null {
  if (!path) return null;
  const b = index.branches.get(path);
  return b ? { x: b.x1, y: b.y1 } : null;
}

// ---------------------------------------------------------------------------
// The tween
// ---------------------------------------------------------------------------

/**
 * Place something that rides a branch tip. `own` is where it sits in its own
 * scene and `ownTip` that scene's tip of its owner; `tip` is the owner's lerped
 * tip. With no owner it stays where it is.
 */
function ride(own: Point, ownTip: Point | null, tip: Point | undefined, share: number): Point {
  if (!ownTip || !tip) return { x: own.x, y: own.y };
  return { x: tip.x + (own.x - ownTip.x) * share, y: tip.y + (own.y - ownTip.y) * share };
}

export function lerpScenes(a: TreeScene, b: TreeScene, t: number): TreeScene {
  const p = Number.isFinite(t) ? clamp01(t) : 0;
  if (p >= 1) return b;

  const ia = indexOf(a);
  const ib = indexOf(b);
  const grow = sprout(p);
  const open = unfurl(p);
  const leave = fall(p);

  // --- Wood ------------------------------------------------------------------

  /** Lerped tips by path: B's wood, then wood only A has (never, in practice). */
  const tips = new Map<string, Point>();
  const branches: Branch[] = [];
  for (const nb of b.branches) {
    const oa = ia.branches.get(nb.path);
    let branch: Branch;
    if (oa) {
      branch = {
        ...nb,
        x0: lerp(oa.x0, nb.x0, p),
        y0: lerp(oa.y0, nb.y0, p),
        cx: lerp(oa.cx, nb.cx, p),
        cy: lerp(oa.cy, nb.cy, p),
        x1: lerp(oa.x1, nb.x1, p),
        y1: lerp(oa.y1, nb.y1, p),
        w0: lerp(oa.w0, nb.w0, p),
        w1: lerp(oa.w1, nb.w1, p),
        wood: lerp(oa.wood, nb.wood, p),
      };
    } else {
      const parent = nb.path.length > 1 ? tips.get(nb.path.slice(0, -1)) : undefined;
      const sx = parent ? parent.x : nb.x0;
      const sy = parent ? parent.y : nb.y0;
      branch = {
        ...nb,
        x0: sx,
        y0: sy,
        cx: sx + (nb.cx - nb.x0) * grow,
        cy: sy + (nb.cy - nb.y0) * grow,
        x1: sx + (nb.x1 - nb.x0) * grow,
        y1: sy + (nb.y1 - nb.y0) * grow,
        w0: nb.w0 * grow,
        w1: nb.w1 * grow,
      };
    }
    tips.set(nb.path, { x: branch.x1, y: branch.y1 });
    branches.push(branch);
  }
  // Wood only A has: v2 never removes wood, but a tween the other way (or
  // across a species change) must not leave it hanging in the air.
  if (leave > 0) {
    for (const oa of a.branches) {
      if (ib.branches.has(oa.path)) continue;
      const parent = oa.path.length > 1 ? tips.get(oa.path.slice(0, -1)) : undefined;
      const sx = parent ? parent.x : oa.x0;
      const sy = parent ? parent.y : oa.y0;
      const branch: Branch = {
        ...oa,
        x0: sx,
        y0: sy,
        cx: sx + (oa.cx - oa.x0) * leave,
        cy: sy + (oa.cy - oa.y0) * leave,
        x1: sx + (oa.x1 - oa.x0) * leave,
        y1: sy + (oa.y1 - oa.y0) * leave,
        w0: oa.w0 * leave,
        w1: oa.w1 * leave,
      };
      tips.set(oa.path, { x: branch.x1, y: branch.y1 });
      branches.push(branch);
    }
  }

  // --- Leaves ------------------------------------------------------------------

  const leaves: Leaf[] = [];
  const leafAt = new Map<string, Leaf>();
  // Leaving leaves first, so they sit under the foliage that stays.
  if (leave > 0) {
    for (const la of a.leaves) {
      if (ib.leaves.has(la.path)) continue;
      const owner = leafOwner(la.path, la.kind, ia);
      const at = ride(la, tipOf(ia, owner), owner ? tips.get(owner) : undefined, 1);
      const leaf: Leaf = { ...la, x: at.x, y: at.y, size: la.size * leave };
      leaves.push(leaf);
      leafAt.set(la.path, leaf);
    }
  }
  for (const lb of b.leaves) {
    const la = ia.leaves.get(lb.path);
    const ownerB = leafOwner(lb.path, lb.kind, ib);
    const tip = ownerB ? tips.get(ownerB) : undefined;
    const tipB = tipOf(ib, ownerB);
    let leaf: Leaf;
    if (la) {
      const tipA = tipOf(ia, leafOwner(la.path, la.kind, ia));
      let x: number;
      let y: number;
      if (tip && tipA && tipB) {
        x = tip.x + lerp(la.x - tipA.x, lb.x - tipB.x, p);
        y = tip.y + lerp(la.y - tipA.y, lb.y - tipB.y, p);
      } else {
        x = lerp(la.x, lb.x, p);
        y = lerp(la.y, lb.y, p);
      }
      leaf = { ...lb, x, y, size: lerp(la.size, lb.size, p), angle: lerp(la.angle, lb.angle, p) };
    } else {
      const at = ride(lb, tipB, tip, open);
      leaf = { ...lb, x: at.x, y: at.y, size: lb.size * open };
    }
    leaves.push(leaf);
    leafAt.set(lb.path, leaf);
  }

  // --- Blossom: on its leaf --------------------------------------------------

  const blossoms: Ornament[] = [];
  const blossomOn = (o: Ornament, presence: number): Ornament => {
    const leaf = leafAt.get(o.path);
    if (leaf) return { ...o, x: leaf.x, y: leaf.y, size: leaf.size * presence };
    return { ...o, size: o.size * presence };
  };
  if (leave > 0) {
    for (const oa of a.blossoms) if (!ib.blossoms.has(oa.path)) blossoms.push(blossomOn(oa, leave));
  }
  for (const ob of b.blossoms) blossoms.push(blossomOn(ob, ia.blossoms.has(ob.path) ? 1 : open));

  // --- Fruit: on its twig ----------------------------------------------------

  const fruits: Ornament[] = [];
  if (leave > 0) {
    for (const oa of a.fruits) {
      if (ib.fruits.has(fruitKey(oa))) continue;
      const owner = fruitOwner(oa.path, ia);
      const at = ride(oa, tipOf(ia, owner), owner ? tips.get(owner) : undefined, 1);
      fruits.push({ ...oa, x: at.x, y: at.y, size: oa.size * leave });
    }
  }
  for (const ob of b.fruits) {
    const oa = ia.fruits.get(fruitKey(ob));
    const ownerB = fruitOwner(ob.path, ib);
    const tip = ownerB ? tips.get(ownerB) : undefined;
    const tipB = tipOf(ib, ownerB);
    if (oa) {
      const tipA = tipOf(ia, fruitOwner(oa.path, ia));
      let x: number;
      let y: number;
      if (tip && tipA && tipB) {
        x = tip.x + lerp(oa.x - tipA.x, ob.x - tipB.x, p);
        y = tip.y + lerp(oa.y - tipA.y, ob.y - tipB.y, p);
      } else {
        x = lerp(oa.x, ob.x, p);
        y = lerp(oa.y, ob.y, p);
      }
      fruits.push({ ...ob, x, y, size: lerp(oa.size, ob.size, p) });
    } else {
      const at = ride(ob, tipB, tip, 1);
      fruits.push({ ...ob, x: at.x, y: at.y, size: ob.size * open });
    }
  }

  // --- Perch -----------------------------------------------------------------

  let perch: TreeScene['perch'];
  if (a.perch && b.perch) {
    perch = { x: lerp(a.perch.x, b.perch.x, p), y: lerp(a.perch.y, b.perch.y, p) };
  } else if (b.perch && p >= 0.5) {
    // The bird moves up into the crown halfway, onto the twig as it is now.
    perch = ride(b.perch, nearestTip(b, b.perch), nearestTipLerped(b, b.perch, tips), 1);
  } else {
    perch = p < 0.5 ? a.perch : b.perch;
  }

  const bounds: TreeBounds = {
    minX: lerp(a.bounds.minX, b.bounds.minX, p),
    maxX: lerp(a.bounds.maxX, b.bounds.maxX, p),
    minY: lerp(a.bounds.minY, b.bounds.minY, p),
    maxY: lerp(a.bounds.maxY, b.bounds.maxY, p),
  };

  return {
    ...b,
    branches,
    leaves,
    blossoms,
    fruits,
    perch,
    bounds,
    growth: lerp(a.growth, b.growth, p),
    health: lerp(a.health, b.health, p),
    position: lerp(a.position, b.position, p),
  };
}

/** The tip of B's branch closest to a point (the perch sits on one), as B has it. */
function nearestTip(scene: TreeScene, at: Point): Point | null {
  const path = nearestPath(scene, at);
  return path ? tipOf(indexOf(scene), path) : null;
}

function nearestTipLerped(scene: TreeScene, at: Point, tips: Map<string, Point>): Point | undefined {
  const path = nearestPath(scene, at);
  return path ? tips.get(path) : undefined;
}

function nearestPath(scene: TreeScene, at: Point): string | null {
  let best: string | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const b of scene.branches) {
    const d = (b.x1 - at.x) * (b.x1 - at.x) + (b.y1 - at.y) * (b.y1 - at.y);
    if (d < bestD) {
      bestD = d;
      best = b.path;
    }
  }
  return best;
}
