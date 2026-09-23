/**
 * Opens the Pro offer dialog from anywhere on the website.
 *
 * The dialog (components/pricing/ProOfferDialog.tsx) is mounted once, in the
 * root layout, and listens for this event - so a paywall inside a note dialog,
 * the AI panel or the lesson window can raise it without a provider being
 * threaded through every layout (several route layouts have no SessionProvider
 * at all).
 *
 * It is raised at the moments someone reaches for something Pro: a limit they
 * just hit, a Pro control they just tapped. Never on a timer, never on page
 * load - an offer nobody asked for is an interruption, not a paywall.
 */

export const PRO_OFFER_EVENT = 'bijbelstudie:pro-offer';

/** Which gate raised the offer. Also the `surface` the analytics events carry. */
export type ProOfferSurface =
  | 'ai_limit'
  | 'note_limit'
  | 'group_limit'
  | 'original_text'
  | 'commentary'
  | 'tts'
  | 'plan_limit';

export interface ProOfferRequest {
  surface: ProOfferSurface;
  /** One line saying what just happened, e.g. "Je hebt je 3 gratis AI-vragen voor vandaag gebruikt." */
  reason?: string;
}

export function openProOffer(request: ProOfferRequest): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ProOfferRequest>(PRO_OFFER_EVENT, { detail: request }));
}
