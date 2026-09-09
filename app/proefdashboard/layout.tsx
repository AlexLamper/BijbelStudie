import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";

/**
 * The shell for the dashboard design candidates - deliberately an empty one.
 *
 * `/dashboard` cannot host these. Its layout renders the header and the
 * sidebar, and a nested layout in the App Router ADDS chrome, it cannot replace
 * the chrome above it - so a variant under /dashboard can never paint behind
 * the navbar and the rail, which is the whole point of the direction being
 * tried here. This prefix exists so each candidate owns the entire viewport and
 * draws its own chrome over its own background.
 *
 * Providers only, therefore: the session (for `useSession`) and the sidebar
 * context, in case a candidate reuses the real sidebar. Theme, study style,
 * prefetch and the levensboom state all come from the root layout already.
 *
 * `/proefdashboard` is in `middleware.ts` protectedRoutes, so these are behind
 * auth exactly like the real dashboard. Remove the whole folder, the middleware
 * entry and ProefdashboardSwitcher together once a direction is chosen.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function ProefdashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
