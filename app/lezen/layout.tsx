import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import SceneShell from "../../components/scene/SceneShell";
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
 * The shell is assembled HERE rather than in the page so that
 * app/lezen/loading.tsx streams into the same frame instead of into an empty
 * dark screen.
 *
 * `backdrop="none"`, and that is the whole of the navbar fix on this route. The
 * shell's bar is transparent, so it shows what is behind it; this page paints
 * an opaque room from the underside of that bar to all four edges. With a
 * landscape behind the shell you therefore got a photograph in the bar and flat
 * ground everywhere else, meeting at a hard line - a picture nobody could see
 * any of, paid for with the seam. With no picture the shell paints its flat
 * ground across the whole viewport, the room lets it through, the bar shows
 * exactly that, and bar and page are one surface. See THE ONE BACKGROUND RULE
 * in components/scene/SceneShell.tsx.
 *
 * It also takes the tree generator, the server SVG and the canvas gate off the
 * heaviest route in the app - which is the route someone sits on for twenty
 * minutes, and the one that must never have anything moving behind the text.
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
        <SceneShell backdrop="none" header rail gutter="none">
          {children}
        </SceneShell>
      </SidebarProvider>
    </SessionProvider>
  );
}
