import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import SceneShell from "../../components/scene/SceneShell";
import { SCENE_TREE, sceneSvg } from "../../components/scene/scene-svg";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('success', lng);
}

/**
 * Providers and the scene - no chrome of its own.
 *
 * This is a checkout return: someone is standing in the middle of a
 * transaction, so the page has to be fast and unambiguous. The backdrop is
 * therefore the server-rendered SVG with NO `gateId`, which means no canvas
 * ever mounts here - the picture is in the first paint and nothing competes
 * with the verification request for the main thread. The shell lives in the
 * layout because `scene-svg.ts` renders on the server and the page is a client
 * component.
 *
 * The navbar and the rail read the session, and `components/layout/header`
 * pushes an unauthenticated visitor straight to the sign-in page - which would
 * be a terrible thing to do to someone who has just paid. They appear only when
 * the server already has a session, which `SessionProvider` then seeds.
 *
 * No wrapper with its own scrollbar: the depth engine in
 * components/scene/useSceneDepth.ts measures `window.scrollY`.
 */
export default async function SuccessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
