import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Note from '../../../../models/Note';
import ReadingSession from '../../../../models/ReadingSession';
import { fetchDayText } from '../../../../lib/mobileDayText';
import { getActivePlanCard } from '../../../../lib/planService';
import { describeLevel } from '../../../../lib/gamification';
import { suggestPlans } from '../../../../lib/planGenerator';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Everything the app's dashboard tab shows, in one round trip.
 *
 * The website assembles the same screen from six parallel `fetch` calls
 * (`app/dashboard/page.tsx`). On a phone that is six TLS handshakes on a cold
 * radio, so the mobile surface returns one document instead. The individual
 * write endpoints (`/v1/streak`, `/v1/last-read`, …) stay separate.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();

    const user = await User.findById(auth.id);
    if (!user) return jsonV1({ error: 'NOT_FOUND' }, { status: 404 });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [notes, sessions, activePlan, dailyVerse] = await Promise.all([
      Note.find({ userId: user._id }).sort({ createdAt: -1 }).limit(500).lean(),
      ReadingSession.find({ userId: user._id, createdAt: { $gte: sevenDaysAgo } })
        .select('createdAt')
        .lean(),
      getActivePlanCard(String(user._id)),
      fetchDayText().catch(() => null),
    ]);

    // ── Weekly reading strip (identical labelling to /api/user/weekly-stats) ──
    const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
    const days: { label: string; count: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const jsDay = d.getDay();
      days.push({
        label: DAY_LABELS[jsDay === 0 ? 6 : jsDay - 1],
        date: d.toISOString().slice(0, 10),
        count: 0,
      });
    }
    for (const s of sessions) {
      const key = (s as unknown as { createdAt: Date }).createdAt.toISOString().slice(0, 10);
      const entry = days.find((d) => d.date === key);
      if (entry) entry.count++;
    }
    const maxCount = Math.max(...days.map((d) => d.count), 1);
    const weekDays = days.map((d) => ({
      label: d.label,
      count: d.count,
      heightPct: Math.round((d.count / maxCount) * 100),
      isToday: d.date === now.toISOString().slice(0, 10),
    }));

    // ── Chapters read per book ───────────────────────────────────────────────
    const readChapters: Record<string, number[]> = {};
    if (user.readChapters) {
      for (const [book, chapters] of user.readChapters.entries()) {
        readChapters[book] = chapters;
      }
    }

    // With no plan running, the card's job is to offer one rather than vanish.
    const planSuggestions = activePlan
      ? []
      : suggestPlans({
          lastReadBook: user.lastReadChapter?.book ?? null,
          readChapters,
          limit: 3,
        });

    return jsonV1({
      user: { name: auth.name, email: auth.email, image: auth.image, isPro: auth.isPro },
      streak: user.streak ?? 0,
      freezes: user.freezeCount ?? 0,
      level: describeLevel(user.xp ?? 0),
      badges: user.badges ?? [],
      lastRead: user.lastReadChapter ?? null,
      readChapters,
      weeklyStats: { days: weekDays, totalThisWeek: sessions.length },
      notesCount: notes.length,
      recentNotes: notes.slice(0, 3).map((n) => ({
        id: n._id.toString(),
        book: n.book,
        chapter: n.chapter,
        verse: n.verse ?? null,
        noteText: n.noteText ?? '',
        createdAt: n.createdAt,
      })),
      activePlan,
      planSuggestions,
      dailyVerse,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
