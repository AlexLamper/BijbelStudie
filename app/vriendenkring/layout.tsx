import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/authOptions"
import SessionProvider from "../../components/providers/SessionProvider"
import GuestGateScene from "../../components/auth/GuestGateScene"
import { robotsFor } from "../../lib/pageMetadata"

/**
 * Noindex like /groepen and /notities: a signed-in-only page is not content.
 * app/robots.ts disallows the path as well, but robots.txt only governs
 * crawling - a URL linked from somewhere else can still be indexed URL-only,
 * which is what this header is for.
 */
export const metadata: Metadata = {
  title: "Vriendenkring",
  description: "Lees samen met vrienden: zie waar zij lezen en moedig elkaar aan.",
  robots: robotsFor(false),
}

/**
 * Providers only - the page draws AppShell itself, the same shape as
 * app/groepen/layout.tsx and app/notities/layout.tsx (a layout can only add
 * chrome, never replace what a parent rendered).
 *
 * `authOptions` is passed on purpose: without it NextAuth returns the default
 * session and skips the callback that attaches isAdmin and isSubscribed, so
 * any client-side Pro check on this route would read undefined.
 */
export default async function VriendenkringLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return (
      <GuestGateScene
        title="Vriendenkring"
        description="Lees samen met vrienden: zie waar zij lezen, moedig elkaar aan en vier elkaars mijlpalen."
        next="/vriendenkring"
      />
    )
  }
  return <SessionProvider session={session}>{children}</SessionProvider>
}
