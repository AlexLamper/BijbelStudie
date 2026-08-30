import type { NextAuthOptions } from "next-auth";
import { decode as defaultDecode, encode as defaultEncode } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectMongoDB from "./mongodb";
import User from "../models/User";
import { isAdminEmail } from "./adminEmails";
import { resolveIsPro } from "./mobilePremium";
import { findUserByEmail, normaliseEmail } from "./userLookup";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          await connectMongoDB();
          const user = await findUserByEmail(credentials.email);
          if (!user || !user.password) return null;
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) return null;
          return { id: user._id.toString(), name: user.name, email: user.email, image: user.image };
        } catch {
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/inloggen",
    error: "/inloggen",
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Silently discard stale/corrupt JWT cookies instead of throwing errors
  jwt: {
    async encode(params) {
      return defaultEncode(params);
    },
    async decode(params) {
      try {
        return await defaultDecode(params);
      } catch {
        // Old cookie encrypted with a different secret - treat as no session
        return null;
      }
    },
  },

  callbacks: {
    /**
     * Applies a rename to the token itself when the client calls
     * `update({ name })`. The session callback below already overrides the name
     * it hands to the app, but `getToken()` reads the raw token - middleware and
     * the mobile API routes go through it - so leaving the claim stale would let
     * the two disagree about who the user is.
     */
    async jwt({ token, trigger, session: update }) {
      if (trigger === "update") {
        const next = (update as { name?: unknown } | undefined)?.name;
        if (typeof next === "string" && next.trim()) token.name = next.trim();
      }
      return token;
    },

    async signIn({ user, profile }) {
      try {
        if (!user.email) return false;
        await connectMongoDB();
        // Case-insensitive: a Google sign-in must find the account created by
        // a credentials registration with different casing, not shadow-create
        // a second one.
        const existingUser = await findUserByEmail(user.email);
        if (!existingUser) {
          await User.create({
            name: user.name || profile?.name || "Gebruiker",
            email: normaliseEmail(user.email),
            image: user.image || "",
            bio: "",
          });
        }
        return true;
      } catch (error) {
        console.error("Fout bij inloggen:", error);
        return false;
      }
    },

    async session({ session }) {
      if (session.user?.email) {
        try {
          await connectMongoDB();
          // This runs on every session read - once per page render and once per
          // API call - so it fetches only the fields it uses instead of
          // hydrating the whole user document.
          const user = await User.findOne({ email: session.user.email })
            .select("name isAdmin subscribed storePremium preferences.onboardingCompleted preferences.tourCompleted preferences.studyStyle")
            .lean<{
              _id: unknown;
              name?: string;
              isAdmin?: boolean;
              subscribed?: boolean;
              storePremium?: boolean;
              preferences?: { onboardingCompleted?: boolean; tourCompleted?: boolean; studyStyle?: string };
            }>();
          if (user) {
            session.user.id = String(user._id);
            // The display name is read from Mongo rather than taken from the
            // JWT. Nothing refreshes a token's `name` claim, so after a rename
            // on /profiel the navbar and the dashboard greeting went on showing
            // whatever the name was at sign-in - until the user signed out and
            // back in. This is one more field on a query that already runs.
            if (user.name) session.user.name = user.name;
            const isAdmin = user.isAdmin || isAdminEmail(session.user.email) || false;
            session.user.isAdmin = isAdmin;
            // Store purchases count here too. `subscribed` alone is the Stripe
            // flag, so someone who bought BijbelStudie Pro in the iOS app was
            // Pro on their phone and paywalled on the website with the same
            // account. `resolveIsPro` is the same helper /api/v1/me uses, so
            // the two surfaces cannot disagree about who has paid.
            session.user.isSubscribed = resolveIsPro(user, isAdmin);
            session.user.onboardingCompleted = user.preferences?.onboardingCompleted || false;
            session.user.tourCompleted = user.preferences?.tourCompleted || false;
            // Onboarding's guided-vs-self answer. It rides along on this query
            // - which the root layout already runs on every render - so the
            // sidebar can be ordered correctly in the server-rendered HTML
            // instead of rearranging itself once a client fetch comes back.
            // Left undefined when unanswered; the reader defaults it.
            if (user.preferences?.studyStyle) session.user.studyStyle = user.preferences.studyStyle;
          }
        } catch {
          // Non-critical - return session without extra fields
        }
      }
      return session;
    },
  },
};
