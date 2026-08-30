import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      isSubscribed?: boolean;
      onboardingCompleted?: boolean;
      tourCompleted?: boolean;
      /** Raw `preferences.studyStyle`; narrowed by normaliseStudyStyle(). */
      studyStyle?: string;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
    isSubscribed?: boolean;
    onboardingCompleted?: boolean;
    tourCompleted?: boolean;
    studyStyle?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin?: boolean;
    isSubscribed?: boolean;
    onboardingCompleted?: boolean;
    tourCompleted?: boolean;
    studyStyle?: string;
  }
}
