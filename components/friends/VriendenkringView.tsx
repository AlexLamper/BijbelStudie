"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, Skeleton } from "../kit/primitives"
import { friendsClient } from "../../lib/friends/client"
import type { FriendRequestsResponse, FriendsFeed, FriendsKring } from "../../lib/friends/types"
import { FriendPostCard } from "./FriendPostCard"
import { FriendRequestRow } from "./FriendRequestRow"
import { FriendRow } from "./FriendRow"
import { InviteFriendsCard } from "./InviteFriendsCard"

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
export function VriendenkringView() {
  const [tab, setTab] = useState<Tab>("feed")
  const [feed, setFeed] = useState<FriendsFeed | null>(null)
  const [kring, setKring] = useState<FriendsKring | null>(null)
  const [requests, setRequests] = useState<FriendRequestsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [feedResult, kringResult, requestsResult] = await Promise.all([
      friendsClient.feed(),
      friendsClient.kring(),
      friendsClient.requests(),
    ])
    if (feedResult.ok) setFeed(feedResult.data)
    if (kringResult.ok) setKring(kringResult.data)
    if (requestsResult.ok) setRequests(requestsResult.data)
    setLoading(false)
  }, [])

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
        feed && feed.posts.length > 0 ? (
          <div className="space-y-3">
            {feed.posts.map((post) => (
              <FriendPostCard key={post.id} post={post} onChanged={load} />
            ))}
          </div>
        ) : hasKring ? (
          <Card className="p-6 text-center">
            <p className="text-[14px] text-ink-faint">
              Nog niets gedeeld in je kring. Deel zelf een tekst of een mijlpaal om te beginnen.
            </p>
          </Card>
        ) : (
          <InviteFriendsCard onJoined={load} />
        )
      ) : tab === "vrienden" ? (
        hasKring ? (
          <Card className="divide-y divide-line">
            {kring!.friends.map((friend) => (
              <FriendRow key={friend.userId} friend={friend} onChanged={load} />
            ))}
          </Card>
        ) : (
          <InviteFriendsCard onJoined={load} />
        )
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
