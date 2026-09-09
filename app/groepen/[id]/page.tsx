"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Lock, Globe, Copy, Check, ArrowLeft, LogOut } from "lucide-react"
import DiscussieTab  from "./_DiscussieTab"
import NotitiesTab   from "./_NotitiesTab"
import VoortgangTab  from "./_VoortgangTab"
import LedenTab      from "./_LedenTab"
import SceneShell from "../../../components/scene/SceneShell"
import { Panel, SectionHeading } from "../../../components/scene/pieces"
import { EYEBROW, TEAL_DEEP, TEAL_ON_DARK, TILE } from "../../../components/scene/tokens"

/* ── Types ─────────────────────────────────────────────────────── */
interface Member       { _id: string; name: string; image?: string }
interface GroupMember  { userId: Member; role: string; joinedAt: string }
interface Assignment   { book: string; chapter: number; title: string; dueDate?: string; setBy?: Member; setAt: string }
interface Challenge    { title: string; type: "chapters"|"notes"; target: number; startDate: string; endDate: string }
interface Group {
  _id: string; name: string; description: string
  isPublic: boolean; inviteCode?: string
  createdBy: Member; members: GroupMember[]
  weeklyAssignment?: Assignment | null
  challenge?: Challenge | null
  createdAt: string
}

type Tab = "discussie" | "notities" | "voortgang" | "leden"

/** A field on the landscape: quiet glass, white type, a real focus ring. */
const SCENE_FIELD =
  "w-full rounded-md border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none transition-colors placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-white"

/* ── Helpers ────────────────────────────────────────────────────── */
/**
 * `h-${size} w-${size}` never worked: Tailwind reads class names as literal
 * text and generates nothing for a spliced-in value, so every avatar fell back
 * to its intrinsic size. The dimension is an inline style now.
 */
function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const px = size * 4
  return (
    <span
      aria-hidden
      className="flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ backgroundColor: TEAL_DEEP, height: px, width: px, fontSize: size <= 7 ? 10 : 12 }}
    >
      {initials}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
}

/* ── Weekly Assignment sidebar panel ───────────────────────────── */
function AssignmentCard({
  assignment, groupId, isLeader, onUpdate,
}: {
  assignment: Assignment | null | undefined
  groupId: string
  isLeader: boolean
  onUpdate: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [book, setBook]         = useState("")
  const [chapter, setChapter]   = useState("")
  const [title, setTitle]       = useState("")
  const [dueDate, setDueDate]   = useState("")
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    if (!book.trim() || !chapter.trim()) return
    setSaving(true)
    await fetch(`/api/groepen/${groupId}/assignment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book: book.trim(), chapter: parseInt(chapter), title: title.trim(), dueDate: dueDate || undefined }),
    })
    setSaving(false)
    setShowForm(false)
    setBook(""); setChapter(""); setTitle(""); setDueDate("")
    onUpdate()
  }

  const handleDelete = async () => {
    await fetch(`/api/groepen/${groupId}/assignment`, { method: "DELETE" })
    onUpdate()
  }

  return (
    <Panel className="p-5" labelledBy="groep-opdracht">
      <SectionHeading id="groep-opdracht" title="Wekelijkse opdracht" />

      {assignment ? (
        <>
          <p className="mt-3 text-sm font-semibold text-white">
            {assignment.book} {assignment.chapter}{assignment.title ? ` - ${assignment.title}` : ""}
          </p>
          {assignment.dueDate && (
            <p className="mt-0.5 text-xs text-white/60">Deadline: {formatDate(assignment.dueDate)}</p>
          )}
          <Link
            href={`/study?book=${encodeURIComponent(assignment.book)}&chapter=${assignment.chapter}&version=statenvertaling`}
            className="press mt-3 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white no-underline outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"
            style={{ backgroundColor: TEAL_DEEP }}>
            Lees nu
          </Link>
          {isLeader && (
            <div className="mt-3 flex items-center gap-4">
              <button onClick={() => setShowForm(true)}
                className="rounded text-xs font-medium text-white/60 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white">
                Wijzigen
              </button>
              <button onClick={handleDelete}
                className="rounded text-xs font-medium text-red-300 outline-none transition-colors hover:text-red-200 focus-visible:ring-2 focus-visible:ring-white">
                Verwijderen
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-xs text-white/60">Geen opdracht ingesteld.</p>
      )}

      {isLeader && (!assignment || showForm) && (
        <div className="mt-3 space-y-2 border-t border-white/15 pt-3">
          {showForm && <p className="text-xs font-semibold text-white/70">Nieuwe opdracht</p>}
          <label htmlFor="opdracht-boek" className="sr-only">Boek</label>
          <input id="opdracht-boek" value={book} onChange={e => setBook(e.target.value)} placeholder="Boek (bijv. Psalmen)"
            className={SCENE_FIELD} />
          <label htmlFor="opdracht-hoofdstuk" className="sr-only">Hoofdstuk</label>
          <input id="opdracht-hoofdstuk" type="number" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="Hoofdstuk"
            className={SCENE_FIELD} />
          <label htmlFor="opdracht-titel" className="sr-only">Titel (optioneel)</label>
          <input id="opdracht-titel" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (optioneel)"
            className={SCENE_FIELD} />
          <label htmlFor="opdracht-deadline" className="sr-only">Deadline</label>
          <input id="opdracht-deadline" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className={`${SCENE_FIELD} [color-scheme:dark]`} />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !book.trim() || !chapter.trim()}
              className="press flex-1 rounded-md py-1.5 text-xs font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: TEAL_DEEP }}>
              {saving ? "..." : "Opslaan"}
            </button>
            {showForm && (
              <button onClick={() => setShowForm(false)}
                className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white">
                Annuleren
              </button>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
/**
 * One group, in the shared immersive shell.
 *
 * The sky carries the group's name and the two things you do to a group you are
 * in - copy the code, leave it. The horizon carries the tab bar, which is what
 * a returning member reaches for first. The desk carries the tab itself and the
 * standing panels beside it.
 *
 * The four tabs (_DiscussieTab, _NotitiesTab, _VoortgangTab, _LedenTab) are
 * drawn for a white page. Rather than fork four files, they render inside a
 * `dark` scope - the same trick the scene header uses - so every theme token
 * inside them resolves to its light-on-dark value against the landscape.
 *
 * Nothing about the data changed: the same GET /api/groepen/[id], the same
 * /api/user lookup for the current user's id, the same assignment POST/DELETE,
 * the same leave POST with the same confirm wording, and the same push back to
 * /groepen when the group cannot be read.
 */
export default function GroupDetailPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const { data: session } = useSession()

  const [group, setGroup]           = useState<Group | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<Tab>("discussie")
  const [copied, setCopied]         = useState(false)
  const [leaving, setLeaving]       = useState(false)
  const [currentUserId, setCurrentUserId] = useState("")

  const fetchGroup = useCallback(async () => {
    const res = await fetch(`/api/groepen/${params.id}`)
    if (!res.ok) { router.push("/groepen"); return }
    const d = await res.json()
    setGroup(d.group)
  }, [params.id, router])

  useEffect(() => {
    setLoading(true)
    fetchGroup().finally(() => setLoading(false))
  }, [fetchGroup])

  // Derive current user id from session + members list
  useEffect(() => {
    if (!session?.user?.email || !group) return
    // Fetch minimal user info to get the _id
    fetch("/api/user")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?._id) setCurrentUserId(d.user._id) })
      .catch(() => {})
  }, [session, group])

  const currentUserRole: "leader" | "member" | null = group?.members.find(
    m => m.userId._id === currentUserId
  )?.role as "leader" | "member" | null ?? null

  const handleCopyCode = () => {
    if (!group?.inviteCode) return
    navigator.clipboard.writeText(group.inviteCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleLeave = async () => {
    if (!confirm("Weet u zeker dat u de groep wilt verlaten?")) return
    setLeaving(true)
    const res = await fetch(`/api/groepen/${params.id}/leave`, { method: "POST" })
    if (res.ok) router.push("/groepen")
    else setLeaving(false)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "discussie",  label: "Discussie" },
    { id: "notities",   label: "Notities" },
    { id: "voortgang",  label: "Voortgang" },
    { id: "leden",      label: "Leden" },
  ]

  if (loading) {
    return (
      <SceneShell backdrop="reader" header rail>
        <div className="space-y-4 pb-24 pt-8" role="status" aria-label="Groep laden">
          <div className="skeleton-pulse h-3 w-40 rounded bg-white/15" />
          <div className="skeleton-pulse h-9 w-72 max-w-full rounded bg-white/20" />
          <div className="skeleton-pulse h-4 w-96 max-w-full rounded bg-white/10" />
          <div className="skeleton-pulse mt-6 h-10 w-80 max-w-full rounded-xl bg-white/10" />
        </div>
      </SceneShell>
    )
  }

  if (!group) return null

  return (
    <SceneShell backdrop="reader" header rail>
      {/* -- The sky ---------------------------------------------------- */}
      <section aria-labelledby="groep-titel" className="pb-10 pt-6">
        <div className="scene-sky">
          <Link href="/groepen"
            className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-white/70 no-underline underline-offset-4 outline-none transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white">
            <ArrowLeft size={12} aria-hidden /> Terug naar groepen
          </Link>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="min-w-0 max-w-[42rem]">
              <p className={`${EYEBROW} flex items-center gap-1.5`} style={{ color: TEAL_ON_DARK }}>
                {/* Identifies who can see the group - a data type, not decoration. */}
                {group.isPublic
                  ? <Globe size={11} aria-hidden />
                  : <Lock size={11} aria-hidden />}
                {group.isPublic ? "Openbare groep" : "Privégroep"}
              </p>
              <h1 id="groep-titel" className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {group.name}
              </h1>
              {group.description && (
                <p className="mt-3 text-sm leading-relaxed text-white/80">{group.description}</p>
              )}
              <p className="mt-3 text-xs text-white/60">
                {group.members.length} {group.members.length === 1 ? "lid" : "leden"}
                <span aria-hidden> · </span>
                Aangemaakt {formatDate(group.createdAt)}
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {group.inviteCode && (
                <button onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs font-semibold text-white outline-none transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white">
                  {copied
                    ? <Check size={12} aria-hidden style={{ color: TEAL_ON_DARK }} />
                    : <Copy size={12} aria-hidden />}
                  {copied ? "Gekopieerd" : group.inviteCode}
                </button>
              )}
              <button onClick={handleLeave} disabled={leaving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs font-semibold text-red-200 outline-none transition-colors hover:bg-black/50 hover:text-red-100 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50">
                <LogOut size={12} aria-hidden />
                Verlaten
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* -- The horizon: the tab bar ----------------------------------- */}
      <div className="scene-horizon">
        <div className={`flex w-fit max-w-full gap-1 overflow-x-auto p-1.5 shadow-lg shadow-black/20 ${TILE}`}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                activeTab === tab.id ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* -- The desk --------------------------------------------------- */}
      <div className="grid grid-cols-1 items-start gap-6 pb-24 pt-12 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* The four tabs are drawn for a white page. `dark` scopes them so every
            theme token inside resolves to its light-on-dark value, the same way
            the scene header does it - rather than forking four files. */}
        <div className="dark min-w-0">
          {activeTab === "discussie" && currentUserId && (
            <DiscussieTab
              groupId={params.id}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole ?? "member"}
              currentUserName={session?.user?.name ?? "Gebruiker"}
            />
          )}
          {activeTab === "notities" && (
            <NotitiesTab groupId={params.id} />
          )}
          {activeTab === "voortgang" && (
            <VoortgangTab groupId={params.id} />
          )}
          {activeTab === "leden" && (
            <LedenTab
              group={group}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onGroupUpdate={fetchGroup}
            />
          )}
        </div>

        {/* The standing panels beside it */}
        <div className="space-y-4">
          <Panel className="p-5" labelledBy="groep-over">
            <SectionHeading id="groep-over" title="Over deze groep" />
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar name={group.createdBy.name} size={6} />
              <div className="min-w-0">
                <p className="text-xs text-white/60">Aangemaakt door</p>
                <p className="truncate text-sm font-semibold text-white">{group.createdBy.name}</p>
              </div>
            </div>
          </Panel>

          <AssignmentCard
            assignment={group.weeklyAssignment}
            groupId={params.id}
            isLeader={currentUserRole === "leader"}
            onUpdate={fetchGroup}
          />

          {group.challenge && new Date(group.challenge.endDate) > new Date() && (
            <Panel className="p-5" labelledBy="groep-uitdaging">
              <SectionHeading id="groep-uitdaging" title="Groepsuitdaging" />
              <p className="mt-3 text-sm font-semibold text-white">{group.challenge.title}</p>
              <p className="mt-0.5 text-xs text-white/70">
                Doel: {group.challenge.target} {group.challenge.type === "chapters" ? "hoofdstukken" : "notities"}
              </p>
              <p className="mt-0.5 text-xs text-white/60">
                Tot {formatDate(group.challenge.endDate)}
              </p>
            </Panel>
          )}
        </div>
      </div>
    </SceneShell>
  )
}
