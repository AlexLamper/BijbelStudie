/**
 * GET /api/v1/notifications/schedule?days=14&tz=Europe/Amsterdam
 *
 * Content for the app's locally scheduled morning and evening notifications.
 * The server only supplies text and deep links; the app owns timing, the
 * on/off switches and cancelling today's evening nudge once the user has been
 * in the app. At most two notifications per day. See DAILY_HABIT_PLAN.md §1-2.
 *
 * Copy rules: Dutch, no emoji, no guilt or deadline wording.
 */

export type NotificationKind = 'bibleYear' | 'study' | 'chapter' | 'verse';

export type ScheduledNotificationContent = {
  kind: NotificationKind;
  title: string;
  body: string;
  /**
   * App go_router location, validated against the app's whitelist:
   * '/studie/<id>/<day>?stap=<step>', '/studies/bijbel-in-een-jaar',
   * '/read', '/dashboard'.
   */
  route: string;
};

export type NotificationScheduleDay = {
  /** 'YYYY-MM-DD' in the requested time zone. */
  date: string;
  /** The verse for this exact date (not today's), or null if the upstream failed. */
  verse: { text: string; reference: string; translation: string } | null;
  /** Title = today's task, body = the verse (or a task line when there is no verse). */
  morning: ScheduledNotificationContent;
  /** Used only if the user has not opened the app that day; the app cancels it otherwise. */
  evening: ScheduledNotificationContent;
};

export type NotificationScheduleResponse = {
  generatedAt: string;
  timeZone: string;
  days: NotificationScheduleDay[];
};
