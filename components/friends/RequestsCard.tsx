"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { KringPanel } from "./KringPanel"
import { friendsClient, mutualLabel, type PublicProfileFlag } from "../../lib/friends/client"
import type { FriendRequestView, FriendSource, FriendSummary } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"

/**
 * "Verzoeken": the open incoming requests, with the count beside the title.
 *
 * Incoming only. An outgoing request is not a decision waiting to be made, so
 * it has no place in a column of things to act on; it is still visible on the
 * other person's profile, where "Verzoek verstuurd" is shown.
 *
 * The card draws nothing at all when the list is empty - no "geen verzoeken"
 * plate. An empty row in a sidebar is noise, and the badge on the Start tab
 * already says when there is something here.
 */

/** How the request found the reader, in one short line. */
const VIA: Record<FriendSource, string> = {
  link: "via je uitnodigingslink",
  code: "via je code",
  contacts: "via je contacten",
  qr: "via een QR-code",
}

export function RequestsCard({
  requests,
  onChanged,
}: {
  requests: (FriendRequestView & { user: FriendSummary & PublicProfileFlag })[]
  onChanged?: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)

  async function act(id: string, what: "accept" | "decline") {
    if (busy) return
    setBusy(id)
    const result = what === "accept" ? await friendsClient.accept(id) : await friendsClient.decline(id)
    setBusy(null)
    if (result.ok) onChanged?.()
  }

  if (requests.length === 0) return null

  return (
    <KringPanel
      title="Verzoeken"
      aside={
        <span className="inline-grid h-[20px] min-w-[20px] place-items-center rounded-full bg-warn px-1.5 text-[11px] font-bold tabular-nums text-white">
          {requests.length}
        </span>
      }
    >
      <ul className="flex flex-col gap-3">
        {requests.map((request) => {
          const name = request.user.name || "Iemand"
          // `mutualCount` is optional and absent is not zero, so the shared
          // count is used when the server sent one and the source line stands
          // in when it did not.
          const why = mutualLabel(request.user) ?? VIA[request.source] ?? "Wil vrienden worden"
          return (
            <li key={request.id} className="flex items-center gap-2.5">
              <FriendLink
                person={request.user}
                name={name}
                className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                <FriendAvatar name={request.user.name} image={request.user.image} size={34} />
              </FriendLink>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">
                  <FriendLink person={request.user}>{name}</FriendLink>
                </p>
                <p className="truncate text-[12px] text-ink-faint">{why}</p>
              </div>
              <button
                type="button"
                onClick={() => void act(request.id, "decline")}
                disabled={busy === request.id}
                aria-label={`Verzoek van ${name} weigeren`}
                className="press grid h-8 w-8 flex-none place-items-center rounded-full border border-line bg-surface text-ink-faint outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
              >
                <X size={15} />
              </button>
              <button
                type="button"
                onClick={() => void act(request.id, "accept")}
                disabled={busy === request.id}
                className="press h-8 flex-none rounded-full bg-teal-dark px-3 text-[12.5px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
              >
                Accepteren
              </button>
            </li>
          )
        })}
      </ul>
    </KringPanel>
  )
}
