import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import SceneShell from "../../components/scene/SceneShell";
import { SCENE_TREE, sceneSvg } from "../../components/scene/scene-svg";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata("resources", lng);
}

// The CollectionPage/ItemList graph lives in page.tsx, not here. A layout also
// wraps /hulpbronnen/:slug, and emitting the list page's nodes there would put
// structured data describing /hulpbronnen on a URL that is not /hulpbronnen.

/**
 * The last route still drawing the old chrome, now in the shared immersive
 * shell (components/scene/SceneShell.tsx).
 *
 * What left, and why. `AppSidebar` took a 16rem column out of every width on
 * this page; the scene replaces it with a rail that floats over the gutter and
 * reserves nothing. The page's own `<Header>` left because a layout in the App
 * Router can only ADD chrome, never replace what a parent rendered - the shell
 * draws the bar itself, in its scene variant. And the `h-screen overflow-hidden`
 * wrapper with the page scrolling inside it had to go: the depth engine in
 * components/scene/useSceneDepth.ts measures `window.scrollY`, and inside such a
 * box the landscape never moves.
 *
 * The shell is HERE rather than in each page - the shape app/abonnement's layout
 * uses - because both routes under it want the same window: the list and a
 * work's own page are one library, and a bar that appeared and disappeared
 * between them would read as two products. app/dashboard and app/notities keep
 * theirs in the page instead, and either is fine; what must not differ is the
 * window two sibling routes stand in.
 *
 * THE ONE BACKGROUND RULE: there IS a picture, so `backdrop` stays at its
 * default. Not `"none"`: nothing on these two routes paints an opaque ground
 * over the landscape any more - the cards, the filters and the rights notices
 * are all scene surfaces (`TILE`) with the sky running through them, and the
 * one genuinely opaque thing on the detail page, the embedded reader, is a
 * framed window inside a panel rather than the page's own floor. That is the
 * case the bar is transparent FOR.
 *
 * It is the still server-rendered SVG (`sceneSvg()`), not the reader's own
 * tree: /hulpbronnen is public on purpose - it is the crawlable SEO surface,
 * see middleware.ts - so there is no session to draw from, and no `gateId` is
 * passed, which means no canvas ever mounts. Same reason `header` and `rail`
 * are gated on a session: both read one, and signed out the bar would push a
 * visitor to the sign-in page.
 *
 * `SidebarProvider` stays because the header's own controls read its context.
 */
export default async function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `authOptions` is required, not optional. Without it NextAuth returns only
  // the default session ({name, email, image}) and skips the `session` callback
  // in lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so
  // any client-side check on those fields read undefined on this route, and a
  // Pro user rendered as not-Pro.
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <SceneShell svg={sceneSvg()} {...SCENE_TREE} header={signedIn} rail={signedIn}>
          {children}
        </SceneShell>
      </SidebarProvider>
    </SessionProvider>
  );
}
