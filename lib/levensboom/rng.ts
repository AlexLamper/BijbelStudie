/**
 * The one random source the Levensboom is allowed to use.
 *
 * Every branch angle, leaf scatter and firefly position is drawn from here,
 * seeded with the user's id. That is what makes the tree *theirs*: the same
 * account renders the same tree on the website, on the phone, and after a
 * reinstall. A single `Math.random()` anywhere in the generator would break
 * that silently - the tree would simply be different every reload.
 *
 * The arithmetic is deliberately written in explicit 32-bit terms so
 * `lib/features/levensboom/domain/rng.dart` can mirror it operation for
 * operation; see docs/levensboom-spec.md §3.
 */

function u32(value: number): number {
  return value >>> 0;
}

function mul32(a: number, b: number): number {
  return Math.imul(a, b) >>> 0;
}

/** FNV-1a, 32 bit. Maps a user id to a stream seed. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash = u32(hash ^ input.charCodeAt(i));
    hash = mul32(hash, 0x01000193);
  }
  return hash;
}

export type Rng = () => number;

/** mulberry32. Small, fast, and trivially portable to Dart. */
export function mulberry32(seed: number): Rng {
  let state = u32(seed);
  return () => {
    state = u32(state + 0x6d2b79f5);
    let t = state;
    t = mul32(u32(t ^ (t >>> 15)), u32(t | 1));
    t = u32(t ^ u32(t + mul32(u32(t ^ (t >>> 7)), u32(t | 61))));
    return u32(t ^ (t >>> 14)) / 4294967296;
  };
}

/** The stream a given user's tree is drawn from. */
export function seededRng(seed: string): Rng {
  return mulberry32(fnv1a32(seed));
}

/**
 * Growth v2: one stream per node of the tree, keyed by its path ("T", "T01",
 * "T01L2", "C0", "PF3" ...). Adding a branch, a leaf or a whole subtree can
 * never shift another node's numbers, which is what lets a tree grow instead
 * of being redrawn at every level-up. Paths are plain ASCII, so the Dart
 * mirror hashes exactly the same code units.
 */
export function nodeRng(seed: string, path: string): Rng {
  return mulberry32(fnv1a32(`${seed}|${path}`));
}

/** The first `count` values of a node's stream. */
export function nodeDraws(seed: string, path: string, count: number): number[] {
  const rand = nodeRng(seed, path);
  const out = new Array<number>(count);
  for (let i = 0; i < count; i += 1) out[i] = rand();
  return out;
}
