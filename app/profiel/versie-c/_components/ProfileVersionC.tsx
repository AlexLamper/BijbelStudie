"use client"

import { useEffect, useState } from "react"
import { useSession, getSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, ChevronRight, Loader2, LogOut, Pencil, X } from "lucide-react"
import { BadgesDialog, BadgeRings, BADGE_TOTAL } from "../../../../components/profile/badges"
import ActivityFeed, { type ActivityFilter } from "../../../../components/profile/ActivityFeed"
import AppShell from "../../../../components/shell/AppShell"
import Tabs from "../../../../components/kit/Tabs"
import { Card, Pill, ProgressBar, Skeleton, StatCard } from "../../../../components/kit/primitives"
import { useLevensboom } from "../../../../hooks/useLevensboom"
import { useIsPro } from "../../../../hooks/useIsPro"
import { MemberFrame } from "./MemberAvatar"
import MembershipCard from "./MembershipCard"

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
  subscriptionInterval?: "monthly" | "annual" | null
  subscriptionStartedAt?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
  storePremium?: boolean
  storePremiumPlatform?: "apple" | "google" | null
  storePremiumExpiresAt?: string | null
}

type Status = "idle" | "saving" | "success" | "error"
type Preview = "pro" | "free"

const monthYear = (d: string) => new Date(d).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
const fullDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })

/**
 * /profiel/versie-c - ontwerp C, "lidmaatschapskaart".
 *
 * A copy of app/profiel/page.tsx with the same fetches (GET /api/user, PUT
 * /api/user/update, `updateSession()` after a rename) and the same content.
 * Only the Pro visuals differ: layered ring + seal on the avatar, an editorial
 * status line under the name, and a membership card in the Abonnement card.
 *
 * The preview toggle is local state only. It starts at the real entitlement
 * (`useIsPro`) and changes nothing but what this page draws.
 */
export default function ProfileVersionC() {
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

  const realPro = useIsPro()
  const [preview, setPreview] = useState<Preview | null>(null)
  const isPro = preview ? preview === "pro" : realPro

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

  const memberSince = user?.createdAt ? monthYear(user.createdAt) : null
  // Pro since: when the current subscription started, falling back to the
  // account's own start for App Store / admin / preview accounts that have none.
  const proSince = user?.subscriptionStartedAt ? monthYear(user.subscriptionStartedAt) : memberSince
  const earnedBadges = user?.badges || []
  const badgeCount = earnedBadges.length
  const streak = user?.streak ?? levensboom?.streak ?? 0
  const level = levensboom?.level ?? 1
  const stageName = levensboom?.levensboom?.stage?.name ?? null
  const remainingXp = levensboom ? Math.max(0, levensboom.xpForNextLevel - levensboom.xpIntoLevel) : 0
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  const plan = user?.isAdmin
    ? "Admin"
    : user?.subscriptionInterval === "annual"
      ? "Jaarlijks"
      : user?.subscriptionInterval === "monthly"
        ? "Maandelijks"
        : user?.storePremiumPlatform === "apple"
          ? "App Store"
          : user?.storePremiumPlatform === "google"
            ? "Google Play"
            : "Pro"
  const periodEnd = user?.currentPeriodEnd ?? user?.storePremiumExpiresAt ?? null

  return (
    <AppShell title="Profiel">
      {/* Design-review control. Not part of the design itself. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Ontwerp C</span>
        <span className="h-3 w-px bg-line-strong" aria-hidden />
        <div role="group" aria-label="Voorbeeld" className="flex items-center gap-2">
          <span className="text-[12.5px] text-ink-muted">Voorbeeld:</span>
          <div className="inline-flex rounded-full border border-line bg-white p-[3px]">
            {(["pro", "free"] as const).map(v => {
              const active = (preview ?? (realPro ? "pro" : "free")) === v
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPreview(v)}
                  className={`h-7 rounded-full px-3 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                    active ? "text-white" : "text-ink-muted hover:text-ink"
                  }`}
                  style={active ? { backgroundColor: "#0F766E" } : undefined}
                >
                  {v === "pro" ? "Pro" : "Gratis"}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex min-h-full flex-col gap-5 lg:flex-row">
        {/* ── The work ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card className="flex flex-none flex-col items-start gap-5 p-5 sm:flex-row">
            <MemberFrame size={96} pro={isPro} seal streak={levensboom?.streak ?? null} />

            <div className="min-w-0 flex-1 self-stretch">
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

              {/* Status line: the tier as a small-caps word, a hairline, then
                  the date - set like a byline, not a row of chips. */}
              {!waiting && (
                <div className="mt-[6px] flex items-center gap-[10px] leading-none">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isPro ? "" : "text-ink-faint"}`}
                    style={isPro ? { color: "#0F766E" } : undefined}
                  >
                    {isPro ? (user?.isAdmin ? "Pro · Admin" : "Pro") : "Gratis"}
                  </span>
                  <span aria-hidden className="h-[13px] w-px" style={{ backgroundColor: isPro ? "#99F6E4" : "#E5E7EB" }} />
                  <span className="truncate text-[12.5px] text-ink-muted">
                    {isPro ? `Pro-lid sinds ${proSince ?? "-"}` : `Lid sinds ${memberSince ?? "-"}`}
                  </span>
                </div>
              )}

              <p className="mt-[9px] truncate text-[13.5px] text-ink-muted">{user?.email}</p>

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

              {streak > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone="warn" label={`${streak} ${dayWord(streak)} reeks`} />
                </div>
              )}
            </div>
          </Card>

          <div className="grid flex-none grid-cols-2 gap-[13px] sm:grid-cols-4">
            <StatCard label="Leesreeks" value={waiting ? "-" : streak} />
            <StatCard label="Badges" value={waiting ? "-" : `${badgeCount}/${BADGE_TOTAL}`} />
            <StatCard label="Lessen afgerond" value={levensboom ? levensboom.lessonsCompleted : "-"} />
            <StatCard label="Studies afgerond" value={levensboom ? levensboom.studiesCompleted : "-"} />
          </div>

          <Card className="flex min-h-[320px] flex-1 flex-col overflow-hidden">
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
          {/* Abonnement moves to the top of the rail: the card is the Pro mark. */}
          <Card className="flex-none p-[15px]">
            <div className="flex items-baseline">
              <div className="flex-1 text-[14.5px] font-bold text-ink">{isPro ? "Lidmaatschap" : "Word Pro"}</div>
              {!isPro && <span className="text-[12px] text-ink-faint">Gratis account</span>}
            </div>
            <div className="mt-3 h-px bg-line" />
            {waiting ? (
              <Skeleton className="mt-4 w-full rounded-[14px]" style={{ aspectRatio: "1.586 / 1" }} />
            ) : isPro ? (
              <>
                <div className="mt-[15px] flex justify-center">
                  <MembershipCard name={user?.name || "-"} since={proSince} plan={plan} />
                </div>
                <dl className="mt-[10px]">
                  <DetailRow label="Plan" value={user?.isAdmin ? "Admin toegang" : plan === "Pro" ? "Pro" : `Pro · ${plan}`} />
                  <DetailRow
                    label="Status"
                    value={user?.cancelAtPeriodEnd ? "Loopt af" : "Actief"}
                    accent={!user?.cancelAtPeriodEnd}
                  />
                  {!user?.isAdmin && periodEnd && (
                    <DetailRow
                      label={user?.cancelAtPeriodEnd ? "Toegang tot" : "Verlengt op"}
                      value={fullDate(periodEnd)}
                    />
                  )}
                </dl>
                {user?.isAdmin ? (
                  <p className="mt-2 text-[12.5px] leading-[1.6] text-ink-muted">
                    Als admin heb je toegang tot alle Pro-functies.
                  </p>
                ) : (
                  <Link
                    href="/abonnement"
                    className="-mx-[6px] mt-[2px] flex h-10 items-center rounded-btn px-[6px] text-[13px] font-semibold text-ink no-underline transition-colors hover:bg-line-soft"
                  >
                    <span className="flex-1">Abonnement beheren</span>
                    <ChevronRight size={16} className="text-ink-faint" aria-hidden />
                  </Link>
                )}
              </>
            ) : (
              <>
                <div className="mt-[15px] flex justify-center">
                  <MembershipCard name={user?.name || "Jouw naam"} since={null} plan="-" muted />
                </div>
                <p className="mt-[14px] text-[13px] leading-[1.6] text-ink-muted">
                  Met Pro krijg je commentaren, de grondtekst en meer studiehulpmiddelen.
                </p>
                <Link
                  href="/abonnement"
                  className="mt-3 flex h-10 items-center justify-center rounded-btn text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#0F766E" }}
                >
                  Word Pro
                </Link>
              </>
            )}
          </Card>

          {/* Je boom */}
          <Card className="flex-none p-[15px]">
            <div className="text-[14.5px] font-bold text-ink">Je boom</div>
            <div className="mt-3 h-px bg-line" />
            <div className="mt-[13px] flex justify-center">
              <MemberFrame size={112} pro={isPro}>
                <LevelDot size={112} level={level} />
              </MemberFrame>
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

          <button
            type="button"
            onClick={() => setBadgesOpen(true)}
            aria-haspopup="dialog"
            className="flex-none rounded-card border border-line bg-white p-[15px] text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
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

      <BadgesDialog open={badgesOpen} onClose={() => setBadgesOpen(false)} earned={earnedBadges} />
    </AppShell>
  )
}

/** The level marker from components/kit/TreeAvatar's `dot` style, unchanged. */
function LevelDot({ size, level }: { size: number; level: number }) {
  const dot = Math.round(size * 0.31)
  return (
    <span
      className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full bg-gold font-bold text-gold-ink tabular-nums"
      style={{
        width: dot,
        height: dot,
        fontSize: Math.max(10, Math.round(dot * 0.45)),
        border: "2.5px solid var(--surface)",
      }}
    >
      {level}
    </span>
  )
}

/** One row of the plan details under the membership card. */
function DetailRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center border-b border-line-soft py-2">
      <dt className="flex-1 text-[13px] text-ink-muted">{label}</dt>
      <dd className="text-[13px] font-semibold text-ink" style={accent ? { color: "#0F766E" } : undefined}>
        {value}
      </dd>
    </div>
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
