/**
 * The five growth phases: bands of growth steps with a name.
 *
 * Growth v2 (LEVENSBOOM_GROWTH_PLAN.md §4.1): the tree grows in 20 steps, one
 * per level, and the phase is what the strip under the avatar, the Groei
 * ladder and the level-up card call it - "Jonge boom · stap 9 van 20" reads as
 * something that happened, where "niveau 9" reads as a counter. From step 21
 * the tree is an Eeuwenoude boom and keeps maturing; every step past 20 is a
 * "jaarring".
 *
 * The ids are the v1 stage ids, unchanged, so nothing that stores or compares
 * them breaks. `zaailing` is shown as "Scheut".
 *
 * The step is the tree's; the level is the account's. For an account without
 * a growth floor they are the same number, with one they can differ
 * (`lib/levensboom/growth.ts`), which is why this takes a step and not a level.
 *
 * Mirror: `lib/features/levensboom/domain/stages.dart`. Contract: spec §4.1.
 */

export type StageId = 'kiem' | 'zaailing' | 'jonge_boom' | 'volwassen_boom' | 'eeuwenoude_boom';

export type StageDef = {
  id: StageId;
  name: string;
  /** First growth step of the band. */
  from: number;
  /** Last growth step of the band, or null for the open-ended last phase. */
  to: number | null;
  /** One line for the ladder and the level-up card. */
  blurb: string;
};

export const STAGES: readonly StageDef[] = [
  { id: 'kiem', name: 'Kiem', from: 1, to: 2, blurb: 'Het zaadje is open; de eerste blaadjes staan boven de grond.' },
  { id: 'zaailing', name: 'Scheut', from: 3, to: 6, blurb: 'Een jonge scheut die houtig wordt, met blad na blad.' },
  { id: 'jonge_boom', name: 'Jonge boom', from: 7, to: 12, blurb: 'De eerste takken; de kroon krijgt vorm.' },
  { id: 'volwassen_boom', name: 'Volwassen boom', from: 13, to: 20, blurb: 'Een volle kroon die elke stap breder wordt.' },
  { id: 'eeuwenoude_boom', name: 'Eeuwenoude boom', from: 21, to: null, blurb: 'Volgroeid. Met elk niveau komt er een jaarring bij.' },
];

export type Stage = StageDef & {
  index: number;
  /**
   * First step of the next phase, or null on the last one. Named `nextLevel`
   * because that is the key the v1 payload served; it is a step now.
   */
  nextLevel: number | null;
  nextName: string | null;
};

export function phaseForStep(step: number): Stage {
  const s = Math.max(1, Math.floor(step));
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (s >= STAGES[i].from) index = i;
  }
  const def = STAGES[index];
  const next = STAGES[index + 1] ?? null;
  return {
    ...def,
    index,
    nextLevel: next ? next.from : null,
    nextName: next ? next.name : null,
  };
}

/**
 * The phase an account without a growth floor is in at `level`.
 *
 * @deprecated Use `phaseForStep(growth.step)`: with a floor the step runs
 * ahead of the level.
 */
export function stageForLevel(level: number): Stage {
  return phaseForStep(level);
}

export function stageById(id: string): StageDef | undefined {
  return STAGES.find((stage) => stage.id === id);
}
