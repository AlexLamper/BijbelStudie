import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { StudyRail } from "../../components/layout/app-sidebar";
import { generatePageMetadata } from "../../lib/pageMetadata";

import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";

interface StudyLayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('study', lng);
}

/**
 * The study flow is the one screen that is deliberately NOT the app shell.
 *
 * No app header. The global navbar carried a sidebar toggle, the page title, a
 * theme switch and an avatar menu - four exits from a lesson someone is halfway
 * through, above content that is already headed by the lesson's own bar. The
 * flow's header owns the top of the screen instead, and the way out is its close
 * button.
 *
 * The sidebar is a 56px icon rail that widens on hover (see StudyRail) rather
 * than a permanent 12rem column, and it floats over the lesson instead of
 * pushing it, so opening it reflows nothing.
 *
 * The lesson itself sits in an inset, rounded, shadowed frame on a darker
 * ground: a window you are working inside rather than a page you are scrolling.
 * Below md the frame goes edge to edge - a 12px margin on a phone is lost space,
 * not atmosphere.
 */
export default async function StudyLayout({
  children,
}: StudyLayoutProps) {
  // `authOptions` is required, not optional. Without it NextAuth returns only
  // the default session ({name, email, image}) and skips the `session` callback
  // in lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so
  // any client-side check on those fields read undefined on this route, and a
  // Pro user rendered as not-Pro.
  const session = await getServerSession(authOptions);

  return (
    <div className="antialiased h-[100dvh] flex overflow-hidden bg-secondary dark:bg-black">
      <SessionProvider session={session}>
        <StudyRail />

        <main className="flex-1 min-w-0 min-h-0 p-0 md:p-3">
          {/* overflow-hidden, not overflow-y-auto: the guided flow is a fixed
              frame - step rail on top, Vorige/Volgende at the bottom, one
              scrolling body between them. With a scrollable wrapper the whole
              frame scrolled instead, so a wheel over the footer dragged the
              buttons off screen. */}
          <div className="h-full w-full overflow-hidden bg-background border-0 md:border border-border md:rounded-2xl shadow-none md:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]">
            {children}
          </div>
        </main>
      </SessionProvider>
    </div>
  );
}
