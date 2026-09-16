"use client"

import { useState, useEffect, useCallback } from "react"
import { GROEPEN_ACTIES, INTENT_EVENT, consumeIntent, readIntent } from "../../lib/commands/deepLink"
import Link from "next/link"
import { Plus, Search, Lock, Globe, RefreshCw, ChevronRight, UserPlus } from "lucide-react"
import { GroupDialog } from "./_GroupDialog"
import AppShell from "../../components/shell/AppShell"
import { Card, SectionHeading, Skeleton } from "../../components/kit/primitives"

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
 * #0D9488 is 3.7:1 on white - fine as a fill or a border, short of AA as small
 * type and as a ground for white type. Type in the brand colour is teal-dark
 * (#0F766E) on the light surface and teal-400 on the dark one; a filled button
 * that carries white type is teal-dark as well (5.5:1).
 */
const TEAL_TEXT = "text-teal-dark dark:text-teal-400"

/** The one filled button shape on this page. */
const BTN_PRIMARY =
  "press inline-flex items-center justify-center gap-2 rounded-btn bg-teal-dark text-[13.5px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"

/** The quiet button next to it: a hairline, no fill. */
const BTN_SECONDARY =
  "press inline-flex items-center justify-center gap-1.5 rounded-btn border border-line bg-surface text-[13.5px] font-semibold text-ink-body no-underline outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488]"

/** A text field on the page (not inside the dialog). */
const FIELD =
  "h-10 w-full rounded-btn border border-line bg-surface px-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-teal max-md:h-11 max-md:text-base"

/** A text field inside the dialogs. */
const DIALOG_FIELD =
  "w-full rounded-btn border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-teal max-md:text-base"

/** The small uppercase label the rail cards on /notities use. */
const EYEBROW = "text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint"

/* ── One group, as a row in the list ────────────────────────────── */
/**
 * The group is a record, so it is set as one: the name and what it is on the
 * left, who is in it and the one action on the right, a hairline between rows -
 * the same row shape as ListRow in components/kit/primitives.tsx.
 */
function GroupRow({ group, isMember, onJoin, first }: {
  group: Group
  isMember: boolean
  onJoin: (group: Group) => void
  first: boolean
}) {
  return (
    <li className={`px-[18px] py-4 max-md:px-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 ${
      first ? "" : "border-t border-line-soft"
    }`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* Identifies who can see the group - a data type, not decoration. */}
          {group.isPublic
            ? <Globe size={12} className="shrink-0 text-ink-faint" aria-hidden />
            : <Lock size={12} className="shrink-0 text-ink-faint" aria-hidden />}
          <span className={EYEBROW}>
            {group.isPublic ? "Openbaar" : "Privé"}
          </span>
          {isMember && (
            <span className={`text-[10.5px] font-semibold uppercase tracking-[1.1px] ${TEAL_TEXT}`}>
              · Lid
            </span>
          )}
        </div>

        <h3 className="mt-1 truncate text-[14.5px] font-semibold text-ink">{group.name}</h3>
        {group.description && (
          <p className="mt-0.5 line-clamp-2 break-words text-[13px] leading-relaxed text-ink-muted">{group.description}</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <div className="flex -space-x-1.5" aria-hidden>
            {group.members.slice(0, 4).map((m, i) => (
              <span key={i}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-surface bg-teal-dark text-[10px] font-bold text-white"
                style={{ zIndex: 4 - i }}>
                {m.userId?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            ))}
          </div>
          <span className="text-[12px] text-ink-faint">
            {group.members.length} {group.members.length === 1 ? "lid" : "leden"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex-shrink-0 sm:mt-0">
        {isMember ? (
          <Link href={`/groepen/${group._id}`} className={`${BTN_SECONDARY} h-9 px-3.5 max-md:h-10`}>
            Bekijken <ChevronRight size={14} aria-hidden />
          </Link>
        ) : (
          <button onClick={() => onJoin(group)} className={`${BTN_PRIMARY} h-9 px-3.5 max-md:h-10 max-md:px-4`}>
            <UserPlus size={14} aria-hidden /> Deelnemen
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
            aria-label="Uitnodigingscode"
            placeholder="Bijv. ABC123"
            maxLength={6}
            className={`${DIALOG_FIELD} mb-3 text-center font-mono tracking-widest`}
          />
        )}
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <button onClick={handleJoin} disabled={loading || (!group.isPublic && code.length < 6)}
          className={`${BTN_PRIMARY} h-11 w-full`}>
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

  const visibilityOption = (active: boolean) =>
    `press flex flex-col gap-1 rounded-btn p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
      active ? "border-2 border-teal bg-teal-faint" : "border border-line bg-surface hover:border-line-strong"
    }`

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
            <label htmlFor="groep-naam" className={`mb-1.5 block ${EYEBROW}`}>Naam *</label>
            <input id="groep-naam" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Bijv. Zondagsgroep Amsterdam"
              className={DIALOG_FIELD}
            />
          </div>
          <div>
            <label htmlFor="groep-beschrijving" className={`mb-1.5 block ${EYEBROW}`}>Beschrijving</label>
            <textarea id="groep-beschrijving" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Vertel iets over de groep..."
              rows={3}
              className={`${DIALOG_FIELD} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 max-[380px]:grid-cols-1">
            <button
              type="button"
              aria-pressed={form.isPublic}
              onClick={() => setForm(p => ({ ...p, isPublic: true }))}
              className={visibilityOption(form.isPublic)}>
              {/* Identifies the visibility - a data type, not decoration. */}
              <span className={`flex items-center gap-2 whitespace-nowrap text-sm font-semibold ${form.isPublic ? TEAL_TEXT : "text-ink"}`}>
                <Globe size={14} className="shrink-0" aria-hidden /> Openbaar
              </span>
              <span className="text-xs leading-snug text-ink-muted">
                Iedereen kan de groep vinden en meedoen
              </span>
            </button>
            <button
              type="button"
              aria-pressed={!form.isPublic}
              onClick={() => setForm(p => ({ ...p, isPublic: false }))}
              className={visibilityOption(!form.isPublic)}>
              <span className={`flex items-center gap-2 whitespace-nowrap text-sm font-semibold ${!form.isPublic ? TEAL_TEXT : "text-ink"}`}>
                <Lock size={14} className="shrink-0" aria-hidden /> Privé
              </span>
              <span className="text-xs leading-snug text-ink-muted">
                Alleen met uitnodigingscode
              </span>
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {needsPro && (
          <div className="mt-3 rounded-btn border border-line bg-teal-faint p-3">
            <p className="text-sm text-ink">
              Een eigen groep aanmaken hoort bij Pro. Deelnemen aan bestaande groepen is gratis.
            </p>
            <Link href="/abonnement"
              className={`mt-2 inline-block text-sm font-semibold underline underline-offset-2 ${TEAL_TEXT}`}>
              Bekijk Pro
            </Link>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className={`${BTN_SECONDARY} h-11 flex-1`}>
            Annuleren
          </button>
          <button onClick={handleCreate} disabled={loading} className={`${BTN_PRIMARY} h-11 flex-1`}>
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
          className={`${FIELD} font-mono tracking-widest`}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
        />
        <button onClick={handleJoin} disabled={loading || code.length < 6}
          className={`${BTN_PRIMARY} h-10 flex-shrink-0 px-4 max-md:h-11`}>
          {loading ? "..." : "Deelnemen"}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      {success && <p className={`mt-2 text-[12px] font-medium ${TEAL_TEXT}`}>Succesvol lid geworden!</p>}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
/**
 * Groepen, in the shared app shell (components/shell/AppShell.tsx) - the same
 * sidebar-and-top-bar frame as /dashboard, /notities and /abonnement, rather
 * than the immersive landscape this page used to draw.
 *
 * Three blocks, top to bottom:
 *   1. the intro   - what a group is, and the one Pro action (aanmaken).
 *   2. the toolbar - the two ways in: an uitnodigingscode and the search box
 *                    with the twee tabbladen. That is what a reader reaches for
 *                    first.
 *   3. the list    - the groups, as rows in one card.
 *
 * A signed-out visitor never reaches this component: app/groepen/layout.tsx
 * answers them with the GuestGate in the same shell.
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

  // Deep links from the command palette: ?actie=aanmaken opens the create
  // dialog, ?actie=code puts the cursor in the invite-code field. Consumed
  // after use so a reload does not reopen the dialog.
  useEffect(() => {
    function applyIntent() {
      const actie = readIntent("actie", GROEPEN_ACTIES)
      if (!actie) return
      consumeIntent("actie")
      if (actie === "aanmaken") {
        setShowCreate(true)
        return
      }
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      const tryFocus = (left: number) => {
        const input = document.getElementById("groepen-code") as HTMLInputElement | null
        if (!input) {
          if (left > 0) window.setTimeout(() => tryFocus(left - 1), 100)
          return
        }
        input.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
        input.focus({ preventScroll: true })
      }
      tryFocus(20)
    }
    applyIntent()
    window.addEventListener(INTENT_EVENT, applyIntent)
    return () => window.removeEventListener(INTENT_EVENT, applyIntent)
  }, [])

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
    <AppShell title="Groepen">
      <div className="max-w-[64rem]">
        {/* -- The intro --------------------------------------------------- */}
        {/* The top bar already carries the page's h1, so the intro starts at h2. */}
        <section aria-labelledby="groepen-titel" className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-[40rem]">
            <p className={`text-[10.5px] font-semibold uppercase tracking-[1.1px] ${TEAL_TEXT}`}>Groepen</p>
            <h2 id="groepen-titel" className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.4px] text-ink">
              Samen lezen
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              Een kleine groep leest hetzelfde gedeelte en praat er samen over door. Deelnemen is gratis.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className={`${BTN_PRIMARY} h-11 px-[18px]`}>
            <Plus size={16} aria-hidden /> Groep aanmaken
          </button>
        </section>

        {/* -- The toolbar: the two ways in -------------------------------- */}
        <Card className="mt-6 grid gap-5 p-[18px] md:grid-cols-2 md:gap-6 max-md:p-4">
          <InviteJoinBar onJoined={loadGroups} />

          <div className="min-w-0">
            <label htmlFor="groepen-zoeken" className={EYEBROW}>Zoeken</label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="search-field flex h-10 min-w-0 flex-1 items-center gap-2 rounded-btn border border-line bg-surface px-3 max-md:h-11">
                {/* Identifies the field, not decoration. */}
                <Search size={15} aria-hidden className="flex-none text-ink-muted" />
                <input id="groepen-zoeken" type="search" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Zoek groepen..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint max-md:text-base"
                />
              </div>

              <div className="flex flex-shrink-0 gap-1 rounded-btn border border-line bg-sunken p-1 max-md:w-full">
                {(["discover", "mine"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
                    className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488] max-md:min-h-9 max-md:flex-1 max-md:text-sm ${
                      tab === t
                        ? "bg-surface text-ink shadow-[0_1px_2px_rgba(17,24,39,.08)]"
                        : "text-ink-muted hover:text-ink-body"
                    }`}>
                    {t === "discover" ? "Ontdekken" : `Mijn groepen (${myGroups.length})`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* -- The list ---------------------------------------------------- */}
        <div className="mt-8">
          <SectionHeading
            title={tab === "discover" ? "Openbare groepen" : "Mijn groepen"}
            meta={
              !loading && !loadFailed && filtered.length > 0 ? (
                <span className="tabular-nums">
                  {filtered.length} {filtered.length === 1 ? "groep" : "groepen"}
                </span>
              ) : undefined
            }
          />

          {loading ? (
            <Card className="mt-3 overflow-hidden">
              <ul role="status" aria-label="Groepen laden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className={`space-y-2 px-[18px] py-4 max-md:px-4 ${i === 0 ? "" : "border-t border-line-soft"}`}>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-56 max-w-full" />
                    <Skeleton className="h-3 w-72 max-w-full" />
                  </li>
                ))}
              </ul>
            </Card>
          ) : loadFailed ? (
            <Card className="content-in mt-3 p-[22px] max-md:p-4">
              <div className="max-w-xl">
                <h3 className="text-[15.5px] font-bold text-ink">Groepen konden niet worden geladen</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                  Er ging iets mis bij het ophalen van de groepen. Dit betekent niet dat er geen
                  groepen zijn - probeer het opnieuw.
                </p>
                <button onClick={loadGroups} className={`${BTN_PRIMARY} mt-5 h-11 px-5`}>
                  <RefreshCw size={15} aria-hidden /> Opnieuw proberen
                </button>
              </div>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="content-in mt-3 p-[22px] max-md:p-4">
              <div className="max-w-2xl">
                <h3 className="text-[15.5px] font-bold text-ink">{empty.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{empty.body}</p>

                {/* The explainer and the aanmaak-CTA are onboarding, not search results:
                    showing them under "geen treffers voor <zoekterm>" buries the one
                    thing that helps there, namely zoeken op iets anders. */}
                {!query && (
                  <>
                    <div className="mt-6 border-t border-line pt-5">
                      <h4 className="text-[14px] font-semibold text-ink">Wat is een bijbelstudiegroep?</h4>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                        Een kleine groep die hetzelfde bijbelgedeelte leest en er samen over doorpraat.
                        De groepsleider zet een wekelijkse opdracht klaar, iedereen leest die en deelt
                        wat opvalt.
                      </p>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                          { title: "Wekelijkse opdracht", body: "Een hoofdstuk of gedeelte voor de hele groep" },
                          { title: "Bespreking",          body: "Stel vragen en reageer op elkaar" },
                          { title: "Gedeelde notities",   body: "Deel wat u ontdekt met de groep" },
                        ].map(({ title, body }) => (
                          <div key={title} className="min-w-0 rounded-btn border border-line bg-sunken px-3.5 py-3">
                            <dt className="text-[13.5px] font-semibold text-ink">{title}</dt>
                            <dd className="mt-0.5 text-[12px] leading-snug text-ink-muted">{body}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <button onClick={() => setShowCreate(true)} className={`${BTN_PRIMARY} mt-6 h-11 px-5`}>
                      <Plus size={15} aria-hidden /> Groep aanmaken
                    </button>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <Card className="mt-3 overflow-hidden">
              <ul className="stagger-in">
                {filtered.map((group, i) => (
                  <GroupRow key={group._id} group={group}
                    isMember={myGroupIds.has(group._id)}
                    onJoin={setJoinTarget}
                    first={i === 0}
                  />
                ))}
              </ul>
            </Card>
          )}
        </div>
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
    </AppShell>
  )
}
