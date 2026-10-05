import type { Metadata } from "next"
import AppShell from "../../../components/shell/AppShell"
import { FriendProfilePanel } from "../../../components/friends/FriendProfilePanel"
import { robotsFor } from "../../../lib/pageMetadata"

/**
 * /vriendenkring/<userId> - one person's profile, inside the app shell.
 *
 * This is where a kring row, a feed byline, a shared friend and a suggestion
 * all lead. It is not /gebruiker/<id>: that page is the public tree, is opt-in
 * and 404s for anyone who did not switch it on, so it cannot carry the links a
 * kring needs. This one is built on `GET /api/v1/friends/:userId`, which
 * answers for anyone the reader is allowed to look at.
 *
 * Signed-in only: app/vriendenkring/layout.tsx shows a guest the gate before
 * this ever renders, which is also why there is nothing to guard here.
 *
 * Noindex, like the parent layout and like /notities and /profiel: a page per
 * person behind a sign-in is not content. app/robots.ts disallows the path as
 * well, but robots.txt only governs crawling - a URL linked from elsewhere can
 * still be indexed URL-only, which is what this header is for.
 */
export const metadata: Metadata = {
  title: "Profiel",
  description: "Een vriend in je vriendenkring: waar ze lezen, en wie jullie samen kennen.",
  robots: robotsFor(false),
}

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  return (
    <AppShell title="Vriendenkring" ownHeading>
      <FriendProfilePanel userId={userId} />
    </AppShell>
  )
}
