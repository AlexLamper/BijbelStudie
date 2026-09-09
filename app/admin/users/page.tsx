"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Search, ShieldCheck, Sparkles, MoreVertical,
  Trash2, ShieldOff, ShieldPlus, UserX, X,
  AlertTriangle, RefreshCw, Apple, Smartphone,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu"
import { Input } from "../../../components/ui/input"
import { ProBadge } from "../../../components/ui/ProBadge"
import SceneShell from "../../../components/scene/SceneShell"
import { SceneSkeleton, SectionHeading } from "../../../components/scene/pieces"
import { EYEBROW, TEAL_DEEP, TEAL_ON_DARK } from "../../../components/scene/tokens"
import {
  ADMIN_CHIP,
  ADMIN_CHIP_ACTIVE,
  DANGER,
  DATA_PANEL,
  ROW_LINE,
  TABLE_HEAD,
  WARN,
} from "../../../components/admin/adminSurface"

interface AdminUser {
  _id: string
  name: string
  email: string
  image?: string
  isAdmin: boolean
  subscribed: boolean
  isPro: boolean
  /** Pro without payment - review account or admin grant. Not a subscriber. */
  isComped: boolean
  storePremium: boolean
  storePremiumPlatform: "apple" | "google" | null
  subscriptionStatus: string | null
  subscriptionInterval: "monthly" | "annual" | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasBillingIssue: boolean
  /** Stripe customer exists but no subscription state was ever written back. */
  needsReconcile: boolean
  streak: number
  createdAt: string
  lastStreakDate?: string
  hasStripe: boolean
  onboardingCompleted: boolean
  noteCount: number
}

type Filter = "all" | "pro" | "free" | "admin"

/** A neutral chip on the plate: GRATIS, ZEGT OP, the store a Pro came from. */
const FLAG = "inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/75"

function formatDate(d?: string): string {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * Gebruikersbeheer, in the immersive shell.
 *
 * This is the densest screen in the product and the only one with a destructive
 * action on it, so it gets the least picture of anything: a heading set into the
 * landscape, and from the filter bar down a single near-opaque plate that the
 * table lives on. The table scrolls inside its own container - the page body
 * never scrolls sideways.
 *
 * NOTHING about behaviour changed here. `deleteUser` still asks the same
 * question with the same words, still calls DELETE /api/admin/users/[id], and
 * still leaves the server-side guards - archive-before-delete in
 * lib/accountArchive.ts and the rule that an admin account cannot be deleted at
 * all - to do their work. `patchUser` and `reconcileUser` are untouched too.
 * The destructive menu item is if anything louder than it was: it keeps its
 * icon, its separator and its red type.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users?limit=500")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter(u => {
      if (filter === "pro" && !u.isPro) return false
      if (filter === "free" && u.isPro) return false
      if (filter === "admin" && !u.isAdmin) return false
      if (!term) return true
      return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    })
  }, [users, search, filter])

  async function patchUser(id: string, patch: Partial<Pick<AdminUser, "isAdmin" | "subscribed">>) {
    setPendingId(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: "err", msg: data?.error || "Bijwerken mislukt" })
        return
      }
      setUsers(prev => prev.map(u => (u._id === id ? { ...u, ...patch } : u)))
      setToast({ type: "ok", msg: "Bijgewerkt" })
    } catch {
      setToast({ type: "err", msg: "Netwerkfout" })
    } finally {
      setPendingId(null)
    }
  }

  /**
   * Re-derives one account's billing state from Stripe. Preferred over the
   * manual Pro toggle: the toggle sets a flag the next Stripe event overwrites,
   * while this makes the database agree with what is actually being billed.
   */
  async function reconcileUser(u: AdminUser) {
    setPendingId(u._id)
    try {
      const res = await fetch("/api/admin/reconcile-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u._id, repairDocuments: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setToast({ type: "err", msg: data?.details || data?.error || "Synchroniseren mislukt" })
        return
      }
      // Two kinds of repair come back, and reporting only the billing one made
      // the button lie: an account whose Stripe state was already correct but
      // whose document carried an invalid `readChapters` key was repaired and
      // then reported as "was al in sync", so the admin had no way to tell the
      // fix had happened.
      const billingRepaired = data.billingRepairs?.length ?? 0
      const documentsRepaired = data.documentRepairs?.length ?? 0
      const parts = []
      if (billingRepaired > 0) parts.push("bijgewerkt vanuit Stripe")
      if (documentsRepaired > 0) parts.push("ongeldige readChapters-sleutel verwijderd")
      setToast({
        type: "ok",
        msg: parts.length > 0 ? `${u.email}: ${parts.join(" en ")}` : `${u.email} was al in sync`,
      })
      await fetchUsers()
    } catch {
      setToast({ type: "err", msg: "Netwerkfout" })
    } finally {
      setPendingId(null)
    }
  }

  async function deleteUser(u: AdminUser) {
    if (!confirm(`Weet je zeker dat je ${u.name || u.email} permanent wilt verwijderen? Notities worden ook gewist.`)) return
    setPendingId(u._id)
    try {
      const res = await fetch(`/api/admin/users/${u._id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setToast({ type: "err", msg: data?.error || "Verwijderen mislukt" })
        return
      }
      setUsers(prev => prev.filter(x => x._id !== u._id))
      setToast({ type: "ok", msg: `${u.email} verwijderd` })
    } catch {
      setToast({ type: "err", msg: "Netwerkfout" })
    } finally {
      setPendingId(null)
    }
  }

  const counts = useMemo(() => ({
    all: users.length,
    pro: users.filter(u => u.isPro).length,
    free: users.filter(u => !u.isPro).length,
    admin: users.filter(u => u.isAdmin).length,
  }), [users])

  return (
    <SceneShell backdrop="reader" header rail>
      {/* -- The sky --------------------------------------------------- */}
      <section aria-labelledby="gebruikers-titel" className="pb-8 pt-6">
        <div className="scene-sky max-w-[46rem]">
          <Link
            href="/admin"
            className="text-xs font-medium text-white/70 no-underline outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
          >
            ← Terug naar overzicht
          </Link>
          <p className={`${EYEBROW} mt-4`} style={{ color: TEAL_ON_DARK }}>
            Admin
          </p>
          <h1
            id="gebruikers-titel"
            className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Gebruikersbeheer
          </h1>
          {loading ? (
            <SceneSkeleton className="mt-3 h-4 w-64" />
          ) : (
            <p className="content-in mt-3 text-sm tabular-nums text-white/80">
              {`${counts.all} gebruikers · ${counts.pro} Pro · ${counts.admin} admin${counts.admin === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
      </section>

      {/* -- The desk: from here down nothing is translucent ------------ */}
      <div className="pb-20">
        <section className={`p-4 sm:p-5 ${DATA_PANEL}`} aria-labelledby="gebruikers-lijst">
          <SectionHeading
            id="gebruikers-lijst"
            title="Alle accounts"
            subtitle="Zoek, filter en beheer rechten en abonnementen"
          />

          {/* Filters bar */}
          <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              {/* Names the field; not decoration. */}
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" aria-hidden />
              <Input
                placeholder="Zoek op naam of e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Zoek op naam of e-mail"
                className="border-white/25 bg-black/40 pl-9 text-white placeholder:text-white/55 focus-visible:ring-white focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { k: "all", label: "Alle", n: counts.all },
                { k: "pro", label: "Pro", n: counts.pro },
                { k: "free", label: "Gratis", n: counts.free },
                { k: "admin", label: "Admins", n: counts.admin },
              ] as { k: Filter; label: string; n: number }[]).map(opt => {
                const active = filter === opt.k
                return (
                  <button
                    key={opt.k}
                    onClick={() => setFilter(opt.k)}
                    aria-pressed={active}
                    className={active ? ADMIN_CHIP_ACTIVE : ADMIN_CHIP}
                    style={active ? { backgroundColor: TEAL_DEEP } : undefined}
                  >
                    {opt.label}{" "}
                    <span className={`tabular-nums ${active ? "text-white/80" : "text-white/60"}`}>· {opt.n}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table */}
          <div className="mt-4">
            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <SceneSkeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <h3 className="text-base font-semibold text-white">Geen gebruikers gevonden</h3>
                <p className="mt-1 text-sm text-white/70">
                  Pas je zoekopdracht of filters aan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${ROW_LINE} ${TABLE_HEAD}`}>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Gebruiker</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">Notities</th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">Streak</th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold lg:table-cell">Aangemeld</th>
                      <th scope="col" className="w-px px-3 py-2.5">
                        <span className="sr-only">Acties</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const busy = pendingId === u._id
                      return (
                        <tr
                          key={u._id}
                          className={`border-b last:border-b-0 transition-colors hover:bg-white/[0.06] ${ROW_LINE}`}
                        >
                          <td className="px-3 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                aria-hidden
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ring-1 ring-white/20"
                                style={{ backgroundColor: "rgba(13,148,136,0.35)" }}
                              >
                                {(u.name || u.email).slice(0, 1).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-white">{u.name || "Naamloos"}</p>
                                <p className="truncate text-xs text-white/65">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {u.isPro ? (
                                <ProBadge size="xs" className="text-[10px]" />
                              ) : (
                                <span className={FLAG}>GRATIS</span>
                              )}
                              {u.isComped && (
                                <span
                                  title="Pro zonder betaling - reviewaccount of handmatig toegekend. Telt niet mee in MRR."
                                  className={FLAG}
                                >
                                  GRATIS
                                </span>
                              )}
                              {u.storePremium && (
                                <span className={FLAG}>
                                  {u.storePremiumPlatform === "apple" ? <Apple size={9} aria-hidden /> : <Smartphone size={9} aria-hidden />}
                                  {u.storePremiumPlatform === "apple" ? "APPLE" : "GOOGLE"}
                                </span>
                              )}
                              {u.subscriptionStatus && u.subscriptionStatus !== "active" && (
                                <span
                                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{ backgroundColor: "rgba(251,191,36,0.18)", color: WARN }}
                                >
                                  {u.subscriptionStatus.toUpperCase()}
                                </span>
                              )}
                              {u.cancelAtPeriodEnd && <span className={FLAG}>ZEGT OP</span>}
                              {/* The signal that would have caught the missed webhook:
                                  money changed hands, nothing granted access. */}
                              {u.needsReconcile && (
                                <span
                                  title="Stripe-klant zonder abonnementsstatus - controleer of deze gebruiker betaalt"
                                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{ backgroundColor: "rgba(248,113,113,0.2)", color: DANGER }}
                                >
                                  <AlertTriangle size={9} aria-hidden /> CONTROLEER
                                </span>
                              )}
                              {u.isAdmin && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{ backgroundColor: "rgba(45,212,191,0.18)", color: TEAL_ON_DARK }}
                                >
                                  <ShieldCheck size={9} aria-hidden /> ADMIN
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden px-3 py-3 tabular-nums text-white/85 md:table-cell">{u.noteCount}</td>
                          <td className="hidden px-3 py-3 tabular-nums text-white/85 md:table-cell">{u.streak}</td>
                          <td className="hidden whitespace-nowrap px-3 py-3 tabular-nums text-white/65 lg:table-cell">{formatDate(u.createdAt)}</td>
                          <td className="px-3 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  disabled={busy}
                                  aria-label={`Acties voor ${u.name || u.email}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                                >
                                  <MoreVertical size={15} aria-hidden />
                                </button>
                              </DropdownMenuTrigger>
                              {/* The menu keeps the app's own popover surface on
                                  purpose: it is a floating control layer, not
                                  something sitting on the landscape, and the
                                  destructive item's `text-destructive` is the
                                  colour the rest of the product uses to mean
                                  "this one deletes". Nothing here is restyled. */}
                              <DropdownMenuContent align="end" className="w-52">
                                {u.isAdmin ? (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { isAdmin: false })}>
                                    <ShieldOff className="mr-2 h-4 w-4" /> Admin-rechten intrekken
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { isAdmin: true })}>
                                    <ShieldPlus className="mr-2 h-4 w-4" /> Tot admin maken
                                  </DropdownMenuItem>
                                )}
                                {u.hasStripe && (
                                  <DropdownMenuItem onClick={() => reconcileUser(u)}>
                                    <RefreshCw className="mr-2 h-4 w-4" /> Synchroniseren met Stripe
                                  </DropdownMenuItem>
                                )}
                                {u.subscribed ? (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { subscribed: false })}>
                                    <UserX className="mr-2 h-4 w-4" /> Pro handmatig deactiveren
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { subscribed: true })}>
                                    <Sparkles className="mr-2 h-4 w-4" /> Pro handmatig activeren
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => deleteUser(u)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Verwijderen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className="animate-in fade-in slide-in-from-bottom-2 fixed bottom-6 right-6 z-50" role="status">
          <div
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
            style={
              toast.type === "ok"
                ? {
                    backgroundColor: "rgba(11,18,32,0.96)",
                    color: "#FFFFFF",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), 0 18px 40px -18px rgba(0,0,0,0.9)",
                  }
                : {
                    backgroundColor: "rgba(30,10,12,0.96)",
                    color: DANGER,
                    boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.45), 0 18px 40px -18px rgba(0,0,0,0.9)",
                  }
            }
          >
            {toast.type === "ok" ? (
              <ShieldCheck size={14} style={{ color: TEAL_ON_DARK }} aria-hidden />
            ) : (
              <X size={14} aria-hidden />
            )}
            {toast.msg}
          </div>
        </div>
      )}
    </SceneShell>
  )
}
