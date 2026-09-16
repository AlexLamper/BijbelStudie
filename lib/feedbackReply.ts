/**
 * The maker answering one piece of feedback.
 *
 * The reply is STORED first and sent second, and a failed or unconfigured send
 * never loses it: the reader still finds the answer in "Mijn feedback" and on
 * the dashboard's closed-loop card. `emailStatus` on the stored reply says what
 * happened to the mail, so the inbox can show "niet gemaild" honestly.
 *
 * Only ever targeted writes: one `$push` onto `replies` and a `$set` of the
 * reply time (and optionally the status). No hydrated document is saved.
 */

import mongoose from 'mongoose';

import connectMongoDB from './mongodb';
import Feedback from '../models/Feedback';
import { sendEmail as defaultSendEmail, type EmailMessage, type SendResult } from './channels/email';
import { renderFeedbackReplyEmail } from './emailTemplates/feedbackReply';

export const REPLY_MAX = 4000;
/** Statuses the reply panel may set together with a reply. */
export const REPLY_STATUSES = ['reviewed', 'planned', 'shipped', 'resolved'] as const;

export type ReplyEmailStatus = 'sent' | 'skipped' | 'failed' | 'no_recipient';

export type ReplyResult =
  | { status: 200; body: { ok: true; emailStatus: ReplyEmailStatus; reply: { at: string; body: string; emailStatus: ReplyEmailStatus } } }
  | { status: 400 | 404; body: { error: string } };

type Deps = {
  sendEmail?: (message: EmailMessage) => Promise<SendResult>;
  now?: Date;
};

/** Sender settings for a reply, from env. Exported for the tests and the admin UI. */
export function replySender(env: Record<string, string | undefined> = process.env) {
  return {
    from: env.FEEDBACK_REPLY_FROM?.trim() || undefined,
    replyTo: env.FEEDBACK_REPLY_TO?.trim() || undefined,
  };
}

export function validateReplyInput(body: Record<string, unknown> | null):
  | { ok: true; text: string; markStatus: (typeof REPLY_STATUSES)[number] | null }
  | { ok: false; error: string } {
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (text.length < 2) return { ok: false, error: 'Schrijf een antwoord' };
  if (text.length > REPLY_MAX) return { ok: false, error: `Antwoord is te lang (max ${REPLY_MAX} tekens)` };
  const raw = body?.markStatus;
  if (raw === undefined || raw === null || raw === '') return { ok: true, text, markStatus: null };
  if (typeof raw !== 'string' || !(REPLY_STATUSES as readonly string[]).includes(raw)) {
    return { ok: false, error: 'Ongeldige status' };
  }
  return { ok: true, text, markStatus: raw as (typeof REPLY_STATUSES)[number] };
}

export async function replyToFeedback(
  id: string,
  body: Record<string, unknown> | null,
  deps: Deps = {},
): Promise<ReplyResult> {
  if (!mongoose.isValidObjectId(id)) return { status: 404, body: { error: 'Niet gevonden' } };
  const input = validateReplyInput(body);
  if (input.ok === false) return { status: 400, body: { error: input.error } };

  await connectMongoDB();
  const doc = await Feedback.findById(id)
    .select('name email contactName contactEmail subject message anonymisedAt')
    .lean<{
      name?: string;
      email?: string;
      contactName?: string;
      contactEmail?: string;
      subject?: string;
      message?: string;
      anonymisedAt?: Date | null;
    }>();
  if (!doc) return { status: 404, body: { error: 'Niet gevonden' } };

  const now = deps.now ?? new Date();
  const recipient = (doc.email || doc.contactEmail || '').trim();
  let emailStatus: ReplyEmailStatus = 'no_recipient';
  let emailId: string | null = null;

  if (recipient && !doc.anonymisedAt) {
    const rendered = renderFeedbackReplyEmail({
      name: doc.name || doc.contactName || '',
      reply: input.text,
      originalMessage: doc.message || '',
      subject: doc.subject || '',
    });
    const sender = replySender();
    const send = deps.sendEmail ?? defaultSendEmail;
    const result = await send({
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      preheader: rendered.preheader,
      ...(sender.from ? { from: sender.from } : {}),
      ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
    });
    emailStatus = result.status;
    if (result.status === 'sent') emailId = result.id;
  }

  const reply = {
    at: now,
    body: input.text,
    channel: emailStatus === 'sent' ? 'email' : 'in_app',
    emailStatus,
    emailId,
  };

  await Feedback.updateOne(
    { _id: id },
    {
      $push: { replies: reply },
      $set: { lastReplyAt: now, ...(input.markStatus ? { status: input.markStatus } : {}) },
    },
  );

  return {
    status: 200,
    body: { ok: true, emailStatus, reply: { at: now.toISOString(), body: input.text, emailStatus } },
  };
}
