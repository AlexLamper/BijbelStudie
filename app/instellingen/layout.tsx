import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('settings', lng);
}

/**
 * Providers only - no chrome.
 *
 * /instellingen is an immersive scene page now: one fixed full-bleed landscape
 * with the page travelling over it. The depth engine in
 * components/scene/useSceneDepth.ts measures `window.scrollY`, so the DOCUMENT
 * has to be what scrolls - the old `h-screen overflow-hidden` wrapper with an
 * inner `overflow-y-auto` pinned the scene in place. The header and the sidebar
 * are gone for the same reason: a layout can only ADD chrome, and the shell
 * draws its own navbar (`<Header variant="scene" />`) and its own floating rail
 * instead of a sidebar column. Same shape as app/dashboard/layout.tsx.
 *
 * `SidebarProvider` stays because the header's own controls read its context.
 */
export default async function SettingsLayout({
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
