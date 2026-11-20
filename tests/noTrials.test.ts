import { describe, expect, it } from "vitest";
import { ABONNEMENT_FAQ } from "../app/abonnement/content";
import { ALL_HELP_FAQS } from "../lib/content/helpFaq";
import { HOME_FAQS } from "../lib/content/homeFaq";
import { TRIALS_ENABLED } from "../lib/promo";
import { REVERSE_TRIAL_ENABLED, planTouch, type TrialAccountFields } from "../lib/reverseTrialRules";

/**
 * The hard paywall (Alex, 20 November 2026): no proefperiode anywhere.
 *
 * Two halves, and both have gone wrong in this product before:
 *  - no NEW trial may start, while a trial that was already running keeps
 *    every day it had coming. The switch sits in one branch of `planTouch`,
 *    and the tests below pin both sides of it, because "turn the trial off"
 *    read carelessly means "revoke 30 people's Pro this afternoon";
 *  - nothing on screen may PROMISE a trial. A page that advertises free days
 *    beside a checkout that charges on day one is a misleading practice under
 *    the UCPD, so the copy is asserted rather than trusted to stay in step.
 */

const NOW = new Date("2026-11-20T10:00:00Z");

function account(fields: Partial<TrialAccountFields> = {}): TrialAccountFields {
  return { createdAt: new Date("2026-11-20T09:00:00Z"), email: "lezer@example.com", ...fields };
}

describe("the switches are off", () => {
  it("has trials disabled", () => {
    expect(TRIALS_ENABLED).toBe(false);
    expect(REVERSE_TRIAL_ENABLED).toBe(false);
  });
});

describe("no new reverse trial starts", () => {
  it("does nothing for a brand new account", () => {
    const plan = planTouch(account(), NOW);
    expect(plan.start).toBe(false);
    expect(plan.addDay).toBeNull();
    expect(plan.grantUntil).toBeNull();
  });

  it("does nothing for an older free account either", () => {
    // This one used to qualify for the one-time trial of an existing account.
    const plan = planTouch(account({ createdAt: new Date("2026-01-04T09:00:00Z") }), NOW);
    expect(plan.start).toBe(false);
    expect(plan.grantUntil).toBeNull();
  });
});

describe("a trial that was already running finishes normally", () => {
  it("still counts today as an active day, and keeps Pro until tonight", () => {
    const plan = planTouch(
      account({
        subscribed: true,
        compedProUntil: new Date("2026-11-19T23:00:00Z"),
        reverseTrial: { startedAt: new Date("2026-11-18T09:00:00Z"), days: ["2026-11-18", "2026-11-19"] },
      }),
      NOW,
    );
    expect(plan.addDay).toBe("2026-11-20");
    // Third of three days: Pro ends tonight, and the grant says so.
    expect(plan.endsAt).not.toBeNull();
    expect(plan.grantUntil).not.toBeNull();
  });

  it("is still finalised once its days are gone", () => {
    const plan = planTouch(
      account({
        reverseTrial: {
          startedAt: new Date("2026-11-15T09:00:00Z"),
          days: ["2026-11-15", "2026-11-16", "2026-11-17"],
          endsAt: new Date("2026-11-17T23:00:00Z"),
          usage: { ai: 9, notes: 1 },
        },
      }),
      NOW,
    );
    expect(plan.finalise).toEqual({ topFeature: "ai" });
  });

  it("drops a lapsed trial grant back to free", () => {
    const plan = planTouch(
      account({
        subscribed: true,
        compedProUntil: new Date("2026-11-17T23:00:00Z"),
        reverseTrial: {
          startedAt: new Date("2026-11-15T09:00:00Z"),
          days: ["2026-11-15", "2026-11-16", "2026-11-17"],
          endsAt: new Date("2026-11-17T23:00:00Z"),
          endedAt: new Date("2026-11-17T23:00:00Z"),
        },
      }),
      NOW,
    );
    expect(plan.revoke).toBe(true);
  });
});

describe("no page promises a trial", () => {
  // Every answer a reader can be shown before they pay. Only the ANSWERS are
  // checked: a question may well ask "kan ik Pro eerst gratis proberen?", and
  // the point is what it is answered with. The reverse trial's own dialogs are
  // not here on purpose - they are rendered only for an account whose trial is
  // still running, and for those readers the promise is true until it ends.
  const answers: { where: string; text: string }[] = [
    ...ABONNEMENT_FAQ.map((entry) => ({ where: `/abonnement: ${entry.q}`, text: entry.a })),
    ...HOME_FAQS.map((entry) => ({ where: `home: ${entry.q}`, text: entry.a })),
    ...ALL_HELP_FAQS.map((entry) => ({ where: `help: ${entry.q}`, text: entry.a })),
  ];

  /** Anything that reads as free days being on offer. */
  const SOUNDS_LIKE_A_TRIAL = /proefperiode|\d+ dagen gratis|gratis Pro-dagen|eerste \d+ dagen/i;

  it("has copy to check", () => {
    expect(answers.length).toBeGreaterThan(10);
  });

  it("only ever mentions a trial to say there is none", () => {
    // A bare ban on the words would be wrong - the honest answer to "kan ik Pro
    // gratis proberen?" has to use them. So every mention must be a denial, and
    // any new answer that slips a promise in fails here.
    const promises = answers
      .filter((entry) => SOUNDS_LIKE_A_TRIAL.test(entry.text))
      .filter((entry) => !/\bgeen\b|niet meer|krijgen geen/i.test(entry.text))
      .map((entry) => entry.where);
    expect(promises).toEqual([]);
  });

  it("answers the question honestly when it is asked", () => {
    const answer = ABONNEMENT_FAQ.find((entry) => /gratis proberen/i.test(entry.q));
    expect(answer).toBeDefined();
    expect(answer?.a).toMatch(/geen proefperiode/i);
  });

  it("never dates the charge to the end of a trial", () => {
    const offenders = answers
      .filter((entry) => /betaal(t|je)? je (pas|niets) vandaag|vandaag niets/i.test(entry.text))
      .map((entry) => entry.where);
    expect(offenders).toEqual([]);
  });
});
