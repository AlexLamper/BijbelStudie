import { it } from 'vitest';
import { generateTree, GROUND_Y, type TreeScene } from '../../lib/levensboom/generate';
import { measureFrame } from '../../lib/levensboom/camera';
import { SPECIES_IDS } from '../../lib/levensboom/species';

/**
 * `npm run tree:probe` - the numbers behind the contact sheets, per species
 * and step: branches, tips, leaves, world height and width, trunk width, and
 * the step-40/60 budget over 16 seeds (rubric 10: at most 600 branches and
 * 1,000 leaves at step 40). `PROBE_SPECIES=eik,ceder` narrows it.
 */

const SEEDS = Array.from({ length: 16 }, (_, i) => `65f0c1a2b3c4d5e6f7a8b9${(i + 16).toString(16).padStart(2, '0')}`);
const STEPS = [...Array.from({ length: 20 }, (_, i) => i + 1), 22, 25, 30, 35, 40, 60];

function at(seed: string, species: string, position: number): TreeScene {
  const level = Math.floor(position);
  return generateTree({ seed, level, frac: position - level, health: 1, species, at: { position } });
}

function tips(scene: TreeScene): number {
  const parents = new Set<string>();
  for (const b of scene.branches) parents.add(b.path.slice(0, -1));
  return scene.branches.filter((b) => !parents.has(b.path)).length;
}

const pad = (v: string | number, n: number) => String(v).padStart(n);

it('probes the growth table', () => {
  const only = (process.env.PROBE_SPECIES ?? '').split(',').filter(Boolean);
  const species = only.length ? only : [...SPECIES_IDS];
  const seed = SEEDS[0];
  for (const sp of species) {
    const lines: string[] = [];
    lines.push(`\n== ${sp} · seed …${seed.slice(-4)}`);
    lines.push(`${pad('step', 5)} ${pad('t', 4)} ${pad('tips', 4)} ${pad('leaf', 5)} ${pad('crown', 5)} ${pad('seedl', 5)} ${pad('H', 6)} ${pad('W', 6)} ${pad('trunkW', 6)} ${pad('depth', 5)} ${pad('fill', 5)}  new`);
    let prevPaths = new Set<string>();
    let prevH = 0;
    for (const step of STEPS) {
      const s = at(seed, sp, step);
      const vis = s.leaves.filter((l) => l.visible);
      const crown = vis.filter((l) => l.kind === 'leaf' || l.kind === 'frond').length;
      const seedl = vis.filter((l) => l.kind === 'cotyledon' || l.kind === 'seedling').length;
      const H = GROUND_Y - s.bounds.minY;
      const W = s.bounds.maxX - s.bounds.minX;
      const trunk = s.branches.find((b) => b.path === 'T');
      const frame = measureFrame(320, 200, s, 'scene');
      const onScreen = (H * frame.scale) / frame.groundTop;
      const paths = new Set(s.branches.map((b) => b.path));
      const born = [...paths].filter((p) => !prevPaths.has(p));
      const byDepth = new Map<number, number>();
      for (const p of born) byDepth.set(p.length - 1, (byDepth.get(p.length - 1) ?? 0) + 1);
      const newText = [...byDepth.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([d, n]) => `d${d}:${n}`)
        .join(' ');
      lines.push(
        `${pad(step, 5)} ${pad(s.branches.length, 4)} ${pad(tips(s), 4)} ${pad(vis.length, 5)} ${pad(crown, 5)} ${pad(seedl, 5)} ${pad(H.toFixed(1), 6)} ${pad(W.toFixed(1), 6)} ${pad((trunk?.w0 ?? 0).toFixed(2), 6)} ${pad(s.maxDepth, 5)} ${pad(onScreen.toFixed(2), 5)}  ${newText}${prevH ? `  H+${(((H - prevH) / prevH) * 100).toFixed(0)}%` : ''}`,
      );
      prevPaths = paths;
      prevH = H;
    }
    // Quiet level-ups: steps 2..20 at which a seed gains no branch and no leaf
    // (rubric 2 then rests on the camera's >= 8 % alone).
    const quiet: string[] = [];
    for (const sd of SEEDS) {
      let prev = at(sd, sp, 1);
      for (let step = 2; step <= 20; step += 1) {
        const now = at(sd, sp, step);
        const prevB = new Set(prev.branches.map((b) => b.path));
        const prevL = new Set(prev.leaves.map((l) => l.path));
        const newB = now.branches.some((b) => !prevB.has(b.path));
        const newL = now.leaves.some((l) => !prevL.has(l.path));
        if (!newB && !newL) quiet.push(`${sd.slice(-2)}@${step}`);
        prev = now;
      }
    }
    lines.push(`  quiet level-ups (seed@step, 16 seeds): ${quiet.length ? quiet.join(' ') : 'none'}`);
    // Budget over 16 seeds.
    for (const step of [20, 40, 60]) {
      let maxT = 0;
      let maxL = 0;
      let minT = 1e9;
      let minL = 1e9;
      for (const sd of SEEDS) {
        const s = at(sd, sp, step + 0.5);
        maxT = Math.max(maxT, s.branches.length);
        maxL = Math.max(maxL, s.leaves.length);
        minT = Math.min(minT, s.branches.length);
        minL = Math.min(minL, s.leaves.length);
      }
      lines.push(`  budget step ${step}: branches ${minT}-${maxT}, leaves ${minL}-${maxL}`);
    }
    console.log(lines.join('\n'));
  }
});
