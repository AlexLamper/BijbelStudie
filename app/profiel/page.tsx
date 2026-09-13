"use client"

import { useEffect, useState } from "react"
import { useSession, getSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Loader2, LogOut, Pencil, X } from "lucide-react"
import { BadgesDialog, BadgeRings, BADGE_TOTAL } from "../../components/profile/badges"
import ActivityFeed, { type ActivityFilter } from "../../components/profile/ActivityFeed"
import AppShell from "../../components/shell/AppShell"
import TreeAvatar from "../../components/kit/TreeAvatar"
import AccountAvatar from "../../components/kit/AccountAvatar"
import Tabs from "../../components/kit/Tabs"
import { Card, Pill, ProgressBar, Skeleton, StatCard } from "../../components/kit/primitives"
import { ProBadge } from "../../components/ui/ProBadge"
import { useLevensboom } from "../../hooks/useLevensboom"
import { useIsPro } from "../../hooks/useIsPro"

interface UserData {
  _id: string
  name: string
  email: string
  bio?: string
  image?: string
  subscribed?: boolean
  stripeSubscriptionId?: string
  isAdmin?: boolean
  badges?: string[]
  streak?: number
  createdAt?: string
}

type Status = "idle" | "saving" | "success" | "error"

/**
 * /profiel (design_handoff_web/PAGES.md §6).
 *
 * Work column: who this is, four figures, and the activity card. Rail: four
 * cards of one width - Je boom, Badges, Abonnement, Account.
 *
 * Nothing about what this page reads or writes moved: the same GET /api/user,
 * the same PUT /api/user/update for the name and the bio, and the same
 * `updateSession()` after a rename so the sidebar does not keep the old one.
 * The level, the streak and the badge count come from `useLevensboom`, which
 * the root layout already mounts for the top bar - so they cost no request.
 *
 * THREE FIGURES THE DESIGN ASKS FOR HAVE NO SOURCE HERE, and RULES.md forbids
 * adding a fetch to get them: bookmarks (web has no bookmark store at all),
 * the note count (/api/notes) and books opened (/api/user/reading-progress).
 * Rather than print three zeros that would be wrong, the four tiles show the
 * four figures this page can actually stand behind. Say the word and the two
 * fetches can be added.
 *
 * THE ACTIVITY CARD has no activity stream behind it - nothing on the web
 * records one - so it shows the nearest real thing: the reader's own notes and
 * markings, from the same GET /api/notes the /notities page reads. That one
 * extra request lives in `components/profile/ActivityFeed`, not here.
 */
export default function ProfilePage() {
  const { update: updateSession } = useSession()
  const router = useRouter()
  const { data: levensboom } = useLevensboom()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // editing state
  const [editing, setEditing] = useState<"name" | "bio" | null>(null)
  const [draftName, setDraftName] = useState("")
  const [draftBio, setDraftBio] = useState("")
  const [nameStatus, setNameStatus] = useState<Status>("idle")
  const [bioStatus, setBioStatus] = useState<Status>("idle")
  const [activityTab, setActivityTab] = useState<ActivityFilter>("all")
  const [badgesOpen, setBadgesOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    async function fetchUserData() {
      try {
        const session = await getSession()
        if (!session?.user) {
          router.push("/inloggen")
          return
        }
        const res = await fetch("/api/user")
        if (!res.ok) throw new Error("Profiel kon niet worden geladen")
        const data = await res.json()
        if (!data.user) throw new Error("Gebruiker niet gevonden")
        setUser(data.user)
        setDraftName(data.user.name || "")
        setDraftBio(data.user.bio || "")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Onbekende fout")
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [mounted, router])

  // auto-clear status indicators
  useEffect(() => {
    if (nameStatus === "success" || nameStatus === "error") {
      const t = setTimeout(() => setNameStatus("idle"), 2500)
      return () => clearTimeout(t)
    }
  }, [nameStatus])
  useEffect(() => {
    if (bioStatus === "success" || bioStatus === "error") {
      const t = setTimeout(() => setBioStatus("idle"), 2500)
      return () => clearTimeout(t)
    }
  }, [bioStatus])

  async function saveName() {
    if (!user) return
    const trimmed = draftName.trim()
    if (!trimmed) {
      setNameStatus("error")
      return
    }
    if (trimmed === user.name) {
      setEditing(null)
      return
    }
    setNameStatus("saving")
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, bio: user.bio || "" }),
      })
      if (!res.ok) throw new Error()
      setUser({ ...user, name: trimmed })
      // Saving to Mongo is not enough on its own: the client caches the session
      // until something asks it to refetch, so without this the sidebar and the
      // dashboard greeting kept the old name until a hard reload.
      await updateSession({ name: trimmed })
      setNameStatus("success")
      setEditing(null)
    } catch {
      setNameStatus("error")
    }
  }

  async function saveBio() {
    if (!user) return
    const trimmed = draftBio.trim()
    if (trimmed === (user.bio || "")) {
      setEditing(null)
      return
    }
    setBioStatus("saving")
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, bio: trimmed }),
      })
      if (!res.ok) throw new Error()
      setUser({ ...user, bio: trimmed })
      setBioStatus("success")
      setEditing(null)
    } catch {
      setBioStatus("error")
    }
  }

  function cancelEdit() {
    if (!user) return
    setDraftName(user.name || "")
    setDraftBio(user.bio || "")
    setEditing(null)
    setNameStatus("idle")
    setBioStatus("idle")
  }

  const waiting = !mounted || loading

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
    : null
  const earnedBadges = user?.badges || []
  const badgeCount = earnedBadges.length
  const streak = user?.streak ?? levensboom?.streak ?? 0
  const level = levensboom?.level ?? 1
  const stageName = levensboom?.levensboom?.stage?.name ?? null
  const remainingXp = levensboom ? Math.max(0, levensboom.xpForNextLevel - levensboom.xpIntoLevel) : 0
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")
  // The session's resolved entitlement, the same source the top bar and the
  // sidebar read. `/api/user`'s `subscribed` is only the Stripe flag, so an App
  // Store subscriber was Pro in the shell and "Upgrade naar Pro" here.
  const isPro = useIsPro()

  return (
    <AppShell title="Profiel">
      <div className="flex min-h-full gap-5">
        {/* ── The work ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Who this is */}
          <Card className="flex flex-none items-start gap-5 p-5">
            <AccountAvatar size={96} />

            <div className="min-w-0 flex-1">
              {waiting ? (
                <Skeleton className="h-8 w-64" />
              ) : editing === "name" ? (
                <div className="flex items-center gap-2">
                  <input
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") cancelEdit() }}
                    autoFocus
                    aria-label="Je naam"
                    className="h-10 min-w-0 flex-1 rounded-btn border border-line px-3 text-[20px] font-bold text-ink outline-none focus-visible:border-teal"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    aria-label="Naam opslaan"
                    className="flex h-9 w-9 items-center justify-center rounded-btn bg-teal text-white transition-opacity hover:opacity-90"
                  >
                    {nameStatus === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    aria-label="Annuleren"
                    className="flex h-9 w-9 items-center justify-center rounded-btn border border-line text-ink-muted transition-colors hover:bg-line-soft"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-[10px]">
                  <h2 className="truncate text-[26px] font-bold tracking-[-0.5px] text-ink">{user?.name}</h2>
                  <button
                    type="button"
                    onClick={() => setEditing("name")}
                    aria-label="Naam bewerken"
                    className="flex-none rounded-[6px] p-1 text-ink-muted transition-colors hover:bg-line-soft hover:text-ink-body"
                  >
                    <Pencil size={17} />
                  </button>
                  {nameStatus === "error" && (
                    <span className="text-[12px] font-semibold text-danger">Opslaan mislukt</span>
                  )}
                </div>
              )}

              <p className="mt-[5px] truncate text-[13.5px] text-ink-muted">{user?.email}</p>

              {/* The bio has no place of its own in the design, so it lives
                  under the address - one line, with the same inline edit. */}
              {editing === "bio" ? (
                <div className="mt-3 flex items-start gap-2">
                  <textarea
                    value={draftBio}
                    onChange={e => setDraftBio(e.target.value)}
                    rows={2}
                    autoFocus
                    aria-label="Over jou"
                    className="min-w-0 flex-1 resize-none rounded-btn border border-line px-3 py-2 text-[13.5px] text-ink outline-none focus-visible:border-teal"
                  />
                  <button
                    type="button"
                    onClick={saveBio}
                    aria-label="Bio opslaan"
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-teal text-white transition-opacity hover:opacity-90"
                  >
                    {bioStatus === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    aria-label="Annuleren"
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-btn border border-line text-ink-muted transition-colors hover:bg-line-soft"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[13px] leading-[1.6] text-ink-body">
                  {user?.bio || <span className="text-ink-faint">Nog geen korte beschrijving.</span>}{" "}
                  <button
                    type="button"
                    onClick={() => setEditing("bio")}
                    className="font-semibold text-teal hover:text-teal-dark"
                  >
                    {user?.bio ? "Bewerken" : "Toevoegen"}
                  </button>
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {isPro && (
                  <ProBadge
                    tone="soft"
                    size="md"
                    className="self-center"
                    label={user?.isAdmin ? "Admin toegang" : "Pro actief"}
                  />
                )}
                {streak > 0 && <Pill tone="warn" label={`${streak} ${dayWord(streak)} reeks`} />}
                {memberSince && <Pill label={`Lid sinds ${memberSince}`} />}
              </div>
            </div>
          </Card>

          {/* The four figures this page can stand behind without a new fetch. */}
          <div className="flex flex-none gap-[13px]">
            <StatCard className="flex-1" label="Leesreeks" value={waiting ? "-" : streak} />
            <StatCard className="flex-1" label="Badges" value={waiting ? "-" : `${badgeCount}/${BADGE_TOTAL}`} />
            <StatCard className="flex-1" label="Lessen afgerond" value={levensboom ? levensboom.lessonsCompleted : "-"} />
            <StatCard className="flex-1" label="Studies afgerond" value={levensboom ? levensboom.studiesCompleted : "-"} />
          </div>

          {/* Activity */}
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex h-[46px] flex-none items-stretch border-b border-line px-[18px]">
              <Tabs
                items={[
                  { value: "all", label: "Alle activiteit" },
                  { value: "highlights", label: "Markeringen" },
                  { value: "notes", label: "Notities" },
                ]}
                value={activityTab}
                onChange={value => setActivityTab(value as ActivityFilter)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ActivityFeed filter={activityTab} name={user?.name} />
            </div>
          </Card>

          {error && (
            <Card className="flex-none p-5">
              <p className="text-[13.5px] text-danger">{error}</p>
            </Card>
          )}
        </div>

        {/* ── The rail - four cards, all 326 px ────────────────────── */}
        <aside className="flex w-[326px] flex-none flex-col gap-[13px]">
          {/* Je boom */}
          <Card className="flex-none p-[15px]">
            <div className="text-[14.5px] font-bold text-ink">Je boom</div>
            <div className="mt-3 h-px bg-line" />
            <div className="mt-[13px] flex justify-center">
              <TreeAvatar size={112} ring={4} level={level} levelStyle="dot" />
            </div>
            <div className="mt-[14px] text-center text-[14.5px] font-bold text-ink">
              {stageName ? `${stageName} · niveau ${level}` : `Niveau ${level}`}
            </div>
            <div className="mt-[3px] text-center text-[12.5px] text-ink-faint">nog {remainingXp} XP</div>
            <div className="mt-[13px] text-center">
              <Link href="/profiel/boom" className="text-[13px] font-semibold text-teal no-underline hover:text-teal-dark">
                Naar je boom →
              </Link>
            </div>
          </Card>

          {/* Badges. The whole card is the control - the ring row is what it
              looks like at rest, the cabinet opens over the page. */}
          <button
            type="button"
            onClick={() => setBadgesOpen(true)}
            aria-haspopup="dialog"
            className="flex-none rounded-card border border-line bg-white p-[15px] text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {/* Spans throughout - a button may only hold phrasing content, and
                the card's rows are layout, not structure. */}
            <span className="flex items-baseline gap-2">
              <span className="flex-1 text-[14.5px] font-bold text-ink">Badges</span>
              <span className="text-[21px] font-bold text-ink tabular-nums">{badgeCount}</span>
              <span className="text-[12.5px] text-ink-faint">van {BADGE_TOTAL}</span>
            </span>
            <span className="mt-3 block h-px bg-line" />
            <span className="mt-[15px] block">
              <BadgeRings earned={earnedBadges} />
            </span>
            <span className="mt-[15px] flex items-center">
              <span className="flex-1 text-[12.5px] text-ink-body">
                {badgeCount === 0 ? "Nog geen badge verdiend" : `${BADGE_TOTAL - badgeCount} nog te verdienen`}
              </span>
              {/* A span, not a button: the card around it is already the button
                  and HTML has no nesting for that. */}
              <span className="text-[12.5px] font-semibold text-teal">Alle badges →</span>
            </span>
          </button>

          {/* Abonnement */}
          <Card className="flex-none p-[15px]">
            <div className="text-[14.5px] font-bold text-ink">Abonnement</div>
            <div className="mt-3 h-px bg-line" />
            {waiting ? (
              <Skeleton className="mt-4 h-14 w-full" />
            ) : isPro ? (
              <>
                <ProBadge
                  size="md"
                  className="mt-[15px]"
                  label={user?.isAdmin ? "Admin toegang" : "Pro actief"}
                />
                <p className="mt-3 text-[13px] leading-[1.6] text-ink-muted">
                  {user?.isAdmin
                    ? "Als admin heb je toegang tot alle Pro-functies."
                    : "Je hebt een actief Pro-abonnement met toegang tot alle premium functies."}
                </p>
                {!user?.isAdmin && (
                  <Link
                    href="/abonnement"
                    className="mt-[13px] inline-block text-[13px] font-semibold text-teal no-underline hover:text-teal-dark"
                  >
                    Beheer abonnement →
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="mt-[15px] text-[13px] leading-[1.6] text-ink-muted">
                  Upgrade naar Pro voor commentaren, de grondtekst en meer studiehulpmiddelen.
                </p>
                <Link
                  href="/abonnement"
                  className="mt-3 flex h-10 items-center justify-center rounded-btn bg-teal text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
                >
                  Upgrade naar Pro
                </Link>
              </>
            )}
          </Card>

          {/* Account */}
          <Card className="flex-none p-[15px]">
            <div className="text-[14.5px] font-bold text-ink">Account</div>
            <div className="mt-3 h-px bg-line" />
            <div className="mt-[6px]">
              <InfoLine label="Lid sinds" value={memberSince ?? "-"} />
              <InfoLine label="Dagelijkse reeks" value={waiting ? "-" : `${streak} ${dayWord(streak)}`} />
              <InfoLine label="Badges verdiend" value={waiting ? "-" : `${badgeCount}`} last />
            </div>
            {levensboom && (
              <div className="mt-3">
                <ProgressBar value={levensboom.progressPercentage} height={4} />
                <p className="mt-2 text-[11.5px] text-ink-faint tabular-nums">
                  {levensboom.xpIntoLevel} / {levensboom.xpForNextLevel} XP tot niveau {level + 1}
                </p>
              </div>
            )}

            {/* Uitloggen is the one thing TOKENS.md hands `danger` to besides a
                negative delta. Quiet - a full-width row, no fill - because it is
                the last thing in the card, not the point of it. */}
            <div className="mt-[13px] h-px bg-line" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-[10px] flex h-9 w-full items-center justify-center gap-2 rounded-btn text-[13px] font-semibold text-danger transition-colors hover:bg-line-soft"
            >
              <LogOut size={15} aria-hidden /> Uitloggen
            </button>
          </Card>
        </aside>
      </div>

      <BadgesDialog open={badgesOpen} onClose={() => setBadgesOpen(false)} earned={earnedBadges} />
    </AppShell>
  )
}

/** One label/value row in the Account card, with a hairline under it. */
function InfoLine({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center py-2 ${last ? "" : "border-b border-line-soft"}`}>
      <span className="flex-1 text-[13px] text-ink-muted">{label}</span>
      <span className="text-[13px] font-bold text-ink">{value}</span>
    </div>
  )
}
