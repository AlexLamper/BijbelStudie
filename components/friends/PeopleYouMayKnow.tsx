"use client"

import { useEffect, useState } from "react"
import { Card } from "../kit/primitives"
import { friendsClient, mutualLabel } from "../../lib/friends/client"
import type { FriendSummary } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"
import { SUGGESTIONS_COPY } from "./profileCopy"

/**
 * "Mensen die je misschien kent" - friends of the people already in the kring,
 * most shared friends first, straight from `GET /api/v1/friends/suggestions`.
 *
 * Renders nothing at all when there is nothing to show, and that includes
 * every failure: no skeleton that never resolves, no error card. A suggestion
 * list is a courtesy, and the rest of Vriendenkring degrades the same way.
 *
 * Note it is structurally empty for a reader with no friends at all - the
 * service answers `[]` the moment `friendIdsFor` is empty, because a
 * friend-of-a-friend needs a friend first. Contact matching and the invite
 * code are how a kring starts; this list only ever grows one.
 */
export function PeopleYouMayKnow({ onInvited }: { onInvited?: () => void }) {
  const [people, setPeople] = useState<FriendSummary[]>([])
  /** The ids already invited in this session, so the row can say so. */
  const [sent, setSent] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    friendsClient.suggestions().then((result) => {
      if (alive && result.ok) setPeople(result.data.suggestions)
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
    <section>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
        {SUGGESTIONS_COPY.title}
      </h2>
      <p className="mt-0.5 mb-2 text-[12.5px] text-ink-faint">{SUGGESTIONS_COPY.hint}</p>
      <Card className="divide-y divide-line">
        {people.map((person) => {
          const name = person.name || "Een lezer"
          const mutual = mutualLabel(person)
          const invited = sent.includes(person.userId)
          return (
            <div key={person.userId} className="flex items-center gap-3 px-4 py-3">
              <FriendLink
                person={person}
                name={name}
                className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                <FriendAvatar name={person.name} image={person.image} size={40} />
              </FriendLink>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">
                  <FriendLink person={person}>{name}</FriendLink>
                </p>
                {mutual && <p className="truncate text-[12.5px] text-ink-faint">{mutual}</p>}
              </div>
              {invited ? (
                <span className="shrink-0 text-[12.5px] font-semibold text-ink-faint">
                  {SUGGESTIONS_COPY.sent}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void invite(person.userId)}
                  disabled={busy === person.userId}
                  className="press shrink-0 rounded-btn bg-teal-dark px-3 py-1.5 text-[13px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
                >
                  {busy === person.userId ? SUGGESTIONS_COPY.inviting : SUGGESTIONS_COPY.invite}
                </button>
              )}
            </div>
          )
        })}
      </Card>
    </section>
  )
}
