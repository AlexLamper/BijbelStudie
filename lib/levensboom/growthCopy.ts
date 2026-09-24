import { xpForLevel } from './client';
import { levelForStep, MATURE, ringsForStep, STEPS_TOTAL, structuralStep, type GrowthFloor } from './growth';
import { phaseForStep } from './stages';
import { fruitAtLevel, traitAtLevel, TRAIT_LABELS, type SpiritFruit } from './traits';

/**
 * Every growth-v2 string the reader sees, as plain functions.
 *
 * Plan: LEVENSBOOM_GROWTH_PLAN.md §9 (the copy is the plan's, word for word,
 * except where a case below says why it had to add a line). Mirror:
 * `lib/features/levensboom/domain/growth_copy.dart` - the app shows the same
 * sentences, so every branch here exists there too and the tests in
 * `tests/levensboomGrowthCopy.test.ts` are the fixtures both sides agree on.
 *
 * Two rules hold everywhere (§9.1):
 * - The step is the tree's and the level is the account's. Both show, but
 *   never inside one sentence; a "Niveau 9 · stap 9 van 20" label is two
 *   labels, not a sentence.
 * - A phase name is capitalised in a pill or header ("Jonge boom · stap 9 van
 *   20") and lowercase inside a sentence ("Je boom is nu een jonge boom").
 *
 * Nothing here reads a clock, a locale or the DOM, so web and app format the
 * same number the same way ("2.100", not whatever `toLocaleString` does on a
 * given phone).
 */

/** The seen-key that records the one-time growth-v2 card (§9.6). */
export const GROWTH_ANNOUNCEMENT_KEY = 'growth-v2';

/** Dutch thousands: 2100 -> "2.100". Whole numbers only; XP never has a fraction. */
export function formatXp(value: number): string {
  const n = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "1 jaarring", "3 jaarringen". */
export function ringsLabel(rings: number): string {
  const n = Math.max(0, Math.floor(rings));
  return `${n} ${n === 1 ? 'jaarring' : 'jaarringen'}`;
}

/** Inside a sentence the phase is a common noun: "een jonge boom". */
export function phaseInSentence(name: string): string {
  return name.toLowerCase();
}

/**
 * The pill and header form (§9.4, studio pill): "Jonge boom · stap 9 van 20",
 * and past step 20 "Eeuwenoude boom · 3 jaarringen".
 */
export function growthPill(step: number): string {
  const phase = phaseForStep(step);
  if (step > STEPS_TOTAL) return `${phase.name} · ${ringsLabel(ringsForStep(step))}`;
  return `${phase.name} · stap ${Math.max(1, Math.floor(step))} van ${STEPS_TOTAL}`;
}

/**
 * The studio's "Volgende fase →" label: "Volwassen boom · stap 13". The
 * Eeuwenoude boom has no step of its own in "van 20" terms, so it comes
 * "na stap 20".
 */
export function nextPhaseLabel(next: { name: string; fromStep: number }): string {
  return next.fromStep > STEPS_TOTAL ? `${next.name} · na stap ${STEPS_TOTAL}` : `${next.name} · stap ${next.fromStep}`;
}

/** A phase section's range on the ladder: "stap 7–12", "stap 21+". */
export function phaseRangeLabel(from: number, to: number | null): string {
  if (to === null) return `stap ${from}+`;
  return from === to ? `stap ${from}` : `stap ${from}–${to}`;
}

// ---------------------------------------------------------------------------
// Progress towards the next step (Groei header, dashboard strip, ladder "Nu")
// ---------------------------------------------------------------------------

export type StepProgress = {
  step: number;
  nextStep: number;
  /** The level at which this account reached `step`, and reaches `nextStep`. */
  stepLevel: number;
  nextStepLevel: number;
  xpToNextStep: number;
  /** 0..1 of the XP between the two steps. For an account without a floor this is the level's own progress. */
  frac: number;
  /** `frac` as a whole percent, rounded down so "100 %" only ever means done. */
  percent: number;
};

/**
 * Where an account stands between two steps, in XP. With a floor a step can
 * take more than one level, so this is measured from the level the step was
 * reached at to the level the next one is (`levelForStep`), never from the
 * level alone.
 */
export function stepProgress(xp: number, level: number, floor?: GrowthFloor | null): StepProgress {
  const step = structuralStep(level, floor);
  const nextStep = step + 1;
  const stepLevel = Math.min(Math.max(1, Math.floor(level)), levelForStep(step, floor));
  const nextStepLevel = levelForStep(nextStep, floor);
  const fromXp = xpForLevel(stepLevel);
  const toXp = xpForLevel(nextStepLevel);
  const safe = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const span = Math.max(1, toXp - fromXp);
  const frac = Math.min(1, Math.max(0, (safe - fromXp) / span));
  return {
    step,
    nextStep,
    stepLevel,
    nextStepLevel,
    xpToNextStep: Math.max(0, toXp - safe),
    frac,
    percent: Math.min(99, Math.floor(frac * 100)),
  };
}

/**
 * "nog 740 XP tot stap 10" under the Groei header. Step 20 has no "stap 21 van
 * 20", so the plan's jaarring takes over from there.
 */
export function xpToNextStepText(step: number, xpToNextStep: number): string {
  const xp = `nog ${formatXp(xpToNextStep)} XP`;
  if (step < STEPS_TOTAL) return `${xp} tot stap ${step + 1}`;
  if (step === STEPS_TOTAL) return `${xp} tot de eerste jaarring`;
  return `${xp} tot de volgende jaarring`;
}

// ---------------------------------------------------------------------------
// Dashboard strip (§9.5)
// ---------------------------------------------------------------------------

/**
 * Line 1 of the strip: "Stap 9 van 20 · nog 740 XP tot stap 10", past 20
 * "Eeuwenoude boom · 3 jaarringen · nog 2.100 XP tot de volgende".
 *
 * `withPhase: false` drops the leading phase past 20, for a surface whose
 * title already says "Eeuwenoude boom" (the dashboard card).
 */
export function stripLine(step: number, xpToNextStep: number, opts: { withPhase?: boolean } = {}): string {
  const xp = `nog ${formatXp(xpToNextStep)} XP`;
  if (step > STEPS_TOTAL) {
    const rings = `${ringsLabel(ringsForStep(step))} · ${xp} tot de volgende`;
    return opts.withPhase === false ? rings : `${phaseForStep(step).name} · ${rings}`;
  }
  if (step === STEPS_TOTAL) return `Stap ${STEPS_TOTAL} van ${STEPS_TOTAL} · ${xp} tot de eerste jaarring`;
  return `Stap ${step} van ${STEPS_TOTAL} · ${xp} tot stap ${step + 1}`;
}

/**
 * Line 2: the next level-gated unlock, "nog 340 XP → Palmboom" - only when it
 * arrives no later than the next step, so the strip never points past the
 * thing the tree is growing towards.
 */
export function stripUnlockLine(
  unlock: { name: string; level: number } | null | undefined,
  xp: number,
  nextStepLevel: number,
): string | null {
  if (!unlock || unlock.level > nextStepLevel) return null;
  const toGo = Math.max(0, xpForLevel(unlock.level) - Math.max(0, xp));
  return `nog ${formatXp(toGo)} XP → ${unlock.name}`;
}

// ---------------------------------------------------------------------------
// Groei ladder (§9.4)
// ---------------------------------------------------------------------------

export function ladderStepLabel(step: number): string {
  return `Stap ${step}`;
}

export function ladderLevelLabel(level: number): string {
  return `Niveau ${level}`;
}

/** "Behaald", "Nu · 62 %" or "Niveau 12" (the level this account reaches that step at). */
export function ladderStatus(step: number, current: { step: number; percent: number }, reachLevel: number): string {
  if (step < current.step) return 'Behaald';
  if (step === current.step) return `Nu · ${current.percent} %`;
  return `Niveau ${reachLevel}`;
}

export const FLOOR_EXPLAINER =
  'Je boom had al een voorsprong van vóór de nieuwe groei. Die houdt hij, en hij groeit gewoon verder.';

/** The explainer shows for an account with a head start, until its tree reaches step 20. */
export function showsFloorExplainer(step: number, floor: GrowthFloor | null | undefined): boolean {
  return !!floor && step < STEPS_TOTAL;
}

/** What maturing adds past step 20, by step (plan §4.5; render-only in the engine). */
export const MATURING: readonly { step: number; label: string }[] = [
  { step: MATURE.knotsFrom, label: 'Knoesten in de schors' },
  { step: MATURE.mossFrom, label: 'Mos aan de voet' },
  { step: MATURE.flareFrom, label: 'Wortels boven de grond' },
];

/** "Mos aan de voet bij niveau 26": the next thing maturing brings, or null once all of it is there. */
export function maturingNextLine(step: number, floor?: GrowthFloor | null): string | null {
  const next = MATURING.find((m) => m.step > step);
  if (!next) return null;
  return `${next.label} bij niveau ${levelForStep(next.step, floor)}`;
}

// ---------------------------------------------------------------------------
// "Bekijk de hele groei": the studio's playback of steps 1 to 30
// ---------------------------------------------------------------------------

/** The playback's labels. The step pill under the tree is `growthPill`. */
export const WHOLE_GROWTH = {
  open: 'Bekijk de hele groei',
  play: 'Afspelen',
  pause: 'Pauzeer',
  restart: 'Opnieuw',
  toNow: 'Naar nu',
  now: 'Nu',
  close: 'Sluiten',
} as const;

/**
 * "Zo groeit je eik". Inside the sentence the species is a common noun, so its
 * first letter drops to lowercase - only the first, so a place name in it
 * stays a name: "Zo groeit je ceder van de Libanon".
 */
export function wholeGrowthTitle(speciesName: string): string {
  const name = speciesName.trim();
  return `Zo groeit je ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/**
 * The line under the playback's pill, for the step on screen against the
 * tree's own step: "Behaald op niveau 7.", "Hier ben je nu." or "Stap 14
 * bereik je op niveau 14.". The level is the one this account stands on that
 * step at (`levelForStep`), so a head start reads as it happened: the steps it
 * skipped were "Behaald op niveau 1.".
 *
 * The future line names a step and a level in one sentence, which §9.1 keeps
 * apart everywhere else. It is the owner's wording for this surface, and the
 * app mirrors it word for word.
 */
export function wholeGrowthLine(step: number, currentStep: number, floor?: GrowthFloor | null): string {
  const n = Math.max(1, Math.floor(step));
  const now = Math.max(1, Math.floor(currentStep));
  if (n === now) return 'Hier ben je nu.';
  const level = levelForStep(n, floor);
  return n < now ? `Behaald op niveau ${level}.` : `Stap ${n} bereik je op niveau ${level}.`;
}

// ---------------------------------------------------------------------------
// Level-up card (§9.3)
// ---------------------------------------------------------------------------

export type LevelUpCase = 'phase' | 'step' | 'floored' | 'grown' | 'ring';

export type LevelUpCopy = {
  case: LevelUpCase;
  title: string;
  subtitle: string;
  line: string | null;
  /** The tree's step after the level-up, and before it. */
  step: number;
  fromStep: number;
  fruit: SpiritFruit | null;
};

/** Geduld and geloof are het-words; every other fruit takes "de". */
function fruitArticle(name: string): string {
  return name === 'Geduld' || name === 'Geloof' ? 'Het' : 'De';
}

/** The fruit line the card has always shown, with the article fixed for the two het-words. */
export function fruitLine(fruit: SpiritFruit): string {
  return `${fruitArticle(fruit.name)} ${fruit.name.toLowerCase()} hangt nu aan je boom - een vrucht van de Geest, ${fruit.reference}.`;
}

function traitLine(level: number): string | null {
  const trait = traitAtLevel(level);
  // The fruit trait arrives with a named fruit, whose line says more.
  return trait && trait !== 'fruit' ? TRAIT_LABELS[trait] : null;
}

/**
 * Title, subtitle and line for the level-up card.
 *
 * `fromLevel` is the level the reader last saw (`lastSeenLevel`); a jump of
 * several levels is one card, judged from there. The cases, first match wins:
 *
 * - no whole step crossed (only a floored account's slower steps can do this)
 * - step 20 reached ("volgroeid"; before "new phase" so a jump from 12 to 20
 *   still reads as fully grown)
 * - a new phase, the Eeuwenoude boom included
 * - past 20: a jaarring
 * - otherwise a new step in the same phase
 *
 * A fruit adds " - {fruit}" to the subtitle and takes the line, as before.
 * One addition to the plan's table: at step 20 the jaarring sentence is the
 * only place the reader learns what happens next, and an account without a
 * floor always gets the geloof fruit at level 20 - so there the two lines
 * are joined instead of the fruit replacing it.
 */
export function levelUpCopy(input: { level: number; fromLevel?: number | null; floor?: GrowthFloor | null }): LevelUpCopy {
  const level = Math.max(1, Math.floor(input.level));
  const fromLevel = Math.max(1, Math.min(level - 1, Math.floor(input.fromLevel ?? level - 1)));
  const step = structuralStep(level, input.floor);
  const fromStep = Math.min(step, structuralStep(fromLevel, input.floor));
  const phase = phaseForStep(step);
  const fromPhase = phaseForStep(fromStep);
  const fruit = fruitAtLevel(level);
  const extra = fruit ? fruitLine(fruit) : traitLine(level);
  const suffix = fruit ? ` - ${fruit.name}` : '';
  const stepLabel = `Niveau ${level} · stap ${step} van ${STEPS_TOTAL}${suffix}`;
  const ringLabel = `Niveau ${level} · ${ringsLabel(ringsForStep(step))}${suffix}`;
  const base = { step, fromStep, fruit };

  if (step === fromStep) {
    const towards = step < STEPS_TOTAL ? `Hij groeit verder naar stap ${step + 1}.` : 'Hij groeit verder naar de volgende jaarring.';
    return {
      ...base,
      case: 'floored',
      title: 'Je boom is gegroeid',
      subtitle: `Niveau ${level}${suffix}`,
      line: fruit ? fruitLine(fruit) : towards,
    };
  }

  if (step === STEPS_TOTAL) {
    const grown = 'Vanaf nu komt er met elk niveau een jaarring bij.';
    return {
      ...base,
      case: 'grown',
      title: 'Je boom is volgroeid',
      subtitle: stepLabel,
      line: fruit ? `${grown} ${fruitLine(fruit)}` : grown,
    };
  }

  if (phase.index > fromPhase.index) {
    return {
      ...base,
      case: 'phase',
      title: `Je boom is nu een ${phaseInSentence(phase.name)}`,
      subtitle: step > STEPS_TOTAL ? ringLabel : stepLabel,
      line: fruit ? fruitLine(fruit) : phase.blurb,
    };
  }

  if (step > STEPS_TOTAL) {
    const gained = ringsForStep(step) - ringsForStep(fromStep);
    return {
      ...base,
      case: 'ring',
      title: gained > 1 ? `Er zijn ${gained} jaarringen bij` : 'Er is een jaarring bij',
      subtitle: ringLabel,
      line: extra,
    };
  }

  return {
    ...base,
    case: 'step',
    title: 'Je boom is gegroeid',
    subtitle: stepLabel,
    line: extra ?? 'Er is nieuw hout bijgekomen.',
  };
}

// ---------------------------------------------------------------------------
// One-time announcement (§9.6)
// ---------------------------------------------------------------------------

export const GROWTH_ANNOUNCEMENT = {
  title: 'Je boom groeit nu in twintig stappen',
  body:
    'Vanaf vandaag groeit je boom langzamer en in meer stappen, met elke les en elk hoofdstuk een stukje. ' +
    'Hij blijft minstens zo groot als hij was. Bij stap 20 is hij volgroeid; daarna komt er met elk niveau een jaarring bij.',
  open: 'Bekijk je groei',
  close: 'Sluiten',
} as const;

/** Show the card: an account from before the launch that has not dismissed it yet. */
export function showsGrowthAnnouncement(tree: { announceGrowth?: boolean; seenItems?: readonly string[]; disabled?: boolean } | null | undefined): boolean {
  if (!tree || tree.disabled || !tree.announceGrowth) return false;
  return !(tree.seenItems ?? []).includes(GROWTH_ANNOUNCEMENT_KEY);
}
