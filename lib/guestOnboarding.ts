/**
 * The handoff between "Doorgaan als gast" and the guest's onboarding.
 *
 * `ContinueAsGuest` sets this in localStorage the moment a visitor confirms
 * they want to continue without an account, right before it sends them into
 * the app. `GuestOnboardingWrapper` (mounted in the root layout for every
 * signed-out page) reads it on the very next render, removes it immediately
 * so a later refresh can never re-trigger the flow, and shows the same
 * first-run modal a new account gets - see
 * components/onboarding/guest-onboarding-wrapper.tsx.
 */
export const GUEST_ONBOARDING_PENDING_KEY = "bijbelstudie_guest_onboarding_pending";
