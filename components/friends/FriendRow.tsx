"use client"

import { useState } from "react"
import { Flame, UserMinus } from "lucide-react"
import { friendsClient, planLabel } from "../../lib/friends/client"
import type { FriendSummary } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"

/**
 * One person in the kring: name, their streak, and the plan day they are on -
 * the three things that make reading together feel like company rather than a
 * list of accounts.
 *
 * Removing asks first. It is quiet rather than hidden: a kring you cannot leave
 * is a kring nobody joins.
 */
export function FriendRow({ friend, onChanged }: { friend: FriendSummary; onChanged?: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const plan = planLabel(friend)

  async function remove() {
    setBusy(true)
    const result = await friendsClient.removeFriend(friend.userId)
    setBusy(false)
    setConfirming(false)
    if (result.ok) onChanged?.()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <FriendAvatar name={friend.name} image={friend.image} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{friend.name || "Een vriend"}</p>
        <p className="truncate text-[12.5px] text-ink-faint">
          {plan ?? "Leest mee"}
          {friend.streak > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 align-middle">
              <Flame size={13} className="text-warn" />
              {friend.streak}
            </span>
          )}
        </p>
      </div>

      {confirming ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="press rounded-btn bg-danger px-3 py-1.5 text-[13px] font-semibold text-white outline-none disabled:opacity-50"
          >
            Verwijderen
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="press rounded-btn border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink-body outline-none hover:bg-line-soft"
          >
            Annuleren
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`${friend.name || "Deze vriend"} uit je kring halen`}
          className="press grid h-9 w-9 place-items-center rounded-full text-ink-faint outline-none hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <UserMinus size={17} />
        </button>
      )}
    </div>
  )
}
