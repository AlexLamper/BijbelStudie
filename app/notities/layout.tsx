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
  return generatePageMetadata('notes', lng);
}

interface NotesLayoutProps {
  children: React.ReactNode;
}

/**
 * Providers only - no chrome.
 *
 * /notities now sits in the shared immersive shell
 * (components/scene/SceneShell.tsx), which draws its own navbar and its own
 * rail. A layout in the App Router can only ADD chrome, never replace what a
 * parent rendered, so the `Header` and the `AppSidebar` had to leave this file;
 * the page renders `<SceneShell header rail>` itself.
 *
 * Just as load-bearing: the wrapper this used to have was a `h-screen
 * overflow-hidden` box with the page scrolling inside it, and the scene's depth
 * engine measures `window.scrollY`. Inside such a box the landscape never
 * moves. The DOCUMENT has to scroll, which is why this is providers only - the
 * same shape as app/dashboard/layout.tsx and app/admin/layout.tsx.
 *
 * `authOptions` is still required, not optional. Without it NextAuth returns
 * only the default session ({name, email, image}) and skips the `session`
 * callback in lib/authOptions that attaches isAdmin, isSubscribed and
 * studyStyle - so any client-side check on those fields read undefined on this
 * route, and a Pro user rendered as not-Pro.
 *
 * `SidebarProvider` stays because the header's own controls read its context.
 */
export default async function NotesLayout({ children }: NotesLayoutProps) {
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
