import { beforeAll, it } from 'vitest';
import { SPECIES, SPECIES_IDS, type TreeForm } from '../../lib/levensboom/species';
import { phaseForStep, STAGES, type StageId } from '../../lib/levensboom/stages';
import { fitScale, writeSheet, type Cell, type Group, type Line, type SheetSpec } from './sheetKit';
import { counts, DASHBOARD, SEEDS, shortSeed, treeCell, v1Cell } from './sheetTrees';

/**
 * `npm run tree:sheet` - PNG contact sheets of the tree for the design pass
 * (LEVENSBOOM_GROWTH_PLAN.md §10.2). Output: design/levensboom/sheets/ (gitignored).
 *
 * One `it` per sheet, so `npm run tree:sheet -- -t growth-branching` renders
 * just that one. `-t film` renders all 13 films; a plain run renders only
 * `film-eik`.
 *
 * Every sheet reads the live generator, growth table and camera, so after an
 * edit to `growth.ts` a rerun shows the change.
 */

const W = DASHBOARD.width;
const H = DASHBOARD.height;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function span(steps: readonly number[]): string {
  // "1-8", or "17-20, 25, 30, 40" when the run breaks.
  const runs: string[] = [];
  let start = steps[0];
  let prev = steps[0];
  for (const step of [...steps.slice(1), Number.NaN]) {
    if (step === prev + 1) {
      prev = step;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = step;
    prev = step;
  }
  return runs.join(', ');
}

/** Yield so the vitest worker can answer its RPC heartbeats between heavy cells. */
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

const phaseName = (step: number) => phaseForStep(step).name;
const SCENE_NOTE = 'Summer, day, scene waterbeken, health 1, every leaf drawn (svg.ts).';
const POSITION_NOTE = 'Position = step, frac 0: the moment the step arrives, so half the leaves are still buds.';

// ---------------------------------------------------------------------------
// growth-<form>: 3 seeds x steps 1-20, 25, 30, 40
// ---------------------------------------------------------------------------

const GROWTH_STEPS = [...range(1, 20), 25, 30, 40];
const FORM_SPECIES: Record<TreeForm, string> = { branching: 'eik', conical: 'ceder', palm: 'palm' };

function growthSheet(form: TreeForm): SheetSpec {
  const species = FORM_SPECIES[form];
  const bands = chunk(GROWTH_STEPS, 8);
  const scale = fitScale(W, 8);
  const lines: Line[] = [];
  for (const band of bands) {
    SEEDS.forEach((seed, s) => {
      const cells = band.map((step) => {
        const { cell, scene } = treeCell({ seed, species, position: step, width: W, height: H, scale });
        cell.label = `${step} · ${phaseName(step)}`;
        cell.note = counts(scene);
        return cell;
      });
      lines.push({ heading: s === 0 ? `Steps ${span(band)}` : undefined, groups: [{ label: 'seed', sublabel: shortSeed(seed), cells }] });
    });
  }
  return {
    name: `growth-${form}`,
    title: `growth-${form} · ${species} · 3 seeds × steps 1-20, 25, 30, 40`,
    subtitle: [
      `Scene framing at dashboard size 320×200, shown at ${Math.round(scale * 100)} %. ${POSITION_NOTE}`,
      `${SCENE_NOTE} Bottom right: branches (t) · visible leaves (b).`,
    ],
    lines,
  };
}

// ---------------------------------------------------------------------------
// species-<phase>: 13 species x the steps of one phase
// ---------------------------------------------------------------------------

type SpeciesSheet = { file: string; phase: StageId; steps: number[]; perLine: number; maxScale: number };

const SPECIES_SHEETS: SpeciesSheet[] = [
  { file: 'species-kiem', phase: 'kiem', steps: [1, 2], perLine: 3, maxScale: 1 },
  { file: 'species-scheut', phase: 'zaailing', steps: [3, 4, 5, 6], perLine: 2, maxScale: 1 },
  { file: 'species-jonge_boom', phase: 'jonge_boom', steps: range(7, 12), perLine: 1, maxScale: 0.6 },
  { file: 'species-volwassen_boom', phase: 'volwassen_boom', steps: range(13, 20), perLine: 1, maxScale: 0.6 },
  { file: 'species-eeuwenoude_boom', phase: 'eeuwenoude_boom', steps: [21, 25, 30, 40, 60], perLine: 1, maxScale: 0.6 },
];

function speciesSheet(def: SpeciesSheet): SheetSpec {
  const stage = STAGES.find((s) => s.id === def.phase)!;
  const scale = Math.min(def.maxScale, fitScale(W, def.steps.length, def.perLine));
  const seed = SEEDS[0];
  const groups: Group[] = SPECIES_IDS.map((species) => ({
    label: species,
    sublabel: SPECIES[species].form,
    cells: def.steps.map((step) => {
      const { cell, scene } = treeCell({ seed, species, position: step, width: W, height: H, scale });
      cell.label = `step ${step}`;
      cell.note = counts(scene);
      return cell;
    }),
  }));
  return {
    name: def.file,
    title: `${def.file} · ${stage.name} (steps ${span(def.steps)}) · 13 species · seed ${shortSeed(seed)}`,
    subtitle: [
      `Scene framing at dashboard size 320×200, shown at ${Math.round(scale * 100)} %. ${POSITION_NOTE}`,
      `${SCENE_NOTE} Bottom right: branches (t) · visible leaves (b).`,
    ],
    lines: chunk(groups, def.perLine).map((line) => ({ groups: line })),
  };
}

// ---------------------------------------------------------------------------
// film-<species>: positions 1.0 -> 20.0 in quarter steps
// ---------------------------------------------------------------------------

async function filmSheet(species: string): Promise<SheetSpec> {
  const seed = SEEDS[0];
  const perLine = 12;
  const labelWidth = 64;
  const scale = fitScale(W, perLine, 1, labelWidth);
  const positions = Array.from({ length: 77 }, (_, i) => 1 + i * 0.25);
  const lines: Line[] = [];
  for (const row of chunk(positions, perLine)) {
    const cells: Cell[] = row.map((position) => {
      const whole = Number.isInteger(position);
      const { cell } = treeCell({ seed, species, position, width: W, height: H, scale, accent: whole });
      cell.label = position.toFixed(2);
      return cell;
    });
    lines.push({ groups: [{ label: `${Math.floor(row[0])}-${Math.floor(row[row.length - 1])}`, sublabel: 'steps', cells }] });
    await breathe();
  }
  return {
    name: `film-${species}`,
    title: `film-${species} · seed ${shortSeed(seed)} · positions 1.00 → 20.00 in steps of 0.25`,
    subtitle: [
      `Scene framing 320×200 shown at ${Math.round(scale * 100)} %. Teal frame = a whole step (level-up: new topology, frac back to 0).`,
      `Between frames only size, camera and bud opening change (frac = position - step). ${SCENE_NOTE}`,
    ],
    labelWidth,
    lines,
  };
}

// ---------------------------------------------------------------------------
// sizes: real pixel sizes of every surface
// ---------------------------------------------------------------------------

const SIZE_STEPS = [1, 3, 6, 10, 15, 20, 30];
const PORTRAITS = [16, 26, 28, 32, 56, 176];

function sizeLines(width: number, height: number, perLine: number, framing: 'scene' | 'portrait'): Line[] {
  const seed = SEEDS[0];
  return chunk(SIZE_STEPS, perLine).map((steps) => ({
    groups: [
      {
        label: `${width}×${height}`,
        cells: steps.map((step) => treeCell({ seed, species: 'eik', position: step, width, height, scale: 1, framing, label: `step ${step}` }).cell),
      },
    ],
  }));
}

const SIZES_SUBTITLE = [
  `eik · seed ${shortSeed(SEEDS[0])} · steps ${SIZE_STEPS.join(', ')} · ${POSITION_NOTE}`,
  `${SCENE_NOTE} Rendered at 1× CSS pixels; a 2× screen shows these sharper, not bigger.`,
];

function sizesSheet(): SheetSpec {
  const seed = SEEDS[0];
  const portraitLines: Line[] = PORTRAITS.map((px, i) => ({
    heading: i === 0 ? 'Portrait framing, real size (1×), cropped to a disc as the UI does. Fit-to-bounds below 32 px.' : undefined,
    groups: [
      {
        label: `${px} px`,
        cells: SIZE_STEPS.map(
          (step) =>
            treeCell({
              seed,
              species: 'eik',
              position: step,
              width: px,
              height: px,
              scale: 1,
              framing: 'portrait',
              disc: true,
              slot: 180,
              labelBelow: true,
              label: `step ${step}`,
            }).cell,
        ),
      },
    ],
  }));
  const dashboard = sizeLines(320, 200, 4, 'scene');
  dashboard[0].heading = 'Dashboard strip, scene framing, real size';
  return {
    name: 'sizes',
    title: 'sizes · portraits and the dashboard strip at real size',
    subtitle: SIZES_SUBTITLE,
    lines: [...portraitLines, ...dashboard],
  };
}

/** The two big scene surfaces get their own sheets: at real size, one sheet would be 3,400 px tall. */
function sizesLessonSheet(): SheetSpec {
  const lines = sizeLines(246, 470, 4, 'scene');
  lines[0].heading = 'Lesson moment (LessonTreeMoment), scene framing, real size';
  return { name: 'sizes-lesson', title: 'sizes-lesson · the lesson moment at real size (246×470)', subtitle: SIZES_SUBTITLE, lines };
}

function sizesCardSheet(): SheetSpec {
  const lines = sizeLines(600, 375, 2, 'scene');
  lines[0].heading = 'Public card (/gebruiker, 16:10), scene framing, real size';
  return { name: 'sizes-card', title: 'sizes-card · the public card at real size (600×375)', subtitle: SIZES_SUBTITLE, lines };
}

// ---------------------------------------------------------------------------
// baseline-v1: today's tree, today's camera
// ---------------------------------------------------------------------------

function baselineSheet(): SheetSpec {
  const seed = SEEDS[0];
  const rows = ['eik', 'ceder', 'palm'];
  const scale = fitScale(W, 8);
  const lines: Line[] = [];
  for (const band of chunk(range(1, 30), 8)) {
    rows.forEach((species, r) => {
      lines.push({
        heading: r === 0 ? `Levels ${span(band)}` : undefined,
        groups: [
          {
            label: species,
            sublabel: SPECIES[species as keyof typeof SPECIES].form,
            cells: band.map((level) => v1Cell({ seed, species, level, width: W, height: H, scale, label: `level ${level}` })),
          },
        ],
      });
    });
  }
  return {
    name: 'baseline-v1',
    title: `baseline-v1 · today's tree (v1 generator) at levels 1-30 · seed ${shortSeed(seed)}`,
    subtitle: [
      `The house-style reference. v1 camera: fit to the bounds, never less than 26 × 34 units. 320×200 shown at ${Math.round(scale * 100)} %, frac 0.5.`,
      SCENE_NOTE,
    ],
    lines,
  };
}

// ---------------------------------------------------------------------------
// levelup-eik: what a level-up adds
// ---------------------------------------------------------------------------

function levelupSheet(species: string): SheetSpec {
  const seed = SEEDS[0];
  const perLine = 3;
  const labelWidth = 80;
  const scale = fitScale(W, 2, perLine, labelWidth);
  const groups: Group[] = range(1, 20).map((k) => {
    // The same size (position k+1) before and after: only what the level-up
    // itself adds differs - new wood at its bud length, new leaves, traits,
    // fruit, and frac dropping back to 0 (leaves closing to buds).
    const before = treeCell({ seed, species, position: k + 1, step: k, level: k, width: W, height: H, scale, label: `end of ${k}` });
    const after = treeCell({ seed, species, position: k + 1, step: k + 1, level: k + 1, width: W, height: H, scale, accent: true, label: `step ${k + 1}` });
    const dBranches = after.scene.branches.length - before.scene.branches.length;
    const visible = (cell: typeof before) => cell.scene.leaves.filter((leaf) => leaf.visible).length;
    const dLeaves = visible(after) - visible(before);
    before.cell.note = counts(before.scene);
    after.cell.note = counts(after.scene);
    return {
      label: `${k} → ${k + 1}`,
      sublabel: `${dBranches >= 0 ? '+' : ''}${dBranches} t ${dLeaves >= 0 ? '+' : ''}${dLeaves} b`,
      cells: [before.cell, after.cell],
    };
  });
  return {
    name: `levelup-${species}`,
    title: `levelup-${species} · what each level-up adds · seed ${shortSeed(seed)}`,
    subtitle: [
      'Left: the end of step k (position k+1, still step k, frac 1). Right (teal): step k+1 at the same position, frac 0.',
      `Same size, so the difference is the new topology, traits and fruit. Scene 320×200 at ${Math.round(scale * 100)} %. ${SCENE_NOTE}`,
    ],
    labelWidth,
    lines: chunk(groups, perLine).map((line) => ({ groups: line })),
  };
}

// ---------------------------------------------------------------------------
// The tests: one per sheet
// ---------------------------------------------------------------------------

/** True when every selected test is a film (`-t film`, `-t film-wilg`): then every film renders. */
let filmsOnly = false;

beforeAll((file) => {
  const selected = file.tasks.filter((task) => task.mode === 'run' || task.mode === 'only');
  filmsOnly = selected.length > 0 && selected.every((task) => task.name.startsWith('film-'));
});

for (const form of ['branching', 'conical', 'palm'] as const) {
  it(`growth-${form}`, async () => {
    await writeSheet(() => growthSheet(form));
  });
}

for (const def of SPECIES_SHEETS) {
  it(def.file, async () => {
    await writeSheet(() => speciesSheet(def));
  });
}

for (const species of SPECIES_IDS) {
  it(`film-${species}`, async (ctx) => {
    if (species !== 'eik' && !filmsOnly) {
      ctx.skip();
      return;
    }
    await writeSheet(() => filmSheet(species));
  });
}

it('sizes', async () => {
  for (const build of [sizesSheet, sizesLessonSheet, sizesCardSheet]) {
    await writeSheet(build);
    await breathe();
  }
});

it('baseline-v1', async () => {
  await writeSheet(() => baselineSheet());
});

it('levelup-eik', async () => {
  await writeSheet(() => levelupSheet('eik'));
});
