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
  return generatePageMetadata('read', lng);
}

/**
 * Providers only - no chrome.
 *
 * The reading room used to be assembled here: the shared immersive scene with
 * the reader set into it, the landscape drawn faintly behind the passage. The
 * redesign takes all of it away - /lezen is now two white panes filling the
 * shell edge to edge (design_handoff_web/PAGES.md §3), and the page draws that
 * shell itself with `<AppShell padded={false}>`. A layout can only ADD chrome,
 * never replace what a parent rendered, so it cannot live here.
 *
 * `authOptions` is required, not optional. Without it NextAuth returns only the
 * default session ({name, email, image}) and skips the `session` callback in
 * lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so any
 * client-side check on those fields read undefined on this route, and a Pro
 * user rendered as not-Pro. `SidebarProvider` stays because shared controls
 * read its context.
 *
 * No guest gate: /lezen is deliberately open to a visitor without an account,
 * and the shell shows them the way in where the account would be.
 */
export default async function ReadLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
