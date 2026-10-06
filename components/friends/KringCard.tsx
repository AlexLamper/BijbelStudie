"use client"

import { useState } from "react"
import { Flame } from "lucide-react"
import { KringPanel } from "./KringPanel"
import { type PublicProfileFlag } from "../../lib/friends/client"
import type { FriendSummary } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"

/**
 * "Vrienden": the kring at column width, with the count beside the title.
 *
 * Four rows, then "Alle n vrienden" under a hairline, which opens the rest in
 * place rather than on a page of its own - the kring is tens of people, so a
 * second route for it would be a click to load what is already loaded.
 *
 * Deliberately not the row from FriendRow: that one carries the plan day and
 * the menu that removes or blocks someone, which needs the room the feed
 * column has. Here a person is a name, whether they read today, and how long
 * their reeks is; the rest is one click away on their profile.
 */

/** Rows before "Alle n vrienden" takes over. The design's count. */
const SHOWN = 4

export function KringCard({ friends }: { friends: (FriendSummary & PublicProfileFlag)[] }) {
  const [all, setAll] = useState(false)
  if (friends.length === 0) return null

  const rows = all ? friends : friends.slice(0, SHOWN)

  return (
    <KringPanel
      title="Vrienden"
      aside={<span className="text-[13px] tabular-nums text-ink-faint">{friends.length}</span>}
      footer={
        friends.length > SHOWN ? (
          <button
            type="button"
            onClick={() => setAll((open) => !open)}
            aria-expanded={all}
            className="press text-[13px] font-semibold text-teal outline-none transition-colors hover:text-teal-dark focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:text-teal-400"
          >
            {all ? "Minder laten zien" : `Alle ${friends.length} vrienden`}
          </button>
        ) : undefined
      }
    >
      <ul className="flex flex-col gap-3">
        {rows.map((friend) => {
          const name = friend.name || "Een vriend"
          return (
            <li key={friend.userId} className="flex items-center gap-2.5">
              <span className="relative flex-none">
                <FriendLink
                  person={friend}
                  name={name}
                  className="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                >
                  <FriendAvatar name={friend.name} image={friend.image} size={32} />
                </FriendLink>
                {friend.activeToday && (
                  <span
                    // Absent reads as no dot: the flag is optional, and
                    // "unknown" must not render as "online".
                    title="Vandaag gelezen"
                    className="absolute -bottom-px -right-px h-[10px] w-[10px] rounded-full border-2 border-surface bg-success-fill"
                  />
                )}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                <FriendLink person={friend}>{name}</FriendLink>
              </p>
              {friend.streak > 0 && (
                <span className="flex flex-none items-center gap-1 text-[12.5px] font-semibold tabular-nums text-warn">
                  <Flame size={14} aria-hidden="true" />
                  {friend.streak}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </KringPanel>
  )
}
