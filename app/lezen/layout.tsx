import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import SceneShell from "../../components/scene/SceneShell";
import { SCENE_TREE, sceneSvg } from "../../components/scene/scene-svg";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('read', lng);
}

/**
 * The reading room: the shared scene, with the reader set INTO it.
 *
 * The room was briefly a lit plate floating on the landscape with a gutter of
 * scene around it, which read as a white card with margins rather than as a
 * place. It is now the scene's own ground, edge to edge - see `./room`. The
 * layout below is unchanged by that; it is written down here because the two
 * are read together.
 *
 * The shell is assembled HERE rather than in the page, for two reasons that
 * only apply to this route:
 *
 *  - The backdrop is the server-rendered SVG (`sceneSvg()`), and
 *    components/scene/scene-svg.ts imports the tree generator, which has no
 *    business in a browser bundle - it may only be called from a server
 *    component. app/lezen/page.tsx is "use client", so the layout is the one
 *    place on this route that can draw the picture. /abonnement does the same.
 *  - app/lezen/loading.tsx then streams into the same frame instead of an empty
 *    dark screen.
 *
 * No `gateId`, deliberately. Naming a gate is what lets SceneBackdrop upgrade
 * the still SVG to a live canvas; without one there is no canvas on this route
 * at any point. /lezen is the heaviest route in the app and the one someone
 * sits on for twenty minutes, so it gets the picture and none of the loop -
 * and for the same reason it is `static` rather than `reader`, whose
 * ProgressTreeScene mounts a TreeCanvas that a fixed, full-bleed layer can
 * never scroll out of view to stop.
 *
 * `gutter="none"`: the reader has no horizontal padding at all, at any width -
 * the room runs edge to edge and the rail floats over it, with only the
 * scripture column inset far enough to clear the rail's resting width. A
 * margin here is measure taken away from the passage, which on this page is
 * the whole task.
 *
 * The old `h-screen overflow-hidden` wrapper with the Header and the AppSidebar
 * inside it is gone - the shell draws its own navbar and its own rail, and a
 * layout can only ADD chrome, never replace what a parent rendered.
 *
 * `authOptions` is required, not optional. Without it NextAuth returns only the
 * default session ({name, email, image}) and skips the `session` callback in
 * lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so any
 * client-side check on those fields read undefined on this route, and a Pro
 * user rendered as not-Pro. `SidebarProvider` stays because the header's own
 * controls read its context.
 */
export default async function ReadLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <SceneShell svg={sceneSvg()} {...SCENE_TREE} header rail gutter="none">
          {children}
        </SceneShell>
      </SidebarProvider>
    </SessionProvider>
  );
}
