import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata("resources", lng);
}

// The CollectionPage/ItemList graph lives in page.tsx, not here. A layout also
// wraps /hulpbronnen/:slug, and emitting the list page's nodes there would put
// structured data describing /hulpbronnen on a URL that is not /hulpbronnen.

/**
 * Providers only - no chrome.
 *
 * Both routes under this layout now sit in the shared app shell
 * (components/shell/AppShell.tsx), the same sidebar-and-top-bar frame as
 * /studies, /lezen and /abonnement, rather than the immersive scene backdrop
 * this layout used to draw. A layout in the App Router can only ADD chrome,
 * never replace what a parent rendered, so AppShell is drawn by each page
 * itself - the same shape as app/abonnement/layout.tsx and app/lezen/layout.tsx.
 * Both pages pass the same title, so the list and a work's own page still read
 * as one library.
 *
 * /hulpbronnen is public on purpose - it is the crawlable SEO surface, see
 * middleware.ts. AppShell already supports a visitor without an account:
 * TopBar renders "Inloggen" in place of the account controls and Sidebar
 * renders the guest footer instead of the account row.
 */
export default async function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `authOptions` is required, not optional. Without it NextAuth returns only
  // the default session ({name, email, image}) and skips the `session` callback
  // in lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so
  // any client-side check on those fields read undefined on this route, and a
  // Pro user rendered as not-Pro.
  const session = await getServerSession(authOptions);

  return <SessionProvider session={session}>{children}</SessionProvider>;
}
