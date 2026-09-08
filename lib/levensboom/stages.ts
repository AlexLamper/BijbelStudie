/**
 * The five growth stages: level bands with a name.
 *
 * The stage is what the strip under the avatar, the Groei timeline and the
 * level-up card call the tree - "Jonge boom" reads as something that happened,
 * where "niveau 4" reads as a counter. Served in the API too, so an app build
 * older than a band change still shows the right word.
 *
 * Mirror: `lib/features/levensboom/domain/stages.dart`. Contract: spec §4.1.
 */

export type StageId = 'kiem' | 'zaailing' | 'jonge_boom' | 'volwassen_boom' | 'eeuwenoude_boom';

export type StageDef = {
  id: StageId;
  name: string;
  /** First level of the band. */
  from: number;
  /** One line for the timeline. */
  blurb: string;
};

export const STAGES: readonly StageDef[] = [
  { id: 'kiem', name: 'Kiem', from: 1, blurb: 'Twee blaadjes boven de grond.' },
  { id: 'zaailing', name: 'Zaailing', from: 2, blurb: 'De eerste vertakking.' },
  { id: 'jonge_boom', name: 'Jonge boom', from: 4, blurb: 'Een echte kroon; bloesem in het voorjaar.' },
  { id: 'volwassen_boom', name: 'Volwassen boom', from: 8, blurb: 'Vol in het blad en de eerste vrucht.' },
  { id: 'eeuwenoude_boom', name: 'Eeuwenoude boom', from: 16, blurb: 'Een tweede stam; blijft altijd groeien.' },
];

export type Stage = StageDef & {
  index: number;
  /** Last level of the band, or null for the open-ended last stage. */
  to: number | null;
  /** First level of the next stage, or null on the last one. */
  nextLevel: number | null;
  nextName: string | null;
};

export function stageForLevel(level: number): Stage {
  const lvl = Math.max(1, Math.floor(level));
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (lvl >= STAGES[i].from) index = i;
  }
  const def = STAGES[index];
  const next = STAGES[index + 1] ?? null;
  return {
    ...def,
    index,
    to: next ? next.from - 1 : null,
    nextLevel: next ? next.from : null,
    nextName: next ? next.name : null,
  };
}

export function stageById(id: string): StageDef | undefined {
  return STAGES.find((stage) => stage.id === id);
}
