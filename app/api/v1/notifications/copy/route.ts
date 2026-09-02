import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { CHAPTER_COUNTS } from '../../../../../lib/data/bible-chapter-counts';
import { fetchDayText } from '../../../../../lib/mobileDayText';
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

const SUPPORTED: NotificationType[] = ['daily_reading', 'streak_risk', 'streak_lost', 'study_nudge'];

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
      .select('name streak freezeCount subscribed lastReadChapter')
      .lean<{
        name?: string;
        streak?: number;
        freezeCount?: number;
        subscribed?: boolean;
        lastReadChapter?: { book?: string; chapter?: number } | null;
      } | null>();
    if (!user) return errorV1('NOT_FOUND', 404);

    const book = user.lastReadChapter?.book ?? undefined;
    const chapter = user.lastReadChapter?.chapter ?? undefined;

    // The next chapter, clamped to the book's real length - offering
    // "Obadja 2" to someone who finished Obadja 1 is worse than offering
    // nothing, so the token is simply dropped at the end of a book.
    const totalChapters = book ? CHAPTER_COUNTS[book] : undefined;
    const nextChapter =
      chapter !== undefined && totalChapters !== undefined && chapter < totalChapters
        ? chapter + 1
        : undefined;

    // The day text is the one token needing a network call. It is optional by
    // design: if it fails, the variants that use it drop out of the pool and
    // the other fourteen still work.
    const dayText = await fetchDayText().catch(() => null);

    const tokens: CopyTokens = {
      voornaam: firstNameOf(user.name),
      boek: book,
      hoofdstuk: chapter,
      volgendHoofdstuk: nextChapter,
      reeks: user.streak && user.streak > 0 ? user.streak : undefined,
      // Freezes are Pro-only, so a free account is told it has none rather
      // than being promised protection it cannot spend.
      vriesdagen: user.subscribed ? (user.freezeCount ?? 0) : 0,
      vers: dayText?.text ?? undefined,
      versverwijzing: dayText?.reference ?? undefined,
    };

    // Seeded on the account and the day this batch was built, so two devices
    // fetching on the same day schedule the same run, and a refetch after a
    // reinstall does not restart the rotation from the same variant.
    const seed = `${auth.id}:${new Date().toISOString().slice(0, 10)}`;
    const variants = pickSeries(typeParam, tokens, { seed, count: days });

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
