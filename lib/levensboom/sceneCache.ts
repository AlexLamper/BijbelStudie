import { generateTree, type TreeInput, type TreeScene } from './generate';

/**
 * One generator run per distinct tree, shared by every canvas on the page.
 *
 * The navbar, the profile circle and a studio full of tiles all draw the same
 * account at the same level; without this each mount re-runs the recursion.
 * Small avatars also bucket `frac` so an XP tick does not regenerate a 28 px
 * tree that could not show the difference anyway.
 */

const MAX_ENTRIES = 48;
const cache = new Map<string, TreeScene>();

export function sceneKey(input: TreeInput, fracBucket = 0): string {
  const frac = fracBucket > 0 ? Math.round(input.frac * fracBucket) / fracBucket : input.frac;
  return `${input.seed}|${input.species ?? 'eik'}|${Math.max(1, Math.floor(input.level))}|${frac.toFixed(3)}|${(input.health ?? 1).toFixed(2)}`;
}

export function cachedTree(input: TreeInput, fracBucket = 0): TreeScene {
  const key = sceneKey(input, fracBucket);
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency: delete and re-insert keeps Map order as an LRU.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const frac = fracBucket > 0 ? Math.round(input.frac * fracBucket) / fracBucket : input.frac;
  const scene = generateTree({ ...input, frac });
  cache.set(key, scene);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return scene;
}
