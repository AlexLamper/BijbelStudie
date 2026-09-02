/**
 * The shell every email in this project is rendered into.
 *
 * Email HTML is not web HTML. Mail clients strip `<style>` blocks, ignore
 * flexbox and grid, refuse web fonts, and Outlook still lays out with Word's
 * engine - so this is a table, inline CSS, 600px wide, with a system font
 * stack and no images. That is not conservatism for its own sake; it is the
 * only layout that renders the same in Gmail, Apple Mail and Outlook.
 *
 * Deliberately plain template strings: no MJML, no React Email. Two email
 * types do not justify a build step, and the day they do, `render()` is the
 * only function that changes.
 */

import { SITE_ORIGIN } from '../channels/email';

const TEAL = '#0D9488';
const SLATE_900 = '#0F172A';
const SLATE_600 = '#475569';
const SLATE_400 = '#94A3B8';
const BORDER = '#E2E8F0';
const CANVAS = '#F8FAFC';

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type RenderedEmail = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

export type FooterLinks = {
  /** Turns off only the notification type this email belongs to. */
  unsubscribeTypeUrl: string;
  /** Turns off every engagement email. */
  unsubscribeAllUrl: string;
};

/** `&`, `<`, `>` and quotes, so an interpolated book title cannot break out. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A teal call-to-action. Built as a bordered table cell rather than a styled
 * `<a>`, because Outlook drops padding on inline elements and the button
 * collapses to bare text.
 */
export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td align="center" bgcolor="${TEAL}" style="border-radius:10px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${SLATE_600};">${html}</p>`;
}

/**
 * The footer for engagement email. Transactional mail (password reset,
 * billing) passes no links and gets no unsubscribe block: offering to opt out
 * of a password reset is nonsense, and it invites people to switch off the
 * mail that tells them their payment failed.
 */
function footer(links: FooterLinks | null): string {
  const legal = `<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${SLATE_400};">
  BijbelStudie · <a href="${SITE_ORIGIN}/privacybeleid" style="color:${SLATE_400};">Privacybeleid</a>
</p>`;

  if (!links) {
    return `<tr><td style="padding:8px 32px 32px;border-top:1px solid ${BORDER};">${legal}</td></tr>`;
  }

  return `<tr>
  <td style="padding:20px 32px 32px;border-top:1px solid ${BORDER};">
    <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${SLATE_400};">
      Je krijgt deze mail omdat je meldingen hebt aanstaan in je BijbelStudie-account.
    </p>
    <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${SLATE_400};">
      <a href="${escapeHtml(links.unsubscribeTypeUrl)}" style="color:${TEAL};">Deze soort uitzetten</a>
      · <a href="${escapeHtml(links.unsubscribeAllUrl)}" style="color:${TEAL};">Alle e-mails uitzetten</a>
      · <a href="${SITE_ORIGIN}/instellingen" style="color:${TEAL};">Instellingen</a>
    </p>
    ${legal}
  </td>
</tr>`;
}

/**
 * Wraps body HTML in the shell.
 *
 * `preheader` is the line a client previews next to the subject. It is hidden
 * in the body with zero dimensions - without it the client picks the first
 * visible words instead, which is usually the greeting.
 */
export function render(params: {
  subject: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
  text: string;
  footerLinks?: FooterLinks | null;
}): RenderedEmail {
  const html = `<div style="background-color:${CANVAS};padding:24px 12px;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(params.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border:1px solid ${BORDER};border-radius:14px;">
    <tr>
      <td style="padding:32px 32px 0;">
        <p style="margin:0 0 24px;font-family:${FONT};font-size:15px;font-weight:700;color:${TEAL};">BijbelStudie</p>
        <h1 style="margin:0 0 16px;font-family:${FONT};font-size:21px;line-height:1.35;font-weight:700;color:${SLATE_900};">${escapeHtml(params.heading)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">${params.bodyHtml}</td>
    </tr>
    ${footer(params.footerLinks ?? null)}
  </table>
</div>`;

  return {
    subject: params.subject,
    preheader: params.preheader,
    html,
    text: params.text,
  };
}
