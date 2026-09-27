import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { CHAPTER_COUNTS } from '../../../../../lib/data/bible-chapter-counts';
import { toCanonicalDutchBook } from '../../../../../lib/readChaptersCanon';
import { fetchDayTextForDate } from '../../../../../lib/mobileDayText';
import { DEFAULT_TIME_ZONE, localDates, notificationReference } from '../../../../../lib/notificationSchedule';
import { levelForXp } from '../../../../../lib/gamification';
import {
  firstNameOf,
  pickSeries,
  type CopyTokens,
  type NotificationType,
} from '../../../../../lib/notificationCopy';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Pre-rendered notification text for a client that schedules locally.
 *
 * The phone's daily reminder is an OS alarm. It fires whether or not there is
 * a network, and nothing of ours runs at that moment - so the copy has to be
 * decided in advance and handed over in a batch. That is what this returns: a
 * run of distinct, already-personalised messages, one per day, which the app
 * schedules under one notification id each.
 *
 * Doing it this way means the reminder text can be improved from the server,
 * for everyone, without an app release - the reason the app is not simply
 * shipping sixteen strings in its own bundle. The app keeps a bundled fallback
 * anyway, for a first run with no network.
 */

const MAX_DAYS = 30;
const DEFAULT_DAYS = 14;

const SUPPORTED: NotificationType[] = [
  'daily_reading',
  'streak_risk',
  'streak_lost',
  'study_nudge',
  // Fired by the app at exactly two days away, before the tree visibly wilts.
  // No new channel: it rides the reminder channel and the existing quiet hours.
  'tree_wilting',
];

function isSupported(value: string | null): value is NotificationType {
  return value !== null && (SUPPORTED as string[]).includes(value);
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const url = new URL(req.url);

    const typeParam = url.searchParams.get('type') ?? 'daily_reading';
    if (!isSupported(typeParam)) {
      return errorV1('INVALID_TYPE', 400, `type must be one of: ${SUPPORTED.join(', ')}`);
    }

    const requested = Number(url.searchParams.get('days') ?? DEFAULT_DAYS);
    const days = Number.isFinite(requested)
      ? Math.min(MAX_DAYS, Math.max(1, Math.trunc(requested)))
      : DEFAULT_DAYS;

    await connectMongoDB();
    const user = await User.findById(auth.id)
      .select('name streak freezeCount lastReadChapter xp')
      .lean<{
        name?: string;
        streak?: number;
        freezeCount?: number;
        xp?: number;
        lastReadChapter?: { book?: string; chapter?: number } | null;
      } | null>();
    if (!user) return errorV1('NOT_FOUND', 404);

    // `lastReadChapter.book` keeps the translation's own spelling; the copy is
    // Dutch and CHAPTER_COUNTS is keyed on the canonical Dutch name.
    const storedBook = user.lastReadChapter?.book || undefined;
    const book = storedBook ? toCanonicalDutchBook(storedBook) ?? storedBook : undefined;
    const chapter = user.lastReadChapter?.chapter ?? undefined;

    // The next chapter, clamped to the book's real length - offering
    // "Obadja 2" to someone who finished Obadja 1 is worse than offering
    // nothing, so the token is simply dropped at the end of a book.
    const totalChapters = book ? CHAPTER_COUNTS[book] : undefined;
    const nextChapter =
      chapter !== undefined && totalChapters !== undefined && chapter < totalChapters
        ? chapter + 1
        : undefined;

    // The day text is the one token needing a network call - one per day, so
    // day N quotes day N's verse rather than fourteen copies of today's. Each
    // date is its own shared upstream cache entry and nothing is written to the
    // archive (these are mostly future days). Optional by design: a day whose
    // fetch fails just loses the verse variants for that day.
    // Only the daily-reading pool quotes the verse; the other types skip the
    // fetches entirely.
    const dayTexts =
      typeParam === 'daily_reading'
        ? await Promise.all(localDates(DEFAULT_TIME_ZONE, days).map((date) => fetchDayTextForDate(date)))
        : [];

    const baseTokens: CopyTokens = {
      voornaam: firstNameOf(user.name),
      boek: book,
      hoofdstuk: chapter,
      volgendHoofdstuk: nextChapter,
      reeks: user.streak && user.streak > 0 ? user.streak : undefined,
      // Freezes are Pro-only, so a free account is told it has none rather
      // than being promised protection it cannot spend. `auth.isPro` is the
      // resolved entitlement (Stripe, App Store / RevenueCat, admin); the
      // `subscribed` flag alone told App Store subscribers they had none.
      vriesdagen: auth.isPro ? (user.freezeCount ?? 0) : 0,
      niveau: levelForXp(user.xp ?? 0),
    };
    const tokensForDay = (day: number): CopyTokens => {
      // "Psalm 23:1", not "Psalmen 23:1" (lib/notificationSchedule.ts).
      const reference = dayTexts[day]?.reference;
      return {
        ...baseTokens,
        vers: dayTexts[day]?.text ?? undefined,
        versverwijzing: reference ? notificationReference(reference) : undefined,
      };
    };

    // Seeded on the account and the day this batch was built, so two devices
    // fetching on the same day schedule the same run, and a refetch after a
    // reinstall does not restart the rotation from the same variant.
    const seed = `${auth.id}:${new Date().toISOString().slice(0, 10)}`;
    const variants = pickSeries(typeParam, tokensForDay, { seed, count: days });

    return jsonV1({
      type: typeParam,
      // The client should come back for a fresh batch before this runs out.
      generatedAt: new Date().toISOString(),
      days,
      variants: variants.map((v, index) => ({
        dayOffset: index,
        variantId: v.variantId,
        title: v.title,
        body: v.body,
        deepLink: v.deepLink,
      })),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
