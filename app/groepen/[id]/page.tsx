"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Users, Lock, Globe, BookMarked, Copy, Check,
  ArrowLeft, LogOut, BookOpen, CalendarCheck2, Target,
} from "lucide-react"
import DiscussieTab  from "./_DiscussieTab"
import NotitiesTab   from "./_NotitiesTab"
import VoortgangTab  from "./_VoortgangTab"
import LedenTab      from "./_LedenTab"

/* ── Types ─────────────────────────────────────────────────────── */
interface Member       { _id: string; name: string; image?: string }
interface GroupMember  { userId: Member; role: string; joinedAt: string }
interface Plan         { _id: string; title: string; duration: number }
interface Assignment   { book: string; chapter: number; title: string; dueDate?: string; setBy?: Member; setAt: string }
interface Challenge    { title: string; type: "chapters"|"notes"; target: number; startDate: string; endDate: string }
interface Group {
  _id: string; name: string; description: string
  isPublic: boolean; inviteCode?: string
  createdBy: Member; members: GroupMember[]
  planId?: Plan | null
  weeklyAssignment?: Assignment | null
  challenge?: Challenge | null
  createdAt: string
}

type Tab = "discussie" | "notities" | "voortgang" | "leden"

/* ── Helpers ────────────────────────────────────────────────────── */
function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className={`h-${size} w-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: "#0D9488", fontSize: size <= 7 ? 10 : 12 }}>
      {initials}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
}

/* ── Weekly Assignment sidebar card ────────────────────────────── */
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
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
          <BookOpen size={13} style={{ color: "#0D9488" }} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground">
          Wekelijkse opdracht
        </p>
      </div>

      {assignment ? (
        <>
          <p className="text-sm font-semibold text-gray-900 dark:text-foreground mb-0.5">
            {assignment.book} {assignment.chapter}{assignment.title ? ` - ${assignment.title}` : ""}
          </p>
          {assignment.dueDate && (
            <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">
              Deadline: {formatDate(assignment.dueDate)}
            </p>
          )}
          <Link
            href={`/study?book=${encodeURIComponent(assignment.book)}&chapter=${assignment.chapter}&version=statenvertaling`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: "#0D9488" }}>
            Lees nu
          </Link>
          {isLeader && (
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setShowForm(true)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-foreground">Wijzigen</button>
              <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">Verwijderen</button>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">Geen opdracht ingesteld.</p>
      )}

      {isLeader && (!assignment || showForm) && (
        <div className="space-y-2 mt-3 pt-3 border-t border-gray-100 dark:border-border">
          {showForm && <p className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">Nieuwe opdracht</p>}
          <input value={book} onChange={e => setBook(e.target.value)} placeholder="Boek (bijv. Psalmen)"
            className="w-full px-2 py-1.5 border border-gray-200 dark:border-border rounded-md text-xs bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none" />
          <input type="number" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="Hoofdstuk"
            className="w-full px-2 py-1.5 border border-gray-200 dark:border-border rounded-md text-xs bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none" />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (optioneel)"
            className="w-full px-2 py-1.5 border border-gray-200 dark:border-border rounded-md text-xs bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none" />
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 dark:border-border rounded-md text-xs bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !book.trim() || !chapter.trim()}
              className="flex-1 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#0D9488" }}>
              {saving ? "..." : "Opslaan"}
            </button>
            {showForm && (
              <button onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded-md text-xs text-gray-500 dark:text-muted-foreground border border-gray-200 dark:border-border">
                Annuleren
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
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
      <div className="px-6 xl:px-10 py-8 space-y-4">
        <div className="h-7 rounded bg-gray-100 dark:bg-secondary animate-pulse w-48" />
        <div className="h-32 rounded-2xl bg-gray-100 dark:bg-secondary animate-pulse" />
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-secondary animate-pulse" />
      </div>
    )
  }

  if (!group) return null

  const planId = (group.planId as unknown as Plan | null)?._id ?? null

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-6 space-y-5 max-w-6xl">

        {/* Breadcrumb */}
        <Link href="/groepen"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground transition-colors">
          <ArrowLeft size={12} /> Terug naar groepen
        </Link>

        {/* Header card */}
        <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Icon */}
            <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
              <Users size={22} style={{ color: "#0D9488" }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">{group.name}</h1>
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: group.isPublic ? "rgba(34,197,94,0.1)" : "rgba(234,88,12,0.08)",
                    color: group.isPublic ? "#16A34A" : "#EA580C",
                  }}>
                  {group.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                  {group.isPublic ? "Openbaar" : "Privé"}
                </span>
              </div>
              {group.description && (
                <p className="text-sm text-gray-500 dark:text-muted-foreground mb-2">{group.description}</p>
              )}
              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Users size={11} /> {group.members.length} {group.members.length === 1 ? "lid" : "leden"}
                </span>
                {group.planId && (
                  <span className="flex items-center gap-1">
                    <BookMarked size={11} /> {(group.planId as unknown as Plan).title}
                  </span>
                )}
                <span>Aangemaakt {formatDate(group.createdAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 self-start">
              {group.inviteCode && (
                <button onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary transition-colors">
                  {copied ? <Check size={12} style={{ color: "#0D9488" }} /> : <Copy size={12} />}
                  {copied ? "Gekopieerd" : group.inviteCode}
                </button>
              )}
              <button onClick={handleLeave} disabled={leaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50">
                <LogOut size={12} />
                Verlaten
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 dark:bg-secondary p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? "#fff" : "transparent",
                color:            activeTab === tab.id ? "#0D9488" : "#6B7280",
                boxShadow:        activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">

          {/* Tab content */}
          <div>
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
              <VoortgangTab groupId={params.id} planId={planId} />
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

          {/* Right sidebar */}
          <div className="space-y-4">

            {/* Group info */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground mb-3">
                Over deze groep
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Avatar name={group.createdBy.name} size={6} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-muted-foreground">Aangemaakt door</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-foreground truncate">{group.createdBy.name}</p>
                  </div>
                </div>
                {group.planId && (
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                      <CalendarCheck2 size={12} style={{ color: "#0D9488" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">Groepsleesplan</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-foreground truncate">
                        {(group.planId as unknown as Plan).title}
                      </p>
                      <Link href={`/plans/${(group.planId as unknown as Plan)._id}`}
                        className="text-xs" style={{ color: "#0D9488" }}>
                        Bekijk plan
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly assignment */}
            <AssignmentCard
              assignment={group.weeklyAssignment}
              groupId={params.id}
              isLeader={currentUserRole === "leader"}
              onUpdate={fetchGroup}
            />

            {/* Challenge (if active) */}
            {group.challenge && new Date(group.challenge.endDate) > new Date() && (
              <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(234,88,12,0.08)" }}>
                    <Target size={13} style={{ color: "#EA580C" }} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground">
                    Groepsuitdaging
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-foreground mb-1">{group.challenge.title}</p>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Doel: {group.challenge.target} {group.challenge.type === "chapters" ? "hoofdstukken" : "notities"}
                </p>
                <p className="text-xs text-gray-400 dark:text-muted-foreground mt-0.5">
                  Tot {formatDate(group.challenge.endDate)}
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
