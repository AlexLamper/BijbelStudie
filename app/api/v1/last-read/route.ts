import { requireUser } from '../../../../lib/apiAuth';
import { isSafeBookKey, isSafeChapter } from '../../../../lib/readingProgress';
import { canonicaliseReadChapters, toCanonicalDutchBook } from '../../../../lib/readChaptersCanon';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import ReadingSession from '../../../../models/ReadingSession';
import { grantXp } from '../../../../lib/gamification';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const user = await User.findById(auth.id).select('lastReadChapter readChapters');
    if (!user) return errorV1('NOT_FOUND', 404);

    const rawReadChapters: Record<string, number[]> = {};
    if (user.readChapters) {
      for (const [book, chapters] of user.readChapters.entries()) {
        rawReadChapters[book] = chapters;
      }
    }

    return jsonV1({
      lastReadChapter: user.lastReadChapter ?? null,
      readChapters: canonicaliseReadChapters(rawReadChapters),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Records the chapter the reader is on and marks it read.
 *
 * The website splits this across `/api/user/last-read` and
 * `/api/user/log-reading`; the app opens a chapter in one gesture, so both
 * happen here. The reading-session write keeps the same 30-minute debounce so
 * the weekly strip counts sittings, not scroll events.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = await req.json();
    const { book, chapter, version, commentary } = body ?? {};

    if (!book || !chapter || !version) {
      return errorV1('MISSING_FIELDS', 400, 'book, chapter and version are required');
    }

    // Same guard as the web route: `book` becomes part of a Mongo update path,
    // so an unchecked value writes an arbitrary key into readChapters and can
    // break every subsequent save of that user document. See lib/readingProgress.
    if (!isSafeBookKey(book) || !isSafeChapter(chapter)) {
      return errorV1('INVALID_FIELDS', 400, 'book or chapter is not valid');
    }

    await connectMongoDB();

    // `lastReadChapter.book` stays the translation's own spelling — the reader
    // reopens the chapter by it. Only the `readChapters` map key is folded onto
    // the canonical Dutch name, so progress lands under one key per book no
    // matter which translation it was read in. See lib/readChaptersCanon.
    const progressKey = toCanonicalDutchBook(book) ?? book;

    const updateData: Record<string, string | number | Date> = {
      'lastReadChapter.book': book,
      'lastReadChapter.chapter': chapter,
      'lastReadChapter.version': version,
      'lastReadChapter.updatedAt': new Date(),
    };
    if (commentary) updateData['lastReadChapter.commentary'] = commentary;

    // Checked before the write so XP is awarded once per chapter, not once per
    // time the reader scrolls back to it.
    const alreadyRead = await User.exists({
      _id: auth.id,
      [`readChapters.${progressKey}`]: chapter,
    });

    const user = await User.findByIdAndUpdate(
      auth.id,
      { $set: updateData, $addToSet: { [`readChapters.${progressKey}`]: chapter } },
      { new: true },
    );
    if (!user) return errorV1('NOT_FOUND', 404);

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recent = await ReadingSession.findOne({
      userId: user._id,
      createdAt: { $gte: thirtyMinutesAgo },
    });
    if (!recent) await ReadingSession.create({ userId: user._id });

    const xp = alreadyRead ? null : await grantXp(auth.id, 'chapter_read', { isPro: auth.isPro });

    return jsonV1({ lastReadChapter: user.lastReadChapter, xp });
  } catch (error) {
    return handleV1Error(error);
  }
}
