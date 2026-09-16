/**
 * The maker's answer to one piece of feedback.
 *
 * Transactional in the sense that matters here: the reader asked something
 * and this is the answer, so there is no unsubscribe footer. It is sent from a
 * sender a person can reply to (`FEEDBACK_REPLY_FROM`, `FEEDBACK_REPLY_TO`),
 * which is the whole point - a conversation, not a notification.
 *
 * The reply body is the admin's plain text. It is escaped and its line breaks
 * kept, never interpreted as HTML. The reader's own words are quoted back
 * (shortened) so the answer makes sense weeks later in an inbox.
 */

import { SITE_ORIGIN } from '../channels/email';
import { button, escapeHtml, paragraph, render, type RenderedEmail } from './layout';

const QUOTE_MAX = 300;

function toHtmlLines(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br />');
}

export function renderFeedbackReplyEmail(params: {
  name: string;
  reply: string;
  originalMessage: string;
  subject?: string;
}): RenderedEmail {
  const first = params.name.trim().split(/\s+/)[0] || '';
  const greeting = first ? `Hallo ${first},` : 'Hallo,';
  const original = params.originalMessage.trim();
  const quote = original.length > QUOTE_MAX ? `${original.slice(0, QUOTE_MAX).trimEnd()}...` : original;
  const mineUrl = `${SITE_ORIGIN}/feedback?tab=mijn`;

  const bodyHtml = [
    paragraph(escapeHtml(greeting)),
    paragraph(toHtmlLines(params.reply.trim())),
    quote
      ? `<p style="margin:0 0 16px;padding:10px 14px;border-left:3px solid #CBD5E1;font-size:13px;line-height:1.6;color:#64748B;">Je schreef: ${toHtmlLines(quote)}</p>`
      : '',
    button('Bekijk je feedback', mineUrl),
    paragraph('Je kunt gewoon op deze mail antwoorden.'),
  ]
    .filter(Boolean)
    .join('\n');

  const text = [
    greeting,
    '',
    params.reply.trim(),
    '',
    ...(quote ? [`Je schreef: ${quote}`, ''] : []),
    `Bekijk je feedback: ${mineUrl}`,
    '',
    'Je kunt gewoon op deze mail antwoorden.',
    '',
    'BijbelStudie',
  ].join('\n');

  const topic = params.subject?.trim();
  return render({
    subject: topic ? `Antwoord op je feedback: ${topic.slice(0, 80)}` : 'Antwoord op je feedback',
    preheader: params.reply.trim().slice(0, 90),
    heading: 'Antwoord op je feedback',
    bodyHtml,
    text,
    footerLinks: null,
  });
}
