"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Users, Plus, Search, Lock, Globe, BookMarked,
  ChevronRight, UserPlus, X,
} from "lucide-react"

interface Member { _id: string; name: string; image?: string }
interface Group {
  _id: string
  name: string
  description: string
  isPublic: boolean
  inviteCode?: string
  createdBy: Member
  members: { userId: Member; role: string }[]
  planId?: { title: string } | null
  createdAt: string
}

const IC = "#0D9488"  // teal-600
const BG_TEAL = "rgba(13,148,136,0.08)"

/* ── Group card ─────────────────────────────────────────────── */
function GroupCard({ group, isMember, onJoin }: {
  group: Group
  isMember: boolean
  onJoin: (group: Group) => void
}) {
  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {group.isPublic
              ? <Globe size={13} style={{ color: IC }} />
              : <Lock   size={13} style={{ color: "#6B7280" }} />}
            <span className="text-xs text-muted-foreground">{group.isPublic ? "Openbaar" : "Privé"}</span>
          </div>
          <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
          )}
        </div>
        {isMember && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: BG_TEAL, color: IC }}>
            Lid
          </span>
        )}
      </div>

      {group.planId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BookMarked size={12} /> {group.planId.title}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {group.members.slice(0, 4).map((m, i) => (
              <div key={i} className="h-6 w-6 rounded-full border-2 border-white dark:border-card flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: IC, zIndex: 4 - i }}>
                {m.userId?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{group.members.length} {group.members.length === 1 ? "lid" : "leden"}</span>
        </div>

        {isMember ? (
          <Link href={`/groepen/${group._id}`}
            className="flex items-center gap-1 text-xs font-semibold transition-colors"
            style={{ color: IC }}>
            Bekijken <ChevronRight size={13} />
          </Link>
        ) : (
          <button onClick={() => onJoin(group)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ backgroundColor: IC }}>
            <UserPlus size={12} /> Deelnemen
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Join modal ─────────────────────────────────────────────── */
function JoinModal({ group, onClose, onJoined }: {
  group: Group
  onClose: () => void
  onJoined: () => void
}) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleJoin = async () => {
    setError(""); setLoading(true)
    const body = group.isPublic ? {} : { inviteCode: code.trim().toUpperCase() }
    try {
      const res = await fetch(`/api/groepen/${group._id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Deelnemen mislukt"); return }
      onJoined()
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground">Deelnemen aan groep</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {group.isPublic
            ? `Wilt u deelnemen aan "${group.name}"?`
            : `Voer de uitnodigingscode in voor "${group.name}".`}
        </p>
        {!group.isPublic && (
          <input
            value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Bijv. ABC123"
            maxLength={6}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm font-mono tracking-widest text-center bg-background text-foreground focus:outline-none focus:ring-2 mb-3"
            style={{ "--tw-ring-color": IC } as React.CSSProperties}
          />
        )}
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}
        <button onClick={handleJoin} disabled={loading || (!group.isPublic && code.length < 6)}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: IC }}>
          {loading ? "Bezig..." : "Deelnemen"}
        </button>
      </div>
    </div>
  )
}

/* ── Create group modal ─────────────────────────────────────── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]     = useState({ name: "", description: "", isPublic: true })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState("")

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("Naam is verplicht"); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/groepen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Aanmaken mislukt"); return }
      onCreated()
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-foreground text-lg">Nieuwe groep aanmaken</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Naam *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Bijv. Zondagsgroep Amsterdam"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": IC } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Beschrijving</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Vertel iets over de groep..."
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 resize-none"
              style={{ "--tw-ring-color": IC } as React.CSSProperties}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setForm(p => ({ ...p, isPublic: true }))}
              className="flex-1 flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: form.isPublic ? IC : undefined, backgroundColor: form.isPublic ? BG_TEAL : undefined, color: form.isPublic ? IC : undefined }}>
              <Globe size={14} /> Openbaar
            </button>
            <button
              onClick={() => setForm(p => ({ ...p, isPublic: false }))}
              className="flex-1 flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: !form.isPublic ? IC : undefined, backgroundColor: !form.isPublic ? BG_TEAL : undefined, color: !form.isPublic ? IC : undefined }}>
              <Lock size={14} /> Privé (met uitnodigingscode)
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Annuleren
          </button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: IC }}>
            {loading ? "Aanmaken..." : "Aanmaken"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Invite code join ─────────────────────────────────────────── */
function InviteJoinBar({ onJoined }: { onJoined: () => void }) {
  const [code, setCode]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState("")
  const [success, setSuccess] = useState(false)

  const handleJoin = async () => {
    if (code.trim().length < 6) return
    setError(""); setLoading(true)
    try {
      // Find group by invite code first
      const searchRes = await fetch(`/api/groepen?inviteCode=${code.trim().toUpperCase()}`)
      const searchData = await searchRes.json()
      const found = searchData.publicGroups?.find(
        (g: Group) => g.inviteCode === code.trim().toUpperCase()
      )
      if (!found) { setError("Geen groep gevonden met deze code"); return }

      const res = await fetch(`/api/groepen/${found._id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Deelnemen mislukt"); return }
      setSuccess(true)
      onJoined()
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Deelnemen via uitnodigingscode</p>
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123" maxLength={6}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono tracking-widest bg-background text-foreground focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": IC } as React.CSSProperties}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
        />
        <button onClick={handleJoin} disabled={loading || code.length < 6}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: IC }}>
          {loading ? "..." : "Deelnemen"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      {success && <p className="text-xs mt-2 font-medium" style={{ color: IC }}>Succesvol lid geworden!</p>}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function GroepenPage() {
  const [publicGroups, setPublicGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups]         = useState<Group[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [tab, setTab]                   = useState<"discover"|"mine">("discover")
  const [joinTarget, setJoinTarget]     = useState<Group | null>(null)
  const [showCreate, setShowCreate]     = useState(false)

  const myGroupIds = new Set(myGroups.map(g => g._id))

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/groepen")
      const data = await res.json()
      setPublicGroups(data.publicGroups || [])
      setMyGroups(data.myGroups || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  const filtered = (tab === "discover" ? publicGroups : myGroups).filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 xl:px-10 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bijbelstudiegroepen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bestudeer de Bijbel samen met anderen
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: IC }}>
          <Plus size={16} /> Groep aanmaken
        </button>
      </div>

      {/* Invite bar */}
      <InviteJoinBar onJoined={loadGroups} />

      {/* Search + tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Zoek groepen..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-white dark:bg-card text-foreground focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": IC } as React.CSSProperties}
          />
        </div>

        <div className="flex bg-muted p-1 rounded-lg">
          {(["discover", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              style={tab === t ? { backgroundColor: "white", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#6B7280" }}>
              {t === "discover" ? "Ontdekken" : `Mijn groepen (${myGroups.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Group grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-16 text-center">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: BG_TEAL }}>
            <Users size={22} style={{ color: IC }} />
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            {tab === "mine" ? "U bent nog geen lid van een groep" : "Geen groepen gevonden"}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {tab === "mine"
              ? "Maak een groep aan of neem deel via een uitnodigingscode."
              : "Probeer een andere zoekterm of maak zelf een groep aan."}
          </p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: IC }}>
            <Plus size={15} /> Groep aanmaken
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(group => (
            <GroupCard key={group._id} group={group}
              isMember={myGroupIds.has(group._id)}
              onJoin={setJoinTarget}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {joinTarget && (
        <JoinModal group={joinTarget} onClose={() => setJoinTarget(null)}
          onJoined={() => { setJoinTarget(null); loadGroups() }} />
      )}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadGroups() }} />
      )}
    </div>
  )
}
