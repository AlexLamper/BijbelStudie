import { DefaultSession } from "next-auth";
import type { Limits } from "../lib/entitlements";
import type { TrialSummary } from "../lib/reverseTrialRules";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      isSubscribed?: boolean;
      /**
       * True only when the session callback actually read the account document.
       * Every field around it is undefined both for an account that has not set
       * it and for a read that failed; this says which. See
       * lib/onboardingGate.ts.
       */
      profileResolved?: boolean;
      onboardingCompleted?: boolean;
      /** Raw `preferences.studyStyle`; narrowed by normaliseStudyStyle(). */
      studyStyle?: string;
      /** The reverse trial (lib/reverseTrialRules.ts); null without one. */
      trial?: TrialSummary | null;
      /** What this account may do right now (lib/entitlements.ts `Limits`). */
      limits?: Limits;
      /** Pro only because of the reverse trial: nothing bought yet. */
      proIsTrial?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
    isSubscribed?: boolean;
    onboardingCompleted?: boolean;
    studyStyle?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin?: boolean;
    isSubscribed?: boolean;
    onboardingCompleted?: boolean;
    studyStyle?: string;
  }
}
