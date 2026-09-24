import { generateTree, type TreeScene } from '../../lib/levensboom/generate';
import { nodeDraws } from '../../lib/levensboom/rng';
import { SPECIES_IDS, type SpeciesId } from '../../lib/levensboom/species';
import type { GrowthFloor } from '../../lib/levensboom/growth';

/**
 * The growth v2 parity fixture (plan §11.2): one seed, all 13 species at a
 * spread of positions plus a floored case, each reduced to counts and two
 * geometry checksums. `npm run tree:fixtures` writes it to
 * `tests/fixtures/levensboom-v2.json` and to the app's
 * `test/fixtures/levensboom_v2.json`; both test suites assert the generator
 * reproduces it. Checksums are rounded to 1e-3, which absorbs a last-ulp
 * difference in cos/sin between V8 and Dart - topology never depends on trig.
 */

export const FIXTURE_SEED = '65f0c1a2b3c4d5e6f7a8b9c0';

export const FIXTURE_POSITIONS: readonly [number, number][] = [
  [1, 0],
  [2, 0],
  [3, 0.5],
  [5, 0],
  [6, 0.99],
  [7, 0],
  [9, 0.4],
  [12, 0],
  [16, 0],
  [20, 0],
  [27, 0.5],
  [40, 0],
];

export const FIXTURE_FLOOR: GrowthFloor = { from: 10, to: 13 };
export const FIXTURE_FLOORED: [number, number] = [12, 0];

export type FixtureCase = {
  species: SpeciesId;
  level: number;
  frac: number;
  floor: GrowthFloor | null;
  branches: number;
  leaves: number;
  open: number;
  visible: number;
  blossoms: number;
  fruits: number;
  step: number;
  maxDepth: number;
  perch: boolean;
  checksum: number;
  leafChecksum: number;
};

export type Fixture = {
  seed: string;
  streams: Record<string, string[]>;
  cases: FixtureCase[];
};

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function summarise(scene: TreeScene, floor: GrowthFloor | null): FixtureCase {
  let checksum = 0;
  for (const b of scene.branches) checksum += b.x0 + b.y0 + b.x1 + b.y1;
  let leafChecksum = 0;
  for (const l of scene.leaves) leafChecksum += l.x + l.y + l.size;
  return {
    species: scene.species,
    level: scene.level,
    frac: scene.frac,
    floor,
    branches: scene.branches.length,
    leaves: scene.leaves.length,
    open: scene.leaves.filter((l) => l.open).length,
    visible: scene.leaves.filter((l) => l.visible).length,
    blossoms: scene.blossoms.length,
    fruits: scene.fruits.length,
    step: scene.step,
    maxDepth: scene.maxDepth,
    perch: scene.perch !== null,
    checksum: r3(checksum),
    leafChecksum: r3(leafChecksum),
  };
}

export function buildFixture(): Fixture {
  const cases: FixtureCase[] = [];
  for (const species of SPECIES_IDS) {
    for (const [level, frac] of FIXTURE_POSITIONS) {
      cases.push(summarise(generateTree({ seed: FIXTURE_SEED, level, frac, health: 1, species }), null));
    }
    const [level, frac] = FIXTURE_FLOORED;
    cases.push(
      summarise(generateTree({ seed: FIXTURE_SEED, level, frac, health: 1, species, floor: FIXTURE_FLOOR }), FIXTURE_FLOOR),
    );
  }
  const streams: Record<string, string[]> = {};
  for (const path of ['T', 'T01L2', 'W', 'PF3']) {
    streams[path] = nodeDraws(FIXTURE_SEED, path, 8).map((v) => v.toFixed(9));
  }
  return { seed: FIXTURE_SEED, streams, cases };
}
