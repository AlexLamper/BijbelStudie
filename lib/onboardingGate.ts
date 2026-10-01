/**
 * Whether to open the five-step first-run flow over a signed-in page.
 *
 * It is one boolean expression and it lives in its own file because getting it
 * wrong is invisible in code review and loud in production: the flow is
 * full-screen, it covers whatever the reader navigated to, and a returning user
 * who has already answered the questions being asked them again - repeatedly,
 * on an ordinary navigation - reads as the app having forgotten who they are.
 *
 * The rule: ask only when the account was actually read and says it has not
 * answered. `onboardingCompleted` is undefined in two completely different
 * situations -
 *
 *   1. a brand-new account that has never answered: ask;
 *   2. the session callback could not read the account at all - the Mongo
 *      query threw, timed out on a cold pool, or matched nothing - in which
 *      case we know nothing about this user: do NOT ask.
 *
 * Treating (2) as (1) is what re-opened the flow at random on a live account.
 * `profileResolved` (lib/authOptions.ts) is what separates them, so an
 * unreadable account now means "ask later", not "ask again".
 *
 * Failing closed is the right default on both sides of the uncertainty: the
 * cost of not asking a genuinely new account on this one render is that it gets
 * asked on the next one, while the cost of asking a returning reader is the bug
 * being reported here.
 */
export interface OnboardingGateSession {
  /** True only when the session callback read the account document. */
  profileResolved?: boolean;
  /** `preferences.onboardingCompleted`, straight off that document. */
  onboardingCompleted?: boolean;
}

export function shouldAskOnboarding(user: OnboardingGateSession | null | undefined): boolean {
  if (!user) return false;
  if (user.profileResolved !== true) return false;
  return user.onboardingCompleted !== true;
}
