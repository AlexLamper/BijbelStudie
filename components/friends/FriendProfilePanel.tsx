"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Ban, Flame, MoreHorizontal, UserMinus } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { ConfirmDialog } from "../ui/ConfirmDialog"
import { Card, Skeleton } from "../kit/primitives"
import { friendsClient, mutualLabel, planLabel, profileHref, theirKringState } from "../../lib/friends/client"
import type { FriendProfileView, FriendSummary } from "../../lib/friends/types"
import { BLOCK_CONFIRM_COPY, blockConfirmTitle } from "../settings/vriendenkringCopy"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"
import {
  PROFILE_COPY,
  friendCountLabel,
  friendsSinceLabel,
  moreMutualsLabel,
  noOtherFriendsLabel,
  publicTreeLabel,
  removeConfirmTitle,
  theirKringTitle,
} from "./profileCopy"

/**
 * /vriendenkring/<id> - one person, from `GET /api/v1/friends/:userId`.
 *
 * The better link target than `/gebruiker/<id>`: the tree page is opt-in and
 * 404s for everyone who did not switch it on, while this one answers for
 * anyone the reader is allowed to look at. It links on to the tree when
 * `publicProfile` says that page exists.
 *
 * What is shown is graded by the server, not here (lib/friends/service.ts):
 *
 * - a non-friend's `streak`, `planDay` and `friendsSince` come back zeroed, so
 *   those lines are left off rather than rendered as zeros;
 * - `friends` is `null` for a non-friend, which means "not yours to see" and
 *   gets no section at all. An empty-list state there would read as "they have
 *   no friends", which is a different claim and not ours to make. An actual
 *   empty array - a friend whose only friend is the reader - does get a line,
 *   because then it is true and the reader may know it.
 *
 * A 404 is Next's not-found, never a message: the endpoint answers the same
 * 404 for a block in either direction, a deleted account, a malformed id and
 * the reader's own id, and the UI must not let a visitor tell those apart.
 */
export function FriendProfilePanel({ userId }: { userId: string }) {
  const [view, setView] = useState<FriendProfileView | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "failed">("loading")
  const [confirming, setConfirming] = useState<"remove" | "block" | null>(null)
  const [busy, setBusy] = useState(false)
  const [invited, setInvited] = useState(false)

  const load = useCallback(async () => {
    const result = await friendsClient.profile(userId)
    if (result.ok) {
      setView(result.data)
      setStatus("ready")
      return
    }
    // Only a 404 is a missing page. A 401 is handled by the route's guest gate
    // and anything else is a bad moment, not a verdict about this person.
    setStatus(result.kind === "not_found" ? "missing" : "failed")
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function invite() {
    if (busy) return
    setBusy(true)
    const result = await friendsClient.invite({ userId, source: "link" })
    setBusy(false)
    if (!result.ok) return
    setInvited(true)
    // Inviting someone who already asked makes you friends on the spot, so the
    // profile is re-read rather than assumed to be pending.
    void load()
  }

  async function act(what: "remove" | "block") {
    setBusy(true)
    const result = what === "block"
      ? await friendsClient.block(userId)
      : await friendsClient.removeFriend(userId)
    setBusy(false)
    setConfirming(null)
    // After a block the endpoint answers 404 for this person, which `load`
    // turns into the not-found page. That is the right landing, and it is the
    // same page a stranger would get - nothing leaks either way.
    if (result.ok) void load()
  }

  // Thrown during render, which is the only place `notFound()` works.
  if (status === "missing") notFound()

  if (status === "failed") {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <Card className="p-6 text-center">
          <p className="text-[14px] text-ink-faint">{PROFILE_COPY.unavailable}</p>
        </Card>
      </div>
    )
  }

  if (status === "loading" || !view) {
    return (
      <div className="mx-auto w-full max-w-[720px] space-y-3">
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-28 w-full rounded-card" />
      </div>
    )
  }

  const person = view.user
  const name = person.name || "Een lezer"
  const plan = view.isFriend ? planLabel(person) : null
  const since = view.isFriend ? friendsSinceLabel(person.friendsSince) : null
  const mutual = mutualLabel({ mutualCount: view.mutualCount })
  const hiddenMutuals = moreMutualsLabel(view.mutualCount - view.mutuals.length)
  const treeHref = profileHref(person)
  const kringState = theirKringState(view.friends)

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <FriendAvatar name={person.name} image={person.image} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] font-bold text-ink">{name}</h1>
            {/* A non-friend's numbers are zeroed server-side, so the line is
                left off rather than printed as a row of zeros. */}
            {view.isFriend && (
              <p className="mt-0.5 truncate text-[13px] text-ink-faint">
                {plan ?? PROFILE_COPY.readsAlong}
                {person.streak > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 align-middle">
                    <Flame size={13} className="text-warn" />
                    {person.streak}
                  </span>
                )}
              </p>
            )}
            <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">
              {friendCountLabel(view.friendCount)}
              {since && <span className="ml-2">{since}</span>}
            </p>
          </div>

          {view.isFriend ? (
            /* Not modal, for the same reason FriendRow says: a modal Radix menu
               plus a Radix dialog each set `pointer-events: none` on <body>,
               and the dialog closing puts the menu's back. */
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Acties voor ${name}`}
                  className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-faint outline-none hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                >
                  <MoreHorizontal size={17} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onSelect={() => setConfirming("remove")}>
                  <UserMinus size={14} className="mr-2" />
                  {PROFILE_COPY.remove}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive" onSelect={() => setConfirming("block")}>
                  <Ban size={14} className="mr-2" />
                  {PROFILE_COPY.block}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            !invited && (
              <button
                type="button"
                onClick={() => void invite()}
                disabled={busy}
                className="press shrink-0 rounded-btn bg-teal-dark px-4 py-2 text-[13.5px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
              >
                {busy ? PROFILE_COPY.befriending : PROFILE_COPY.befriend}
              </button>
            )
          )}
        </div>

        {!view.isFriend && invited && (
          <p className="mt-3 text-[13px] text-ink-faint">{PROFILE_COPY.requestSent}</p>
        )}

        {/* The one place `/gebruiker/<id>` is still worth linking: a deliberate
            way on to the tree, shown only when its owner opted in. */}
        {treeHref && (
          <Link
            href={treeHref}
            prefetch={false}
            className="press mt-3 inline-block text-[13px] font-semibold text-teal no-underline hover:text-teal-dark focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:text-teal-400 dark:hover:text-teal-300"
          >
            {publicTreeLabel(name)}
          </Link>
        )}
      </Card>

      {mutual && (
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">{mutual}</h2>
          <p className="mt-0.5 mb-2 text-[12.5px] text-ink-faint">{PROFILE_COPY.mutualsHint}</p>
          {view.mutuals.length > 0 && (
            <Card className="divide-y divide-line">
              {view.mutuals.map((friend) => (
                <PersonRow key={friend.userId} person={friend} />
              ))}
            </Card>
          )}
          {hiddenMutuals && <p className="mt-2 text-[12.5px] text-ink-faint">{hiddenMutuals}</p>}
        </section>
      )}

      {/* `null` is "not yours to see" and gets nothing at all; `[]` is a friend
          whose only friend is the reader. `theirKringState` owns that call. */}
      {kringState !== "hidden" && (
        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
            {theirKringTitle(name)}
          </h2>
          {kringState === "list" ? (
            <Card className="divide-y divide-line">
              {view.friends!.map((friend) => (
                <PersonRow key={friend.userId} person={friend} />
              ))}
            </Card>
          ) : (
            <Card className="p-5">
              <p className="text-[13px] text-ink-faint">{noOtherFriendsLabel(name)}</p>
            </Card>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirming === "remove"}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void act("remove")}
        title={removeConfirmTitle(name)}
        description={PROFILE_COPY.removeBody}
        confirmLabel={PROFILE_COPY.removeAction}
        pendingLabel={PROFILE_COPY.removePending}
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
        pendingLabel={PROFILE_COPY.blockPending}
        pending={busy}
        destructive
      />
    </div>
  )
}

/** A name and a face, linking to that person's own profile. Nothing else: a
 *  mutual friend or a friend-of-a-friend is not the subject of this page. */
function PersonRow({ person }: { person: FriendSummary }) {
  const name = person.name || "Een lezer"
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <FriendLink
        person={person}
        name={name}
        className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
      >
        <FriendAvatar name={person.name} image={person.image} size={36} />
      </FriendLink>
      <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
        <FriendLink person={person}>{name}</FriendLink>
      </p>
    </div>
  )
}
