"use client"

import { useCallback, useState } from "react"
import { friendsClient } from "../../lib/friends/client"
import type { FriendPostBody } from "../../lib/friends/types"

/**
 * Sharing one thing with your vriendenkring, from wherever that thing is
 * drawn: the daily verse card and a note today.
 *
 * Always an explicit choice. Nothing here runs on mount, on a timer or as a
 * side effect of saving something - plan section 8: a tekst van de dag or a
 * notitie only reaches the kring because somebody picked "Deel met je
 * vrienden". The one thing that posts by itself is a mijlpaal, and that is
 * written server-side.
 *
 * A post is a COPY, not a reference (plan section 8). The text travels with
 * the request, so editing the note tomorrow does not rewrite what the kring
 * read today; `sourceId` is provenance only, which is what lets a deleted note
 * take its post with it.
 */

export type ShareState = "idle" | "sharing" | "shared" | "failed"

/**
 * The server trims to `MAX_POST_BODY` (lib/friends/service.ts) anyway; this is
 * the same number, kept here so the request is not needlessly large. Not
 * imported from the service: that module pulls in mongoose.
 */
const MAX_BODY = 2000

export const SHARE_TO_KRING_LABEL = "Deel met je vrienden"

export const SHARE_TO_KRING_FEEDBACK: Record<Exclude<ShareState, "idle">, string> = {
  sharing: "Delen...",
  shared: "Gedeeld met je vriendenkring.",
  failed: "Delen lukte niet.",
}

/**
 * One share action's state and the call behind it.
 *
 * `state` goes back to "idle" a few seconds after a success so a card does not
 * keep claiming "Gedeeld" for the rest of the session; a failure keeps its
 * message until the next attempt, because that one has to be read.
 */
export function useShareToKring() {
  const [state, setState] = useState<ShareState>("idle")
  const [message, setMessage] = useState("")

  const share = useCallback(async (body: FriendPostBody): Promise<boolean> => {
    setState("sharing")
    setMessage("")
    const result = await friendsClient.share({
      ...body,
      body: (body.body ?? "").trim().slice(0, MAX_BODY),
    })
    if (!result.ok) {
      setState("failed")
      setMessage(result.message)
      return false
    }
    setState("shared")
    setMessage(SHARE_TO_KRING_FEEDBACK.shared)
    window.setTimeout(() => {
      setState((current) => (current === "shared" ? "idle" : current))
      setMessage((current) => (current === SHARE_TO_KRING_FEEDBACK.shared ? "" : current))
    }, 4000)
    return true
  }, [])

  return { state, message, share, busy: state === "sharing" }
}

/**
 * The live region that reports what came of it, under whichever card asked.
 * Renders nothing while nothing has happened, so a card gains no blank line.
 */
export function ShareToKringStatus({
  state,
  message,
  className,
}: {
  state: ShareState
  message: string
  className?: string
}) {
  if (state === "idle" && !message) return null
  const text = message || SHARE_TO_KRING_FEEDBACK[state as Exclude<ShareState, "idle">]
  if (!text) return null
  return (
    <p
      role="status"
      className={
        className ??
        `mt-2 text-[12.5px] ${state === "failed" ? "text-amber-700 dark:text-amber-400" : "text-ink-faint"}`
      }
    >
      {text}
    </p>
  )
}

/**
 * What the kring is shown for a note.
 *
 * The reader's own words when there are any, otherwise the verse they
 * highlighted - a highlight with no note still has something to say. The
 * reference travels separately, as the card's eyebrow.
 */
export function notePostBody(note: {
  _id?: string
  noteText?: string
  verseText?: string
  verseReference?: string
}): FriendPostBody {
  const own = (note.noteText ?? "").trim()
  const verse = (note.verseText ?? "").trim()
  return {
    kind: "note",
    body: own || verse,
    reference: (note.verseReference ?? "").trim() || undefined,
    sourceId: note._id,
  }
}
