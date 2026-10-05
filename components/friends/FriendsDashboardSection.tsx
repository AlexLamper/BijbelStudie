"use client"

import { useCallback, useEffect, useState } from "react"
import { SectionHeading, Skeleton } from "../kit/primitives"
import { friendsClient } from "../../lib/friends/client"
import type { FriendsFeed } from "../../lib/friends/types"
import { FriendPostCard } from "./FriendPostCard"
import { InviteFriendsCard } from "./InviteFriendsCard"

/**
 * "Bij je vrienden" on the dashboard: the two newest posts in the kring, in
 * the same card the Vriendenkring page uses, or the invitation when there is
 * no kring yet. Mirrors the app's Start tab, which shows the same two.
 *
 * Renders nothing at all while the feed has not answered yet - a reader with
 * friends must not see "nodig vrienden uit" flash by first.
 */
export function FriendsDashboardSection({ maxPosts = 2 }: { maxPosts?: number }) {
  const [feed, setFeed] = useState<FriendsFeed | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const result = await friendsClient.feed({ limit: maxPosts })
    if (result.ok) setFeed(result.data)
    setLoading(false)
  }, [maxPosts])

  useEffect(() => {
    load()
  }, [load])

  const posts = feed ? feed.posts.slice(0, maxPosts) : []

  return (
    <>
      <SectionHeading title="Bij je vrienden" action={{ label: "Alles bekijken", href: "/vriendenkring" }} />
      {loading ? (
        <Skeleton className="h-28 w-full rounded-card" />
      ) : posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <FriendPostCard key={post.id} post={post} onChanged={load} />
          ))}
        </div>
      ) : (
        <InviteFriendsCard onJoined={load} />
      )}
    </>
  )
}
