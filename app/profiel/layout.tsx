import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";

export const metadata: Metadata = {
  title: {
    absolute: "BijbelStudie | User Profile",
  },
  description: "Manage your BijbelStudie user profile, track your progress, and personalize your biblical learning experience.",
  keywords: [
    "User profile",
    "BijbelStudie profile",
    "Profile management",
    "Account settings",
    "User dashboard",
    "Profile customization",
    "Learning progress",
    "Biblical learning profile",
    "Profile preferences",
    "User account",
    "Profile updates",
    "Personal information",
    "Profile security",
    "Profile privacy",
    "Profile notifications",
    "Profile achievements",
    "Profile badges",
    "Profile statistics",
    "Profile insights",
    "Profile activity",
    "Profile history",
    "Profile settings",
    "Profile customization options",
    "Profile themes",
    "Profile avatars",
    "Profile pictures",
    "Profile cover photos",
    "Profile bio",
    "Profile interests",
    "Profile connections",
    "Profile followers",
    "Profile following",
    "Profile messages",
    "Profile inbox",
    "Profile comments",
    "Profile posts",
    "Profile likes",
    "Profile bookmarks",
    "Profile favorites",
    "Profile reviews",
    "Profile ratings",
    "Profile feedback",
    "Profile support",
    "Profile help",
    "Profile tutorials",
    "Profile guides",
    "Profile FAQs",
    "Profile resources",
    "Profile community",
    "Profile forums",
  ],
  openGraph: {
    title: "BijbelStudie | User Profile",
    description: "Access and manage your BijbelStudie user profile to enhance your personalized biblical learning journey.",
    url: "https://www.bijbelstudie.io/profile",
    siteName: "BijbelStudie",
    images: [
      {
        url: "https://www.bijbelstudie.io/og-image.svg",
        width: 1200,
        height: 630,
        alt: "BijbelStudie - User Profile",
      },
    ],
    locale: "en_US",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "BijbelStudie | User Profile",
    description: "Personalize your BijbelStudie experience by managing your user profile and tracking your biblical learning progress.",
    site: "@BijbelStudieEdu",
    creator: "@BijbelStudieEdu",
    images: ["https://www.bijbelstudie.io/og-image.svg"],
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.bijbelstudie.io/profile",
  },
};

/**
 * Providers only - no chrome.
 *
 * /profiel and /profiel/boom are immersive scene pages now: one fixed
 * full-bleed landscape with the page travelling over it. The depth engine in
 * components/scene/useSceneDepth.ts measures `window.scrollY`, so the DOCUMENT
 * has to be what scrolls - the old `h-screen overflow-hidden` wrapper with an
 * inner `overflow-y-auto` pinned the scene in place. The header and the sidebar
 * are gone for the same reason: a layout can only ADD chrome, and the shell
 * draws its own navbar (`<Header variant="scene" />`) and its own floating rail
 * instead of a sidebar column. Same shape as app/dashboard/layout.tsx.
 *
 * `SidebarProvider` stays because the header's own controls read its context.
 */
export default async function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `authOptions` is required, not optional. Without it NextAuth returns only
  // the default session ({name, email, image}) and skips the `session` callback
  // in lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so
  // any client-side check on those fields read undefined on this route, and a
  // Pro user rendered as not-Pro.
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}



