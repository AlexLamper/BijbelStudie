import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import LessonRail from "../../components/shell/LessonRail";
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
 * No AppShell. The 196 px sidebar and the 64 px top bar are four exits from a
 * lesson someone is halfway through, above content that is already headed by
 * the lesson's own bar. So the flow is a focus mode: the app's sidebar
 * COLLAPSED to a 64 px strip of icons (components/shell/LessonRail.tsx), and
 * the lesson's own 52 px bar, 212 px step panel and 68 px foot inside
 * StudyFlowShell. See design_handoff_web/PAGES-STUDIE-EN-LES.md.
 *
 * THE LESSON IS FULL-BLEED. IT IS NOT A CARD. It used to sit in an inset,
 * rounded, shadowed frame on a darker ground - a window you were working
 * inside. The metaphor was good and the geometry was not: a ring of dead
 * ground, two rounded corners and a drop shadow around the one screen in the
 * app that is nothing but a column of scripture and a column of commentary.
 *
 * IT HAS TWO PALETTES, AND THE READER PICKS. This used to force a scoped
 * `dark` and paint the scene's night ground, because back then every signed-in
 * screen was a landscape and a white lesson would have been the odd one out.
 * The redesign inverted that: the app is a light product, the lesson ships in
 * light and dark from one set of components, and which one you get is the
 * Thema setting (`.dark` on <html>) reading through the `--les-*` tokens in
 * app/globals.css.
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
    // The lesson's own ground, from the `--les-*` tokens: white on light and
    // #0B1E1E on dark, one class either way. The scoped `dark` this used to
    // carry is gone - the whole app is a light product now, so a lesson that
    // forced night was the screen that had not joined the redesign, and the
    // reader's Thema setting decides again (design_handoff_web/TOKENS-LES.md).
    // `w-full min-w-0` for the reason components/scene/SceneShell.tsx states:
    // a signed-in layout may wrap the page in a `flex` row, and a flex child
    // without them is sized to its content rather than to the viewport.
    <div className="relative flex h-[100dvh] w-full min-w-0 overflow-hidden bg-les-bg text-les-ink antialiased">
      <SessionProvider session={session}>
        {/* The app's sidebar, collapsed to 64 px of icons. Same items, same
            order - see components/shell/nav.ts. */}
        <LessonRail />

        {/* No padding at any width. The lesson runs to the edge of what is left
            of the viewport once the rail has taken its strip. */}
        <main className="relative z-10 min-h-0 min-w-0 flex-1">
          {/* overflow-hidden, not overflow-y-auto: the guided flow is a fixed
              frame - bar on top, Vorige/Volgende at the bottom, one scrolling
              body between them. With a scrollable wrapper the whole frame
              scrolled instead, so a wheel over the footer dragged the buttons
              off screen. */}
          <div className="h-full w-full overflow-hidden">{children}</div>
        </main>
      </SessionProvider>
    </div>
  );
}
