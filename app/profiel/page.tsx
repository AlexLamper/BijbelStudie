"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getSession } from "next-auth/react"
import { ArrowRight, Check, Loader2, X } from "lucide-react"
import UserBadges from "../../components/profile/badges"
import LevelCard from "../../components/profile/LevelCard"
import TreeAvatar from "../../components/levensboom/TreeAvatar"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { ProBadge } from "../../components/ui/ProBadge"
import SceneShell from "../../components/scene/SceneShell"
import { GlassStat, Panel, SceneSkeleton, SectionHeading } from "../../components/scene/pieces"
import { CTA_BRAND, CTA_PRIMARY, EYEBROW, TEAL_DEEP, TEAL_ON_DARK } from "../../components/scene/tokens"

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

/** The input and the textarea, on a scene panel rather than on a white card. */
const FIELD_INPUT =
  "w-full rounded-lg border border-white/25 bg-black/35 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus-visible:border-[#2DD4BF] focus-visible:ring-2 focus-visible:ring-[#2DD4BF]/50"

/** "Bewerken" / "Toevoegen": type only, with a real focus ring on the scene. */
const EDIT_LINK =
  "flex-shrink-0 rounded-md text-xs font-semibold outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-white"

/**
 * /profiel - the reader's own page, on the scene.
 *
 * Same three layers as the dashboard: the sky carries who this is, the horizon
 * the two standing figures the page already knew, and the desk the working
 * panels - the account fields, the level, the badges, the tree, the
 * subscription. The backdrop is `reader`, so the landscape behind all of it is
 * this reader's OWN tree; the round avatar in the right column is therefore
 * drawn `still`, because a page may mount exactly one animated canvas and the
 * shell already owns it.
 *
 * Nothing about what this page reads or writes moved: the same GET /api/user,
 * the same PUT /api/user/update for the name and the bio, the same
 * `updateSession()` after a rename so the navbar does not keep the old one.
 */
export default function ProfilePage() {
  // Only the updater is needed here; the page reads the user from /api/user.
  const { update: updateSession } = useSession()
  const router = useRouter()
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
      // until something asks it to refetch, so without this the navbar and the
      // dashboard greeting kept the old name until a hard reload. `update()`
      // refetches, which re-runs the session callback and reads the new name.
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
  const badgeCount = (user?.badges || []).length
  const streak = user?.streak || 0
  const dayWord = (n: number) => (n === 1 ? "dag" : "dagen")

  return (
    // The reader's own tree is the landscape here, so `backdrop="reader"`. The
    // shell owns the root, the scene, the scrims, the navbar, the rail and the
    // gutter - see components/scene/README.md.
    <SceneShell backdrop="reader" header rail>
      {/* -- Layer 1: the sky ------------------------------------------ */}
      <section
        aria-labelledby="profiel-titel"
        className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-between pb-32 pt-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {waiting || !memberSince ? (
            <span aria-hidden />
          ) : (
            <p className="text-sm text-white/80">Lid sinds {memberSince}</p>
          )}
          <div className="flex items-center gap-2">
            {user?.isAdmin && (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/25">
                Admin
              </span>
            )}
            {user?.subscribed && <ProBadge size="md" />}
          </div>
        </div>

        <div className="scene-sky max-w-[46rem]">
          {/* The one accent up here: the word that says which page this is. */}
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
            Profiel
          </p>

          {/* The heading is always in the tree, so the section's label is never
              a dangling reference and the page never lacks an h1 while the
              name is still being fetched. */}
          <h1
            id="profiel-titel"
            className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl xl:text-6xl"
          >
            {user ? <span className="content-in">{user.name}</span> : <span className="sr-only">Profiel</span>}
          </h1>
          {!user && <SceneSkeleton className="mt-3 h-14 w-[22rem] max-w-full" />}

          <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
            Beheer je accountgegevens en uiterlijk.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/profiel/boom" className={CTA_PRIMARY}>
              Bekijk je boom
              <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/abonnement"
              className="text-sm font-semibold no-underline underline-offset-4 hover:underline"
              style={{ color: TEAL_ON_DARK }}
            >
              Abonnement →
            </Link>
          </div>
        </div>

        {/* Keeps the button row clear of the numbers that break the fold. */}
        <div aria-hidden />
      </section>

      {/* -- Layer 2: the horizon -------------------------------------- */}
      <div className="scene-horizon -mt-24">
        <dl className="stagger-in grid max-w-[34rem] grid-cols-2 gap-3 lg:gap-4">
          <GlassStat label="Dagelijkse reeks" value={waiting ? null : `${streak}`} unit={dayWord(streak)} />
          <GlassStat
            label="Badges"
            value={waiting ? null : `${badgeCount}`}
            unit="verdiend"
          />
        </dl>
      </div>

      {/* -- Layer 3: the desk ----------------------------------------- */}
      <div className="grid w-full grid-cols-1 items-start gap-6 pb-20 pt-14 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">

        {error && !user ? (
          <Panel className="p-6" labelledBy="profiel-fout">
            <SectionHeading id="profiel-fout" title="Profiel laden mislukt" />
            <p className="mt-2 text-sm leading-relaxed text-white/80">{error}</p>
          </Panel>
        ) : (
          <>
            {/* --- The work column ------------------------------------ */}
            <div className="flex min-w-0 flex-col gap-6">

              {/* Accountgegevens */}
              <Panel className="p-5 sm:p-6" labelledBy="profiel-account">
                <SectionHeading id="profiel-account" title="Accountgegevens" rule />

                {waiting || !user ? (
                  <div className="mt-5 space-y-4">
                    <SceneSkeleton className="h-4 w-full" />
                    <SceneSkeleton className="h-4 w-4/5" />
                    <SceneSkeleton className="h-4 w-3/5" />
                  </div>
                ) : (
                  <div className="mt-5 divide-y divide-white/10">
                    {/* Name field */}
                    <FieldRow label="Gebruikersnaam">
                      {editing === "name" ? (
                        <div className="flex flex-1 items-center gap-2">
                          <label htmlFor="profiel-naam" className="sr-only">Gebruikersnaam</label>
                          <input
                            id="profiel-naam"
                            autoFocus
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveName()
                              if (e.key === "Escape") cancelEdit()
                            }}
                            className={FIELD_INPUT}
                            maxLength={60}
                          />
                          <button
                            onClick={saveName}
                            disabled={nameStatus === "saving"}
                            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                            style={{ backgroundColor: TEAL_DEEP }}
                            aria-label="Naam opslaan"
                            title="Opslaan"
                          >
                            {nameStatus === "saving"
                              ? <Loader2 size={14} aria-hidden className="animate-spin" />
                              : <Check size={14} aria-hidden />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                            aria-label="Bewerken annuleren"
                            title="Annuleren"
                          >
                            <X size={14} aria-hidden />
                          </button>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <p className="flex-1 truncate text-sm text-white">{user.name}</p>
                          {nameStatus === "success" && (
                            <span className="text-[11px] font-semibold" style={{ color: TEAL_ON_DARK }}>
                              Opgeslagen
                            </span>
                          )}
                          {nameStatus === "error" && (
                            <span className="text-[11px] font-semibold text-[#FCA5A5]">Mislukt</span>
                          )}
                          <button
                            onClick={() => setEditing("name")}
                            className={EDIT_LINK}
                            style={{ color: TEAL_ON_DARK }}
                          >
                            Bewerken
                          </button>
                        </div>
                      )}
                    </FieldRow>

                    {/* Email field */}
                    <FieldRow label="E-mailadres" hint="Kan niet worden gewijzigd">
                      <p className="truncate text-sm text-white/75">{user.email}</p>
                    </FieldRow>

                    {/* Bio field */}
                    <FieldRow label="Over jou" align="start">
                      {editing === "bio" ? (
                        <div className="flex-1 space-y-2">
                          <label htmlFor="profiel-bio" className="sr-only">Over jou</label>
                          <textarea
                            id="profiel-bio"
                            autoFocus
                            value={draftBio}
                            onChange={(e) => setDraftBio(e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="Vertel iets over jezelf..."
                            className={`${FIELD_INPUT} resize-none py-2`}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveBio}
                              disabled={bioStatus === "saving"}
                              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                              style={{ backgroundColor: TEAL_DEEP }}
                            >
                              {bioStatus === "saving" && <Loader2 size={12} aria-hidden className="animate-spin" />}
                              Opslaan
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                            >
                              Annuleren
                            </button>
                            <span className="ml-auto text-[11px] tabular-nums text-white/60">{draftBio.length}/500</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <p className={`flex-1 text-sm leading-relaxed ${user.bio ? "text-white/85" : "italic text-white/55"}`}>
                            {user.bio || "Nog geen biografie. Voeg er een toe om jezelf voor te stellen."}
                          </p>
                          {bioStatus === "success" && (
                            <span className="text-[11px] font-semibold" style={{ color: TEAL_ON_DARK }}>
                              Opgeslagen
                            </span>
                          )}
                          <button
                            onClick={() => setEditing("bio")}
                            className={EDIT_LINK}
                            style={{ color: TEAL_ON_DARK }}
                          >
                            {user.bio ? "Bewerken" : "Toevoegen"}
                          </button>
                        </div>
                      )}
                    </FieldRow>
                  </div>
                )}
              </Panel>

              {/* Niveau - fetches its own summary, so it appears when it can. */}
              <LevelCard />

              {/* Badges */}
              <Panel className="p-5 sm:p-6" labelledBy="profiel-badges">
                <SectionHeading
                  id="profiel-badges"
                  title="Jouw badges"
                  subtitle="Verdien badges door je dagelijkse studie en mijlpalen te bereiken."
                  rule
                />
                <div className="mt-5">
                  {waiting || !user ? (
                    <SceneSkeleton className="h-24 w-full rounded-xl" />
                  ) : (
                    <UserBadges earned={user.badges || []} />
                  )}
                </div>
              </Panel>
            </div>

            {/* --- The side column ------------------------------------ */}
            <div className="flex flex-col gap-6">

              {/* Je boom, as the profile picture. There is no photo upload any
                  more: the tree is the picture. The initials circle - or the
                  image an OAuth provider already gave us - only stands in while
                  the tree loads or when it has been switched off.

                  `still`: the shell's backdrop is already this reader's tree,
                  animated, and one page may mount exactly one animated canvas
                  (components/scene/README.md). */}
              <Panel className="flex flex-col items-center px-5 py-6" labelledBy="profiel-boom">
                <SectionHeading id="profiel-boom" title="Je boom" className="w-full" rule />
                <div className="mt-6">
                  <TreeAvatar
                    size={132}
                    still
                    fallback={
                      <Avatar className="h-28 w-28 ring-2 ring-white/25">
                        <AvatarImage src={user?.image || ""} alt={user?.name || ""} className="object-cover" />
                        <AvatarFallback
                          className="text-2xl font-semibold text-white"
                          style={{ backgroundColor: "rgba(13,148,136,0.35)" }}
                        >
                          {user?.name?.charAt(0)?.toUpperCase() || "G"}
                        </AvatarFallback>
                      </Avatar>
                    }
                  />
                </div>
              </Panel>

              {/* Abonnement */}
              <Panel className="p-5 sm:p-6" labelledBy="profiel-abonnement">
                <SectionHeading id="profiel-abonnement" title="Abonnement" rule />
                <div className="mt-4">
                  {waiting || !user ? (
                    <SceneSkeleton className="h-16 w-full" />
                  ) : user.subscribed || user.isAdmin ? (
                    <div className="space-y-3">
                      {user.isAdmin ? (
                        <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
                          Admin toegang
                        </span>
                      ) : (
                        <ProBadge size="md" label="Pro actief" />
                      )}
                      <p className="text-xs leading-relaxed text-white/75">
                        {user.isAdmin
                          ? "Als admin heb je toegang tot alle Pro-functies."
                          : "Je hebt een actief Pro-abonnement met toegang tot alle premium functies."}
                      </p>
                      {user.stripeSubscriptionId && !user.isAdmin && (
                        <p className="break-all font-mono text-[10px] text-white/55">
                          ID: {user.stripeSubscriptionId}
                        </p>
                      )}
                      {!user.isAdmin && (
                        <Link
                          href="/abonnement"
                          className="inline-flex rounded-md text-xs font-semibold no-underline underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white"
                          style={{ color: TEAL_ON_DARK }}
                        >
                          Beheer abonnement →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs leading-relaxed text-white/75">
                        Upgrade naar Pro voor commentaren, historische context en meer studiehulpmiddelen.
                      </p>
                      <Link
                        href="/abonnement"
                        className={`w-full ${CTA_BRAND}`}
                        style={{ backgroundColor: TEAL_DEEP }}
                      >
                        Upgrade naar Pro
                      </Link>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Account */}
              <Panel className="p-5" labelledBy="profiel-overzicht">
                <SectionHeading id="profiel-overzicht" title="Account" rule />
                <dl className="mt-4 space-y-2.5">
                  {memberSince && <InfoLine label="Lid sinds" value={memberSince} />}
                  <InfoLine
                    label="Dagelijkse reeks"
                    value={waiting ? "—" : `${streak} ${dayWord(streak)}`}
                  />
                  <InfoLine label="Badges verdiend" value={waiting ? "—" : `${badgeCount}`} />
                </dl>
              </Panel>
            </div>
          </>
        )}
      </div>
    </SceneShell>
  )
}

/**
 * One labelled row in the account panel. The label keeps its own column from
 * `sm` up and stacks below it, so a long value never has to share a line with
 * a truncated label.
 */
function FieldRow({
  label, hint, children, align = "center",
}: {
  label: string
  hint?: string
  children: React.ReactNode
  align?: "center" | "start"
}) {
  return (
    <div
      className={`flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:gap-4 ${
        align === "start" ? "sm:items-start" : "sm:items-center"
      }`}
    >
      <div className="flex-shrink-0 sm:w-40">
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-white/55">{hint}</p>}
      </div>
      <div className="w-full min-w-0 flex-1">{children}</div>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="text-white/60">{label}</dt>
      <dd className="m-0 font-semibold tabular-nums text-white">{value}</dd>
    </div>
  )
}
