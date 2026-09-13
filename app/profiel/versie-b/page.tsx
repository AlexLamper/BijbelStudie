"use client"

import { useEffect, useState } from "react"
import { useSession, getSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Loader2, LogOut, Pencil, X } from "lucide-react"
import { BadgesDialog, BadgeRings, BADGE_TOTAL } from "../../../components/profile/badges"
import ActivityFeed, { type ActivityFilter } from "../../../components/profile/ActivityFeed"
import AppShell from "../../../components/shell/AppShell"
import Tabs from "../../../components/kit/Tabs"
import { Card, Pill, ProgressBar, Skeleton, StatCard } from "../../../components/kit/primitives"
import { useLevensboom } from "../../../hooks/useLevensboom"
import { useIsPro } from "../../../hooks/useIsPro"
import { ChampagneFrame, ChampagneTree } from "./_components/ChampagneAvatar"
import { ProChip, ProStatusCard, type BillingState } from "./_components/ProStatusCard"
import { TEAL_DEEP } from "./_components/champagne"

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
type Preview = "pro" | "gratis"

/**
 * /profiel/versie-b - ontwerp B, "champagne".
 *
 * Een kopie van app/profiel/page.tsx met dezelfde gegevens en dezelfde
 * schrijfpaden (GET /api/user, PUT /api/user/update). Alleen de Pro-weergave is
 * anders: de avatar-ring, de PRO-pil, de Pro-chip in de kop en de
 * Abonnement-kaart - zie ./_components.
 *
 * Twee toevoegingen die de echte pagina niet heeft:
 *  - de voorbeeldschakelaar "Pro / Gratis", puur lokale state, zodat beide
 *    toestanden te beoordelen zijn los van de echte status;
 *  - één GET /api/subscription/billing-state (alleen lezen, alleen voor een
 *    echt Pro-account) voor plan en verlengdatum in de Pro-kaart.
 *
 * De bovenbalk en de zijbalk tekenen nog de gedeelde AccountAvatar; die zijn
 * bewust niet aangeraakt.
 */
export default function ProfileVersieBPage() {
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

  // design preview
  const realPro = useIsPro()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)

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

  // Plan and renewal date for the Pro card - read-only, real Pro accounts only.
  useEffect(() => {
    if (!mounted || !realPro) return
    let cancelled = false
    setBillingLoading(true)
    fetch("/api/subscription/billing-state")
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && data && !data.error) setBilling(data as BillingState) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBillingLoading(false) })
    return () => { cancelled = true }
  }, [mounted, realPro])

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

  // What this page draws: the preview toggle wins once touched, the session's
  // resolved entitlement until then.
  const isPro = preview ? preview === "pro" : realPro
  const sample = isPro && !realPro
  // Admin copy only when the admin is actually the one looking at their own
  // Pro state, not in a forced preview.
  const showAdmin = !!user?.isAdmin && realPro && !sample

  return (
    <AppShell title="Profiel">
      <div className="flex min-h-full flex-col gap-4">
        <PreviewToggle value={isPro ? "pro" : "gratis"} onChange={setPreview} />

        <div className="flex flex-1 flex-col gap-5 lg:flex-row">
          {/* ── The work ─────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Who this is */}
            <Card className="flex flex-none items-start gap-4 p-5 sm:gap-5">
              <ChampagneFrame size={96} pro={isPro} mark streak={levensboom?.streak ?? null} />

              <div className="min-w-0 flex-1">
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
                  {isPro && <ProChip label={showAdmin ? "Beheerder" : "Pro-lid"} />}
                  {streak > 0 && <Pill tone="warn" label={`${streak} ${dayWord(streak)} reeks`} />}
                  {memberSince && <Pill label={`Lid sinds ${memberSince}`} />}
                </div>
              </div>
            </Card>

            {/* The four figures this page can stand behind without a new fetch. */}
            <div className="grid flex-none grid-cols-2 gap-[13px] sm:flex">
              <StatCard className="flex-1" label="Leesreeks" value={waiting ? "-" : streak} />
              <StatCard className="flex-1" label="Badges" value={waiting ? "-" : `${badgeCount}/${BADGE_TOTAL}`} />
              <StatCard className="flex-1" label="Lessen afgerond" value={levensboom ? levensboom.lessonsCompleted : "-"} />
              <StatCard className="flex-1" label="Studies afgerond" value={levensboom ? levensboom.studiesCompleted : "-"} />
            </div>

            {/* Activity */}
            <Card className="flex min-h-[360px] flex-1 flex-col overflow-hidden lg:min-h-0">
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
            {/* Je boom */}
            <Card className="flex-none p-[15px]">
              <div className="text-[14.5px] font-bold text-ink">Je boom</div>
              <div className="mt-3 h-px bg-line" />
              <div className="mt-[13px] flex justify-center">
                <ChampagneTree size={112} pro={isPro} level={level} />
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

            {/* Badges */}
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

            {/* Abonnement */}
            <ProStatusCard
              pro={isPro}
              waiting={waiting}
              isAdmin={showAdmin}
              billing={billing}
              billingLoading={billingLoading && !sample}
              sample={sample}
            />

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

/** One label/value row in the Account card, with a hairline under it. */
function InfoLine({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center py-2 ${last ? "" : "border-b border-line-soft"}`}>
      <span className="flex-1 text-[13px] text-ink-muted">{label}</span>
      <span className="text-[13px] font-bold text-ink">{value}</span>
    </div>
  )
}

/**
 * Beoordelingsbalk: welk ontwerp dit is, en een schakelaar om Pro en Gratis te
 * vergelijken. Alleen lokale weergave - er wordt niets opgeslagen of verstuurd.
 */
function PreviewToggle({ value, onChange }: { value: Preview; onChange: (v: Preview) => void }) {
  const options: { value: Preview; label: string }[] = [
    { value: "pro", label: "Pro" },
    { value: "gratis", label: "Gratis" },
  ]
  return (
    <div className="flex flex-none flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-dashed border-line-strong bg-white px-4 py-[10px]">
      <span className="text-[12.5px] font-semibold text-ink">Ontwerp B · champagne</span>
      <span className="hidden text-[12.5px] text-ink-faint sm:inline">Alleen de weergave wisselt, je account niet.</span>
      <div className="ml-auto flex items-center gap-2">
        <span id="voorbeeld-label" className="text-[12.5px] text-ink-muted">Voorbeeld</span>
        <div role="radiogroup" aria-labelledby="voorbeeld-label" className="flex rounded-full border border-line bg-line-soft p-[3px]">
          {options.map(o => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(o.value)}
                className={`h-7 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
                  active ? "bg-white shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "text-ink-muted hover:text-ink-body"
                }`}
                style={active ? { color: TEAL_DEEP } : undefined}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
