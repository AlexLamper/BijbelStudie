import { generateTree, type TreeInput, type TreeScene } from './generate';
import { effectivePosition, GROWTH_MODEL, isFloor, untaper } from './growth';

/**
 * One generator run per distinct tree, shared by every canvas on the page.
 *
 * The navbar, the profile circle and a studio full of tiles all draw the same
 * account at the same position; without this each mount re-runs the
 * generator. The key is what decides the drawing (growth v2, plan §4.10): the
 * model, the seed and species, the level (traits and fruit), the floor, an
 * `at` override, and the effective position bucketed - by default to 1/50 of
 * a step - so an XP tick does not regenerate a tree that could not show the
 * difference anyway. The scene is generated *at* the bucketed position, so
 * one key is always one drawing, whichever caller filled it.
 */

const MAX_ENTRIES = 48;
const cache = new Map<string, TreeScene>();

/** Default position bucket: 1/50 of a step. */
export const POSITION_BUCKET = 50;

function bucketed(value: number, bucket: number): number {
  return bucket > 0 ? Math.round(value * bucket) / bucket : value;
}

/** The generator input a cache key stands for: position bucketed, health to hundredths. */
function normalise(input: TreeInput, bucket: number): { key: string; input: TreeInput } {
  const level = Math.max(1, Math.floor(input.level));
  const frac = Number.isFinite(input.frac) ? Math.min(1, Math.max(0, input.frac)) : 0;
  const floor = isFloor(input.floor) ? input.floor : null;
  const health = Math.round((input.health ?? 1) * 100) / 100;
  const species = input.species ?? 'eik';

  let at: TreeInput['at'] = null;
  let genFrac = frac;
  let position: number;
  if (input.at) {
    // The step is read before bucketing, so rounding 3.99 up never adds a step.
    const raw = Math.max(1, input.at.position);
    const step = Math.max(1, Math.floor(input.at.step ?? raw + 1e-9));
    position = Math.max(1, bucketed(raw, bucket));
    at = { position, step };
  } else {
    position = bucketed(effectivePosition(level, frac, floor), bucket);
    // Back from the bucketed position to the frac that lands on it; the level
    // (and with it the step, traits and fruit) is untouched.
    genFrac = bucket > 0 ? Math.min(1, Math.max(0, untaper(position, floor) - level)) : frac;
  }

  const key = [
    `v${GROWTH_MODEL}`,
    input.seed,
    species,
    level,
    floor ? `${floor.from},${floor.to}` : '-',
    at ? `@${at.step}` : '',
    position.toFixed(bucket > 0 ? 4 : 6),
    health.toFixed(2),
  ].join('|');
  return { key, input: { ...input, level, frac: genFrac, health, species, floor, at } };
}

export function sceneKey(input: TreeInput, bucket = POSITION_BUCKET): string {
  return normalise(input, bucket).key;
}

/**
 * The scene for `input`, generated at most once per key. `bucket` is how many
 * positions per step are told apart (0: exact).
 */
export function cachedTree(input: TreeInput, bucket = POSITION_BUCKET): TreeScene {
  const { key, input: normalised } = normalise(input, bucket);
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency: delete and re-insert keeps Map order as an LRU.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const scene = generateTree(normalised);
  cache.set(key, scene);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return scene;
}
