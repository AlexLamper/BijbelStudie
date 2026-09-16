/**
 * Deep links the command palette uses to land on a specific control:
 * `/instellingen?sectie=account#instelling-wachtwoord`,
 * `/groepen?actie=aanmaken`, `/profiel?actie=badges`.
 *
 * A page reads the intent on mount AND on INTENT_EVENT, because router.push to
 * the page the reader is already on does not remount it. After acting on it
 * the page consumes the intent, so a reload does not reopen a dialog.
 */

export const INTENT_EVENT = "bs:intent";

export const GROEPEN_ACTIES = ["aanmaken", "code"] as const;
export const PROFIEL_ACTIES = ["naam", "bio", "badges"] as const;
export const INSTELLINGEN_SECTIES = ["lezen", "meldingen", "account", "abonnement", "over"] as const;

export type GroepenActie = (typeof GROEPEN_ACTIES)[number];
export type ProfielActie = (typeof PROFIEL_ACTIES)[number];
export type InstellingenSectie = (typeof INSTELLINGEN_SECTIES)[number];

/** The value of `key` in `search` when it is one of `allowed`, else null. */
export function parseIntent<T extends string>(search: string, key: string, allowed: readonly T[]): T | null {
  try {
    const value = new URLSearchParams(search).get(key);
    return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
  } catch {
    return null;
  }
}

/** parseIntent against the current URL. Null during SSR. */
export function readIntent<T extends string>(key: string, allowed: readonly T[]): T | null {
  if (typeof window === "undefined") return null;
  return parseIntent(window.location.search, key, allowed);
}

/** Remove `key` from the URL without a navigation (keeps the hash). */
export function consumeIntent(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(key)) return;
    url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* nothing to clean up */
  }
}

/** Fired by the palette after router.push, so a page already on screen re-reads its intent. */
export function dispatchIntent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INTENT_EVENT));
}

/** Whether `current` is the location `href` points at: same path, same params (any order), same hash. */
export function isAtHref(href: string, current: { pathname: string; search: string; hash: string }): boolean {
  try {
    const target = new URL(href, "https://x.test");
    const sortParams = (s: string) => {
      const p = new URLSearchParams(s);
      p.sort();
      return p.toString();
    };
    return (
      target.pathname === current.pathname &&
      sortParams(target.search) === sortParams(current.search) &&
      decodeURIComponent(target.hash) === decodeURIComponent(current.hash)
    );
  } catch {
    return false;
  }
}

/**
 * Dispatch INTENT_EVENT exactly once, as soon as the URL has become `href`
 * (router.push updates it asynchronously), or give up after `timeoutMs`.
 * One event, not a volley of timers: every extra event re-ran the page's
 * intent (a second scroll and highlight on /instellingen).
 */
export function dispatchIntentWhenAt(href: string, timeoutMs = 2000): () => void {
  if (typeof window === "undefined") return () => {};
  const started = Date.now();
  let timer = 0;
  const check = () => {
    if (isAtHref(href, window.location)) {
      dispatchIntent();
      return;
    }
    if (Date.now() - started < timeoutMs) timer = window.setTimeout(check, 40);
  };
  check();
  return () => window.clearTimeout(timer);
}

/** Remove the hash from the URL without a navigation, once a page has acted on it. */
export function consumeHash(): void {
  if (typeof window === "undefined" || !window.location.hash) return;
  try {
    const url = new URL(window.location.href);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  } catch {
    /* nothing to clean up */
  }
}

/** Set `?key=value` in the URL without a navigation. Drops the hash: it pointed into the old view. */
export function writeParam(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  } catch {
    /* the tab still switches; only the URL is not updated */
  }
}

/** A 2 px brand-teal ring. */
const HIGHLIGHT = "0 0 0 2px #0D9488";

/**
 * Scroll a setting into view and outline it in teal for 1.2 s. Retries for a
 * short while, because the section may still be rendering (or loading its
 * data) when this is called. Returns false if the element never appeared.
 */
export function scrollToSetting(id: string, attempts = 20): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    let tries = 0;
    const attempt = () => {
      const el = document.getElementById(id);
      if (!el) {
        if (++tries >= attempts) return resolve(false);
        window.setTimeout(attempt, 100);
        return;
      }
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      // Inline style, not classes: tailwind does not scan lib/, so a class
      // string here would never be generated.
      const prev = { boxShadow: el.style.boxShadow, borderRadius: el.style.borderRadius, transition: el.style.transition };
      el.style.boxShadow = HIGHLIGHT;
      if (!el.style.borderRadius) el.style.borderRadius = "10px";
      if (!reduce) el.style.transition = "box-shadow 200ms ease";
      window.setTimeout(() => {
        el.style.boxShadow = prev.boxShadow;
        window.setTimeout(() => {
          el.style.borderRadius = prev.borderRadius;
          el.style.transition = prev.transition;
        }, reduce ? 0 : 220);
      }, 1200);
      resolve(true);
    };
    attempt();
  });
}

/** The `instelling-*` id in the current hash, if any. */
export function settingHash(): string | null {
  if (typeof window === "undefined") return null;
  const id = decodeURIComponent(window.location.hash.slice(1));
  return /^instelling-[a-z0-9-]+$/.test(id) ? id : null;
}
