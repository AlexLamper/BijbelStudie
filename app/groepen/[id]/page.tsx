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
import AppShell from "../../../components/shell/AppShell"
import { Card, Skeleton } from "../../../components/kit/primitives"

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

/**
 * #0D9488 is 3.7:1 on white - short of AA as small type and as a ground for
 * white type. Teal type is teal-dark on the light surface, teal-400 on the dark
 * one; a filled button with white type is teal-dark (5.5:1).
 */
const TEAL_TEXT = "text-teal-dark dark:text-teal-400"

const BTN_PRIMARY =
  "press inline-flex items-center justify-center gap-1.5 rounded-btn bg-teal-dark font-semibold text-white no-underline outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"

const BTN_SECONDARY =
  "press inline-flex items-center justify-center gap-1.5 rounded-btn border border-line bg-surface font-semibold text-ink-body outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:cursor-not-allowed disabled:opacity-50"

/** A field in the sidebar cards - the /notities rail's field shape. */
const FIELD =
  "h-9 w-full rounded-[9px] border border-line bg-surface px-[11px] text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-teal max-md:h-11 max-md:text-base"

/** A rail card's title, as on /notities. */
const CARD_TITLE = "text-[14px] font-semibold text-ink"

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
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-teal-dark font-bold text-white"
      style={{ height: px, width: px, fontSize: size <= 7 ? 10 : 12 }}
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
    <Card className="p-[18px]">
      <section aria-labelledby="groep-opdracht">
        <h3 id="groep-opdracht" className={CARD_TITLE}>Wekelijkse opdracht</h3>

        {assignment ? (
          <>
            <p className="mt-2.5 text-[13.5px] font-semibold text-ink">
              {assignment.book} {assignment.chapter}{assignment.title ? ` - ${assignment.title}` : ""}
            </p>
            {assignment.dueDate && (
              <p className="mt-0.5 text-[12px] text-ink-faint">Deadline: {formatDate(assignment.dueDate)}</p>
            )}
            <Link
              href={`/lezen?book=${encodeURIComponent(assignment.book)}&chapter=${assignment.chapter}&version=statenvertaling`}
              className={`${BTN_PRIMARY} mt-3 h-9 px-3.5 text-[13px] max-md:h-10 max-md:px-4 max-md:text-sm`}>
              Lees nu
            </Link>
            {isLeader && (
              <div className="mt-3 flex items-center gap-4">
                <button onClick={() => setShowForm(true)}
                  className="rounded text-[12.5px] font-medium text-ink-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-[#0D9488] max-md:min-h-10">
                  Wijzigen
                </button>
                <button onClick={handleDelete}
                  className="rounded text-[12.5px] font-medium text-danger outline-none transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0D9488] max-md:min-h-10">
                  Verwijderen
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2.5 text-[12.5px] text-ink-muted">Geen opdracht ingesteld.</p>
        )}

        {isLeader && (!assignment || showForm) && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            {showForm && <p className="text-[12px] font-semibold text-ink-body">Nieuwe opdracht</p>}
            <label htmlFor="opdracht-boek" className="sr-only">Boek</label>
            <input id="opdracht-boek" value={book} onChange={e => setBook(e.target.value)} placeholder="Boek (bijv. Psalmen)"
              className={FIELD} />
            <label htmlFor="opdracht-hoofdstuk" className="sr-only">Hoofdstuk</label>
            <input id="opdracht-hoofdstuk" type="number" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="Hoofdstuk"
              className={FIELD} />
            <label htmlFor="opdracht-titel" className="sr-only">Titel (optioneel)</label>
            <input id="opdracht-titel" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (optioneel)"
              className={FIELD} />
            <label htmlFor="opdracht-deadline" className="sr-only">Deadline</label>
            <input id="opdracht-deadline" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className={`${FIELD} dark:[color-scheme:dark]`} />
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !book.trim() || !chapter.trim()}
                className={`${BTN_PRIMARY} h-9 flex-1 text-[13px] max-md:h-11 max-md:text-sm`}>
                {saving ? "..." : "Opslaan"}
              </button>
              {showForm && (
                <button onClick={() => setShowForm(false)}
                  className={`${BTN_SECONDARY} h-9 px-3 text-[13px] max-md:h-11 max-md:text-sm`}>
                  Annuleren
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </Card>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
/**
 * One group, in the shared app shell (components/shell/AppShell.tsx), the same
 * sidebar-and-top-bar frame as /groepen itself. The top bar keeps "Groepen" as
 * the title, so the sidebar row and the bar agree; the group's own name is the
 * first heading in the body.
 *
 * The intro carries the group's name and the two things you do to a group you
 * are in - copy the code, leave it. Under it the tab bar, then the tab itself
 * with the standing cards beside it.
 *
 * The four tabs (_DiscussieTab, _NotitiesTab, _VoortgangTab, _LedenTab) render
 * straight on the page ground now. They used to sit inside a `dark` scope so
 * their theme tokens resolved light-on-dark against the landscape; on the
 * shell's light ground they use the app's own tokens and follow the reader's
 * theme like every other page.
 *
 * A signed-out visitor never reaches this component: app/groepen/layout.tsx
 * answers them with the GuestGate in the same shell.
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
      <AppShell title="Groepen">
        <div className="max-w-[72rem]" role="status" aria-label="Groep laden">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-8 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <Skeleton className="mt-6 h-10 w-80 max-w-full" />
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Skeleton className="h-[320px] rounded-card" />
            <Skeleton className="h-[180px] rounded-card max-xl:hidden" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!group) return null

  return (
    <AppShell title="Groepen">
      <div className="max-w-[72rem]">
        {/* -- The intro --------------------------------------------------- */}
        {/* The top bar already carries the page's h1, so the intro starts at h2. */}
        <section aria-labelledby="groep-titel">
          <Link href="/groepen"
            className="inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-semibold text-ink-muted no-underline underline-offset-4 outline-none transition-colors hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-[#0D9488] max-md:min-h-10">
            <ArrowLeft size={13} aria-hidden /> Terug naar groepen
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0 max-w-[42rem]">
              <p className={`flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[1.1px] ${TEAL_TEXT}`}>
                {/* Identifies who can see the group - a data type, not decoration. */}
                {group.isPublic
                  ? <Globe size={11} aria-hidden />
                  : <Lock size={11} aria-hidden />}
                {group.isPublic ? "Openbare groep" : "Privégroep"}
              </p>
              <h2 id="groep-titel" className="mt-2 break-words text-[24px] font-bold leading-tight tracking-[-0.4px] text-ink">
                {group.name}
              </h2>
              {group.description && (
                <p className="mt-2 break-words text-[14px] leading-relaxed text-ink-muted">{group.description}</p>
              )}
              <p className="mt-2 text-[12.5px] text-ink-faint">
                {group.members.length} {group.members.length === 1 ? "lid" : "leden"}
                <span aria-hidden> · </span>
                Aangemaakt {formatDate(group.createdAt)}
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2 max-md:flex-wrap">
              {group.inviteCode && (
                <button onClick={handleCopyCode} className={`${BTN_SECONDARY} h-9 px-3 text-[12.5px] max-md:h-10`}>
                  {copied
                    ? <Check size={13} aria-hidden className={TEAL_TEXT} />
                    : <Copy size={13} aria-hidden />}
                  {copied ? "Gekopieerd" : <span className="font-mono tracking-wider">{group.inviteCode}</span>}
                </button>
              )}
              <button onClick={handleLeave} disabled={leaving}
                className="press inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-line bg-surface px-3 text-[12.5px] font-semibold text-danger outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488] disabled:cursor-not-allowed disabled:opacity-50 max-md:h-10">
                <LogOut size={13} aria-hidden />
                Verlaten
              </button>
            </div>
          </div>
        </section>

        {/* -- The tab bar: the /notities underline tabs -------------------- */}
        <div className="mt-6 flex gap-[22px] overflow-x-auto border-b border-line max-md:gap-5">
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={active}
                className={`-mb-px flex-shrink-0 border-b-2 pb-[11px] pt-2 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                  active
                    ? "border-teal font-semibold text-teal-dark dark:text-teal-400"
                    : "border-transparent font-medium text-ink-muted hover:text-ink-body"
                }`}>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* -- The tab, with the standing cards beside it ------------------- */}
        <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
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

          <aside className="space-y-4">
            <Card className="p-[18px]">
              <section aria-labelledby="groep-over">
                <h3 id="groep-over" className={CARD_TITLE}>Over deze groep</h3>
                <div className="mt-3 flex items-center gap-2.5">
                  <Avatar name={group.createdBy.name} size={6} />
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink-faint">Aangemaakt door</p>
                    <p className="truncate text-[13.5px] font-semibold text-ink">{group.createdBy.name}</p>
                  </div>
                </div>
              </section>
            </Card>

            <AssignmentCard
              assignment={group.weeklyAssignment}
              groupId={params.id}
              isLeader={currentUserRole === "leader"}
              onUpdate={fetchGroup}
            />

            {group.challenge && new Date(group.challenge.endDate) > new Date() && (
              <Card className="p-[18px]">
                <section aria-labelledby="groep-uitdaging">
                  <h3 id="groep-uitdaging" className={CARD_TITLE}>Groepsuitdaging</h3>
                  <p className="mt-2.5 text-[13.5px] font-semibold text-ink">{group.challenge.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    Doel: {group.challenge.target} {group.challenge.type === "chapters" ? "hoofdstukken" : "notities"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">
                    Tot {formatDate(group.challenge.endDate)}
                  </p>
                </section>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
