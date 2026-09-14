"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Search, ShieldCheck, MoreVertical,
  Trash2, ShieldOff, ShieldPlus, UserCheck, UserX, X,
  AlertTriangle, RefreshCw, Apple, Smartphone, ChevronLeft,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu"
import AppShell from "../../../components/shell/AppShell"
import { Card, Skeleton } from "../../../components/kit/primitives"
import {
  BACK_LINK,
  DANGER,
  HUE_VARS,
  ROW_LINE,
  SEG_ITEM,
  SEG_OFF,
  SEG_ON,
  SEG_TRACK,
  TABLE_HEAD,
  WARN,
  tint,
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

/** A neutral chip: GRATIS, ZEGT OP, the store a Pro came from. */
const FLAG =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-line-soft px-[7px] py-[2px] text-[10.5px] font-semibold text-ink-muted"

function formatDate(d?: string): string {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * Gebruikersbeheer, in the AppShell.
 *
 * The densest screen in the product and the only one with a destructive action
 * on it. From `md` up the accounts are a table inside one card; below `md` the
 * same rows stack as compact list items, so the page body never scrolls
 * sideways.
 *
 * NOTHING about behaviour changed here. `deleteUser` still asks the same
 * question with the same words, still calls DELETE /api/admin/users/[id], and
 * still leaves the server-side guards - archive-before-delete in
 * lib/accountArchive.ts and the rule that an admin account cannot be deleted at
 * all - to do their work. `patchUser` and `reconcileUser` are untouched too.
 * The destructive menu item keeps its icon, its separator and its red type.
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

  const actions = (u: AdminUser) => (
    <UserActions
      user={u}
      busy={pendingId === u._id}
      onPatch={patchUser}
      onReconcile={reconcileUser}
      onDelete={deleteUser}
    />
  )

  return (
    <AppShell title="Gebruikersbeheer" active="/beheer">
      <div className={`flex flex-col gap-4 ${HUE_VARS}`}>
        {/* -- What this is, and the way back ------------------------------ */}
        <div className="flex flex-none flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/beheer" className={BACK_LINK}>
            <ChevronLeft size={15} aria-hidden /> Beheer
          </Link>
          <div className="flex-1" />
          {loading ? (
            <Skeleton className="h-4 w-56" />
          ) : (
            <p className="text-[12px] text-ink-faint tabular-nums">
              {`${counts.all} gebruikers · ${counts.pro} Pro · ${counts.admin} admin${counts.admin === 1 ? "" : "s"}`}
            </p>
          )}
        </div>

        <Card className="flex-none overflow-hidden">
          <section aria-labelledby="gebruikers-lijst">
            <div className="px-4 pt-[14px] sm:px-5">
              <h2 id="gebruikers-lijst" className="text-[15.5px] font-bold text-ink">Alle accounts</h2>
              <p className="mt-1 text-[12.5px] text-ink-muted">Zoek, filter en beheer rechten en abonnementen</p>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col items-stretch gap-3 px-4 py-[14px] sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
              <div className="flex h-[34px] w-full items-center gap-2 rounded-[9px] bg-line-soft px-[11px] sm:w-[260px]">
                {/* Names the field; not decoration. */}
                <Search size={14} className="flex-none text-ink-muted" aria-hidden />
                <input
                  placeholder="Zoek op naam of e-mail..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Zoek op naam of e-mail"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
              <div className={SEG_TRACK} role="group" aria-label="Filter">
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
                      className={`${SEG_ITEM} ${active ? SEG_ON : SEG_OFF}`}
                    >
                      {opt.label}
                      <span className={`tabular-nums ${active ? "text-white/80" : "text-ink-faint"}`}>{opt.n}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 border-t border-line-soft px-4 py-4 sm:px-5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="border-t border-line-soft px-6 py-14 text-center">
                <h3 className="text-[14.5px] font-bold text-ink">Geen gebruikers gevonden</h3>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Pas je zoekopdracht of filters aan.
                </p>
              </div>
            ) : (
              <>
                {/* -- Below md: stacked rows ------------------------------- */}
                <ul className="md:hidden">
                  {filtered.map(u => (
                    <li key={u._id} className={`flex items-start gap-3 border-t px-4 py-3 ${ROW_LINE}`}>
                      <Initial user={u} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{u.name || "Naamloos"}</p>
                        <p className="mt-[2px] truncate text-[11.5px] text-ink-faint">{u.email}</p>
                        <div className="mt-2">
                          <StatusFlags user={u} />
                        </div>
                        <p className="mt-2 text-[11.5px] text-ink-muted tabular-nums">
                          {`${u.noteCount} notities · ${u.streak} reeks · ${formatDate(u.createdAt)}`}
                        </p>
                      </div>
                      <div className="flex-none">{actions(u)}</div>
                    </li>
                  ))}
                </ul>

                {/* -- md and up: the table --------------------------------- */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-t ${ROW_LINE} ${TABLE_HEAD}`}>
                        <th scope="col" className="px-5 py-[10px] font-semibold">Gebruiker</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Status</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Notities</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Reeks</th>
                        <th scope="col" className="hidden px-3 py-[10px] font-semibold lg:table-cell">Aangemeld</th>
                        <th scope="col" className="w-px px-5 py-[10px]">
                          <span className="sr-only">Acties</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(u => (
                        <tr
                          key={u._id}
                          className={`border-t transition-colors hover:bg-sunken ${ROW_LINE}`}
                        >
                          <td className="max-w-[280px] px-5 py-3">
                            <div className="flex min-w-0 items-center gap-[11px]">
                              <Initial user={u} />
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-ink">{u.name || "Naamloos"}</p>
                                <p className="mt-[2px] truncate text-[11.5px] text-ink-faint">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <StatusFlags user={u} />
                          </td>
                          <td className="px-3 py-3 text-[12.5px] tabular-nums text-ink-body">{u.noteCount}</td>
                          <td className="px-3 py-3 text-[12.5px] tabular-nums text-ink-body">{u.streak}</td>
                          <td className="hidden whitespace-nowrap px-3 py-3 text-[12.5px] tabular-nums text-ink-muted lg:table-cell">{formatDate(u.createdAt)}</td>
                          <td className="px-5 py-3 text-right">{actions(u)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="animate-in fade-in slide-in-from-bottom-2 fixed bottom-4 left-4 right-4 z-50 flex justify-end sm:bottom-6 sm:left-auto sm:right-6"
          role="status"
        >
          <div
            className={`flex max-w-full items-center gap-2 rounded-[10px] border bg-surface px-4 py-2.5 text-[13px] shadow-[0_8px_24px_-10px_rgba(17,24,39,.25)] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,.6)] ${HUE_VARS} ${
              toast.type === "ok" ? "border-line text-ink" : "border-danger/40"
            }`}
            style={toast.type === "err" ? { color: DANGER } : undefined}
          >
            {toast.type === "ok" ? (
              <ShieldCheck size={14} className="flex-none text-teal dark:text-teal-400" aria-hidden />
            ) : (
              <X size={14} className="flex-none" aria-hidden />
            )}
            <span className="min-w-0 break-words">{toast.msg}</span>
          </div>
        </div>
      )}
    </AppShell>
  )
}

/* ── Sub components ───────────────────────────────────────────── */

function Initial({ user }: { user: AdminUser }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-line-soft text-[12px] font-semibold text-ink-muted"
    >
      {(user.name || user.email).slice(0, 1).toUpperCase()}
    </span>
  )
}

function StatusFlags({ user: u }: { user: AdminUser }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {u.isPro ? (
        <span className="whitespace-nowrap rounded-full bg-pro-soft px-[7px] py-[2px] text-[10.5px] font-semibold text-gold-ink dark:text-gold-badge">
          PRO
        </span>
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
          {u.storePremiumPlatform === "apple" ? <Apple size={10} aria-hidden /> : <Smartphone size={10} aria-hidden />}
          {u.storePremiumPlatform === "apple" ? "APPLE" : "GOOGLE"}
        </span>
      )}
      {u.subscriptionStatus && u.subscriptionStatus !== "active" && (
        <span
          className="inline-flex items-center whitespace-nowrap rounded-full px-[7px] py-[2px] text-[10.5px] font-semibold"
          style={{ backgroundColor: tint(WARN, 14), color: WARN }}
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
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-[7px] py-[2px] text-[10.5px] font-semibold"
          style={{ backgroundColor: tint(DANGER, 14), color: DANGER }}
        >
          <AlertTriangle size={10} aria-hidden /> CONTROLEER
        </span>
      )}
      {u.isAdmin && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[var(--teal-wash)] px-[7px] py-[2px] text-[10.5px] font-semibold text-teal-dark dark:text-teal-400">
          <ShieldCheck size={10} aria-hidden /> ADMIN
        </span>
      )}
    </div>
  )
}

function UserActions({
  user: u, busy, onPatch, onReconcile, onDelete,
}: {
  user: AdminUser
  busy: boolean
  onPatch: (id: string, patch: Partial<Pick<AdminUser, "isAdmin" | "subscribed">>) => void
  onReconcile: (u: AdminUser) => void
  onDelete: (u: AdminUser) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={busy}
          aria-label={`Acties voor ${u.name || u.email}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-muted outline-none transition-colors hover:bg-line-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
        >
          <MoreVertical size={15} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      {/* The destructive item's `text-destructive` is the colour the rest of
          the product uses to mean "this one deletes". */}
      <DropdownMenuContent align="end" className="w-56">
        {u.isAdmin ? (
          <DropdownMenuItem onClick={() => onPatch(u._id, { isAdmin: false })}>
            <ShieldOff className="mr-2 h-4 w-4" /> Admin-rechten intrekken
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onPatch(u._id, { isAdmin: true })}>
            <ShieldPlus className="mr-2 h-4 w-4" /> Tot admin maken
          </DropdownMenuItem>
        )}
        {u.hasStripe && (
          <DropdownMenuItem onClick={() => onReconcile(u)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Synchroniseren met Stripe
          </DropdownMenuItem>
        )}
        {u.subscribed ? (
          <DropdownMenuItem onClick={() => onPatch(u._id, { subscribed: false })}>
            <UserX className="mr-2 h-4 w-4" /> Pro handmatig deactiveren
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onPatch(u._id, { subscribed: true })}>
            <UserCheck className="mr-2 h-4 w-4" /> Pro handmatig activeren
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(u)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Verwijderen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
