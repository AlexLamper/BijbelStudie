/**
 * Every notification string this product sends, and the rules for choosing one.
 *
 * WHY THIS EXISTS. The app shipped with a single hardcoded reminder - "Tijd om
 * te lezen" / "Neem even de tijd voor je bijbelgedeelte." - repeated every day
 * forever. A string a reader has seen forty times is not a message any more,
 * it is furniture, and it gets swiped away without being read.
 *
 * WHAT IS TAKEN FROM DUOLINGO. Three things, and only three: variety at scale,
 * specificity over exhortation (name the book and chapter, do not say "time to
 * read"), and their published finding that backing off after a run of ignored
 * notifications *improves* retention rather than hurting it.
 *
 * WHAT IS NOT. The passive-aggressive mascot, manufactured urgency, loss
 * threats, guilt, emoji, exclamation marks. A person made to feel accused about
 * reading scripture does not merely churn - they resent the product that did
 * it, and they are right to. The tone here is a friend who noticed you left a
 * book open, not a coach with a whistle.
 *
 * HOUSE RULES, enforced by tests/notificationCopy.test.ts:
 * - title <= 32 characters, body <= 110 characters (Android's collapsed
 *   notification shows about that much and nothing more)
 * - no emoji, no exclamation marks, and the word "moet" never appears
 * - the specific noun goes in the first 30 characters
 * - every pool holds at least 3 variants needing no tokens at all, so a
 *   brand-new account with no reading history still gets a real message
 */

import { createHash } from 'crypto';

export type NotificationType =
  | 'daily_reading'
  | 'streak_risk'
  | 'streak_lost'
  | 'study_nudge';

/** Values a variant can interpolate. Absent keys remove a variant from the pool. */
export type CopyTokens = {
  voornaam?: string;
  boek?: string;
  hoofdstuk?: number;
  volgendHoofdstuk?: number;
  reeks?: number;
  vriesdagen?: number;
  studie?: string;
  les?: number;
  lessenTotaal?: number;
  plan?: string;
  plandag?: number;
  vers?: string;
  versverwijzing?: string;
};

export type Variant = {
  id: string;
  title: string;
  body: string;
  /** Token names that must resolve for this variant to be usable. */
  needs: (keyof CopyTokens)[];
};

export type RenderedNotification = {
  variantId: string;
  title: string;
  body: string;
  /** Route the notification opens. Web path; the app maps it in its router. */
  deepLink: string;
};

export const TITLE_MAX = 32;
export const BODY_MAX = 110;

/** A day text quoted in a notification is trimmed to this, at a word boundary. */
const VERSE_MAX = 80;

const DAILY_READING: Variant[] = [
  { id: 'd01', title: '{boek} {hoofdstuk} ligt open', body: 'Je was hier gebleven. Tien minuten is genoeg om verder te komen.', needs: ['boek', 'hoofdstuk'] },
  { id: 'd02', title: 'Verder in {boek}', body: 'Hoofdstuk {volgendHoofdstuk} staat klaar.', needs: ['boek', 'volgendHoofdstuk'] },
  { id: 'd03', title: 'Even stil bij het Woord', body: 'Je vaste moment. Eén hoofdstuk, meer hoeft niet.', needs: [] },
  { id: 'd04', title: 'Vandaag: {versverwijzing}', body: '{vers}', needs: ['vers', 'versverwijzing'] },
  { id: 'd05', title: 'Je leesmoment', body: 'Zin om {boek} weer op te pakken?', needs: ['boek'] },
  { id: 'd06', title: 'Dag {voornaam}', body: '{boek} {hoofdstuk} ligt nog open waar je stopte.', needs: ['voornaam', 'boek', 'hoofdstuk'] },
  { id: 'd07', title: 'Tijd voor een hoofdstuk', body: 'Kort lezen telt ook. Begin waar je gebleven was.', needs: [] },
  { id: 'd08', title: 'Een vers om te beginnen', body: '{versverwijzing} - {vers}', needs: ['vers', 'versverwijzing'] },
  { id: 'd09', title: 'Vijf minuten?', body: 'Genoeg voor {boek} {volgendHoofdstuk}.', needs: ['boek', 'volgendHoofdstuk'] },
  { id: 'd10', title: 'Je Bijbel ligt klaar', body: 'Geen haast. Lees zo ver als je komt.', needs: [] },
  { id: 'd11', title: 'Waar je gebleven was', body: '{boek} {hoofdstuk}. We hebben het voor je bewaard.', needs: ['boek', 'hoofdstuk'] },
  { id: 'd12', title: 'Dag {reeks} van je reeks', body: 'Eén hoofdstuk houdt hem lopend.', needs: ['reeks'] },
  { id: 'd13', title: 'Rustig beginnen', body: 'Open {boek} en lees tot je genoeg hebt.', needs: ['boek'] },
  { id: 'd14', title: 'Het is jouw tijd', body: 'Je koos dit moment zelf. {boek} staat klaar.', needs: ['boek'] },
  { id: 'd15', title: 'Nog niet gelezen vandaag', body: 'Geen probleem. {boek} {hoofdstuk} wacht gewoon.', needs: ['boek', 'hoofdstuk'] },
  { id: 'd16', title: 'Eén hoofdstuk', body: 'Meer vraagt vandaag niemand van je.', needs: [] },
];

/**
 * Streak nudges split on whether a freeze will actually catch the miss.
 *
 * Freezes are Pro-only (`app/api/streak/route.ts`), so a free account's
 * `freezeCount` is not protection and the copy must never imply it is. The
 * caller passes `vriesdagen: 0` for anyone who cannot spend one.
 */
const STREAK_RISK_NO_FREEZE: Variant[] = [
  { id: 's01', title: 'Je reeks van {reeks} dagen', body: 'Eén hoofdstuk vandaag houdt hem heel.', needs: ['reeks'] },
  { id: 's02', title: 'Nog even vandaag', body: '{reeks} dagen op rij. Een kort stuk is genoeg.', needs: ['reeks'] },
  { id: 's03', title: 'De avond loopt', body: 'Je las vandaag nog niet. {boek} {hoofdstuk} ligt klaar.', needs: ['boek', 'hoofdstuk'] },
  { id: 's04', title: '{reeks} dagen', body: 'Vandaag hoort er nog bij als je nu leest.', needs: ['reeks'] },
  { id: 's05', title: 'Bijna dag {reeks} plus één', body: 'Eén hoofdstuk en hij staat.', needs: ['reeks'] },
];

const STREAK_RISK_WITH_FREEZE: Variant[] = [
  { id: 's06', title: 'Je hebt {vriesdagen} vriesdagen', body: 'Sla je vandaag over, dan vangt er één het op. Lezen mag ook.', needs: ['vriesdagen'] },
  { id: 's07', title: 'Vandaag overslaan mag', body: 'Een vriesdag houdt je reeks van {reeks} dagen heel.', needs: ['vriesdagen', 'reeks'] },
];

/** `{reeks}` here is the streak that was lost, captured when it broke. */
const STREAK_LOST: Variant[] = [
  { id: 'l01', title: 'Je reeks staat weer op 1', body: 'Dat gebeurt. Vandaag is gewoon de eerste van de volgende.', needs: [] },
  { id: 'l02', title: 'Opnieuw beginnen mag', body: 'Je las {reeks} dagen achter elkaar. Dat raak je niet kwijt.', needs: ['reeks'] },
  { id: 'l03', title: 'Een nieuwe start', body: 'De reeks is opnieuw begonnen. Waar wil je verder?', needs: [] },
];

const STUDY_NUDGE: Variant[] = [
  { id: 't01', title: '{studie}, les {les}', body: 'De volgende les staat klaar. Ongeveer tien minuten.', needs: ['studie', 'les'] },
  { id: 't02', title: 'Verder met {studie}', body: 'Je bent op les {les} van {lessenTotaal}.', needs: ['studie', 'les', 'lessenTotaal'] },
  { id: 't03', title: 'Les {les} wacht', body: '{studie}. Je kunt hem in één zitting doen.', needs: ['studie', 'les'] },
  { id: 't04', title: 'Dag {plandag} van {plan}', body: '{boek} {hoofdstuk} staat vandaag op het rooster.', needs: ['plan', 'plandag', 'boek', 'hoofdstuk'] },
  { id: 't05', title: 'Je leesplan', body: 'Dag {plandag} staat klaar in {plan}.', needs: ['plan', 'plandag'] },
];

/** The pool for a type, given the context that changes which pool applies. */
export function poolFor(type: NotificationType, tokens: CopyTokens): Variant[] {
  switch (type) {
    case 'daily_reading':
      return DAILY_READING;
    case 'streak_risk':
      return (tokens.vriesdagen ?? 0) > 0 ? STREAK_RISK_WITH_FREEZE : STREAK_RISK_NO_FREEZE;
    case 'streak_lost':
      return STREAK_LOST;
    case 'study_nudge':
      return STUDY_NUDGE;
  }
}

/** Trims a quoted verse at a word boundary, with a period - never mid-word. */
export function truncateVerse(verse: string): string {
  const clean = verse.replace(/\s+/g, ' ').trim();
  if (clean.length <= VERSE_MAX) return clean;
  const cut = clean.slice(0, VERSE_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:!?-]+$/, '')}.`;
}

/**
 * A first name, or nothing.
 *
 * An account created by OAuth sometimes carries the email address in `name`,
 * and "Dag alex.lamper06@gmail.com" is worse than no greeting at all.
 */
export function firstNameOf(name: string | null | undefined): string | undefined {
  const trimmed = (name ?? '').trim();
  if (!trimmed || trimmed.includes('@')) return undefined;
  const first = trimmed.split(/\s+/)[0];
  return first.length > 0 && first.length <= 20 ? first : undefined;
}

function tokenValue(tokens: CopyTokens, key: keyof CopyTokens): string | undefined {
  const raw = tokens[key];
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : undefined;
  const text = key === 'vers' ? truncateVerse(raw) : raw.trim();
  return text.length > 0 ? text : undefined;
}

/** True when every token this variant declares can actually be filled. */
export function isUsable(variant: Variant, tokens: CopyTokens): boolean {
  return variant.needs.every((key) => tokenValue(tokens, key) !== undefined);
}

function fill(template: string, tokens: CopyTokens): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = tokenValue(tokens, key as keyof CopyTokens);
    // An unresolved token should have removed the variant from the pool, so
    // reaching this means a variant declared its needs wrongly. Leave the
    // placeholder rather than printing "undefined" - the test suite asserts no
    // rendered string contains a brace, so it fails loudly instead of shipping.
    return value ?? whole;
  });
}

/** Where a notification of this type should land. */
export function deepLinkFor(type: NotificationType, tokens: CopyTokens): string {
  if (type === 'study_nudge') return '/studies';
  if (type === 'streak_lost') return '/dashboard';
  if (tokens.boek && tokens.hoofdstuk) {
    return `/lezen?book=${encodeURIComponent(tokens.boek)}&chapter=${tokens.hoofdstuk}`;
  }
  return '/dashboard';
}

/**
 * Chooses a variant and renders it.
 *
 * `recentVariantIds` is the most-recent-first list of what this user has
 * already been sent for this type. Selection is deterministic on `seed`, so a
 * retry after a crash renders the same message rather than a second, different
 * one - which matters once a claim row already exists for the send.
 */
export function pickVariant(
  type: NotificationType,
  tokens: CopyTokens,
  options: { seed: string; recentVariantIds?: string[]; noRepeatWindow?: number } = { seed: '' },
): RenderedNotification {
  const usable = poolFor(type, tokens).filter((v) => isUsable(v, tokens));

  // Every pool keeps token-free variants precisely so this cannot happen.
  if (usable.length === 0) {
    throw new Error(`notificationCopy: no usable variant for ${type}`);
  }

  const recent = options.recentVariantIds ?? [];
  const notRecent = (window: number) => {
    const blocked = new Set(recent.slice(0, window));
    return usable.filter((v) => !blocked.has(v.id));
  };

  // No repeat inside the last 10 sends by default; relax to 5 for a small pool
  // and a heavy reader, and fall back to the whole pool rather than sending
  // nothing. `pickSeries` widens the window to the whole batch, because two
  // identical reminders inside one scheduled fortnight is the visible failure
  // this rotation exists to prevent.
  const primary = options.noRepeatWindow ?? 10;
  const candidates =
    notRecent(primary).length > 0
      ? notRecent(primary)
      : notRecent(5).length > 0
        ? notRecent(5)
        : usable;

  const digest = createHash('sha1').update(`${options.seed}:${type}`).digest();
  const chosen = candidates[digest.readUInt32BE(0) % candidates.length];

  return {
    variantId: chosen.id,
    title: fill(chosen.title, tokens),
    body: fill(chosen.body, tokens),
    deepLink: deepLinkFor(type, tokens),
  };
}

/**
 * A run of distinct variants, for a client that schedules several days of
 * local notifications in one go.
 *
 * The app cannot ask the server at fire time - the alarm belongs to the OS -
 * so it pre-fetches a stretch of days. Each day's pick feeds the next one's
 * exclusion list, so a fortnight of reminders never repeats itself.
 */
export function pickSeries(
  type: NotificationType,
  tokens: CopyTokens,
  options: { seed: string; count: number; recentVariantIds?: string[] },
): RenderedNotification[] {
  const out: RenderedNotification[] = [];
  const used = [...(options.recentVariantIds ?? [])];

  for (let day = 0; day < options.count; day++) {
    const rendered = pickVariant(type, tokens, {
      seed: `${options.seed}:${day}`,
      recentVariantIds: used,
      // Exclude everything already placed in this batch, not just the last 10.
      noRepeatWindow: used.length,
    });
    out.push(rendered);
    used.unshift(rendered.variantId);
  }
  return out;
}
