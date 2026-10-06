"use client"

import { useEffect, useState } from "react"
import { KringPanel } from "./KringPanel"
import { friendsClient, mutualLabel } from "../../lib/friends/client"
import type { FriendSummary } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"
import { SUGGESTIONS_COPY } from "./profileCopy"

/**
 * "Misschien ken je" on the Ontdek tab: friends of the people already in the
 * kring, most shared friends first, from `GET /api/v1/friends/suggestions`.
 *
 * Renders nothing when it has nothing, and that includes every failure - no
 * skeleton that never resolves, no error plate. A suggestion is a courtesy,
 * and the rest of Vriendenkring degrades the same way.
 *
 * Structurally empty for a reader with no friends at all: the service answers
 * `[]` the moment their kring is, because a friend-of-a-friend needs a friend
 * first. The invite card is how a kring starts; this list only grows one.
 *
 * Replaces PeopleYouMayKnow, which drew the same list as a wide section under
 * the old centre-column Vrienden tab. There is no wide column left to draw it
 * in, and two components for one list is how copy drifts.
 */

/** The design's three rows. More would make the column taller than the feed. */
const SHOWN = 3

export function SuggestionsCard({ onInvited }: { onInvited?: () => void }) {
  const [people, setPeople] = useState<FriendSummary[]>([])
  /** The ids invited from this card in this session, so the row can say so. */
  const [sent, setSent] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void friendsClient.suggestions().then((result) => {
      if (alive && result.ok) setPeople(result.data.suggestions.slice(0, SHOWN))
    })
    return () => {
      alive = false
    }
  }, [])

  async function invite(userId: string) {
    if (busy) return
    setBusy(userId)
    const result = await friendsClient.invite({ userId, source: "link" })
    setBusy(null)
    if (!result.ok) return
    // The row stays and reports the pending request rather than disappearing:
    // a person who vanishes on a click reads as a mistake, not as a result.
    setSent((current) => (current.includes(userId) ? current : [...current, userId]))
    onInvited?.()
  }

  if (people.length === 0) return null

  return (
    <KringPanel title="Misschien ken je">
      <ul className="flex flex-col gap-3">
        {people.map((person) => {
          const name = person.name || "Een lezer"
          // Shared friends when the server counted them, otherwise the one
          // other thing two strangers demonstrably have in common.
          const why =
            mutualLabel(person) ??
            (person.planTotalDays ? "leest ook Bijbel in een jaar" : "leest ook mee")
          const invited = sent.includes(person.userId)
          return (
            <li key={person.userId} className="flex items-center gap-2.5">
              <FriendLink
                person={person}
                name={name}
                className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                <FriendAvatar name={person.name} image={person.image} size={34} />
              </FriendLink>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">
                  <FriendLink person={person}>{name}</FriendLink>
                </p>
                <p className="truncate text-[12px] text-ink-faint">{why}</p>
              </div>
              <button
                type="button"
                onClick={() => void invite(person.userId)}
                disabled={invited || busy === person.userId}
                className={`press h-8 flex-none rounded-full border px-3 text-[12.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                  invited
                    ? "cursor-default border-line bg-sunken text-ink-faint"
                    : "border-line bg-surface text-ink-body hover:bg-line-soft disabled:opacity-50"
                }`}
              >
                {invited
                  ? SUGGESTIONS_COPY.sent
                  : busy === person.userId
                    ? SUGGESTIONS_COPY.inviting
                    : "Toevoegen"}
              </button>
            </li>
          )
        })}
      </ul>
    </KringPanel>
  )
}
