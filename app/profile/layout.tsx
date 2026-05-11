import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import SessionProvider from "../../components/providers/SessionProvider";
import { Header } from "../../components/layout/header";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";

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
    url: "https://www.bijbel-studie.com/profile",
    siteName: "BijbelStudie",
    images: [
      {
        url: "https://www.bijbel-studie.com/og-image.svg",
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
    images: ["https://www.bijbel-studie.com/og-image.svg"],
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
    canonical: "https://www.bijbel-studie.com/profile",
  },
};

export default async function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;

  return (
    <div className="antialiased bg-gray-100 dark:bg-background h-screen flex flex-col overflow-hidden">
      <SessionProvider session={session}>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <Header params={{ lng }} />
            <div className="flex-1 min-h-0 overflow-hidden">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </SessionProvider>
    </div>
  );
}
