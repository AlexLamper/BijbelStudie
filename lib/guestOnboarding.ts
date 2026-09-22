/**
 * The guest's first-run answers, and how they become account preferences.
 *
 * A visitor with no account answers exactly the same questions a new account
 * answers - study style, translation, commentary, weergave, the tree they start
 * with - and there is nowhere on the server to put those answers, so they are
 * kept in localStorage instead. Same shape as lib/guestLessons.ts: one
 * namespaced key, every read and write wrapped, and a replay that hands the
 * result to the normal endpoints the moment there is an account to hand it to.
 *
 * Nothing here ever throws. A browser that refuses storage (a private window,
 * blocked site data) falls back to the in-memory copy below, which lasts for
 * one page load - enough for the flow itself to finish correctly, and the
 * visitor simply gets asked again on the next visit rather than seeing an
 * error.
 */

/** The answers themselves. Written once, when the flow ends. */
export const GUEST_ONBOARDING_KEY = "bijbelstudie_guest_onboarding";

/**
 * The one-shot handoff from "Doorgaan als gast".
 *
 * `ContinueAsGuest` sets it right before it sends a visitor into the app, so
 * the flow runs on the very next render whatever page they land on. A visitor
 * who arrives in the product some other way is covered by
 * `guestOnboardingRoute()` instead, so this key is a trigger, not the only one.
 */
export const GUEST_ONBOARDING_PENDING_KEY = "bijbelstudie_guest_onboarding_pending";

export type GuestStudyStyle = "guided" | "self";
export type GuestSpecies = "eik" | "olijf";

export interface GuestOnboarding {
  /** Default bible translation, by manifest id. */
  translation?: string;
  /** Default commentary, by manifest id. */
  commentary?: string;
  /** The theme. Carried in `intent` because that is the field the account has. */
  intent?: string;
  studyStyle?: GuestStudyStyle;
  species?: GuestSpecies;
  /** True when the visitor pressed "Overslaan" instead of finishing. */
  skipped?: boolean;
  answeredAt?: string;
}

const STUDY_STYLES: readonly string[] = ["guided", "self"];
const SPECIES: readonly string[] = ["eik", "olijf"];
const THEMES: readonly string[] = ["light", "dark", "system"];

/**
 * The fallback for a browser that hands back nothing.
 *
 * It lives for one page load, which is exactly the window the flow itself
 * needs: the modal writes its answers as it closes and the wrapper must not
 * re-open on the next render of the same page.
 */
const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return stored;
  } catch {
    /* no storage: fall through to the in-memory copy */
  }
  return memory.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* kept in memory for this page load only */
  }
}

function removeRaw(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing stored, nothing to remove */
  }
}

/** The stored answers, or null when there are none or they are unusable. */
export function readGuestOnboarding(): GuestOnboarding | null {
  const raw = readRaw(GUEST_ONBOARDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Record<string, unknown>;
    const answers: GuestOnboarding = {};
    if (typeof value.translation === "string") answers.translation = value.translation;
    if (typeof value.commentary === "string") answers.commentary = value.commentary;
    if (typeof value.intent === "string" && THEMES.includes(value.intent)) {
      answers.intent = value.intent;
    }
    if (typeof value.studyStyle === "string" && STUDY_STYLES.includes(value.studyStyle)) {
      answers.studyStyle = value.studyStyle as GuestStudyStyle;
    }
    if (typeof value.species === "string" && SPECIES.includes(value.species)) {
      answers.species = value.species as GuestSpecies;
    }
    if (value.skipped === true) answers.skipped = true;
    if (typeof value.answeredAt === "string") answers.answeredAt = value.answeredAt;
    return answers;
  } catch {
    return null;
  }
}

/**
 * Records that this browser has been through the flow.
 *
 * Called on both exits, including "Overslaan": the record is what stops the
 * flow asking again, so a skip has to leave one too.
 */
export function writeGuestOnboarding(answers: GuestOnboarding): void {
  writeRaw(
    GUEST_ONBOARDING_KEY,
    JSON.stringify({ ...answers, answeredAt: answers.answeredAt ?? new Date().toISOString() }),
  );
  removeRaw(GUEST_ONBOARDING_PENDING_KEY);
}

export function clearGuestOnboarding(): void {
  removeRaw(GUEST_ONBOARDING_KEY);
  removeRaw(GUEST_ONBOARDING_PENDING_KEY);
}

export function hasGuestOnboarding(): boolean {
  return readGuestOnboarding() !== null;
}

/** Set by "Doorgaan als gast"; read and cleared by the wrapper on sight. */
export function markGuestOnboardingPending(): void {
  writeRaw(GUEST_ONBOARDING_PENDING_KEY, "1");
}

export function takeGuestOnboardingPending(): boolean {
  const pending = readRaw(GUEST_ONBOARDING_PENDING_KEY) !== null;
  if (pending) removeRaw(GUEST_ONBOARDING_PENDING_KEY);
  return pending;
}

/**
 * Where a first-run flow may open itself over the page.
 *
 * The wrapper is mounted by the root layout, which is every signed-out page -
 * the marketing homepage, the pricing page, the legal pages and the auth forms
 * included. A full-screen flow over any of those would be an interruption of
 * something the visitor came to do, so it only opens on the product itself:
 * the studies, the reader and a lesson. Those are also where a guest lands
 * from the landing page's own buttons and from `guestTarget()`.
 */
const GUEST_ONBOARDING_ROUTES = ["/studies", "/lezen", "/studie"];

export function guestOnboardingRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0];
  return GUEST_ONBOARDING_ROUTES.some(
    route => path === route || path.startsWith(`${route}/`),
  );
}

/**
 * Hands the stored answers to the account that just signed in.
 *
 * Goes through /api/user/preferences - the same endpoint the flow itself posts
 * to - so `onboardingCompleted`, the translation, the commentary, the theme and
 * the study style are all set by the one path that already knows how. The tree
 * is planted by the caller, through the levensboom provider, because planting
 * is an optimistic client update the provider owns.
 *
 * Never throws. A failed post keeps the record, so the next page load tries
 * again; the account simply sees the questions if it never succeeds.
 *
 * Returns the answers that were migrated, or null when there was nothing to do
 * or the post failed.
 */
export async function migrateGuestOnboarding(): Promise<GuestOnboarding | null> {
  const answers = readGuestOnboarding();
  if (!answers) return null;

  // A skipped flow answered nothing worth copying, but it still means this
  // browser has been asked. Drop it rather than posting empty preferences.
  if (answers.skipped) {
    clearGuestOnboarding();
    return null;
  }

  const body: Record<string, unknown> = { onboardingCompleted: true };
  if (answers.translation) body.translation = answers.translation;
  if (answers.commentary) body.commentary = answers.commentary;
  if (answers.intent) body.intent = answers.intent;
  if (answers.studyStyle) body.studyStyle = answers.studyStyle;

  try {
    const res = await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
  } catch {
    return null;
  }

  clearGuestOnboarding();
  return answers;
}
