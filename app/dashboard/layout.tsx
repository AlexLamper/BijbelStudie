import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Jouw persoonlijk bijbelstudie overzicht",
};

/**
 * Providers only - no chrome.
 *
 * The dashboard is the one signed-in screen that owns its whole viewport: a
 * fixed full-bleed scene with the navbar drawn transparently over it and the
 * sidebar replaced by a rail that floats rather than taking a column out of the
 * page. A layout in the App Router can only ADD chrome, never replace what a
 * parent rendered, so the header and the sidebar are the page's to draw - see
 * app/dashboard/page.tsx, which renders `<Header variant="scene" />` and
 * `<SceneRail />` itself.
 *
 * `SidebarProvider` stays because the header's own controls read its context;
 * it renders a flex row, which is why the page root carries `w-full min-w-0`.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
