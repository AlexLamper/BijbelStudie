import { DefaultSession } from "next-auth";

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
