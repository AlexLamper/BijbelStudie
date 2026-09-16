import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('success', lng);
}

/**
 * Providers only - no chrome.
 *
 * The checkout return now sits in the shared app shell
 * (components/shell/AppShell.tsx), the same sidebar-and-top-bar frame as
 * /abonnement, where the checkout started. A layout in the App Router can only
 * ADD chrome, never replace what a parent rendered, so AppShell is drawn by
 * `page.tsx` itself - the same shape as app/abonnement/layout.tsx.
 *
 * The shell is safe signed OUT: TopBar renders "Inloggen" in place of the
 * account controls and Sidebar renders the guest footer, and neither of them
 * redirects - so, unlike the old scene navbar, it can be drawn for everyone
 * without ever bouncing someone who has just paid to the sign-in page.
 */
export default async function SuccessLayout({
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
      {children}
    </SessionProvider>
  );
}
