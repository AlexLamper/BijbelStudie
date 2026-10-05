"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, Skeleton } from "../kit/primitives"
import { feedCursor, friendsClient } from "../../lib/friends/client"
import type { FriendPost, FriendRequestsResponse, FriendsKring } from "../../lib/friends/types"
import { FriendPostCard } from "./FriendPostCard"
import { FriendRequestRow } from "./FriendRequestRow"
import { FriendRow } from "./FriendRow"
import { InviteFriendsCard } from "./InviteFriendsCard"
import { PeopleYouMayKnow } from "./PeopleYouMayKnow"

type Tab = "feed" | "vrienden" | "verzoeken"

const TABS: { key: Tab; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "vrienden", label: "Vrienden" },
  { key: "verzoeken", label: "Verzoeken" },
]

/**
 * /vriendenkring: the same three sections the app has, so a reader moving
 * between phone and browser finds the kring where they left it.
 *
 * Opening the page is what "gezien" means, so the badge is cleared once, here -
 * not on any click that happens to land in the feed.
 */
/**
 * One page of the feed. `FEED_PAGE_SIZE` in lib/friends/service.ts, repeated
 * rather than imported: that module pulls in mongoose. Asked for explicitly so
 * a short page is a reliable signal that there is nothing after it - with the
 * server's default the client would not know what "full" was.
 */
const PAGE = 20

export function VriendenkringView() {
  const [tab, setTab] = useState<Tab>("feed")
  /** The pages loaded so far, oldest page last - what the feed actually draws. */
  const [posts, setPosts] = useState<FriendPost[]>([])
  /** False once a page comes back short: there is nothing left to ask for. */
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [kring, setKring] = useState<FriendsKring | null>(null)
  const [requests, setRequests] = useState<FriendRequestsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [feedResult, kringResult, requestsResult] = await Promise.all([
      friendsClient.feed({ limit: PAGE }),
      friendsClient.kring(),
      friendsClient.requests(),
    ])
    if (feedResult.ok) {
      // A refresh (a new comment, an accepted verzoek) starts the feed over at
      // the first page. Appending here instead would duplicate every post that
      // is already on screen.
      setPosts(feedResult.data.posts)
      setMore(feedResult.data.posts.length >= PAGE)
    }
    if (kringResult.ok) setKring(kringResult.data)
    if (requestsResult.ok) setRequests(requestsResult.data)
    setLoading(false)
  }, [])

  /**
   * The next page, from the oldest post on screen. The cursor is read off the
   * rows rather than kept in state, so it can never point at a post that a
   * refresh has since dropped.
   */
  const loadMore = useCallback(async () => {
    const before = feedCursor(posts)
    if (!before || loadingMore) return
    setLoadingMore(true)
    const result = await friendsClient.feed({ limit: PAGE, before })
    setLoadingMore(false)
    if (!result.ok) return
    const page = result.data.posts
    setMore(page.length >= PAGE)
    if (page.length === 0) return
    // Guarded against a post that both pages contain - two posts written in
    // the same millisecond put one of them on either side of the cursor.
    setPosts((current) => {
      const seen = new Set(current.map((post) => post.id))
      return [...current, ...page.filter((post) => !seen.has(post.id))]
    })
  }, [posts, loadingMore])

  useEffect(() => {
    load().then(() => friendsClient.markSeen())
  }, [load])

  const pending = requests ? requests.incoming.length : (kring?.pendingIncoming ?? 0)
  const hasKring = Boolean(kring && kring.friends.length > 0)

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="mb-4 flex items-center gap-1 rounded-btn border border-line bg-sunken p-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-current={tab === item.key}
            className={`press flex-1 rounded-[7px] px-3 py-2 text-[13.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
              tab === item.key ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink-body"
            }`}
          >
            {item.label}
            {item.key === "verzoeken" && pending > 0 && (
              <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-teal px-1 text-[10.5px] font-bold text-white">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-28 w-full rounded-card" />
        </div>
      ) : tab === "feed" ? (
        posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <FriendPostCard key={post.id} post={post} onChanged={load} />
            ))}
            {more && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="press w-full rounded-btn border border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink-body outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
              >
                {loadingMore ? "Laden..." : "Meer laden"}
              </button>
            )}
          </div>
        ) : hasKring ? (
          <Card className="p-6 text-center">
            <p className="text-[14px] text-ink-faint">
              Nog niets te zien in je kring. Zodra iemand een studie afrondt of een tekst
              bewaart, staat het hier.
            </p>
          </Card>
        ) : (
          <InviteFriendsCard onJoined={load} />
        )
      ) : tab === "vrienden" ? (
        /* The kring, then who else the reader might know. The suggestions
           section hides itself when it has nothing - which includes a reader
           with no friends at all, since a friend-of-a-friend needs a friend
           first - so it can sit under both branches without a second check. */
        <div className="space-y-5">
          {hasKring ? (
            <Card className="divide-y divide-line">
              {kring!.friends.map((friend) => (
                <FriendRow key={friend.userId} friend={friend} onChanged={load} />
              ))}
            </Card>
          ) : (
            <InviteFriendsCard onJoined={load} />
          )}
          <PeopleYouMayKnow onInvited={load} />
        </div>
      ) : requests && (requests.incoming.length > 0 || requests.outgoing.length > 0) ? (
        <div className="space-y-4">
          {requests.incoming.length > 0 && (
            <Card className="divide-y divide-line">
              {requests.incoming.map((request) => (
                <FriendRequestRow key={request.id} request={request} direction="incoming" onChanged={load} />
              ))}
            </Card>
          )}
          {requests.outgoing.length > 0 && (
            <>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Verstuurd</h2>
              <Card className="divide-y divide-line">
                {requests.outgoing.map((request) => (
                  <FriendRequestRow key={request.id} request={request} direction="outgoing" onChanged={load} />
                ))}
              </Card>
            </>
          )}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-[14px] text-ink-faint">Geen open verzoeken.</p>
        </Card>
      )}
    </div>
  )
}
