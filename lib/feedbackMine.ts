/**
 * "Mijn feedback": what a reader sent, what became of it, and any answer.
 *
 * Scoped to one account by construction: every filter here starts from the
 * caller's own `userId`, which comes from `resolveUser`, never from the body.
 * Pure builders plus one serialiser, so the scoping is testable without Mongo.
 *
 * What a reader never sees: the internal `adminNote`, themes, sentiment, the
 * segment, and the delivery details of a reply (`emailStatus`, `emailId`).
 */

/** Surfaces where the reader wrote something in their own words. */
export const MINE_TOUCHPOINTS = ['unprompted', 'subscription_cancel', 'ai_report'] as const;

export const MINE_LIMIT = 50;

export type MineStatus = 'ontvangen' | 'bekeken' | 'gepland' | 'opgelost';

export const MINE_STATUS_LABELS: Record<MineStatus, string> = {
  ontvangen: 'Ontvangen',
  bekeken: 'Bekeken',
  gepland: 'Gepland',
  opgelost: 'Opgelost',
};

/** The admin status folded into the four steps a reader can follow. */
export function mineStatus(status: string | null | undefined): MineStatus {
  switch (status) {
    case 'reviewed':
    case 'archived':
      return 'bekeken';
    case 'planned':
      return 'gepland';
    case 'shipped':
    case 'resolved':
      return 'opgelost';
    default:
      return 'ontvangen';
  }
}

export function mineFilter(userId: string): Record<string, unknown> {
  return {
    userId,
    $or: [{ touchpoint: { $in: [...MINE_TOUCHPOINTS] } }, { lastReplyAt: { $ne: null } }],
  };
}

/** Marks every answer this reader has as seen. Own documents only. */
export function markSeenFilter(userId: string): Record<string, unknown> {
  return { userId, lastReplyAt: { $ne: null } };
}

type MineDoc = {
  _id: unknown;
  subject?: string;
  message?: string;
  category?: string;
  touchpoint?: string;
  status?: string;
  createdAt?: Date | string;
  replies?: { at: Date | string; body: string }[];
  lastReplyAt?: Date | string | null;
  userSeenReplyAt?: Date | string | null;
};

export function serialiseMine(doc: MineDoc) {
  const lastReply = doc.lastReplyAt ? new Date(doc.lastReplyAt).getTime() : 0;
  const seen = doc.userSeenReplyAt ? new Date(doc.userSeenReplyAt).getTime() : 0;
  const status = mineStatus(doc.status);
  return {
    id: String(doc._id),
    subject: doc.subject || '',
    message: doc.message || '',
    category: doc.category || 'other',
    touchpoint: doc.touchpoint || 'unprompted',
    status,
    statusLabel: MINE_STATUS_LABELS[status],
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
    replies: (doc.replies ?? []).map((reply) => ({ at: new Date(reply.at).toISOString(), body: reply.body })),
    hasUnseenReply: lastReply > 0 && lastReply > seen,
  };
}

export type MineItem = ReturnType<typeof serialiseMine>;

/** Only what `serialiseMine` reads - never the admin fields. */
export const MINE_PROJECTION = 'subject message category touchpoint status createdAt replies.at replies.body lastReplyAt userSeenReplyAt';
