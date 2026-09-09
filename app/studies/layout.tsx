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
  return generatePageMetadata('studies', lng);
}

// The CollectionPage/ItemList/Course graph lives in page.tsx, not here. This
// layout also wraps /studies/:id, and emitting the list page's nodes there
// would describe /studies on a URL that is not /studies.

/**
 * Providers only - no chrome.
 *
 * Both screens under this layout now sit in the shared immersive shell
 * (components/scene/SceneShell.tsx), which draws the landscape full-bleed from
 * the very top of the viewport. Two things had to leave for that to work.
 *
 * The wrapper. It was `h-screen ... overflow-hidden` with the page scrolling in
 * a box inside it, and the scene's depth engine measures `window.scrollY`.
 * Inside such a box the landscape never moves. The DOCUMENT has to scroll -
 * the same shape as app/dashboard/layout.tsx and app/admin/layout.tsx.
 *
 * The header and the sidebar. `components/layout/header.tsx` pushes an
 * unauthenticated visitor to /api/auth/signin, and /studies and /studies/:id
 * are public, crawlable pages that anyone may read without an account - so the
 * chrome cannot be unconditional here. A layout can only ADD chrome, never
 * replace what a parent rendered, and it cannot hand a prop to `children`
 * either, so the decision belongs to the pages: each reads the session on the
 * server and passes `header` and `rail` to SceneShell only when there is one.
 * Signed in that is the same bar and rail as /dashboard; signed out neither is
 * rendered at all, which is what keeps the redirect away from a public page.
 *
 * `SessionProvider` stays: the session it hands down is the full one from
 * `authOptions` (isAdmin, isSubscribed, studyStyle), not NextAuth's default,
 * and `SidebarProvider` stays because shared controls read its context.
 */
export default async function PlansLayout({
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
