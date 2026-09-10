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
 * The shell is assembled HERE rather than in the page so that
 * app/lezen/loading.tsx streams into the same frame instead of into an empty
 * dark screen.
 *
 * THE BACKDROP IS THE DASHBOARD'S, MUTED.
 *
 * The owner's brief, in order: the room used to be a lit plate on the landscape
 * (a card with margins); then it was the bare ground with no picture at all
 * (`backdrop="none"`), which read as a different product from the dashboard a
 * click away; and the verdict on that was "still use the dashboard background,
 * but VERY subtle - a real background, not obvious, must not hinder reading".
 * So the shell now draws exactly the picture /dashboard draws - the reader's
 * own tree, or the public oak for a guest - through SceneBackdrop's `muted`
 * dial: faint, still, with the ground's own colour laid back over it and none
 * of the scrolling page's scrims. The room paints nothing of its own and lets
 * that through, so the transparent bar and the page still stand on one surface
 * and THE ONE BACKGROUND RULE in components/scene/SceneShell.tsx still holds:
 * this is a page WITH a picture, drawn quietly. The contrast the type keeps is
 * worked out at MUTED_PICTURE_OPACITY in components/scene/tokens.ts (white
 * stays above 8.6:1 on the brightest pixel the palette can produce, and at
 * 16:1 almost everywhere).
 *
 * Nothing moves behind the text. Muted asks the reader's tree to stand still
 * and never wakes the static tree's canvas - this is the route someone sits on
 * for twenty minutes, and a branch swaying under the verse they are following
 * is the one thing atmosphere must never do here.
 *
 * `backdrop="reader"` needs a session; a guest gets the static oak instead
 * (signed out, reader mode falls back to a level disc, which is not a
 * landscape). Both go through the same `muted`, so the two look the same
 * apart from which tree it is.
 *
 * `gutter="none"`: the reader has no horizontal padding at all, at any width -
 * the room runs edge to edge and the rail stands on it, with only the scripture
 * column inset by exactly the rail's own width (RAIL_GUTTER), so the pane's
 * left edge sits on the rail's right edge with nothing between them. A margin
 * here is measure taken away from the passage, which on this page is the whole
 * task.
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
  const signedIn = Boolean(session?.user?.email);

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        {signedIn ? (
          <SceneShell backdrop="reader" muted header rail gutter="none">
            {children}
          </SceneShell>
        ) : (
          <SceneShell svg={sceneSvg()} {...SCENE_TREE} muted header rail gutter="none">
            {children}
          </SceneShell>
        )}
      </SidebarProvider>
    </SessionProvider>
  );
}
