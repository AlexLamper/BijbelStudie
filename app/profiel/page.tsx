"use client"

import { useEffect, useState } from "react"
import { useSession, getSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Loader2, LogOut, Pencil, X } from "lucide-react"
import { BadgesDialog, BadgeRings, BADGE_TOTAL } from "../../components/profile/badges"
import ActivityFeed, { type ActivityFilter } from "../../components/profile/ActivityFeed"
import AppShell from "../../components/shell/AppShell"
import Tabs from "../../components/kit/Tabs"
import { Card, Pill, ProgressBar, Skeleton, StatCard } from "../../components/kit/primitives"
import { useLevensboom } from "../../hooks/useLevensboom"
import { useIsPro } from "../../hooks/useIsPro"
import AccountAvatar from "../../components/kit/AccountAvatar"
import TreeAvatar from "../../components/kit/TreeAvatar"
import { FreeMembershipPanel, ProMembershipPanel, type BillingInfo } from "../../components/profile/MembershipPanel"

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
 * Work column: who this is, four figures, and the activity card. Rail: Je boom,
 * Badges, the membership panel and Account; it stacks under the work below lg.
 *
 * Reads and writes: GET /api/user, PUT /api/user/update for the name and the
 * bio, and `updateSession()` after a rename so the sidebar does not keep the old
 * one. The level, the streak and the badge count come from `useLevensboom`.
 * One read-only extra for Pro accounts: GET /api/subscription/billing-state for
 * the plan and renewal date in the membership panel.
 *
 * Pro comes from `useIsPro` (the session's resolved entitlement), the same
 * source as the top bar and the sidebar - `/api/user`'s `subscribed` is only the
 * Stripe flag.
 */
export default function ProfilePage() {
  const { update: updateSession } = useSession()
  const router = useRouter()
  const { data: levensboom } = useLevensboom()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const [editing, setEditing] = useState<"name" | "bio" | null>(null)
  const [draftName, setDraftName] = useState("")
  const [draftBio, setDraftBio] = useState("")
  const [nameStatus, setNameStatus] = useState<Status>("idle")
  const [bioStatus, setBioStatus] = useState<Status>("idle")
  const [activityTab, setActivityTab] = useState<ActivityFilter>("all")
  const [badgesOpen, setBadgesOpen] = useState(false)

  const isPro = useIsPro()
  const [billing, setBilling] = useState<BillingInfo | null>(null)

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

  // Plan and renewal date for the membership panel - read-only, real Pro only.
  useEffect(() => {
    if (!mounted || !isPro) return
    let cancelled = false
    fetch("/api/subscription/billing-state")
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && data) setBilling(data as BillingInfo) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [mounted, isPro])

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
  const isAdmin = isPro && !!user?.isAdmin

  return (
    <AppShell title="Profiel">
      <div className="flex flex-col gap-4">
        <div className="flex min-h-full flex-col gap-5 lg:flex-row">
          {/* ── The work ─────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Card className="flex flex-none flex-col items-start gap-5 p-5 sm:flex-row">
              <AccountAvatar size={96} />

              <div className="min-w-0 w-full flex-1">
                {waiting ? (
                  <Skeleton className="h-8 w-64 max-w-full" />
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
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-teal text-white transition-opacity hover:opacity-90"
                    >
                      {nameStatus === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
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
                  <div className="flex items-center gap-[10px]">
                    <h2 className="truncate text-[22px] font-bold tracking-[-0.5px] text-ink sm:text-[26px]">{user?.name}</h2>
                    <button
                      type="button"
                      onClick={() => setEditing("name")}
                      aria-label="Naam bewerken"
                      className="flex-none rounded-[6px] p-1 text-ink-muted max-md:p-2 transition-colors hover:bg-line-soft hover:text-ink-body"
                    >
                      <Pencil size={17} />
                    </button>
                    {nameStatus === "error" && (
                      <span className="text-[12px] font-semibold text-danger">Opslaan mislukt</span>
                    )}
                  </div>
                )}

                <p className="mt-[5px] truncate text-[13.5px] text-ink-muted">{user?.email}</p>

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
                      className="font-semibold text-teal hover:text-teal-dark dark:hover:text-teal-bright"
                    >
                      {user?.bio ? "Bewerken" : "Toevoegen"}
                    </button>
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {isPro && (
                    <span
                      className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-900 px-3 py-[6px] text-[12.5px] font-semibold text-white dark:bg-teal-500/15 dark:text-ink"
                      style={{ boxShadow: "inset 0 0 0 1px rgba(45,212,191,.35)" }}
                    >
                      <span className="mr-[6px] text-[10.5px] uppercase tracking-[0.14em] text-teal-200">Pro</span>
                      {isAdmin ? "Beheerder" : "Lid"}
                    </span>
                  )}
                  {streak > 0 && <Pill tone="warn" label={`${streak} ${dayWord(streak)} reeks`} />}
                  {memberSince && <Pill label={`Lid sinds ${memberSince}`} />}
                </div>
              </div>
            </Card>

            <div className="grid flex-none grid-cols-2 gap-[13px] sm:grid-cols-4">
              <StatCard label="Leesreeks" value={waiting ? "-" : streak} />
              <StatCard label="Badges" value={waiting ? "-" : `${badgeCount}/${BADGE_TOTAL}`} />
              <StatCard label="Lessen afgerond" value={levensboom ? levensboom.lessonsCompleted : "-"} />
              <StatCard label="Studies afgerond" value={levensboom ? levensboom.studiesCompleted : "-"} />
            </div>

            <Card className="flex min-h-[320px] flex-1 flex-col overflow-hidden lg:min-h-0">
              <div className="flex h-[46px] flex-none items-stretch overflow-x-auto border-b border-line px-[18px]">
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

          {/* ── The rail ─────────────────────────────────────────────── */}
          <aside className="flex w-full flex-none flex-col gap-[13px] lg:w-[326px]">
            <Card className="flex-none p-[15px]">
              <div className="text-[14.5px] font-bold text-ink">Je boom</div>
              <div className="mt-3 h-px bg-line" />
              <div className="mt-[13px] flex justify-center">
                {/* The disc is a second way into the studio, next to "Naar je boom". The
                    focus ring is a box-shadow on a rounded-full link, so it follows the
                    circle instead of drawing a square outline. */}
                <Link
                  href="/profiel/boom"
                  aria-label="Open je boom"
                  className="flex cursor-pointer rounded-full outline-none transition-transform duration-150 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                  <TreeAvatar size={112} ring={4} level={level} levelStyle="dot" />
                </Link>
              </div>
              <div className="mt-[14px] text-center text-[14.5px] font-bold text-ink">
                {stageName ? `${stageName} · niveau ${level}` : `Niveau ${level}`}
              </div>
              <div className="mt-[3px] text-center text-[12.5px] text-ink-faint">nog {remainingXp} XP</div>
              <div className="mt-[13px] text-center">
                <Link href="/profiel/boom" className="text-[13px] font-semibold text-teal no-underline hover:text-teal-dark dark:hover:text-teal-bright">
                  Naar je boom →
                </Link>
              </div>
            </Card>

            <button
              type="button"
              onClick={() => setBadgesOpen(true)}
              aria-haspopup="dialog"
              className="flex-none rounded-card border border-line bg-surface p-[15px] text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
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
                <span className="text-[12.5px] font-semibold text-teal">Alle badges →</span>
              </span>
            </button>

            {/* Lidmaatschap - replaces the Abonnement card. */}
            {waiting ? (
              <Card className="flex-none p-[15px]">
                <Skeleton className="h-24 w-full" />
              </Card>
            ) : isPro ? (
              <ProMembershipPanel
                memberSince={memberSince}
                billing={billing}
                isAdmin={isAdmin}
              />
            ) : (
              <FreeMembershipPanel memberSince={memberSince} />
            )}

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
      </div>

      <BadgesDialog open={badgesOpen} onClose={() => setBadgesOpen(false)} earned={earnedBadges} />
    </AppShell>
  )
}

function InfoLine({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center py-2 ${last ? "" : "border-b border-line-soft"}`}>
      <span className="flex-1 text-[13px] text-ink-muted">{label}</span>
      <span className="text-[13px] font-bold text-ink">{value}</span>
    </div>
  )
}
