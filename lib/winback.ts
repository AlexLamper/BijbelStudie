/**
 * Win-back mail: one mail after 3, 7 and 14 days without the app or the site,
 * each about this reader (lib/emailTemplates/winback.ts).
 *
 * THE RULES, all enforced here and covered by tests/winback.test.ts:
 *
 * - "Away" is measured from the last time the account was used anywhere: the
 *   newest of `platformsSeenAt.{ios,android,web}` (lib/clientPlatform.ts, at
 *   most an hour stale), `lastStreakDate` and `createdAt`, in Dutch calendar
 *   days.
 * - A stage is due on its day or the two after it (3-5, 7-9, 14-16), so a
 *   missed cron run is caught up, and an account away for longer than 16 days
 *   gets nothing: the first run after launch does not mail the whole dormant
 *   back catalogue.
 * - At most one mail per stage per absence. `winback.awayFrom` + `stage` on
 *   the User document are claimed with a conditional write before the send
 *   (and rolled back when the send does not happen), so two runs at once
 *   cannot both mail. Coming back moves the last-active instant, which starts
 *   a new absence at stage 0.
 * - Never to an account that switched win-back or all engagement mail off
 *   (lib/emailPrefs.ts). Deleted accounts are gone from `users` altogether
 *   (lib/accountPurge.ts), so they cannot be selected.
 *
 * Sent by the cron in app/api/internal/winback-emails (vercel.json), once a
 * day in the late afternoon.
 */

import { dayKey } from './streak';

export const WINBACK_STAGES = [3, 7, 14] as const;
export type WinbackStageDays = (typeof WINBACK_STAGES)[number];

/** A stage stays due for this many days after its own. */
export const STAGE_WINDOW_DAYS = 2;

/** The longest absence that still gets a mail. */
export const MAX_AWAY_DAYS = WINBACK_STAGES[WINBACK_STAGES.length - 1] + STAGE_WINDOW_DAYS;

export type ActivityFields = {
  platformsSeenAt?: { ios?: Date | string | null; android?: Date | string | null; web?: Date | string | null } | null;
  lastStreakDate?: Date | string | null;
  createdAt?: Date | string | null;
};

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** The newest sign of use, or null for an account with none at all. */
export function lastActiveAt(user: ActivityFields): Date | null {
  const times = [
    toTime(user.platformsSeenAt?.ios),
    toTime(user.platformsSeenAt?.android),
    toTime(user.platformsSeenAt?.web),
    toTime(user.lastStreakDate),
    toTime(user.createdAt),
  ].filter((t): t is number => t !== null);
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Whole Dutch calendar days between [last] and [now]; never negative. */
export function daysAway(last: Date, now: Date = new Date()): number {
  return Math.max(0, dayNumber(dayKey(now)) - dayNumber(dayKey(last)));
}

/** The stage due after [days] away, or null. */
export function stageForDays(days: number): WinbackStageDays | null {
  for (let i = WINBACK_STAGES.length - 1; i >= 0; i--) {
    const stage = WINBACK_STAGES[i];
    if (days >= stage && days <= stage + STAGE_WINDOW_DAYS) return stage;
  }
  return null;
}

export type WinbackState = { awayFrom?: Date | string | null; stage?: number | null } | null | undefined;

/** True when [stage] was already sent for the absence that started at [last]. */
export function alreadySent(state: WinbackState, last: Date, stage: number): boolean {
  const from = toTime(state?.awayFrom);
  if (from === null || Math.abs(from - last.getTime()) > 1000) return false;
  return (state?.stage ?? 0) >= stage;
}

export type WinbackCandidate = ActivityFields & {
  _id: unknown;
  email?: string | null;
  emailPrefs?: { winback?: unknown; all?: unknown } | null;
  winback?: WinbackState;
};

export type WinbackDecision =
  | { send: true; stage: WinbackStageDays; last: Date; days: number }
  | { send: false; reason: 'opted_out' | 'no_activity' | 'not_due' | 'already_sent' | 'no_email' };

export function decideWinback(
  user: WinbackCandidate,
  now: Date,
  mayEmail: (prefs: WinbackCandidate['emailPrefs']) => boolean,
): WinbackDecision {
  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) return { send: false, reason: 'no_email' };
  if (!mayEmail(user.emailPrefs)) return { send: false, reason: 'opted_out' };
  const last = lastActiveAt(user);
  if (!last) return { send: false, reason: 'no_activity' };
  const days = daysAway(last, now);
  const stage = stageForDays(days);
  if (!stage) return { send: false, reason: 'not_due' };
  if (alreadySent(user.winback, last, stage)) return { send: false, reason: 'already_sent' };
  return { send: true, stage, last, days };
}

/** The Mongo filter for accounts whose last activity may fall in the mail window. */
export function candidateFilter(now: Date): Record<string, unknown> {
  const DAY = 86_400_000;
  // One day of slack on both ends: the precise test is `decideWinback`, in
  // Dutch calendar days; this only has to be wide enough to contain it.
  const lo = new Date(now.getTime() - (MAX_AWAY_DAYS + 2) * DAY);
  const hi = new Date(now.getTime() - (WINBACK_STAGES[0] - 1) * DAY);
  const fields = ['platformsSeenAt.ios', 'platformsSeenAt.android', 'platformsSeenAt.web', 'lastStreakDate', 'createdAt'];
  return {
    'emailPrefs.all': { $ne: false },
    'emailPrefs.winback': { $ne: false },
    // Something inside the window...
    $or: fields.map((f) => ({ [f]: { $gte: lo, $lte: hi } })),
    // ...and nothing newer than it.
    $and: fields.map((f) => ({ [f]: { $not: { $gt: hi } } })),
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export type WinbackRunOptions = {
  now?: Date;
  /** Decide and report, write and send nothing. */
  dryRun?: boolean;
  limit?: number;
  /** Pause between sends; Resend allows a few requests a second. */
  spacingMs?: number;
};

export type WinbackRunSummary = {
  dryRun: boolean;
  scanned: number;
  due: number;
  sent: number;
  skipped: number;
  failed: number;
  byStage: Record<string, number>;
  reasons: Record<string, number>;
};

type LeanUser = WinbackCandidate & {
  name?: string | null;
  xp?: number | null;
  lostStreak?: number | null;
  lostStreakAt?: Date | null;
  dailyGoal?: { minutes?: number | null } | null;
  levensboom?: { disabled?: boolean | null } | null;
};

function firstNameOf(name: string | null | undefined, email: string | null | undefined): string | null {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return null;
  // A placeholder name (the relay address's local part) is not a name.
  const local = (email ?? '').split('@')[0]?.toLowerCase();
  if (local && first.toLowerCase() === local) return null;
  return first.slice(0, 40);
}

function trackedLink(stage: number, path: string): string {
  const q = new URLSearchParams({ s: String(stage), to: path });
  return `https://www.bijbelstudie.io/api/email/c?${q.toString()}`;
}

type ComposeDeps = {
  renderWinbackEmail: typeof import('./emailTemplates/winback').renderWinbackEmail;
  levelForXp: typeof import('./gamification').levelForXp;
  readTreeHealth: typeof import('./progressTree/health').readTreeHealth;
  loadScheduleContext: typeof import('./notificationSchedule').loadScheduleContext;
  DEFAULT_DAILY_GOAL: typeof import('./dailyGoal').DEFAULT_DAILY_GOAL;
  isDailyGoalMinutes: typeof import('./dailyGoal').isDailyGoalMinutes;
};

/**
 * The mail itself, for one reader at one stage: where they left off, their
 * tree, level, a recently lost streak, the verse. Shared by the cron and the
 * admin preview, so the preview is exactly what readers get.
 */
async function composeWinbackMail(
  user: LeanUser & { _id: unknown },
  stage: import('./emailTemplates/winback').WinbackStage,
  now: Date,
  verse: { text: string; reference: string } | null,
  urls: { typeUrl: string; allUrl: string },
  deps: ComposeDeps,
) {
  const userId = String(user._id);
  let resume = null as import('./emailTemplates/winback').WinbackResume | null;
  let path = '/dashboard';
  try {
    const ctx = await deps.loadScheduleContext(userId, now);
    if (ctx.study) {
      resume = { kind: 'study', title: ctx.study.title, lessonDay: ctx.study.lessonDay };
      path = `/studie/${encodeURIComponent(ctx.study.studyId)}/${ctx.study.lessonDay}`;
    } else if (ctx.chapter) {
      resume = { kind: 'chapter', book: ctx.chapter.book, chapter: ctx.chapter.chapter };
      path = '/lezen';
    }
  } catch {
    // A mail without "where you left off" is still a fine mail.
  }

  const health = deps.readTreeHealth(user.lastStreakDate ? new Date(user.lastStreakDate) : null, now);
  const goalMinutes = deps.isDailyGoalMinutes(user.dailyGoal?.minutes) ? (user.dailyGoal!.minutes as number) : deps.DEFAULT_DAILY_GOAL;
  const lostRecently =
    user.lostStreak && user.lostStreakAt && now.getTime() - new Date(user.lostStreakAt).getTime() < 21 * 86_400_000
      ? user.lostStreak
      : null;

  return deps.renderWinbackEmail({
    stage,
    firstName: firstNameOf(user.name, user.email),
    resume,
    tree: user.levensboom?.disabled ? null : { thirsty: health.wilting },
    level: deps.levelForXp(user.xp ?? 0),
    lostStreak: lostRecently,
    goalMinutes,
    verse,
    ctaUrl: trackedLink(stage, path),
    footer: {
      unsubscribeTypeUrl: urls.typeUrl,
      unsubscribeAllUrl: urls.allUrl,
      reason: 'Je krijgt deze mail omdat je een BijbelStudie-account hebt en een tijdje niet hebt gelezen.',
    },
  });
}

export async function runWinback(options: WinbackRunOptions = {}): Promise<WinbackRunSummary> {
  const now = options.now ?? new Date();
  const dryRun = Boolean(options.dryRun);
  const limit = Math.max(1, Math.min(options.limit ?? 150, 500));
  const spacingMs = options.spacingMs ?? 600;

  const [
    { default: connectMongoDB },
    { default: User },
    { mayEmail, unsubscribePageUrl, unsubscribeOneClickUrl },
    { sendEmail },
    { renderWinbackEmail },
    { levelForXp },
    { readTreeHealth },
    { loadScheduleContext },
    { fetchDayTextForDate },
    { recordServerEvent },
    { DEFAULT_DAILY_GOAL, isDailyGoalMinutes },
  ] = await Promise.all([
    import('./mongodb'),
    import('../models/User'),
    import('./emailPrefs'),
    import('./channels/email'),
    import('./emailTemplates/winback'),
    import('./gamification'),
    import('./progressTree/health'),
    import('./notificationSchedule'),
    import('./mobileDayText'),
    import('./serverAnalytics'),
    import('./dailyGoal'),
  ]);
  await connectMongoDB();

  const summary: WinbackRunSummary = {
    dryRun, scanned: 0, due: 0, sent: 0, skipped: 0, failed: 0, byStage: {}, reasons: {},
  };

  const users = await User.find(candidateFilter(now))
    .select(
      'name email emailPrefs winback platformsSeenAt lastStreakDate createdAt xp lostStreak lostStreakAt dailyGoal.minutes levensboom.disabled',
    )
    .limit(limit * 4)
    .lean<LeanUser[]>();
  summary.scanned = users.length;

  // One verse for the whole run: the day's text, the same one the app's
  // morning notification carries today.
  const verseRow = await fetchDayTextForDate(dayKey(now)).catch(() => null);
  const verse = verseRow ? { text: verseRow.text, reference: verseRow.reference } : null;

  for (const user of users) {
    if (summary.due >= limit) break;
    const decision = decideWinback(user, now, (prefs) => mayEmail(prefs, 'winback'));
    if (decision.send === false) {
      summary.reasons[decision.reason] = (summary.reasons[decision.reason] ?? 0) + 1;
      continue;
    }
    summary.due++;
    summary.byStage[decision.stage] = (summary.byStage[decision.stage] ?? 0) + 1;
    if (dryRun) continue;

    const userId = String(user._id);
    const typeUrl = unsubscribePageUrl(userId, 'winback');
    const allUrl = unsubscribePageUrl(userId, 'all');
    const oneClick = unsubscribeOneClickUrl(userId, 'winback');
    if (!typeUrl || !allUrl || !oneClick) {
      // No signing secret on this deployment: a mail without a working
      // unsubscribe link is not sent at all.
      summary.reasons.no_unsubscribe_secret = (summary.reasons.no_unsubscribe_secret ?? 0) + 1;
      summary.skipped++;
      continue;
    }

    // Claim the stage first; only one run can.
    const previous = user.winback ?? null;
    const claim = await User.updateOne(
      {
        _id: user._id,
        $or: [
          { 'winback.awayFrom': { $ne: decision.last } },
          { 'winback.stage': { $lt: decision.stage } },
          { 'winback.stage': { $exists: false } },
        ],
      },
      { $set: { 'winback.awayFrom': decision.last, 'winback.stage': decision.stage, 'winback.sentAt': now } },
    );
    if (claim.modifiedCount !== 1) {
      summary.reasons.claimed_elsewhere = (summary.reasons.claimed_elsewhere ?? 0) + 1;
      continue;
    }

    const mail = await composeWinbackMail(user, decision.stage, now, verse, { typeUrl, allUrl }, {
      renderWinbackEmail,
      levelForXp,
      readTreeHealth,
      loadScheduleContext,
      DEFAULT_DAILY_GOAL,
      isDailyGoalMinutes,
    });

    const result = await sendEmail({
      to: user.email as string,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      preheader: mail.preheader,
      unsubscribeUrl: oneClick,
    });

    if (result.status === 'sent') {
      summary.sent++;
      await recordServerEvent('winback_email_sent', user._id, { stage: String(decision.stage) });
    } else {
      if (result.status === 'skipped') summary.skipped++;
      else {
        summary.failed++;
        console.error(`[winback] send failed for ${userId}: ${result.error}`);
      }
      // Not sent: give the stage back so the next run may try again.
      await User.updateOne(
        { _id: user._id, 'winback.awayFrom': decision.last, 'winback.stage': decision.stage },
        {
          $set: {
            'winback.awayFrom': previous?.awayFrom ?? null,
            'winback.stage': previous?.stage ?? 0,
            'winback.sentAt': (previous as { sentAt?: Date | null } | null)?.sentAt ?? null,
          },
        },
      );
    }
    if (spacingMs > 0) await new Promise((resolve) => setTimeout(resolve, spacingMs));
  }

  return summary;
}

export type WinbackPreviewResult =
  | { status: 'sent'; to: string; subject: string; id: string | null }
  | { status: 'failed' | 'skipped'; error: string };

/**
 * Sends ONE win-back mail, built exactly as the cron builds it, to the admin
 * who asks for it - their own account, their own address, nobody else's
 * (Alex, Nov 2026: "I want to see the mail the others get"). It touches no
 * win-back state and records no analytics, so it changes nothing about when
 * the real mails go out.
 */
export async function sendWinbackPreview(
  email: string,
  stage: import('./emailTemplates/winback').WinbackStage,
  now: Date = new Date(),
): Promise<WinbackPreviewResult> {
  const [
    { default: connectMongoDB },
    { default: User },
    { unsubscribePageUrl, unsubscribeOneClickUrl },
    { sendEmail },
    { renderWinbackEmail },
    { levelForXp },
    { readTreeHealth },
    { loadScheduleContext },
    { fetchDayTextForDate },
    { DEFAULT_DAILY_GOAL, isDailyGoalMinutes },
  ] = await Promise.all([
    import('./mongodb'),
    import('../models/User'),
    import('./emailPrefs'),
    import('./channels/email'),
    import('./emailTemplates/winback'),
    import('./gamification'),
    import('./progressTree/health'),
    import('./notificationSchedule'),
    import('./mobileDayText'),
    import('./dailyGoal'),
  ]);
  await connectMongoDB();

  const user = await User.findOne({ email })
    .select(
      'name email emailPrefs winback platformsSeenAt lastStreakDate createdAt xp lostStreak lostStreakAt dailyGoal.minutes levensboom.disabled',
    )
    .lean<LeanUser & { _id: unknown }>();
  if (!user || typeof user.email !== 'string') return { status: 'skipped', error: 'account not found' };

  const userId = String(user._id);
  const typeUrl = unsubscribePageUrl(userId, 'winback');
  const allUrl = unsubscribePageUrl(userId, 'all');
  const oneClick = unsubscribeOneClickUrl(userId, 'winback');
  if (!typeUrl || !allUrl || !oneClick) return { status: 'skipped', error: 'no unsubscribe secret' };

  const verseRow = await fetchDayTextForDate(dayKey(now)).catch(() => null);
  const verse = verseRow ? { text: verseRow.text, reference: verseRow.reference } : null;

  const mail = await composeWinbackMail(user, stage, now, verse, { typeUrl, allUrl }, {
    renderWinbackEmail,
    levelForXp,
    readTreeHealth,
    loadScheduleContext,
    DEFAULT_DAILY_GOAL,
    isDailyGoalMinutes,
  });

  const result = await sendEmail({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    preheader: mail.preheader,
    unsubscribeUrl: oneClick,
  });
  if (result.status === 'sent') return { status: 'sent', to: user.email, subject: mail.subject, id: result.id };
  return { status: result.status, error: result.status === 'failed' ? result.error : 'not sent' };
}
