/**
 * Google Analytics 4 (gtag.js), consent-gated.
 *
 * Deliberately dependency-free, like lib/cookieConsent.ts: it is imported from
 * the root-layout client graph (components/providers/GoogleAnalytics.tsx).
 *
 * BASIC CONSENT MODE. gtag.js is not even downloaded until the reader presses
 * "Accepteren" in the cookiebanner, so a visitor who declines or never answers
 * sends nothing to Google - not even the cookieless pings of "advanced" consent
 * mode. Ads signals stay denied throughout: this site shows no ads.
 *
 * URLS ARE SANITISED. /wachtwoord-herstellen carries a live reset token in its
 * query string and /succes a Stripe session id; the default GA page view would
 * ship both to Google as `page_location` / `page_referrer`. So the automatic page
 * view is off (`send_page_view: false`) and every page view is sent from here
 * with the query string reduced to campaign parameters and the hash dropped.
 * For this to hold, "Paginawijzigingen op basis van browsergeschiedenis" must
 * stay OFF in the GA data stream's enhanced measurement settings - otherwise GA
 * sends its own page views on every client-side navigation, with the raw URL.
 *
 * Only loaded on the production deployment (see app/layout.tsx): previews and
 * local dev would pollute the property.
 */

export const GA_MEASUREMENT_ID = "G-34DVLFFCBS";

/** Query parameters GA needs for traffic-source attribution. Everything else is dropped. */
const KEPT_PARAM = /^(utm_[a-z_]+|gclid|gbraid|wbraid)$/i;

/**
 * `href` with every query parameter except campaign tags removed and the hash
 * dropped. Returns "" for anything that does not parse, so a malformed referrer
 * can never leak through unsanitised.
 */
export function sanitizeUrl(href: string): string {
  if (!href) return "";
  try {
    const url = new URL(href);
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (KEPT_PARAM.test(key)) kept.append(key, value);
    });
    const query = kept.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "";
  }
}

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** GA's own documented kill switch: while true, gtag.js sends no hits at all. */
const DISABLE_FLAG = `ga-disable-${GA_MEASUREMENT_ID}`;

let started = false;
let lastLocation: string | null = null;

function setDisabled(disabled: boolean): void {
  (window as unknown as Record<string, boolean>)[DISABLE_FLAG] = disabled;
}

/** Loads gtag.js once; on later calls only re-enables it. Call only after consent. */
export function startGoogleAnalytics(): void {
  if (typeof window === "undefined") return;
  setDisabled(false);

  if (started) {
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    return;
  }
  started = true;

  window.dataLayer = window.dataLayer || [];
  // gtag.js only accepts the `arguments` object itself, not a spread array.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: sanitizeUrl(window.location.href),
    page_referrer: sanitizeUrl(document.referrer),
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/**
 * Consent withdrawn (or never given): stop every hit and remove the _ga
 * cookies. Idempotent and cheap, so it is safe to call on every render path
 * where analytics is not allowed.
 */
export function stopGoogleAnalytics(): void {
  if (typeof window === "undefined") return;
  setDisabled(true);
  if (started) window.gtag?.("consent", "update", { analytics_storage: "denied" });
  deleteGaCookies();
}

/** One page view for the current URL, sanitised. No-op until started. */
export function sendPageView(): void {
  if (typeof window === "undefined" || !started || !window.gtag) return;
  const location = sanitizeUrl(window.location.href);
  const referrer = lastLocation ?? sanitizeUrl(document.referrer);
  // `set` as well as the event, so enhanced-measurement events (scrolls,
  // outbound clicks, downloads) carry the sanitised URL too.
  window.gtag("set", { page_location: location, page_referrer: referrer });
  window.gtag("event", "page_view", {
    page_location: location,
    page_referrer: referrer,
    page_title: document.title,
  });
  lastLocation = location;
}

/**
 * `_ga` and `_ga_<id>` are set on the widest domain GA can write
 * (.bijbelstudie.io), so every suffix of the hostname is tried as well as a
 * host-only cookie.
 */
function deleteGaCookies(): void {
  try {
    const names = document.cookie
      .split(";")
      .map((part) => part.split("=")[0].trim())
      .filter((name) => name === "_ga" || name.startsWith("_ga_"));
    if (names.length === 0) return;

    const labels = window.location.hostname.split(".");
    const domains = [""];
    for (let i = 0; i < labels.length - 1; i++) {
      domains.push(`; domain=.${labels.slice(i).join(".")}`);
    }
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
      }
    }
  } catch {
    /* blocked cookie access: nothing was stored either */
  }
}
