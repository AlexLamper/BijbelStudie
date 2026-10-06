"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, Skeleton } from "../kit/primitives"
import { feedCursor, friendsClient } from "../../lib/friends/client"
import type {
  DiscoverPost,
  FriendPost,
  FriendRequestsResponse,
  FriendSummary,
  TrendingShare,
} from "../../lib/friends/types"
import { FriendPostCard } from "./FriendPostCard"
import { InviteCard } from "./InviteCard"
import { KringCard } from "./KringCard"
import { RequestsCard } from "./RequestsCard"
import { SuggestionsCard } from "./SuggestionsCard"
import { TrendingCard } from "./TrendingCard"

/**
 * /vriendenkring: one feed column and one 360 px column of cards, under two
 * text tabs.
 *
 * The page used to be a narrow centre column with Feed / Vrienden / Verzoeken
 * as three tabs, which meant the kring and the open requests - the two things
 * a reader comes here to act on - were each a click away and never on screen
 * at the same time as the feed. They are cards in the right column now, and
 * the tabs are what they should always have been: whose posts am I reading,
 * my friends' or everyone's.
 *
 * Both tabs draw the same post card and page the same way; switching one
 * swaps the contents of both columns and nothing else. The feed is one column,
 * always: posts side by side turn a conversation into a noticeboard.
 */

type Tab = "vrienden" | "ontdek"

/**
 * One page of either feed. `FEED_PAGE_SIZE` in lib/friends/service.ts,
 * repeated rather than imported because that module pulls in mongoose. Asked
 * for explicitly so a short page is a reliable signal that there is nothing
 * after it - with the server's default the client would not know what "full"
 * was.
 */
const PAGE = 20

/** The chips on Ontdek. The value is the API's `kind`, never the label. */
const FILTERS: { key: string; label: string }[] = [
  { key: "alles", label: "Alles" },
  { key: "verse", label: "Verzen" },
  { key: "note", label: "Notities" },
  { key: "milestone", label: "Mijlpalen" },
  { key: "study", label: "Studies" },
]

/** `?tab=ontdek` is the only value worth putting in the URL; Vrienden is home. */
function tabFromSearch(search: string): Tab {
  return new URLSearchParams(search).get("tab") === "ontdek" ? "ontdek" : "vrienden"
}

export function VriendenkringView() {
  const [tab, setTab] = useState<Tab>("vrienden")

  /* ── Vrienden ─────────────────────────────────────────────────────────── */
  const [posts, setPosts] = useState<FriendPost[]>([])
  const [hasFriends, setHasFriends] = useState(false)
  const [moreFriends, setMoreFriends] = useState(false)
  const [kring, setKring] = useState<FriendSummary[]>([])
  const [requests, setRequests] = useState<FriendRequestsResponse | null>(null)
  const [loadingFriends, setLoadingFriends] = useState(true)

  /* ── Ontdek ───────────────────────────────────────────────────────────── */
  const [discovered, setDiscovered] = useState<DiscoverPost[]>([])
  const [trending, setTrending] = useState<TrendingShare[]>([])
  const [filter, setFilter] = useState("alles")
  const [moreDiscover, setMoreDiscover] = useState(false)
  const [loadingDiscover, setLoadingDiscover] = useState(true)
  /** Ids invited from a post card in this session, so the link can say so. */
  const [invited, setInvited] = useState<string[]>([])

  const [paging, setPaging] = useState(false)

  /**
   * The tab the URL asked for, read once from the address bar rather than
   * through `useSearchParams`: this component is already client-only inside
   * the shell, and reading it here keeps the page out of the Suspense dance a
   * search-params hook would require.
   */
  useEffect(() => {
    setTab(tabFromSearch(window.location.search))
  }, [])

  function openTab(next: Tab) {
    setTab(next)
    const url = new URL(window.location.href)
    if (next === "ontdek") url.searchParams.set("tab", "ontdek")
    else url.searchParams.delete("tab")
    // `replaceState`, not a push: flipping a tab is not a place to come back
    // to with the back button.
    window.history.replaceState(null, "", `${url.pathname}${url.search}`)
  }

  const loadFriends = useCallback(async () => {
    const [feed, kringResult, requestsResult] = await Promise.all([
      friendsClient.feed({ limit: PAGE }),
      friendsClient.kring(),
      friendsClient.requests(),
    ])
    if (feed.ok) {
      // A refresh (a new reaction, an accepted verzoek) starts the feed over at
      // the first page. Appending here would duplicate every post on screen.
      setPosts(feed.data.posts)
      setHasFriends(feed.data.hasFriends)
      setMoreFriends(feed.data.posts.length >= PAGE)
    }
    if (kringResult.ok) setKring(kringResult.data.friends)
    if (requestsResult.ok) setRequests(requestsResult.data)
    setLoadingFriends(false)
  }, [])

  const loadDiscover = useCallback(async (kind: string) => {
    setLoadingDiscover(true)
    const result = await friendsClient.discover({ limit: PAGE, kind })
    setLoadingDiscover(false)
    if (!result.ok) return
    setDiscovered(result.data.posts)
    setMoreDiscover(result.data.posts.length >= PAGE)
    // `trending` rides along with the first page only, so a chip that filters
    // the feed leaves the week's list where it was.
    if (result.data.trending.length > 0) setTrending(result.data.trending)
  }, [])

  useEffect(() => {
    void loadFriends().then(() => friendsClient.markSeen())
  }, [loadFriends])

  useEffect(() => {
    if (tab === "ontdek") void loadDiscover(filter)
  }, [tab, filter, loadDiscover])

  /**
   * The next page of whichever feed is open, from the oldest post on screen.
   *
   * The cursor is read off the rows rather than kept in state, so it can never
   * point at a post a refresh has since dropped. A post that both pages
   * contain - two written in the same millisecond land on either side of the
   * cursor - is dropped by id.
   */
  const loadMore = useCallback(async () => {
    if (paging) return
    const current: { id: string; createdAt: string }[] = tab === "ontdek" ? discovered : posts
    const before = feedCursor(current)
    if (!before) return
    setPaging(true)
    if (tab === "ontdek") {
      const result = await friendsClient.discover({ limit: PAGE, before, kind: filter })
      setPaging(false)
      if (!result.ok) return
      const page = result.data.posts
      setMoreDiscover(page.length >= PAGE)
      if (page.length === 0) return
      setDiscovered((rows) => {
        const seen = new Set(rows.map((row) => row.id))
        return [...rows, ...page.filter((row) => !seen.has(row.id))]
      })
    } else {
      const result = await friendsClient.feed({ limit: PAGE, before })
      setPaging(false)
      if (!result.ok) return
      const page = result.data.posts
      setMoreFriends(page.length >= PAGE)
      if (page.length === 0) return
      setPosts((rows) => {
        const seen = new Set(rows.map((row) => row.id))
        return [...rows, ...page.filter((row) => !seen.has(row.id))]
      })
    }
  }, [tab, paging, posts, discovered, filter])

  /**
   * Infinite scroll, with the button as its own fallback.
   *
   * The sentinel sits under the last card; when it comes into view the next
   * page is asked for. The button below it stays, because an observer that
   * never fires (a short list, a browser that will not) must not be the only
   * way forward.
   */
  const sentinel = useRef<HTMLDivElement | null>(null)
  const hasMore = tab === "ontdek" ? moreDiscover : moreFriends
  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      // A screen of lead time, so the next page is usually there before the
      // reader reaches the end of this one.
      { rootMargin: "600px 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  async function invite(userId: string) {
    const result = await friendsClient.invite({ userId, source: "link" })
    if (!result.ok) return
    setInvited((current) => (current.includes(userId) ? current : [...current, userId]))
  }

  const incoming = requests?.incoming ?? []
  const loading = tab === "ontdek" ? loadingDiscover && discovered.length === 0 : loadingFriends

  const skeleton = (
    <>
      <Skeleton className="h-[132px] w-full rounded-card" />
      <Skeleton className="h-[132px] w-full rounded-card" />
      <Skeleton className="h-[132px] w-full rounded-card" />
    </>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid gap-8 px-10 pt-7 max-[1100px]:px-6 max-md:px-4 max-md:pt-5 min-[1101px]:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── The feed, one column, never two ───────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex gap-[26px] border-b border-line">
            {(
              [
                { key: "vrienden", label: "Vrienden" },
                { key: "ontdek", label: "Ontdek" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openTab(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                className={`relative -mb-px pb-[10px] text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                  tab === item.key ? "font-bold text-ink" : "font-semibold text-ink-faint hover:text-ink-body"
                }`}
              >
                {item.label}
                {tab === item.key && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full"
                    style={{ backgroundColor: "#0D9488" }}
                  />
                )}
              </button>
            ))}
          </div>

          {tab === "ontdek" && (
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((chip) => {
                const active = filter === chip.key
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setFilter(chip.key)}
                    aria-pressed={active}
                    className={`press inline-flex h-8 items-center rounded-full px-[13px] text-[12.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                      active
                        ? "bg-ink text-surface"
                        : "border border-line bg-surface text-ink-body hover:bg-line-soft"
                    }`}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
          )}

          {loading ? (
            skeleton
          ) : tab === "vrienden" ? (
            posts.length > 0 ? (
              posts.map((post) => <FriendPostCard key={post.id} post={post} onChanged={loadFriends} />)
            ) : hasFriends ? (
              <Card className="p-6 text-center">
                <p className="text-[14px] text-ink-faint">
                  Nog niets te zien in je kring. Zodra iemand een studie afrondt of een tekst
                  bewaart, staat het hier.
                </p>
              </Card>
            ) : (
              // No friends at all: the invitation replaces the feed. It
              // explains and points right, rather than repeating the link and
              // the code field that already stand in the column beside it -
              // two copies of one input on one screen is a question about
              // which one counts.
              <Card className="px-[18px] py-5">
                <h2 className="text-[15px] font-bold text-ink">Lees samen met vrienden</h2>
                <p className="mt-1 text-[13.5px] leading-[1.6] text-ink-faint">
                  Zie waar je vrienden lezen, moedig elkaar aan en vier elkaars mijlpalen. Deel de
                  uitnodigingslink hiernaast, of vul de code in die een vriend je gaf. In de app
                  kun je ook je contacten laten zoeken wie BijbelStudie al gebruikt.
                </p>
              </Card>
            )
          ) : discovered.length > 0 ? (
            discovered.map((post) => (
              <FriendPostCard
                key={post.id}
                post={post}
                canInvite={post.canInvite && !invited.includes(post.authorId)}
                invited={invited.includes(post.authorId)}
                onInvite={(userId) => void invite(userId)}
              />
            ))
          ) : filter !== "alles" ? (
            <p className="py-2 text-[13.5px] text-ink-faint">Nog niets gedeeld in deze categorie.</p>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-[14px] text-ink-faint">
                Er is nog niets openbaar gedeeld. Zet Openbaar delen aan in Instellingen om zelf
                de eerste te zijn.
              </p>
            </Card>
          )}

          <div ref={sentinel} aria-hidden="true" />
          {hasMore && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={paging}
              className="press w-full rounded-btn border border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink-body outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:opacity-50"
            >
              {paging ? "Laden..." : "Meer laden"}
            </button>
          )}
          {/* The feed ends above the shell's edge rather than against it. */}
          <div className="h-8" aria-hidden="true" />
        </div>

        {/* ── The column of things to act on ────────────────────────────── */}
        <aside className="flex min-w-0 flex-col gap-4 min-[1101px]:w-[360px]">
          {tab === "vrienden" ? (
            <>
              <InviteCard onJoined={loadFriends} />
              <RequestsCard requests={incoming} onChanged={loadFriends} />
              <KringCard friends={kring} />
            </>
          ) : (
            <>
              <SuggestionsCard onInvited={loadFriends} />
              <TrendingCard shares={trending} />
            </>
          )}
          <div className="h-4" aria-hidden="true" />
        </aside>
      </div>
    </div>
  )
}
