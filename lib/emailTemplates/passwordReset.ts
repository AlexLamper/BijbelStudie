/**
 * The password-reset email.
 *
 * Transactional, so no unsubscribe footer: nobody opts out of being able to
 * get back into their own account.
 *
 * The copy states the validity window and says plainly what to do if the
 * request was not theirs. That second line is the one that stops a reset mail
 * reading like a phishing attempt, which is the main reason people ignore them
 * and then mail support instead.
 */

import { button, escapeHtml, paragraph, render, type RenderedEmail } from './layout';

/** Kept in step with `RESET_TOKEN_TTL_MS` in the forgot-password route. */
export const RESET_VALIDITY_TEXT = 'een uur';

export function renderPasswordResetEmail(params: {
  name: string;
  resetUrl: string;
}): RenderedEmail {
  const first = params.name.trim().split(/\s+/)[0] || 'daar';

  const bodyHtml = [
    // `paragraph` takes HTML, so anything interpolated into it is escaped here.
    // The display name is user-supplied and reaches an inbox unfiltered
    // otherwise.
    paragraph(`Hallo ${escapeHtml(first)},`),
    paragraph(
      'Je hebt gevraagd om je wachtwoord opnieuw in te stellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.',
    ),
    button('Nieuw wachtwoord instellen', params.resetUrl),
    paragraph(`Deze link werkt ${RESET_VALIDITY_TEXT} en kan één keer gebruikt worden.`),
    paragraph(
      'Heb je dit niet zelf aangevraagd? Dan hoef je niets te doen. Je wachtwoord blijft zoals het is, zolang je de link niet gebruikt.',
    ),
  ].join('\n');

  const text = [
    `Hallo ${first},`,
    '',
    'Je hebt gevraagd om je wachtwoord opnieuw in te stellen. Open deze link om een nieuw wachtwoord te kiezen:',
    '',
    params.resetUrl,
    '',
    `Deze link werkt ${RESET_VALIDITY_TEXT} en kan één keer gebruikt worden.`,
    '',
    'Heb je dit niet zelf aangevraagd? Dan hoef je niets te doen. Je wachtwoord blijft zoals het is, zolang je de link niet gebruikt.',
    '',
    'BijbelStudie',
  ].join('\n');

  return render({
    subject: 'Je wachtwoord opnieuw instellen',
    preheader: `De link werkt ${RESET_VALIDITY_TEXT}.`,
    heading: 'Stel een nieuw wachtwoord in',
    bodyHtml,
    text,
    footerLinks: null,
  });
}
