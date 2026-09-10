import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";

export const metadata: Metadata = {
  title: "Feedback | BijbelStudie",
  description:
    "Deel je feedback om BijbelStudie nog beter te maken. Meld bugs, vraag functies aan of laat ons weten wat je waardeert.",
  robots: { index: false, follow: true },
};

/**
 * Providers only - no chrome.
 *
 * /feedback now sits in the shared immersive shell
 * (components/scene/SceneShell.tsx), which draws its own navbar and its own
 * rail, so the `Header` and the `AppSidebar` had to leave this file - a layout
 * can only ADD chrome, never replace what a parent rendered.
 *
 * And the wrapper had to go with them: it was an `h-screen overflow-hidden` box
 * with the page scrolling inside it, and the scene's depth engine measures
 * `window.scrollY`. Inside such a box the landscape never moves.
 *
 * `authOptions` is required, not optional. Without it NextAuth returns only the
 * default session ({name, email, image}) and skips the `session` callback in
 * lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so any
 * client-side check on those fields read undefined on this route, and a Pro
 * user rendered as not-Pro.
 */
export default async function FeedbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
