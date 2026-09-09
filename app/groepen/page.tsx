"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Search, Lock, Globe, RefreshCw, ChevronRight, UserPlus } from "lucide-react"
import { GroupDialog } from "./_GroupDialog"
import SceneShell from "../../components/scene/SceneShell"
import { SectionHeading } from "../../components/scene/pieces"
import {
  CTA_PRIMARY, EYEBROW, TEAL, TEAL_DEEP, TEAL_ON_DARK, TILE,
} from "../../components/scene/tokens"

interface Member { _id: string; name: string; image?: string }
interface Group {
  _id: string
  name: string
  description: string
  isPublic: boolean
  createdBy: Member
  members: { userId: Member; role: string }[]
  createdAt: string
}

/**
 * Inside the modals the surface is still the themed dialog, so the brand fill
 * there stays what it always was. Everything ON the landscape uses the scene's
 * own values from components/scene/tokens.ts instead.
 */
const IC = TEAL                       // fills that carry no type
const TEAL_TEXT = TEAL_DEEP           // #0D9488 is 3.7:1 on white, short of AA for small text
const BG_TEAL = "rgba(13,148,136,0.08)"

/** A control on the landscape: quiet glass, white type, a real focus ring. */
const SCENE_FIELD =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/50 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white"

/* ── One group, as a line in the ledger ─────────────────────────── */
/**
 * A group used to be a card in a four-up grid. On the landscape a grid of
 * boxes is a box inside a box, and it read as somebody else's content; the
 * README calls this out for exactly this shape of list. The group is a record,
 * so it is set as one: the name and what it is on the left, who is in it and
 * the one action on the right, a hairline between them.
 */
function GroupRow({ group, isMember, onJoin }: {
  group: Group
  isMember: boolean
  onJoin: (group: Group) => void
}) {
  return (
    <li className="border-b border-white/10 py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* Identifies who can see the group - a data type, not decoration. */}
          {group.isPublic
            ? <Globe size={12} className="shrink-0 text-white/60" aria-hidden />
            : <Lock size={12} className="shrink-0 text-white/60" aria-hidden />}
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
            {group.isPublic ? "Openbaar" : "Privé"}
          </span>
          {isMember && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: TEAL_ON_DARK }}>
              · Lid
            </span>
          )}
        </div>

        <h3 className="mt-1 truncate text-base font-semibold text-white">{group.name}</h3>
        {group.description && (
          <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-white/70">{group.description}</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <div className="flex -space-x-1.5" aria-hidden>
            {group.members.slice(0, 4).map((m, i) => (
              <span key={i}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-black/40 text-[10px] font-bold text-white"
                style={{ backgroundColor: TEAL_DEEP, zIndex: 4 - i }}>
                {m.userId?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            ))}
          </div>
          <span className="text-xs text-white/60">
            {group.members.length} {group.members.length === 1 ? "lid" : "leden"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex-shrink-0 sm:mt-0">
        {isMember ? (
          <Link href={`/groepen/${group._id}`}
            className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-white no-underline underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-white">
            Bekijken <ChevronRight size={14} aria-hidden />
          </Link>
        ) : (
          <button onClick={() => onJoin(group)}
            className="press inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"
            style={{ backgroundColor: TEAL_DEEP }}>
            <UserPlus size={12} aria-hidden /> Deelnemen
          </button>
        )}
      </div>
    </li>
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
    <GroupDialog
      open
      onOpenChange={o => { if (!o) onClose() }}
      title="Deelnemen aan groep"
      description={group.isPublic
        ? `Wilt u deelnemen aan "${group.name}"? U kunt daarna meelezen, meepraten en notities delen.`
        : `Voer de uitnodigingscode in voor "${group.name}".`}
      className="max-w-sm"
    >
      <div>
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
          className="press w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: TEAL_DEEP }}>
          {loading ? "Bezig..." : "Deelnemen"}
        </button>
      </div>
    </GroupDialog>
  )
}

/* ── Create group modal ─────────────────────────────────────── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]     = useState({ name: "", description: "", isPublic: true })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState("")
  // Creating a group is a Pro feature. Surfaced as an upgrade path rather than a
  // bare error, since "Aanmaken mislukt" tells the user nothing they can act on.
  const [needsPro, setNeedsPro] = useState(false)

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("Naam is verplicht"); return }
    setError(""); setNeedsPro(false); setLoading(true)
    try {
      const res = await fetch("/api/groepen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === "SUBSCRIPTION_REQUIRED") setNeedsPro(true)
        else setError(data.error || "Aanmaken mislukt")
        return
      }
      onCreated()
    } finally { setLoading(false) }
  }

  return (
    <GroupDialog
      open
      onOpenChange={o => { if (!o) onClose() }}
      title="Nieuwe groep aanmaken"
      description="Een studiegroep leest samen hetzelfde gedeelte: u zet een wekelijkse opdracht klaar, bespreekt de tekst en deelt notities met elkaar."
    >
      <div>
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={form.isPublic}
              onClick={() => setForm(p => ({ ...p, isPublic: true }))}
              className="press flex flex-col gap-1 p-3 rounded-xl border text-left transition-colors"
              style={{ borderColor: form.isPublic ? IC : undefined, backgroundColor: form.isPublic ? BG_TEAL : undefined }}>
              <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                style={{ color: form.isPublic ? TEAL_TEXT : undefined }}>
                <Globe size={14} className="shrink-0" /> Openbaar
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                Iedereen kan de groep vinden en meedoen
              </span>
            </button>
            <button
              type="button"
              aria-pressed={!form.isPublic}
              onClick={() => setForm(p => ({ ...p, isPublic: false }))}
              className="press flex flex-col gap-1 p-3 rounded-xl border text-left transition-colors"
              style={{ borderColor: !form.isPublic ? IC : undefined, backgroundColor: !form.isPublic ? BG_TEAL : undefined }}>
              <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                style={{ color: !form.isPublic ? TEAL_TEXT : undefined }}>
                <Lock size={14} className="shrink-0" /> Privé
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                Alleen met uitnodigingscode
              </span>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        {needsPro && (
          <div className="mt-3 rounded-xl border border-border p-3" style={{ backgroundColor: BG_TEAL }}>
            <p className="text-sm text-foreground">
              Een eigen groep aanmaken hoort bij Pro. Deelnemen aan bestaande groepen is gratis.
            </p>
            <Link href="/abonnement"
              className="mt-2 inline-block text-sm font-semibold underline underline-offset-2"
              style={{ color: TEAL_TEXT }}>
              Bekijk Pro
            </Link>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="press flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Annuleren
          </button>
          <button onClick={handleCreate} disabled={loading}
            className="press flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: TEAL_DEEP }}>
            {loading ? "Aanmaken..." : "Aanmaken"}
          </button>
        </div>
      </div>
    </GroupDialog>
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
      // The server resolves the code. Matching it client-side against the public
      // list could never find a private group - the only kind that needs a code.
      const res = await fetch("/api/groepen/join-by-code", {
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
    <div className="min-w-0">
      <label htmlFor="groepen-code" className={EYEBROW}>Uitnodigingscode</label>
      <div className="mt-2 flex gap-2">
        <input id="groepen-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123" maxLength={6}
          className={`${SCENE_FIELD} font-mono tracking-widest`}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
        />
        <button onClick={handleJoin} disabled={loading || code.length < 6}
          className="press flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: TEAL_DEEP }}>
          {loading ? "..." : "Deelnemen"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {success && <p className="mt-2 text-xs font-medium" style={{ color: TEAL_ON_DARK }}>Succesvol lid geworden!</p>}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
/**
 * Groepen, in the shared immersive shell.
 *
 * Three layers, the shape the dashboard uses:
 *   1. the sky      - a short one. Someone here came to find or join a group,
 *                     not to look at a landscape.
 *   2. the horizon  - the two ways in: an uitnodigingscode and the search box
 *                     with the twee tabbladen. There is no honest row of
 *                     figures for this page, and that toolbar IS what a reader
 *                     reaches for first.
 *   3. the desk     - the groups, bare on the landscape as a ledger.
 *
 * Nothing about the data changed: the same GET /api/groepen, the same
 * join / join-by-code / create endpoints with the same bodies, the same
 * client-side filter, the same three empty states and the same Pro path on
 * SUBSCRIPTION_REQUIRED.
 */
export default function GroepenPage() {
  const [publicGroups, setPublicGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups]         = useState<Group[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [tab, setTab]                   = useState<"discover"|"mine">("discover")
  const [joinTarget, setJoinTarget]     = useState<Group | null>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [loadFailed, setLoadFailed]     = useState(false)

  const myGroupIds = new Set(myGroups.map(g => g._id))

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/groepen")
      // A failed request used to fall through to `data.publicGroups || []`, so a
      // 401, a 404 ("Gebruiker niet gevonden") or a 500 rendered as the ordinary
      // "geen groepen gevonden" empty state. Those are different claims - "there
      // are none" versus "we could not look" - and the second one is the more
      // likely explanation for a discover list that is empty on a live site.
      if (!res.ok) throw new Error(`GET /api/groepen ${res.status}`)
      const data = await res.json()
      setPublicGroups(data.publicGroups || [])
      setMyGroups(data.myGroups || [])
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
      setPublicGroups([])
      setMyGroups([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  const query    = search.trim()
  const filtered = (tab === "discover" ? publicGroups : myGroups).filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  )

  // Three different situations shared one message before. "Probeer een andere
  // zoekterm" is meaningless while the search box is empty, and on the discover
  // tab it blamed the user's search for what is really "nobody has made a
  // public group yet" - which also hid the free way in: an invite code.
  const empty = query
    ? {
        title: "Geen groepen gevonden",
        body: `Geen groep met "${query}" in de naam of beschrijving. Probeer een andere zoekterm.`,
      }
    : tab === "mine"
      ? {
          title: "U bent nog geen lid van een groep",
          body: "Neem deel aan een openbare groep via het tabblad Ontdekken, of gebruik een uitnodigingscode. Deelnemen is gratis.",
        }
      : {
          title: "Er zijn nog geen openbare groepen",
          body: "Zodra iemand een openbare groep aanmaakt, verschijnt die hier. Heeft u een uitnodigingscode gekregen? Vul die hierboven in - deelnemen is gratis.",
        }

  return (
    <SceneShell backdrop="reader" header rail>
      {/* -- The sky ---------------------------------------------------- */}
      <section aria-labelledby="groepen-titel" className="pb-10 pt-6">
        <div className="scene-sky flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div className="min-w-0 max-w-[40rem]">
            {/* One of the two accents on this screen; the other is the "Lid"
                marker in the ledger. */}
            <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Groepen</p>
            <h1 id="groepen-titel" className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Samen lezen
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Een kleine groep leest hetzelfde gedeelte en praat er samen over door. Deelnemen is gratis.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className={CTA_PRIMARY}>
            <Plus size={16} aria-hidden /> Groep aanmaken
          </button>
        </div>
      </section>

      {/* -- The horizon: the two ways in ------------------------------- */}
      <div className="scene-horizon">
        <div className={`grid gap-4 p-4 shadow-lg shadow-black/20 sm:grid-cols-2 sm:gap-6 sm:p-5 ${TILE}`}>
          <InviteJoinBar onJoined={loadGroups} />

          <div className="min-w-0">
            <label htmlFor="groepen-zoeken" className={EYEBROW}>Zoeken</label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                {/* Identifies the field, not decoration. */}
                <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <input id="groepen-zoeken" type="search" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Zoek groepen..."
                  className={`${SCENE_FIELD} pl-9`}
                />
              </div>

              <div className="flex flex-shrink-0 gap-1 rounded-lg border border-white/20 bg-black/30 p-1">
                {(["discover", "mine"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                      tab === t ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                    }`}>
                    {t === "discover" ? "Ontdekken" : `Mijn groepen (${myGroups.length})`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- The desk: the ledger --------------------------------------- */}
      <div className="pb-24 pt-12">
        <SectionHeading
          id="groepen-lijst"
          rule
          title={tab === "discover" ? "Openbare groepen" : "Mijn groepen"}
          action={
            !loading && !loadFailed && filtered.length > 0 ? (
              <span className="text-xs tabular-nums text-white/60">
                {filtered.length} {filtered.length === 1 ? "groep" : "groepen"}
              </span>
            ) : undefined
          }
        />

        {loading ? (
          <ul aria-label="Groepen laden" className="mt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="border-b border-white/10 py-5">
                <div className="skeleton-pulse h-3 w-20 rounded bg-white/15" />
                <div className="skeleton-pulse mt-2 h-4 w-56 max-w-full rounded bg-white/20" />
                <div className="skeleton-pulse mt-2 h-3 w-72 max-w-full rounded bg-white/10" />
              </li>
            ))}
          </ul>
        ) : loadFailed ? (
          <div className="content-in max-w-xl py-12">
            <h3 className="text-base font-semibold text-white">Groepen konden niet worden geladen</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/70">
              Er ging iets mis bij het ophalen van de groepen. Dit betekent niet dat er geen
              groepen zijn - probeer het opnieuw.
            </p>
            <button onClick={loadGroups}
              className="press mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"
              style={{ backgroundColor: TEAL_DEEP }}>
              <RefreshCw size={15} aria-hidden /> Opnieuw proberen
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="content-in max-w-2xl py-12">
            <h3 className="text-base font-semibold text-white">{empty.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/70">{empty.body}</p>

            {/* The explainer and the aanmaak-CTA are onboarding, not search results:
                showing them under "geen treffers voor <zoekterm>" buries the one
                thing that helps there, namely zoeken op iets anders. */}
            {!query && (
              <>
                <div className="mt-8 border-t border-white/15 pt-6">
                  <h4 className="text-sm font-semibold text-white">Wat is een bijbelstudiegroep?</h4>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    Een kleine groep die hetzelfde bijbelgedeelte leest en er samen over doorpraat.
                    De groepsleider zet een wekelijkse opdracht klaar, iedereen leest die en deelt
                    wat opvalt.
                  </p>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                    {[
                      { title: "Wekelijkse opdracht", body: "Een hoofdstuk of gedeelte voor de hele groep" },
                      { title: "Bespreking",          body: "Stel vragen en reageer op elkaar" },
                      { title: "Gedeelde notities",   body: "Deel wat u ontdekt met de groep" },
                    ].map(({ title, body }) => (
                      <div key={title} className="min-w-0">
                        <dt className="text-sm font-semibold text-white">{title}</dt>
                        <dd className="mt-0.5 text-xs leading-snug text-white/60">{body}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <button onClick={() => setShowCreate(true)}
                  className="press mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white"
                  style={{ backgroundColor: TEAL_DEEP }}>
                  <Plus size={15} aria-hidden /> Groep aanmaken
                </button>
              </>
            )}
          </div>
        ) : (
          <ul className="stagger-in mt-1">
            {filtered.map(group => (
              <GroupRow key={group._id} group={group}
                isMember={myGroupIds.has(group._id)}
                onJoin={setJoinTarget}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      {joinTarget && (
        <JoinModal group={joinTarget} onClose={() => setJoinTarget(null)}
          onJoined={() => { setJoinTarget(null); loadGroups() }} />
      )}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadGroups() }} />
      )}
    </SceneShell>
  )
}
