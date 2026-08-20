import type { NextAuthOptions } from "next-auth";
import { decode as defaultDecode, encode as defaultEncode } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectMongoDB from "./mongodb";
import User from "../models/User";
import { isAdminEmail } from "./adminEmails";
import { resolveIsPro } from "./mobilePremium";

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
          const user = await User.findOne({ email: credentials.email });
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
    async signIn({ user, profile }) {
      try {
        await connectMongoDB();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          await User.create({
            name: user.name || profile?.name || "Gebruiker",
            email: user.email,
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
          const user = await User.findOne({ email: session.user.email });
          if (user) {
            session.user.id = user._id.toString();
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
          }
        } catch {
          // Non-critical - return session without extra fields
        }
      }
      return session;
    },
  },
};
