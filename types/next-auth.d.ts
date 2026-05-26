import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      isSubscribed?: boolean;
      onboardingCompleted?: boolean;
      tourCompleted?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
    isSubscribed?: boolean;
    onboardingCompleted?: boolean;
    tourCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin?: boolean;
    isSubscribed?: boolean;
    onboardingCompleted?: boolean;
    tourCompleted?: boolean;
  }
}
