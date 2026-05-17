"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users, Lock, Globe, BookMarked, Copy, Check,
  ArrowLeft, LogOut, StickyNote, ChevronRight,
} from "lucide-react"

interface Member { _id: string; name: string; image?: string }
interface GroupMember { userId: Member; role: string; joinedAt: string }
interface Note { _id: string; verseReference: string; noteText: string; userId: Member; createdAt: string }
interface Plan { _id: string; title: string; duration: number }
interface Group {
  _id: string; name: string; description: string
  isPublic: boolean; inviteCode?: string
  createdBy: Member
  members: GroupMember[]
  planId?: Plan | null
  createdAt: string
}

const IC = "#0D9488"
const BG_TEAL = "rgba(13,148,136,0.08)"

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div className={`h-${size} w-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs`}
      style={{ backgroundColor: IC }}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [group, setGroup]   = useState<Group | null>(null)
  const [notes, setNotes]   = useState<Note[]>([])
  const [loading, setLoading]   = useState(true)
  const [leaving, setLeaving]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [gRes, nRes] = await Promise.all([
        fetch(`/api/groepen/${id}`),
        fetch(`/api/groepen/${id}/notes`),
      ])
      const [gData, nData] = await Promise.all([gRes.json(), nRes.json()])
      if (gData.group) setGroup(gData.group)
      if (Array.isArray(nData.notes)) setNotes(nData.notes)
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const copyCode = () => {
    if (!group?.inviteCode) return
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = async () => {
    if (!confirm("Weet u zeker dat u deze groep wilt verlaten?")) return
    setLeaving(true)
    const res = await fetch(`/api/groepen/${id}/leave`, { method: "POST" })
    if (res.ok) router.push("/groepen")
    else {
      const d = await res.json()
      alert(d.error || "Verlaten mislukt")
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <div className="px-6 xl:px-10 py-8 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="px-6 xl:px-10 py-8 text-center">
        <p className="text-muted-foreground">Groep niet gevonden.</p>
        <Link href="/groepen" className="text-sm font-semibold mt-3 inline-block" style={{ color: IC }}>
          ← Terug naar groepen
        </Link>
      </div>
    )
  }

  return (
    <div className="px-6 xl:px-10 py-8 space-y-6">
      {/* Breadcrumb */}
      <Link href="/groepen" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft size={14} /> Alle groepen
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {group.isPublic
                ? <Globe size={14} style={{ color: IC }} />
                : <Lock   size={14} className="text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{group.isPublic ? "Openbare groep" : "Privégroep"}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{group.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!group.isPublic && group.inviteCode && (
              <button onClick={copyCode}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                {copied ? <Check size={14} style={{ color: IC }} /> : <Copy size={14} />}
                {group.inviteCode}
              </button>
            )}
            <button onClick={handleLeave} disabled={leaving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut size={14} />
              {leaving ? "Bezig..." : "Verlaten"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={14} /> <span>{group.members.length} {group.members.length === 1 ? "lid" : "leden"}</span>
          </div>
          {group.planId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookMarked size={14} /> <span>{group.planId.title}</span>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Aangemaakt op {new Date(group.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-6">

        {/* Shared notes / activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">Gedeelde notities</h2>
            <Link href="/study" className="flex items-center gap-1 text-xs font-semibold transition-colors" style={{ color: IC }}>
              Notitie delen in studietool <ChevronRight size={12} />
            </Link>
          </div>

          {notes.length === 0 ? (
            <div className="bg-white dark:bg-card border border-border rounded-xl p-10 text-center">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: BG_TEAL }}>
                <StickyNote size={18} style={{ color: IC }} />
              </div>
              <p className="font-semibold text-foreground mb-1">Nog geen gedeelde notities</p>
              <p className="text-sm text-muted-foreground">
                Leden kunnen notities delen via de bijbelstudietool.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note._id} className="bg-white dark:bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={note.userId?.name ?? "?"} size={8} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">{note.userId?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="text-xs font-medium mb-2" style={{ color: IC }}>{note.verseReference}</p>
                      <p className="text-sm text-foreground leading-relaxed">{note.noteText}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="space-y-4">
          <h2 className="font-bold text-foreground">Leden ({group.members.length})</h2>
          <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
            {group.members.map((m, i) => (
              <div key={m.userId._id}
                className={`flex items-center gap-3 px-4 py-3 ${i < group.members.length - 1 ? "border-b border-border" : ""}`}>
                <Avatar name={m.userId.name} size={8} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.userId.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Lid sinds {new Date(m.joinedAt).toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}
                  </p>
                </div>
                {m.role === "leader" && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: BG_TEAL, color: IC }}>
                    Leider
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Reading plan widget */}
          {group.planId && (
            <div className="bg-white dark:bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Groepsleesplan</p>
              <p className="font-semibold text-foreground text-sm mb-1">{group.planId.title}</p>
              <p className="text-xs text-muted-foreground mb-4">{group.planId.duration} dagen</p>
              <Link href="/plans"
                className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
                style={{ color: IC }}>
                Bekijk leesplan <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
