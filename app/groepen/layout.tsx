import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/authOptions"
import SessionProvider from "../../components/providers/SessionProvider"
import GuestGateScene from "../../components/auth/GuestGateScene"

export const metadata: Metadata = {
  title: "Groepen",
  description: "Bijbelstudie in groepsverband",
}

/**
 * Providers only - no chrome.
 *
 * /groepen and /groepen/[id] sit in the shared app shell
 * (components/shell/AppShell.tsx), the same sidebar-and-top-bar frame as
 * /dashboard, /notities and /abonnement, rather than the immersive scene
 * backdrop they used to draw. A layout in the App Router can only ADD chrome,
 * never replace what a parent rendered, so AppShell is drawn by each page
 * itself (it takes the page's title) - the same shape as
 * app/notities/layout.tsx and app/dashboard/layout.tsx.
 *
 * The signed-out branch below needs no change for that: GuestGateScene already
 * renders the GuestGate card inside the same AppShell, whose top bar shows
 * "Inloggen" in place of the account controls.
 *
 * `authOptions` is passed on purpose, not left off. Without it NextAuth returns
 * only the default session ({name, email, image}) and skips the `session`
 * callback in lib/authOptions that attaches isAdmin, isSubscribed and
 * studyStyle - so any client-side check on those fields reads undefined on this
 * route, and a Pro user renders as not-Pro.
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
      {children}
    </SessionProvider>
  )
}
