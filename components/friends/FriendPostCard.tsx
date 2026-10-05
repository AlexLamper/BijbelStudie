"use client"

import { useState } from "react"
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react"
import { Card } from "../kit/primitives"
import { POST_KIND_LABELS, friendsClient, postWhen, type PublicProfileFlag } from "../../lib/friends/client"
import type { FriendPost } from "../../lib/friends/types"
import { FriendAvatar } from "./FriendAvatar"
import { FriendLink } from "./FriendLink"

/**
 * One card in the vriendenkring feed - the same card the app draws: avatar,
 * name, "Mijlpaal · 2 u", the body, then heart / reaction / more.
 *
 * The heart answers the click and is put back if the server refuses, so the
 * one interaction people repeat never waits on a round trip.
 */
export function FriendPostCard({
  post,
  onChanged,
}: {
  post: FriendPost & PublicProfileFlag
  onChanged?: () => void
}) {
  const [liked, setLiked] = useState(post.likedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [commenting, setCommenting] = useState(false)
  const [comment, setComment] = useState("")
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [busy, setBusy] = useState(false)

  // The author as a linkable person: the post carries them under `authorId`,
  // not `userId`. `publicProfile` rides along for `authorHref` - the way on to
  // the opt-in tree page - but the byline links to `/vriendenkring/<id>`,
  // which needs no opt-in (see FriendLink).
  const authorName = post.authorName || "Een vriend"
  const author = { userId: post.authorId, publicProfile: post.publicProfile }

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
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <FriendLink
          person={author}
          name={authorName}
          className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <FriendAvatar name={post.authorName} image={post.authorImage} size={36} />
        </FriendLink>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">
            <FriendLink person={author}>{authorName}</FriendLink>
          </p>
          <p className="text-[12.5px] text-ink-faint">
            {POST_KIND_LABELS[post.kind] ?? "Deelde iets"} · {postWhen(post.createdAt)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Meer"
          className="press -mr-1 grid h-9 w-9 place-items-center rounded-full text-ink-faint outline-none hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          onClick={() => navigator.clipboard?.writeText(`${post.body}${post.reference ? `\n${post.reference}` : ""}`)}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="mt-2 pl-[48px]">
        {post.reference && (
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-teal-dark dark:text-teal-400">
            {post.reference}
          </p>
        )}
        {post.body && (
          <p className={`mt-1 text-[14px] leading-[1.55] text-ink ${post.kind === "verse" ? "font-medium" : ""}`}>
            {post.body}
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1 pl-[44px]">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Hart weghalen" : "Hart geven"}
          className="press inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-ink-faint outline-none hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <Heart size={17} className={liked ? "fill-current text-warn" : ""} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setCommenting((open) => !open)}
          aria-expanded={commenting}
          className="press inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-ink-faint outline-none hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <MessageCircle size={17} />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
      </div>

      {commenting && (
        <div className="mt-2 flex gap-2 pl-[48px]">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") sendComment()
            }}
            placeholder="Schrijf een reactie"
            className="min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          />
          <button
            type="button"
            onClick={sendComment}
            disabled={busy || comment.trim().length === 0}
            className="press rounded-btn bg-teal-dark px-3.5 text-[13.5px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] disabled:opacity-50"
          >
            Plaatsen
          </button>
        </div>
      )}
    </Card>
  )
}
