import Link from "next/link"
import { kringProfileHref, type PublicProfileFlag } from "../../lib/friends/client"

/**
 * A person's avatar and name, as a link to their profile.
 *
 * It points at `/vriendenkring/<id>`, not at `/gebruiker/<id>`. The public
 * tree page is opt-in and answers a hard 404 for anyone who did not switch
 * "Openbaar profiel" on - on purpose, so it never confirms that an account
 * exists - which made a kring full of names that each might 404 the wrong
 * link. The in-app profile is built on `GET /api/v1/friends/:userId`, which
 * answers for anyone the reader may look at, so every row can be a link.
 *
 * `PublicProfileFlag` stays on the person type: the profile page itself links
 * on to `/gebruiker/<id>` when that flag says the tree is public, and callers
 * pass whole `FriendSummary` rows through here either way.
 */
export function FriendLink({
  person,
  name,
  className,
  children,
}: {
  person: { userId: string } & PublicProfileFlag
  /** For the accessible name of an avatar-only link. */
  name?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={kringProfileHref(person.userId)}
      // Not prefetched: a feed or a kring list is a dozen of these, and a
      // dozen speculative profile renders is a lot of nothing.
      prefetch={false}
      aria-label={name ? `Het profiel van ${name}` : undefined}
      className={className ?? "no-underline outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#0D9488]"}
    >
      {children}
    </Link>
  )
}
