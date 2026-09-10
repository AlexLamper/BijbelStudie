import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { StudyRail } from "../../components/layout/app-sidebar";
import { SCENE_BG, SCENE_ROOM } from "../../components/scene/tokens";
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
 * THE LESSON IS FULL-BLEED. IT IS NOT A CARD.
 *
 * It used to sit in an inset, rounded, shadowed frame on a darker ground - a
 * window you were working inside. The metaphor was good and the geometry was
 * not: a 12px ring of dead ground, two rounded corners and a drop shadow around
 * the one screen in the app that is nothing but a column of scripture and a
 * column of commentary. On a laptop that is a measurable slice of the reading
 * height spent on a frame, and on a phone the frame was already switched off,
 * so the screen it produced was the one people actually liked.
 *
 * So there is no frame at every width now: no outer padding, no radius, no ring,
 * no shadow. The flow owns the viewport from edge to edge and from the top of
 * the header to the bottom of the Vorige/Volgende bar, beside the rail. The
 * reading measure still lives where it belongs - on the column inside
 * `LessonLayout`, not on a box around the whole screen.
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
 *   3. There is nothing left for a picture to stand behind. With the frame gone
 *      the lesson IS the viewport; a landscape would be entirely covered by the
 *      first paragraph of it.
 *
 * So the ground is the scene's own ground colour (`SCENE_BG`) and nothing else.
 * The teal `SCENE_WASH` that used to light the window's surround went with the
 * surround: it existed to give a 12px border of ground somewhere to belong, and
 * once there is no border it is a brand-coloured gradient laid under a screen of
 * reading - the one thing the scene's own note on it says never to do. Brand
 * teal is an accent here (the eyebrow, the primary action, the active step),
 * never the ground.
 *
 * No canvas, no image, no gradient, no second animated layer, nothing for the
 * reader to wait on: the lesson is in the HTML and the ground is a colour. This
 * route has no app bar at all, so THE ONE BACKGROUND RULE in SceneShell.tsx is
 * satisfied by construction - there is no picture anywhere on it and therefore
 * no seam.
 *
 * AND THE INSIDE BELONGS TO THAT WORLD TOO.
 *
 * An earlier pass stopped at the frame: it darkened the ground and ringed the
 * window, and left the interior answering the reader's light/dark setting. In
 * light mode that produced a white document dropped into a night frame - the one
 * screen in the product that had not joined the redesign.
 *
 * `dark` plus `SCENE_ROOM` fixes that in one place, and it is the same pair
 * /lezen wears - see the note on SCENE_ROOM in components/scene/tokens.ts.
 * `dark` scopes every theme token inside the window to its light-on-dark end;
 * the variables then re-point those tokens from the app's neutral near-black at
 * the scene's own ground, which is the difference between a grey panel and a
 * place. Together they carry the flow's own surfaces AND the shared components
 * it hosts - the commentary, the grondtekst, the notes, the assistant - onto
 * the night without one of them being forked.
 *
 * There is no exception any more. The passage used to sit on the scene's light
 * `PLATE` as "the one lit object"; a white page inside a night window is a
 * second design however well argued, and the lesson now reads on the same
 * ground as everything around it, at a better contrast than the plate gave it.
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
      {/* No wash layer, and no gradient of any kind. See the note above the
          component: the teal wash lit a window surround that no longer exists,
          and a brand-coloured gradient under a column of scripture is a page
          ground wearing an accent colour. One flat ground, and the type sits
          straight on it - which is also the ground every contrast figure in
          components/scene/tokens.ts is measured against. */}

      <SessionProvider session={session}>
        {/* `dark` scopes the rail to the light-on-dark end of every theme
            token, the same trick `Header variant="scene"` uses: the rail is
            standing on the night ground beside the window, so a white column
            there would be the one thing on screen that had not joined the
            scene. SCENE_ROOM goes with it - `dark` alone would land the rail's
            `dark:bg-card` on the app's neutral #212121, a grey column beside a
            teal-slate window. Custom properties inherit straight through
            `display: contents`, which keeps the wrapper out of the flex layout
            so the rail is still the flex item it was. */}
        <div className="dark contents" style={SCENE_ROOM as React.CSSProperties}>
          <StudyRail />
        </div>

        {/* No padding at any width. The lesson runs to the edge of what is left
            of the viewport once the rail has taken its strip - see THE LESSON IS
            FULL-BLEED above. */}
        <main className="relative z-10 flex-1 min-w-0 min-h-0">
          {/* overflow-hidden, not overflow-y-auto: the guided flow is a fixed
              frame - step rail on top, Vorige/Volgende at the bottom, one
              scrolling body between them. With a scrollable wrapper the whole
              frame scrolled instead, so a wheel over the footer dragged the
              buttons off screen.

              No radius, no ring, no shadow: there is no card here any more, so
              there is nothing for a corner or an edge highlight to describe.

              `dark` and SCENE_ROOM are what keep this screen the same world as
              the rest of the app in BOTH themes - see the note above the
              component. Without them a reader on the light setting gets a white
              document where every other signed-in screen is a night one. */}
          <div
            className="dark h-full w-full overflow-hidden"
            style={{ ...SCENE_ROOM, backgroundColor: SCENE_BG } as React.CSSProperties}
          >
            {children}
          </div>
        </main>
      </SessionProvider>
    </div>
  );
}
