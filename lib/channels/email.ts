/**
 * The one place this project sends email from.
 *
 * There was no email sender here at all before this module, and the cost of
 * that was not theoretical: `/wachtwoord-vergeten` had been POSTing to a route
 * that did not exist, so anyone who forgot their password could not get back
 * into their account, while `lib/content/helpFaq.ts` told them the mail was on
 * its way.
 *
 * PROVIDER. Resend, over its HTTP API with `fetch`, deliberately without the
 * `resend` npm package - the whole integration is one POST and one bearer
 * token, and a dependency that wraps that earns its place only if we start
 * using the rest of the API. Swapping provider means rewriting `deliver()` and
 * nothing else; every caller goes through `sendEmail`.
 *
 * ABSENT CONFIGURATION IS NOT AN ERROR. With no `RESEND_API_KEY` set - local
 * development, CI, a preview deployment - `sendEmail` logs what it would have
 * sent and reports `skipped`. A missing key must never turn a password-reset
 * request into a 500, because the caller's own behaviour (see
 * `app/api/auth/forgot-password`) is to answer 200 either way.
 */

export type EmailAddress = string;

export type EmailMessage = {
  to: EmailAddress;
  subject: string;
  /** Full HTML body. Build it with a module from `lib/emailTemplates`. */
  html: string;
  /** Plain-text alternative. Required: an HTML-only mail scores as spam. */
  text: string;
  /**
   * The short line a client shows after the subject. Rendered into the HTML as
   * hidden text by the templates, so it is passed here only for logging.
   */
  preheader?: string;
  /**
   * `List-Unsubscribe` targets. Transactional mail (password reset, billing)
   * leaves this unset on purpose - offering to unsubscribe from a password
   * reset is nonsense, and RFC 8058 does not ask for it.
   */
  unsubscribeUrl?: string;
};

export type SendResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'failed'; error: string };

/** The site's own origin. Every link in an email must be absolute. */
export const SITE_ORIGIN = 'https://www.bijbelstudie.io';

/**
 * Sender identity. A subdomain, so that a future engagement-mail reputation
 * problem cannot take password reset down with it - the argument for splitting
 * the streams is in NOTIFICATIONS_PLAN.md, open decision O1.
 */
const DEFAULT_FROM = 'BijbelStudie <geenantwoord@mail.bijbelstudie.io>';

function from(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

/**
 * Reject anything that is not plausibly one address before it reaches the
 * provider. A newline is the one that matters: a header-injection attempt in a
 * user-supplied address must not become a second header.
 */
function isSendableAddress(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 254 &&
    !/[\r\n]/.test(value) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

async function deliver(message: EmailMessage, apiKey: string): Promise<SendResult> {
  const headers: Record<string, string> = {};
  if (message.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${message.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: from(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      }),
    });

    if (!res.ok) {
      // Never log the body of an email or the key; the status and the
      // provider's own error text are enough to act on.
      const detail = await res.text().catch(() => '');
      return { status: 'failed', error: `${res.status} ${detail.slice(0, 300)}` };
    }

    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    return { status: 'sent', id: body?.id ?? null };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : 'unknown' };
  }
}

/**
 * Sends one email, or explains why it did not. Never throws: every caller so
 * far has a correct answer to give the user whether or not the mail left.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!isSendableAddress(message.to)) {
    return { status: 'failed', error: 'invalid recipient' };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      `[email] Niet verzonden (RESEND_API_KEY ontbreekt): "${message.subject}" -> ${message.to}`,
    );
    return { status: 'skipped', reason: 'not_configured' };
  }

  return deliver(message, apiKey);
}

/** True when a real send would happen. For diagnostics and admin screens. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
