"use client"

import { useState } from "react"
import Link from "next/link"
import { Flame, Heart, MessageCircle } from "lucide-react"
import { bannerGradient } from "../kit/primitives"
import { friendsClient, postWhen, type PublicProfileFlag } from "../../lib/friends/client"
import type { FriendPost } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"

/**
 * One card in the Vriendenkring feed, on both tabs.
 *
 * Three bands, always in this order: who and when, then the post itself in the
 * shape its kind asks for, then the hart and the reactie under a hairline.
 * Nothing about the card changes between Vrienden and Ontdek except the one
 * extra link in the action bar, so a post reads the same wherever it is met.
 *
 * The heart answers the click and is put back if the server refuses, because
 * the one interaction people repeat must never wait on a round trip.
 *
 * Also drawn on the dashboard ("Bij je vrienden"), which passes `post` and
 * `onChanged` only - the Ontdek props are optional for exactly that reason.
 */

/** `sourceId` for a finished study, the key lib/friends/milestones.ts writes. */
const STUDY_PREFIX = "study:"

/** The id in `study:<id>`, or null for any other milestone. */
function studyIdOf(post: FriendPost): string | null {
  const source = post.sourceId ?? ""
  if (post.kind !== "milestone" || !source.startsWith(STUDY_PREFIX)) return null
  const id = source.slice(STUDY_PREFIX.length).trim()
  return id || null
}

/**
 * What the byline says after the name: "Naam deelde een vers".
 *
 * Lower case and in the past tense, so the line reads as one sentence rather
 * than as a name with a label stapled to it.
 */
function actionOf(post: FriendPost): string {
  if (post.kind === "verse") return "deelde een vers"
  if (post.kind === "note") return "deelde een notitie"
  if (studyIdOf(post)) return "rondde een studie af"
  if (post.kind === "milestone") return "bereikte een mijlpaal"
  return "deelde iets"
}

/**
 * Whether a note is long enough that the three-line clamp will bite.
 *
 * A guess, on purpose: measuring would mean a layout read per card on every
 * render. Erring towards showing "Meer lezen" on a note that happened to fit
 * costs one harmless link; erring the other way hides text.
 */
const CLAMPS_AT = 170

export function FriendPostCard({
  post,
  onChanged,
  canInvite = false,
  invited = false,
  onInvite,
}: {
  post: FriendPost & PublicProfileFlag
  onChanged?: () => void
  /** Ontdek only: may this reader still ask the writer to be friends? */
  canInvite?: boolean
  /** A request sent from this card in this session. */
  invited?: boolean
  onInvite?: (userId: string) => void
}) {
  const [liked, setLiked] = useState(post.likedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [commenting, setCommenting] = useState(false)
  const [comment, setComment] = useState("")
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)

  // The author as a linkable person: a post carries them under `authorId`, not
  // `userId`. `publicProfile` rides along for the opt-in tree page; the byline
  // itself goes to /vriendenkring/<id>, which needs no opt-in (see FriendLink).
  const authorName = post.authorName || "Een vriend"
  const author = { userId: post.authorId, publicProfile: post.publicProfile }
  const studyId = studyIdOf(post)

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)))
    const result = await friendsClient.like(post.id, next)
    if (!result.ok) {
      setLiked(!next)
      setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)))
    }
  }

  async function sendComment() {
    const body = comment.trim()
    if (!body || busy) return
    setBusy(true)
    const result = await friendsClient.comment(post.id, body)
    setBusy(false)
    if (!result.ok) return
    setComment("")
    setCommenting(false)
    setCommentCount((count) => count + 1)
    onChanged?.()
  }

  return (
    <article className="flex flex-col gap-3 rounded-card border border-line bg-surface px-[18px] py-4">
      {/* ── Who, and when ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <FriendLink
          person={author}
          name={authorName}
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <FriendAvatar name={post.authorName} image={post.authorImage} size={36} />
        </FriendLink>
        <p className="min-w-0 flex-1 truncate pt-[2px] text-[14px] text-ink-faint">
          <FriendLink person={author} className="font-semibold text-ink no-underline hover:underline">
            {authorName}
          </FriendLink>{" "}
          {actionOf(post)}
        </p>
        <time dateTime={post.createdAt} className="shrink-0 pt-[3px] text-[12px] text-ink-faint">
          {postWhen(post.createdAt)}
        </time>
      </div>

      {/* ── The post ────────────────────────────────────────────────────── */}
      {post.kind === "verse" ? (
        <div className="rounded-[12px] border border-line bg-sunken px-4 py-[14px]">
          <p className="font-lora text-[17px] leading-[1.6] text-ink">{post.body}</p>
          {post.reference && (
            <p className="mt-[10px] text-[10.5px] font-semibold uppercase tracking-[1.2px] text-teal-dark dark:text-teal-400">
              {post.reference}
            </p>
          )}
        </div>
      ) : studyId ? (
        <div className="flex items-center gap-3">
          {/* The gradient plate the rest of the app uses where there is no
              artwork. A post is a copy, so it carries no image of its own and
              nothing is fetched to find one. */}
          <span
            className="h-12 w-12 flex-none rounded-btn"
            style={{ background: bannerGradient(studyId) }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-bold text-ink">{post.reference || "Een studie"}</p>
            <p className="mt-[2px] truncate text-[12.5px] text-ink-faint">{post.body}</p>
          </div>
          <Link
            href={`/studie/${encodeURIComponent(studyId)}`}
            prefetch={false}
            className="flex-none text-[13px] font-semibold text-teal no-underline hover:text-teal-dark dark:text-teal-400 dark:hover:text-teal-300"
          >
            Bekijk
          </Link>
        </div>
      ) : post.kind === "milestone" ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-warn/30 bg-warn-wash px-[14px] py-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-btn bg-warn text-white">
            <Flame size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-[1.3] text-ink">{post.body || "Een mijlpaal"}</p>
            {post.reference && post.reference !== post.body && (
              <p className="mt-[2px] truncate text-[12.5px] text-ink-faint">{post.reference}</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          {post.reference && (
            <p className="mb-[6px] text-[10.5px] font-semibold uppercase tracking-[1.2px] text-teal-dark dark:text-teal-400">
              {post.reference}
            </p>
          )}
          <p className={`text-[14px] leading-[1.6] text-ink ${expanded ? "" : "line-clamp-3"}`}>{post.body}</p>
          {post.body.length > CLAMPS_AT && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              className="mt-[6px] text-[13px] font-semibold text-teal outline-none hover:text-teal-dark focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:text-teal-400"
            >
              {expanded ? "Minder lezen" : "Meer lezen"}
            </button>
          )}
        </div>
      )}

      {/* ── Hart, reactie, and on Ontdek the invitation ──────────────────── */}
      <div className="flex items-center gap-[18px] border-t border-line-soft pt-[10px]">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Hart weghalen" : "Hart geven"}
          className={`press inline-flex items-center gap-1.5 text-[13px] font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
            liked ? "text-danger" : "text-ink-faint hover:text-ink-body"
          }`}
        >
          <Heart size={17} className={liked ? "fill-current" : ""} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setCommenting((open) => !open)}
          aria-expanded={commenting}
          aria-label="Reageren"
          className="press inline-flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-ink-faint outline-none transition-colors hover:text-ink-body focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <MessageCircle size={17} />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>

        {/* Ontdek only, and only while there is something to send: the server
            answers `canInvite`, so this never has to be worked out from
            whichever lists the page happened to have loaded. */}
        {(canInvite || invited) && (
          <span className="ml-auto">
            {invited ? (
              <span className="text-[13px] font-semibold text-ink-faint">Verzoek verstuurd</span>
            ) : (
              <button
                type="button"
                onClick={() => onInvite?.(post.authorId)}
                className="press text-[13px] font-semibold text-teal outline-none transition-colors hover:text-teal-dark focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:text-teal-400"
              >
                Toevoegen als vriend
              </button>
            )}
          </span>
        )}
      </div>

      {commenting && (
        <div className="flex gap-2">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void sendComment()
            }}
            placeholder="Schrijf een reactie"
            className="min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          />
          <button
            type="button"
            onClick={() => void sendComment()}
            disabled={busy || comment.trim().length === 0}
            className="press rounded-btn bg-teal-dark px-3.5 text-[13.5px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] disabled:opacity-50"
          >
            Plaatsen
          </button>
        </div>
      )}
    </article>
  )
}
