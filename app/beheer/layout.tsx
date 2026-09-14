import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { authOptions } from "../../lib/authOptions";
import connectMongoDB from "../../lib/mongodb";
import User from "../../models/User";
import { isAdminEmail } from "../../lib/adminEmails";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata("admin", lng);
}

/**
 * Providers and the admin guard - no chrome.
 *
 * The three admin screens now sit in the shared immersive shell
 * (components/scene/SceneShell.tsx), which draws its own navbar and its own
 * rail. A layout in the App Router can only ADD chrome, never replace what a
 * parent rendered, so the header and the sidebar had to leave this file; the
 * pages render `<SceneShell header rail>` themselves.
 *
 * Just as load-bearing: the wrapper this used to have was a fixed-height box
 * with the page scrolling inside it, and the scene's depth engine measures
 * `window.scrollY`. Inside such a box the landscape never moves. The DOCUMENT
 * has to scroll, which is why this is providers only - the same shape as
 * app/dashboard/layout.tsx.
 *
 * The guard itself is untouched: no session goes to /inloggen, and an account
 * that is neither `isAdmin` in the database nor in ADMIN_EMAILS goes to
 * /dashboard, before any admin markup is produced.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/inloggen");
  }

  await connectMongoDB();
  const dbUser = await User.findOne({ email: session.user.email })
    .select("isAdmin")
    .lean<{ isAdmin?: boolean }>();

  if (!dbUser?.isAdmin && !isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
