import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Jouw persoonlijk bijbelstudie overzicht",
};

/**
 * Providers only - no chrome.
 *
 * Signed out, the dashboard used to answer with a GuestGate card instead of
 * the page itself. It now renders the real dashboard for a guest too: every
 * fetch it makes is already session-gated or fails closed to an empty
 * default (see hooks/useDashboardData.ts, useTreeSummary,
 * DashboardFeedbackSlot, BillingNotices) so a guest sees the same generic,
 * empty-state layout a brand new account would - no name, no streak, no
 * saved progress - with a slim banner of its own (app/dashboard/page.tsx)
 * pointing at registreren/inloggen. That degrade-to-generic behaviour is
 * exactly what "basic, non-personal" means here; nothing further to gate.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
