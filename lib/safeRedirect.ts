/**
 * Validates a `next` / `callbackUrl` parameter before it is used as a redirect
 * target.
 *
 * Without this check, `/registreren?next=https://evil.example` would hand an
 * attacker a redirect off the back of a trusted domain - the classic open
 * redirect, and a genuinely effective phishing primitive on an auth page
 * because the user has just typed their password.
 *
 * Only same-site absolute *paths* are accepted:
 *  - must start with a single "/" (so "//evil.example", which browsers treat as
 *    protocol-relative and therefore off-site, is rejected);
 *  - must not contain a backslash, which some browsers normalise to "/";
 *  - must not contain a scheme;
 *  - must not contain control characters, which can be used to confuse a parser
 *    further down the line.
 */

const FALLBACK = "/dashboard";

/** True if the string contains any C0 or C7 control character. */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}



export function safeRedirect(target: unknown, fallback: string = FALLBACK): string {
  if (typeof target !== "string" || target.length === 0) return fallback;
  if (target.length > 512) return fallback;

  if (!target.startsWith("/")) return fallback;
  if (target.startsWith("//")) return fallback;
  if (target.includes("\\")) return fallback;
  if (target.includes("://")) return fallback;
  if (hasControlChar(target)) return fallback;

  return target;
}
