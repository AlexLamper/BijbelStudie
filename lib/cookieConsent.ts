/**
 * Cookie consent: the one place that knows what the reader chose.
 *
 * Deliberately dependency-free (no React, no imports) so it can be pulled into
 * the root-layout client graph and into lib/analytics.ts without dragging
 * anything else along - see the note at the top of
 * components/providers/AnalyticsTracker.tsx for why that matters here.
 *
 * WHAT NEEDS CONSENT AND WHAT DOES NOT.
 *
 * Strictly necessary, never gated, keeps working whatever the reader picks:
 *  - the NextAuth session/callback cookies (inloggen en beveiliging),
 *  - the i18next language cookie set by middleware.ts,
 *  - anything Stripe sets while a checkout is actually running.
 * Under art. 11.7a Telecommunicatiewet / art. 5(3) ePrivacy these are exempt:
 * they are needed to deliver the service the reader explicitly asked for.
 *
 * Consent-gated:
 *  - our own usage statistics (lib/analytics.ts, which writes the `bs_anon_id`
 *    key into localStorage and posts events to /api/analytics),
 *  - the `bs_seen_landing` convenience cookie, which is a comfort feature and
 *    not required to deliver anything.
 *
 * There is no third-party tracking on this site, so there are no categories to
 * toggle - the choice is the whole consent, and "declined" is a real, honoured
 * answer rather than a dark pattern.
 */

/** Bump the version suffix to re-ask everyone after a material change. */
export const CONSENT_STORAGE_KEY = "bs-cookie-consent-v1";

/** Fired on `window` after every write, so open tabs react without a reload. */
export const CONSENT_EVENT = "bs-cookie-consent-change";

export type ConsentStatus = "accepted" | "declined";

export interface ConsentRecord {
  status: ConsentStatus;
  /** ISO timestamp of the moment the reader chose. Part of the audit trail. */
  date: string;
}

function isStatus(value: unknown): value is ConsentStatus {
  return value === "accepted" || value === "declined";
}

/**
 * Parses whatever is in storage. Exported for the tests: a value written by an
 * older build, hand-edited, or truncated must read as "no choice yet" rather
 * than throw or silently count as consent.
 */
export function parseConsent(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { status, date } = parsed as { status?: unknown; date?: unknown };
    if (!isStatus(status)) return null;
    return { status, date: typeof date === "string" ? date : "" };
  } catch {
    return null;
  }
}

/** The stored choice, or null when the reader has not answered yet. */
export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    // Private mode or blocked storage: treat as "not answered", which means
    // nothing optional runs.
    return null;
  }
}

/** Records the choice and tells every listener in this tab about it. */
export function setConsent(status: ConsentStatus): ConsentRecord {
  const record: ConsentRecord = { status, date: new Date().toISOString() };
  if (typeof window === "undefined") return record;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked: the banner still closes for this session, and nothing
    // optional starts, because hasAnalyticsConsent() will read null again.
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
  } catch {
    /* never let a notification break the click that caused it */
  }
  return record;
}

/**
 * True only after an explicit "Accepteren". No answer, a declined answer, a
 * server render or unreadable storage all mean false - opt-in, not opt-out.
 */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.status === "accepted";
}

/** Same rule, for the optional `bs_seen_landing` convenience cookie. */
export function hasFunctionalConsent(): boolean {
  return hasAnalyticsConsent();
}

/**
 * Subscribes to changes in this tab (CONSENT_EVENT) and in other tabs
 * (`storage`). Returns the unsubscribe function.
 */
export function subscribeConsent(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === CONSENT_STORAGE_KEY) listener();
  };
  window.addEventListener(CONSENT_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
