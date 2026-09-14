import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import GuestGateScene from "../../components/auth/GuestGateScene";
import { generatePageMetadata } from "../../lib/pageMetadata";

export const metadata: Metadata = generatePageMetadata("profile");

/**
 * Providers only - no chrome.
 *
 * /profiel and /profiel/boom are immersive scene pages now: one fixed
 * full-bleed landscape with the page travelling over it. The depth engine in
 * components/scene/useSceneDepth.ts measures `window.scrollY`, so the DOCUMENT
 * has to be what scrolls - the old `h-screen overflow-hidden` wrapper with an
 * inner `overflow-y-auto` pinned the scene in place. The header and the sidebar
 * are gone for the same reason: a layout can only ADD chrome, and the shell
 * draws its own navbar (`<Header variant="scene" />`) and its own floating rail
 * instead of a sidebar column. Same shape as app/dashboard/layout.tsx.
 *
 * `SidebarProvider` stays because the header's own controls read its context.
 */
export default async function ProfileLayout({
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

  // Signed out: the GuestGate in the same chrome, instead of the middleware
  // bouncing the visitor to "/" (see components/auth/GuestGate.tsx). This
  // covers /profiel/boom too, which is the reader's own tree and has no guest
  // shape - the public one lives at /gebruiker/[id].
  if (!session?.user?.email) {
    return (
      <GuestGateScene
        title="Profiel"
        description="Je profiel toont je voortgang: je boom, je niveau, je badges en je studiestatistieken. Hier stel je ook in hoe je heet en of anderen je boom mogen zien."
        next="/profiel"
      />
    );
  }

  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  );
}



