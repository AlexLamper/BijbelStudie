import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { StudyRail } from "../../components/layout/app-sidebar";
import { SCENE_BG } from "../../components/scene/tokens";
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
 *
 * WHERE THE SCENE IS, AND WHY IT IS NOT BEHIND THE TEXT
 *
 * Every other signed-in screen now sits on `components/scene`: one fixed
 * landscape with the page travelling over it. This one deliberately does not,
 * and there are three reasons, in order of weight.
 *
 *   1. Legibility. This is the only screen in the app whose whole job is a
 *      column of scripture and a column of commentary. A picture behind either
 *      of them buys atmosphere with the one thing that must not be spent.
 *   2. The shell cannot mount here anyway. `useSceneDepth` measures
 *      `window.scrollY`, and this route is `h-[100dvh] overflow-hidden` on
 *      purpose - a fixed frame with one scrolling body inside it. Nothing the
 *      scene animates would ever move.
 *   3. It already owns the metaphor. A window on a dark ground IS the scene
 *      vocabulary's light `PLATE`: a lit object laid on the landscape, which
 *      is where the scene design says the eye should go first.
 *
 * So the scene lives at the EDGES. The ground is the scene's own ground colour
 * (`SCENE_BG`, #0B1220 - the same literal `SceneShell` paints), lifted by one
 * still wash so the border of the window belongs to a world rather than to a
 * grey app chrome. No canvas, no image, no second animated layer, nothing for
 * the reader to wait on: the lesson is in the HTML and the ground is a colour.
 *
 * AND THE INSIDE BELONGS TO THAT WORLD TOO.
 *
 * An earlier pass stopped at the frame: it darkened the ground and ringed the
 * window, and left the interior answering the reader's light/dark setting. In
 * light mode that produced a white document dropped into a night frame - the one
 * screen in the product that had not joined the redesign.
 *
 * `dark` fixes that in one place. It is the same trick `Header variant="scene"`
 * and the rail below already use: it scopes every theme token inside the window
 * to its light-on-dark end, so the flow's own surfaces AND the shared components
 * it hosts (the commentary, the grondtekst, the notes, the assistant) all land
 * on the night without any of them being forked. `colorScheme` goes with it, so
 * the browser's own furniture - select popups, scrollbars, the caret in the
 * reflection box - is drawn dark rather than being the one light thing left.
 *
 * The single exception is deliberate: the passage itself sits on the scene's
 * light `PLATE` (see StepWord), which is what the scene vocabulary reserves for
 * the thing that has to be read for twenty minutes.
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
    // The ground is set through `style`, not a class: Tailwind reads class names
    // as literal text, so a value spliced in from an import is a class it never
    // generates - and the colour has to come from the token rather than be
    // written out a second time.
    <div
      className="antialiased relative h-[100dvh] flex overflow-hidden"
      style={{ backgroundColor: SCENE_BG }}
    >
      {/* The still wash. One layer, no animation, purely decorative - the light
          the window is standing in. It sits under everything and takes no
          pointer events, so it can never come between the reader and a
          control. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(120% 90% at 8% 0%, rgba(45,212,191,0.10) 0%, rgba(13,148,136,0.05) 32%, rgba(11,18,32,0) 68%)',
        }}
      />

      <SessionProvider session={session}>
        {/* `dark` scopes the rail to the light-on-dark end of every theme
            token, the same trick `Header variant="scene"` uses: the rail is
            standing on the night ground beside the window, so a white column
            there would be the one thing on screen that had not joined the
            scene. `contents` keeps the wrapper out of the flex layout, so the
            rail is still the flex item it was. */}
        <div className="dark contents">
          <StudyRail />
        </div>

        <main className="relative z-10 flex-1 min-w-0 min-h-0 p-0 md:p-3">
          {/* overflow-hidden, not overflow-y-auto: the guided flow is a fixed
              frame - step rail on top, Vorige/Volgende at the bottom, one
              scrolling body between them. With a scrollable wrapper the whole
              frame scrolled instead, so a wheel over the footer dragged the
              buttons off screen.

              A ring rather than a border, and the scene's own plate shadow: the
              window reads as an object lit on the ground rather than a card
              boxed in a hairline, and a ring costs no layout the way a border
              does.

              `dark` and `color-scheme: dark` are what make the INSIDE the same
              world as the outside in both themes - see the note above the
              component. */}
          <div
            className="dark h-full w-full overflow-hidden md:rounded-2xl md:ring-1 md:ring-white/10 shadow-none md:shadow-[0_40px_80px_-32px_rgba(0,0,0,0.85)]"
            style={{ backgroundColor: SCENE_BG, colorScheme: 'dark' }}
          >
            {children}
          </div>
        </main>
      </SessionProvider>
    </div>
  );
}
