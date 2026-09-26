/**
 * Static reading schedules for "Bijbel in een jaar" (DAILY_HABIT_PLAN.md §4).
 *
 * Pure and DB-free. A schedule is fully determined by (planKey, track, version)
 * and the committed chapter weights (lib/data/bible-chapter-weights.ts), so it
 * is built once per process and memoised. Enrollments store `scheduleVersion`;
 * anything that would move a chapter to another day (weights, split rule,
 * constants below, strand makeup) needs a NEW version - the test suite pins a
 * hash per version to catch accidental changes.
 *
 * Tracks
 * - gemengd:  three strands side by side - 'ot' (OT without Psalmen and
 *             Spreuken), 'nt', 'poetry' (Psalmen then Spreuken). Every strand is
 *             paced over all N days by its own weight, so all three finish on
 *             the last day.
 * - canoniek: one strand 'all', Genesis to Openbaring.
 *
 * Split rule (no drift). With C(k) the running weight after chapter k, day d
 * ends at the chapter boundary whose C(k) is NEAREST to the cumulative target
 * for day d (ties: the earlier boundary). Targets are cumulative, so rounding
 * never accumulates. Every strand starts on day 1 and its last chapter falls on
 * day N. Chapters are never split.
 *
 * Balancing (gemengd only). A strand's target for day d is not just d/N of its
 * own weight but d/N of (own + other strands) minus what the other strands
 * already hold by day d, so a heavy NT or Psalm day is answered by a lighter OT
 * portion. The strands are placed OT, NT, poetry (finest-grained last), then
 * re-placed against each other for PLACEMENT_ROUNDS rounds. The result is
 * clamped so each strand stays within PACE_WINDOW_DAYS of its own even pace:
 * the three strands really do run side by side.
 *
 * At least one chapter per strand per day is enforced where the strand has at
 * least two chapters per day on average (OT in jaar-1, canoniek in jaar-1). In
 * jaar-2 the OT has 748 chapters for 730 days: forcing one every day would
 * override the weight split (OT ~49 days off its pace, much less even days),
 * so there only the day as a whole is guaranteed at least one chapter. NT (260)
 * and Psalmen+Spreuken (181) have fewer chapters than days in every plan and
 * necessarily rest on some days; Psalm 119 (the longest chapter) is one day of
 * its own in its strand, and the strand rests for the days it covers.
 */

import { BIBLE_CHAPTER_WEIGHTS } from '../data/bible-chapter-weights';
import type {
  BibleYearPlanKey,
  BibleYearPortion,
  BibleYearRef,
  BibleYearSchedule,
  BibleYearScheduleDay,
  BibleYearStrand,
  BibleYearTrackKey,
} from './types';

export const SCHEDULE_VERSION = 1;

export const PLAN_DAYS: Record<BibleYearPlanKey, number> = { 'jaar-1': 365, 'jaar-2': 730 };
export const PLAN_KEYS: readonly BibleYearPlanKey[] = ['jaar-1', 'jaar-2'];
export const TRACK_KEYS: readonly BibleYearTrackKey[] = ['gemengd', 'canoniek'];
export const TOTAL_CHAPTERS = 1189;

/** Part of SCHEDULE_VERSION 1 - changing either moves chapters. */
const PACE_WINDOW_DAYS = 7;
const PLACEMENT_ROUNDS = 3;

/** Order in which a day's portions are listed. */
const STRAND_ORDER: readonly BibleYearStrand[] = ['ot', 'nt', 'poetry', 'all'];

type WeightedRef = BibleYearRef & { weight: number };

const ALL_REFS: readonly WeightedRef[] = BIBLE_CHAPTER_WEIGHTS.flatMap((b) =>
  b.weights.map((weight, i) => ({ book: b.name, code: b.code, chapter: i + 1, weight })),
);

const TOTAL_WEIGHT = ALL_REFS.reduce((s, r) => s + r.weight, 0);

/** Calibration: the whole Bible in 365 days reads ~15 minutes a day. */
export const CHARS_PER_MINUTE = TOTAL_WEIGHT / (365 * 15);

const POETRY = new Set(['PS', 'PROV']);

type Strand = { strand: BibleYearStrand; refs: readonly WeightedRef[] };

/** Strands in placement order. */
function strandsFor(track: BibleYearTrackKey): Strand[] {
  if (track === 'canoniek') return [{ strand: 'all', refs: ALL_REFS }];
  const ntStart = BIBLE_CHAPTER_WEIGHTS.slice(0, 39).reduce((n, b) => n + b.weights.length, 0);
  return [
    { strand: 'ot', refs: ALL_REFS.slice(0, ntStart).filter((r) => !POETRY.has(r.code)) },
    { strand: 'nt', refs: ALL_REFS.slice(ntStart) },
    { strand: 'poetry', refs: ALL_REFS.filter((r) => POETRY.has(r.code)) },
  ];
}

/** Nearest boundary k (0..n) to a target given multiplied by `days`; ties go to the earlier one. */
function nearestBoundary(cum: readonly number[], days: number, scaledTarget: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] * days >= scaledTarget) hi = mid;
    else lo = mid + 1;
  }
  if (lo > 0 && scaledTarget - cum[lo - 1] * days <= cum[lo] * days - scaledTarget) return lo - 1;
  return lo;
}

/**
 * Day boundaries for one strand: `ends[d]` = number of chapters read after day d
 * (ends[0] = 0, ends[days] = weights.length).
 *
 * `placedCum[d]` is the weight the other strands hold after day d (length
 * days + 1; all zeros for a lone strand) and `placedTotal` their total. All
 * comparisons are multiplied by `days` and stay in exact integers (< 2^53).
 */
export function splitStrand(
  weights: readonly number[],
  days: number,
  placedCum: readonly number[] = new Array<number>(days + 1).fill(0),
  placedTotal = 0,
): number[] {
  const n = weights.length;
  const cum = [0];
  for (const w of weights) cum.push(cum[cum.length - 1] + w);
  const ownTotal = cum[n];
  const groupTotal = ownTotal + placedTotal;
  const ends = new Array<number>(days + 1).fill(0);
  for (let d = 1; d < days; d++) {
    const balanced = nearestBoundary(cum, days, d * groupTotal - days * placedCum[d]);
    const earliest = nearestBoundary(cum, days, Math.max(0, d - PACE_WINDOW_DAYS) * ownTotal);
    const latest = nearestBoundary(cum, days, Math.min(days, d + PACE_WINDOW_DAYS) * ownTotal);
    ends[d] = Math.max(ends[d - 1], Math.min(latest, Math.max(earliest, balanced)));
  }
  ends[days] = n;
  if (n >= 2 && days >= 2) {
    // Every strand starts on day 1 and ends on day N.
    ends[1] = Math.max(ends[1], 1);
    for (let d = 2; d < days; d++) ends[d] = Math.max(ends[d], ends[d - 1]);
    ends[days - 1] = Math.min(ends[days - 1], n - 1);
    for (let d = days - 2; d >= 1; d--) ends[d] = Math.min(ends[d], ends[d + 1]);
  }
  if (n >= 2 * days) {
    // At least one chapter every day: minimal forward, then backward nudge.
    for (let d = 1; d < days; d++) ends[d] = Math.max(ends[d], ends[d - 1] + 1);
    for (let d = days - 1; d >= 1; d--) ends[d] = Math.min(ends[d], ends[d + 1] - 1);
  }
  return ends;
}

/**
 * Give every empty day a chapter. The nearest day with two or more chapters
 * (earlier first on a tie) donates one, passed along day by day so each strand
 * keeps its order: every day in between hands one chapter to its neighbour and
 * gets one back. Within a day the strand with the most chapters gives.
 */
function fillEmptyDays(ends: number[][], days: number): void {
  const count = (i: number, d: number) => ends[i][d] - ends[i][d - 1];
  const dayCount = (d: number) => ends.reduce((s, _, i) => s + count(i, d), 0);
  const giver = (d: number) => {
    // Never take a strand's only chapter on day 1 or day N (strands start and end there).
    const edge = d === 1 || d === days;
    let best = -1;
    for (let i = 0; i < ends.length; i++) {
      if (count(i, d) === 0 || (edge && count(i, d) < 2)) continue;
      if (best === -1 || count(i, d) > count(best, d)) best = i;
    }
    if (best !== -1) return best;
    for (let i = 0; i < ends.length; i++) if (best === -1 || count(i, d) > count(best, d)) best = i;
    return best;
  };
  for (let d = 1; d <= days; d++) {
    if (dayCount(d) > 0) continue;
    let donor = 0;
    for (let off = 1; off < days && !donor; off++) {
      if (d - off >= 1 && dayCount(d - off) >= 2) donor = d - off;
      else if (d + off <= days && dayCount(d + off) >= 2) donor = d + off;
    }
    if (!donor) continue; // fewer chapters than days: cannot happen with 1189 chapters
    if (donor < d) {
      // Last chapter of day g moves to the start of day g + 1.
      for (let g = donor; g < d; g++) ends[giver(g)][g] -= 1;
    } else {
      // First chapter of day g moves to the end of day g - 1.
      for (let g = donor; g > d; g--) ends[giver(g)][g - 1] += 1;
    }
  }
}

function displayName(ref: BibleYearRef, plural: boolean): string {
  if (ref.code === 'PS') return plural ? 'Psalmen' : 'Psalm';
  return ref.book;
}

/** "Genesis 4-6", "Psalm 5", "Psalmen 5-6", "Genesis 50 - Exodus 2". */
export function portionLabel(refs: readonly BibleYearRef[]): string {
  if (refs.length === 0) return '';
  const first = refs[0];
  const last = refs[refs.length - 1];
  if (first.code === last.code) {
    if (refs.length === 1) return `${displayName(first, false)} ${first.chapter}`;
    return `${displayName(first, true)} ${first.chapter}-${last.chapter}`;
  }
  return `${displayName(first, false)} ${first.chapter} - ${displayName(last, false)} ${last.chapter}`;
}

export function minutesForWeight(weight: number): number {
  return Math.max(1, Math.round(weight / CHARS_PER_MINUTE));
}

function build(planKey: BibleYearPlanKey, track: BibleYearTrackKey): BibleYearSchedule {
  const totalDays = PLAN_DAYS[planKey];
  const strands = strandsFor(track);
  const weights = strands.map((s) => s.refs.map((r) => r.weight));
  const totals = weights.map((w) => w.reduce((a, b) => a + b, 0));
  const ends: number[][] = strands.map(() => []);
  // cums[i][d] = weight of strand i read after day d.
  const cums: number[][] = strands.map(() => new Array<number>(totalDays + 1).fill(0));
  const recount = (i: number) => {
    for (let d = 1; d <= totalDays; d++) {
      let w = 0;
      for (let k = ends[i][d - 1]; k < ends[i][d]; k++) w += weights[i][k];
      cums[i][d] = cums[i][d - 1] + w;
    }
  };

  const rounds = strands.length > 1 ? PLACEMENT_ROUNDS : 1;
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < strands.length; i++) {
      // Round 0: balance against the strands placed before this one; later
      // rounds: against all the others as they now stand.
      const others = strands.map((_, j) => j).filter((j) => j !== i && (round > 0 || j < i));
      const placedCum = new Array<number>(totalDays + 1).fill(0);
      for (const j of others) for (let d = 0; d <= totalDays; d++) placedCum[d] += cums[j][d];
      const placedTotal = others.reduce((s, j) => s + totals[j], 0);
      ends[i] = splitStrand(weights[i], totalDays, placedCum, placedTotal);
      recount(i);
    }
  }
  fillEmptyDays(ends, totalDays);
  strands.forEach((_, i) => recount(i));

  const days: BibleYearScheduleDay[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const portions: BibleYearPortion[] = [];
    let weight = 0;
    strands.forEach(({ strand, refs }, i) => {
      const slice = refs.slice(ends[i][d - 1], ends[i][d]);
      if (slice.length === 0) return;
      const portionRefs = slice.map(({ book, code, chapter }) => ({ book, code, chapter }));
      portions.push({ strand, label: portionLabel(portionRefs), refs: portionRefs });
      weight += cums[i][d] - cums[i][d - 1];
    });
    portions.sort((a, b) => STRAND_ORDER.indexOf(a.strand) - STRAND_ORDER.indexOf(b.strand));
    days.push({ day: d, portions, minutes: minutesForWeight(weight) });
  }

  return { planKey, track, version: SCHEDULE_VERSION, totalDays, days };
}

const memo = new Map<string, BibleYearSchedule>();

export function isPlanKey(v: unknown): v is BibleYearPlanKey {
  return typeof v === 'string' && (PLAN_KEYS as readonly string[]).includes(v);
}

export function isTrackKey(v: unknown): v is BibleYearTrackKey {
  return typeof v === 'string' && (TRACK_KEYS as readonly string[]).includes(v);
}

export function isKnownScheduleVersion(v: unknown): v is number {
  return v === SCHEDULE_VERSION;
}

/**
 * The static schedule. Memoised; treat the result as read-only (it is shared
 * between callers). Throws a RangeError for an unknown plan, track or version.
 */
export function getSchedule(
  planKey: BibleYearPlanKey,
  track: BibleYearTrackKey,
  version: number = SCHEDULE_VERSION,
): BibleYearSchedule {
  if (!isPlanKey(planKey)) throw new RangeError(`unknown bible-year plan "${planKey}"`);
  if (!isTrackKey(track)) throw new RangeError(`unknown bible-year track "${track}"`);
  if (!isKnownScheduleVersion(version)) throw new RangeError(`unknown bible-year schedule version ${version}`);
  const key = `${planKey}|${track}|${version}`;
  let s = memo.get(key);
  if (!s) {
    s = build(planKey, track);
    memo.set(key, s);
  }
  return s;
}

/** Day `day` (1-based) of a schedule, or null when out of range. */
export function getScheduleDay(schedule: BibleYearSchedule, day: number): BibleYearScheduleDay | null {
  if (!Number.isInteger(day) || day < 1 || day > schedule.totalDays) return null;
  return schedule.days[day - 1];
}

/** Average minutes per day for a plan length (15 for jaar-1, 8 for jaar-2). */
export function minutesPerDay(planKey: BibleYearPlanKey): number {
  return Math.round((365 * 15) / PLAN_DAYS[planKey]);
}

/** Label of a whole day: its portion labels joined, e.g. "Genesis 1-2, Mattheüs 1, Psalm 1". */
export function dayLabel(day: BibleYearScheduleDay): string {
  return day.portions.map((p) => p.label).join(', ');
}
