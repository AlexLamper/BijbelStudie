"use client"

import { useState } from "react"
import { friendsClient, type PublicProfileFlag } from "../../lib/friends/client"
import type { FriendRequestView, FriendSummary } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"

/**
 * A pending verzoek. Incoming gets "Accepteren" and a quiet "Weigeren";
 * outgoing gets "Intrekken" and nothing else - there is nothing to decide on
 * your own request.
 */
export function FriendRequestRow({
  request,
  direction,
  onChanged,
}: {
  request: FriendRequestView & { user: FriendSummary & PublicProfileFlag }
  direction: "incoming" | "outgoing"
  onChanged?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const name = request.user.name || "Iemand"

  async function act(action: "accept" | "decline" | "cancel") {
    setBusy(true)
    const result =
      action === "accept"
        ? await friendsClient.accept(request.id)
        : action === "decline"
          ? await friendsClient.decline(request.id)
          : await friendsClient.cancel(request.id)
    setBusy(false)
    if (result.ok) onChanged?.()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <FriendLink
        person={request.user}
        name={name}
        className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
      >
        <FriendAvatar name={request.user.name} image={request.user.image} size={40} />
      </FriendLink>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          <FriendLink person={request.user}>{name}</FriendLink>
        </p>
        <p className="text-[12.5px] text-ink-faint">
          {direction === "incoming" ? "Wil vrienden worden" : "Verzoek verstuurd"}
        </p>
      </div>

      {direction === "incoming" ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => act("accept")}
            disabled={busy}
            className="press rounded-btn bg-teal-dark px-3.5 py-1.5 text-[13px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] disabled:opacity-50"
          >
            Accepteren
          </button>
          <button
            type="button"
            onClick={() => act("decline")}
            disabled={busy}
            className="press rounded-btn border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink-body outline-none hover:bg-line-soft disabled:opacity-50"
          >
            Weigeren
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => act("cancel")}
          disabled={busy}
          className="press rounded-btn border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink-body outline-none hover:bg-line-soft disabled:opacity-50"
        >
          Intrekken
        </button>
      )}
    </div>
  )
}
