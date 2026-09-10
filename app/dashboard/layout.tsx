import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import GuestGateScene from "../../components/auth/GuestGateScene";

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
 *
 * Signed out, the route is no longer bounced to "/" by the middleware: the
 * layout answers with the GuestGate in the same scene chrome, so the Dashboard
 * link in the rail leads somewhere for a guest too. The page itself never
 * renders without a session.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <GuestGateScene
        title="Dashboard"
        description="Je dashboard laat zien waar je gebleven bent: je leesstreak, je voortgang per studie, de tekst van de dag en de hoofdstukken die je al las."
        next="/dashboard"
      />
    );
  }
  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}
