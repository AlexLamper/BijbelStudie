import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/authOptions"
import SessionProvider from "../../components/providers/SessionProvider"
import { SidebarProvider } from "../../components/ui/sidebar"
import GuestGateScene from "../../components/auth/GuestGateScene"

export const metadata: Metadata = {
  title: "Groepen",
  description: "Bijbelstudie in groepsverband",
}

/**
 * Providers only - no chrome.
 *
 * /groepen now sits in the shared immersive shell
 * (components/scene/SceneShell.tsx), which draws its own navbar and its own
 * rail. A layout in the App Router can only ADD chrome, never replace what a
 * parent rendered, so the `Header` and the `AppSidebar` had to leave this file;
 * the pages render `<SceneShell header rail>` themselves.
 *
 * Just as load-bearing: the wrapper this used to have was an `h-screen
 * overflow-hidden` box with the page scrolling inside it, and the scene's depth
 * engine measures `window.scrollY`. Inside such a box the landscape never
 * moves. The DOCUMENT has to scroll, which is why this is providers only - the
 * same shape as app/dashboard/layout.tsx and app/notities/layout.tsx.
 *
 * `authOptions` is passed on purpose, not left off. Without it NextAuth returns
 * only the default session ({name, email, image}) and skips the `session`
 * callback in lib/authOptions that attaches isAdmin, isSubscribed and
 * studyStyle - so any client-side check on those fields reads undefined on this
 * route, and a Pro user renders as not-Pro.
 *
 * `SidebarProvider` stays because the header's own controls read its context.
 */
export default async function GroepenLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  // Signed out: the GuestGate in the same chrome, instead of the middleware
  // bouncing the visitor to "/" (see components/auth/GuestGate.tsx).
  if (!session?.user?.email) {
    return (
      <GuestGateScene
        title="Groepen"
        description="In een groep studeer je samen: een studie, gedeelde voortgang en ruimte om notities met elkaar te delen."
        next="/groepen"
      />
    )
  }
  return (
    <SessionProvider session={session}>
      <SidebarProvider>{children}</SidebarProvider>
    </SessionProvider>
  )
}
