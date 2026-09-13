import { safeRedirect } from "./safeRedirect";

/**
 * Where "Doorgaan als gast" on /inloggen and /registreren sends a visitor.
 *
 * The studies are the guest front door - the same place middleware.ts sends a
 * returning guest from "/". /dashboard is NOT: its layout answers a guest with
 * GuestGate, so a guest button pointing there would land on "log eerst in".
 *
 * A `next` parameter is honoured only when a guest can actually use that page.
 * The account-bound routes below each render GuestGate from their own layout
 * (or, for /admin, are bounced by middleware), so sending a guest there would
 * just show the login prompt again. "/" is skipped too: it is the marketing
 * page the visitor has just come from.
 */
export const GUEST_HOME = "/studies";

const ACCOUNT_ONLY_ROUTES = [
  "/dashboard",
  "/notities",
  "/profiel",
  "/instellingen",
  "/groepen",
  "/feedback",
  "/admin",
  "/inloggen",
  "/registreren",
];

export function guestTarget(next: unknown): string {
  const target = safeRedirect(next, GUEST_HOME);
  const pathname = target.split(/[?#]/)[0];
  if (pathname === "/") return GUEST_HOME;
  const accountOnly = ACCOUNT_ONLY_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
  return accountOnly ? GUEST_HOME : target;
}
