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

/**
 * The four vriendenkring events worth a push.
 *
 * These differ from the five above in one way that changes everything about
 * them: somebody else caused them. A reading reminder is a clock going off and
 * may be rescheduled, skipped or backed off without anyone noticing. "Marieke
 * reageerde" is a fact about another person, and arriving late or not at all
 * is a visible failure. So these are sent by the server the moment the write
 * lands (iOS, via lib/push/send.ts) and are also readable from
 * `GET /api/v1/notifications/social` - which is how Android, which gets no
 * push at all, and any iPhone that was offline both catch up.
 */
export type SocialNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'post_like'
  | 'post_comment';

export const SOCIAL_NOTIFICATION_TYPES: readonly SocialNotificationType[] = [
  'friend_request',
  'friend_accepted',
  'post_like',
  'post_comment',
];

export type NotificationType =
  | 'daily_reading'
  | 'streak_risk'
  | 'streak_lost'
  | 'study_nudge'
  | 'tree_wilting'
  | SocialNotificationType;

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
  /** The reader's ProgressTree level, for the tree nudge. */
  niveau?: number;
  /** The other person in a vriendenkring notification - a first name. */
  vriend?: string;
  /** That person's account id, for the deep link. Never rendered. */
  vriendId?: string;
  /** The post the like or comment landed on. Never rendered. */
  berichtId?: string;
  /** A comment, quoted. Trimmed at a word boundary like `vers`. */
  reactie?: string;
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
 * A banked freeze is protection for every reader (`lib/streak.ts`): one is
 * granted on every 7th day of a run and any account may spend it. The caller
 * passes `vriesdagen: 0` only for someone who has none banked.
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

/**
 * The ProgressTree nudge, fired at exactly two days away - before the tree
 * visibly wilts, never after.
 *
 * The plan's draft copy carried a seedling emoji; the house rules above forbid
 * emoji, so it is gone. What survives is the useful half: the tree is a thing
 * of the reader's own that responds to them, and one short sitting is enough.
 * No variant says the tree could die, because it cannot - health floors at 0.3
 * (lib/progressTree/health.ts) precisely so this copy never has to threaten.
 */
const TREE_WILTING: Variant[] = [
  { id: 'b01', title: 'Je boom mist wat licht', body: 'Twee dagen zonder lezen. Een paar verzen en hij staat er weer fris bij.', needs: [] },
  { id: 'b02', title: 'Je boom wacht op je', body: 'Eén kort stuk laat hem weer opveren.', needs: [] },
  { id: 'b03', title: 'Even water geven', body: 'Je boom hangt wat slap. Tien minuten lezen is genoeg.', needs: [] },
  { id: 'b04', title: 'Je boom op niveau {niveau}', body: 'Hij staat er wat stil bij. Lees {boek} {hoofdstuk} en hij groeit verder.', needs: ['niveau', 'boek', 'hoofdstuk'] },
  { id: 'b05', title: 'Terug naar {boek}', body: 'Je boom veert op zodra je weer leest. Geen haast.', needs: ['boek'] },
];

/**
 * Vriendenkring copy.
 *
 * Two rules on top of the house rules, both learned from the pools above.
 *
 * The name is a *first* name and is optional. An OAuth account sometimes
 * carries an email address in `name`, and "alex.lamper06@gmail.com reageerde"
 * is worse than "Iemand reageerde", so every pool here keeps three or more
 * variants that need no token at all and the caller passes `vriend` only when
 * `firstNameOf` gave something real.
 *
 * Nothing here counts. "3 mensen vinden dit mooi" would need a tally the server
 * does not keep, and the coalescing rule in lib/friends/notify.ts means the
 * fourth like sends nothing anyway - a number that stops being true after the
 * third like is worse than no number.
 */
const FRIEND_REQUEST: Variant[] = [
  { id: 'f01', title: '{vriend} wil vrienden worden', body: 'Een nieuw verzoek in je vriendenkring.', needs: ['vriend'] },
  { id: 'f02', title: 'Nieuw vriendschapsverzoek', body: 'Iemand wil vrienden worden. Je vindt het verzoek in je kring.', needs: [] },
  { id: 'f03', title: 'Een verzoek voor je', body: 'Er wacht een vriendschapsverzoek in je kring.', needs: [] },
  { id: 'f04', title: 'Iemand zocht je op', body: 'Er staat een nieuw vriendschapsverzoek voor je klaar.', needs: [] },
];

const FRIEND_ACCEPTED: Variant[] = [
  { id: 'g01', title: '{vriend} is nu je vriend', body: 'Jullie zien vanaf nu elkaars mijlpalen in de kring.', needs: ['vriend'] },
  { id: 'g02', title: 'Je verzoek is aangenomen', body: 'Jullie zijn nu vrienden in je kring.', needs: [] },
  { id: 'g03', title: 'Nieuwe vriend in je kring', body: 'Je verzoek is geaccepteerd. Kijk wie erbij is gekomen.', needs: [] },
  { id: 'g04', title: 'Jullie zijn nu vrienden', body: 'Vanaf nu zie je elkaars mijlpalen in de kring.', needs: [] },
];

const POST_LIKE: Variant[] = [
  { id: 'h01', title: '{vriend} vindt dit mooi', body: 'Een hart bij je bericht in de kring.', needs: ['vriend'] },
  { id: 'h02', title: 'Een hart bij je bericht', body: 'Iemand uit je kring vindt wat je deelde mooi.', needs: [] },
  { id: 'h03', title: 'Je bericht is gezien', body: 'Iemand liet een hart achter bij je bericht.', needs: [] },
  { id: 'h04', title: 'Waardering uit je kring', body: 'Iemand vindt je bericht mooi.', needs: [] },
];

const POST_COMMENT: Variant[] = [
  // The one variant that quotes: a reaction you can read on the lock screen is
  // worth far more than a notice that one exists.
  { id: 'k01', title: '{vriend} reageerde', body: '{reactie}', needs: ['vriend', 'reactie'] },
  { id: 'k02', title: '{vriend} reageerde op je', body: 'Een reactie onder je bericht in de kring.', needs: ['vriend'] },
  { id: 'k03', title: 'Een reactie op je bericht', body: 'Iemand uit je kring schreef iets onder je bericht.', needs: [] },
  { id: 'k04', title: 'Nieuwe reactie', body: 'Er staat een reactie onder je bericht in de kring.', needs: [] },
  { id: 'k05', title: 'Iemand schreef je terug', body: 'Een reactie onder je bericht in je vriendenkring.', needs: [] },
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
    case 'tree_wilting':
      return TREE_WILTING;
    case 'friend_request':
      return FRIEND_REQUEST;
    case 'friend_accepted':
      return FRIEND_ACCEPTED;
    case 'post_like':
      return POST_LIKE;
    case 'post_comment':
      return POST_COMMENT;
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
  const text = key === 'vers' || key === 'reactie' ? truncateVerse(raw) : raw.trim();
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

/**
 * Where a notification of this type should land.
 *
 * The vriendenkring paths are the app's own routes, not web URLs that happen to
 * rhyme: `features/friends` is reached at `/vriendenkring` and one person at
 * `/vriendenkring/:userId` (the app's router mirrors the website's
 * `app/vriendenkring/[userId]`). A query string the app does not read yet is
 * dropped by go_router rather than failing to match, so `?tab=verzoeken` and
 * `?post=` land on the kring today and can be honoured later without the
 * server having to change what it sends.
 */
export function deepLinkFor(type: NotificationType, tokens: CopyTokens): string {
  if (type === 'friend_request') return '/vriendenkring?tab=verzoeken';
  if (type === 'friend_accepted') {
    return tokens.vriendId ? `/vriendenkring/${encodeURIComponent(tokens.vriendId)}` : '/vriendenkring';
  }
  if (type === 'post_like' || type === 'post_comment') {
    return tokens.berichtId
      ? `/vriendenkring?post=${encodeURIComponent(tokens.berichtId)}`
      : '/vriendenkring';
  }
  if (type === 'study_nudge') return '/studies';
  if (type === 'streak_lost') return '/dashboard';
  // The nudge is about the tree, so it opens the tree rather than a chapter.
  if (type === 'tree_wilting') return '/profiel/boom';
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
  /** One token set for the whole run, or one per day (e.g. that day's own verse). */
  tokens: CopyTokens | ((day: number) => CopyTokens),
  options: { seed: string; count: number; recentVariantIds?: string[] },
): RenderedNotification[] {
  const out: RenderedNotification[] = [];
  const used = [...(options.recentVariantIds ?? [])];

  for (let day = 0; day < options.count; day++) {
    const dayTokens = typeof tokens === 'function' ? tokens(day) : tokens;
    const rendered = pickVariant(type, dayTokens, {
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

/** True for the four vriendenkring types, narrowing as it goes. */
export function isSocialNotificationType(value: string): value is SocialNotificationType {
  return (SOCIAL_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/**
 * iOS groups notifications that share a `thread-id` into one stack, so these
 * are families rather than types: four likes and a comment collapse into one
 * "Vriendenkring" stack instead of five separate rows pushing the reading
 * reminder off the screen.
 */
export function apnsThreadId(type: NotificationType): string {
  if (isSocialNotificationType(type)) return 'vriendenkring';
  if (type === 'study_nudge') return 'studie';
  if (type === 'tree_wilting') return 'boom';
  return 'lezen';
}

/**
 * The APNs JSON body.
 *
 * `aps` is Apple's; everything beside it is ours and is what the app reads to
 * route the tap. `deepLink` is the contract: the app already maps a payload
 * path onto its router (`/vriendenkring`, `/lezen?book=...`), so a new
 * notification type needs no app release as long as it deep-links to a route
 * that exists. `type` and `variantId` ride along for analytics and for the
 * app's own de-duplication against `GET /api/v1/notifications/social`, which
 * can deliver the same event to a phone that was offline when the push went
 * out. `eventId` is that join key: it is the exact `id` the social endpoint
 * gives the same event, so a phone that receives both shows one notification.
 * It is not the same as the `apns-collapse-id` header, which is coarser on
 * purpose - that one groups every like on a post so the third replaces the
 * first on screen, where `eventId` must stay unique per event.
 */
export type ApnsAlertPayload = {
  aps: {
    alert: { title: string; body: string };
    sound: string;
    'thread-id': string;
    badge?: number;
  };
  type: NotificationType;
  deepLink: string;
  variantId: string;
  /** Matches the `id` of the same event in the social pull response. */
  eventId?: string;
};

export function apnsPayloadFor(
  type: NotificationType,
  rendered: RenderedNotification,
  options: { badge?: number; eventId?: string } = {},
): ApnsAlertPayload {
  const payload: ApnsAlertPayload = {
    aps: {
      alert: { title: rendered.title, body: rendered.body },
      sound: 'default',
      'thread-id': apnsThreadId(type),
    },
    type,
    deepLink: rendered.deepLink,
    variantId: rendered.variantId,
  };
  if (typeof options.badge === 'number' && Number.isFinite(options.badge) && options.badge >= 0) {
    payload.aps.badge = Math.trunc(options.badge);
  }
  if (options.eventId) payload.eventId = options.eventId;
  return payload;
}
