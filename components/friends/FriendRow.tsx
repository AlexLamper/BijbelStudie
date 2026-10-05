"use client"

import { useState } from "react"
import { Flame, MoreHorizontal, Ban, UserMinus } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { ConfirmDialog } from "../ui/ConfirmDialog"
import { friendsClient, planLabel, type PublicProfileFlag } from "../../lib/friends/client"
import type { FriendSummary } from "../../lib/friends/types"
import { BLOCK_CONFIRM_COPY, blockConfirmTitle } from "../settings/vriendenkringCopy"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"

/**
 * One person in the kring: name, their streak, and the plan day they are on -
 * the three things that make reading together feel like company rather than a
 * list of accounts.
 *
 * Both ways out ask first, and both live behind one menu rather than two icons
 * on the row: "uit je kring halen" is an ordinary choice, blocking is not, and
 * a row that puts them side by side invites the wrong one. Quiet rather than
 * hidden, though: a kring you cannot leave is a kring nobody joins.
 *
 * Blocking is undone in Instellingen > Vriendenkring, where the blocked list
 * lives (`FriendSettings.blocked`), which is what the confirm text says.
 */
export function FriendRow({
  friend,
  onChanged,
}: {
  friend: FriendSummary & PublicProfileFlag
  onChanged?: () => void
}) {
  const [confirming, setConfirming] = useState<"remove" | "block" | null>(null)
  const [busy, setBusy] = useState(false)
  const plan = planLabel(friend)
  const name = friend.name || "Een vriend"

  async function act(what: "remove" | "block") {
    setBusy(true)
    const result =
      what === "block"
        ? await friendsClient.block(friend.userId)
        : await friendsClient.removeFriend(friend.userId)
    setBusy(false)
    setConfirming(null)
    if (result.ok) onChanged?.()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <FriendLink person={friend} name={name} className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded-full">
        <FriendAvatar name={friend.name} image={friend.image} size={40} />
      </FriendLink>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          <FriendLink person={friend}>{name}</FriendLink>
        </p>
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

      {/* Not modal: both items open a ConfirmDialog, and a modal Radix menu
          plus a Radix dialog each set `pointer-events: none` on <body> from
          their own copy of DismissableLayer - the dialog, opened while the menu
          is still up, puts the menu's "none" back when it closes and the page
          stays unclickable. Full account in
          components/dashboard/DailyVerseCard.tsx. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acties voor ${name}`}
            className="press grid h-9 w-9 place-items-center rounded-full text-ink-faint outline-none hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          >
            <MoreHorizontal size={17} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer" onSelect={() => setConfirming("remove")}>
            <UserMinus size={14} className="mr-2" />
            Uit je kring halen
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer text-destructive" onSelect={() => setConfirming("block")}>
            <Ban size={14} className="mr-2" />
            Blokkeren
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirming === "remove"}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void act("remove")}
        title={`${name} uit je kring halen?`}
        description="Jullie zien elkaars berichten niet meer. Je kunt elkaar later opnieuw uitnodigen."
        confirmLabel="Verwijderen"
        pendingLabel="Verwijderen..."
        pending={busy}
        destructive
      />
      <ConfirmDialog
        open={confirming === "block"}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void act("block")}
        title={blockConfirmTitle(name)}
        description={BLOCK_CONFIRM_COPY.body}
        confirmLabel={BLOCK_CONFIRM_COPY.action}
        pendingLabel="Blokkeren..."
        pending={busy}
        destructive
      />
    </div>
  )
}
