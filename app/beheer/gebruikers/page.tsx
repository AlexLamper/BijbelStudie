"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Search, ShieldCheck, MoreVertical,
  Trash2, ShieldOff, ShieldPlus, UserCheck, UserX, X,
  AlertTriangle, RefreshCw, Apple, Smartphone, ChevronLeft, Gift, Globe,
  ChevronDown, ChevronUp, CreditCard, Receipt, Clock, Info,
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
  GOOD,
  INSET,
  isRecentlyActive,
  relativeTime,
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
  /** End of a time-limited grant; null when the grant is open-ended. */
  compedProUntil: string | null
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
  lastStreakDate?: string | null
  hasStripe: boolean
  onboardingCompleted: boolean
  noteCount: number
  /** Null on accounts made before this was recorded. */
  signupPlatform: ClientPlatform | "unknown" | null
  /** Last use per client; null = never seen there. */
  platformsSeenAt?: Record<ClientPlatform, string | null>
  /** The step this account is on, from lib/billingJourney. */
  journey: JourneySummary
}

type BillingStage =
  | "free" | "reverse_trial" | "free_after_reverse_trial" | "comped_until" | "comped_open" | "admin"
  | "stripe_trial" | "stripe_active" | "stripe_canceling" | "stripe_paused" | "stripe_past_due"
  | "stripe_payment_failed" | "stripe_canceled" | "store_trial" | "store_active" | "store_lapsed"

interface BillingIssue {
  code: string
  level: "warn" | "error"
  message: string
}

interface JourneySummary {
  stage: BillingStage
  label: string
  explanation: string
  channel: "stripe" | "apple" | "google" | "comp" | "reverse_trial" | "admin" | null
  hasPaid: boolean
  willCharge: boolean
  nextChargeAt: string | null
  accessUntil: string | null
  interval: "monthly" | "annual" | null
  trialKind: "reverse" | "stripe" | "store" | null
  trialEndsAt: string | null
  issues: BillingIssue[]
}

interface InvoiceLine {
  id: string
  status: string | null
  amountPaidCents: number
  amountDueCents: number
  currency: string
  createdAt: string
  isTrialInvoice: boolean
  hostedUrl: string | null
}

interface BillingReport {
  user: { id: string; name: string | null; email: string | null; createdAt: string | null }
  journey: JourneySummary & { plan: { interval: "monthly" | "annual" | null; priceId: string | null; biller: string | null }; trial: { kind: string | null; startedAt: string | null; endsAt: string | null; over: boolean; daysUsed: number | null }; firstPaidAt: string | null }
  fields: Record<string, unknown>
  stripe: {
    configured: boolean
    mode: string
    customerId: string | null
    subscription: {
      id: string
      status: string
      priceId: string | null
      amountCents: number | null
      currency: string | null
      interval: "monthly" | "annual" | null
      trialStart: string | null
      trialEnd: string | null
      currentPeriodEnd: string | null
      cancelAtPeriodEnd: boolean
      hasPaymentMethod: boolean
      collectionPaused: boolean
    } | null
    invoices: InvoiceLine[]
    totalPaidCents: number | null
    error: string | null
  }
}

/**
 * How each step reads on screen. `tone` is the hue, not the wording:
 *  - good: money is coming in, or will;
 *  - info: free access that ends by itself and never charges;
 *  - warn: something is waiting on the reader (opzegging, gepauzeerd);
 *  - bad: a payment problem.
 */
const STAGE_TONE: Record<BillingStage, "good" | "info" | "warn" | "bad" | "flat"> = {
  free: "flat",
  reverse_trial: "info",
  free_after_reverse_trial: "flat",
  comped_until: "info",
  comped_open: "info",
  admin: "info",
  stripe_trial: "good",
  stripe_active: "good",
  stripe_canceling: "warn",
  stripe_paused: "warn",
  stripe_past_due: "bad",
  stripe_payment_failed: "bad",
  stripe_canceled: "flat",
  store_trial: "good",
  store_active: "good",
  store_lapsed: "flat",
}

function euros(cents: number | null | undefined, currency = "EUR"): string {
  if (cents === null || cents === undefined) return "-"
  return `${currency === "EUR" ? "€" : `${currency} `}${(cents / 100).toFixed(2).replace(".", ",")}`
}

const INTERVAL_LABEL: Record<"monthly" | "annual", string> = { monthly: "Maandelijks", annual: "Jaarlijks" }

type ClientPlatform = "ios" | "android" | "web"

const PLATFORM_LABEL: Record<ClientPlatform, string> = { ios: "iOS", android: "Android", web: "Web" }

type Filter = "all" | "pro" | "free" | "paying" | "issues" | "admin"

/** `compMonths` is an action, not a field: it grants Pro for that many months. */
type UserPatch = Partial<Pick<AdminUser, "isAdmin" | "subscribed">> & { compMonths?: number }

/** A neutral chip: GRATIS, ZEGT OP, the store a Pro came from. */
const FLAG =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-line-soft px-[7px] py-[2px] text-[10.5px] font-semibold text-ink-muted"

function formatDate(d?: string): string {
  if (!d) return "-"
  const date = new Date(d)
  const datePart = date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
  const timePart = date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
  return `${datePart}, ${timePart}`
}

function shortDate(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).toUpperCase()
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
  /** The account whose billing panel is open; one at a time, it costs a Stripe call. */
  const [openBillingId, setOpenBillingId] = useState<string | null>(null)

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
      if (filter === "paying" && !(u.journey?.hasPaid || u.journey?.willCharge)) return false
      if (filter === "issues" && !(u.journey?.issues?.length)) return false
      if (!term) return true
      return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    })
  }, [users, search, filter])

  async function patchUser(id: string, patch: UserPatch) {
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
      // The server answers with the flags it actually wrote - a grant moves more
      // of them than the patch names.
      const { compMonths, ...optimistic } = patch
      const next: Partial<AdminUser> = data?.user
        ? { subscribed: data.user.subscribed, isAdmin: data.user.isAdmin, compedProUntil: data.user.compedProUntil ?? null }
        : optimistic
      setUsers(prev =>
        prev.map(u =>
          u._id === id
            ? { ...u, ...next, isPro: Boolean((next.subscribed ?? u.subscribed) || u.storePremium || (next.isAdmin ?? u.isAdmin)) }
            : u,
        ),
      )
      setToast({
        type: "ok",
        msg: compMonths ? `Pro toegekend voor ${compMonths} ${compMonths === 1 ? "maand" : "maanden"}` : "Bijgewerkt",
      })
      // The step is derived on the server from fields this patch moved, so the
      // optimistic row above would keep showing the old one ("CADEAU" after the
      // gift was revoked). Re-read rather than re-derive it here.
      await fetchUsers()
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
    // Everyone money has come from or is coming from: the number "Pro" was
    // being read as and never was.
    paying: users.filter(u => u.journey?.hasPaid || u.journey?.willCharge).length,
    issues: users.filter(u => u.journey?.issues?.length).length,
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
                  { k: "paying", label: "Betalend", n: counts.paying },
                  { k: "issues", label: "Controleer", n: counts.issues },
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
                        <div className="mt-2">
                          <BillingSummary user={u} />
                          <BillingToggle
                            open={openBillingId === u._id}
                            onClick={() => setOpenBillingId(openBillingId === u._id ? null : u._id)}
                          />
                        </div>
                        {openBillingId === u._id && (
                          <div className="mt-2">
                            <BillingPanel userId={u._id} />
                          </div>
                        )}
                        <p className="mt-2 text-[11.5px] text-ink-muted tabular-nums">
                          {`${u.noteCount} notities · ${u.streak} dagen reeks · lid sinds ${formatDate(u.createdAt)}`}
                        </p>
                        <div className="mt-1">
                          <LastActive iso={u.lastStreakDate} />
                        </div>
                        <div className="mt-2">
                          <Platforms user={u} />
                        </div>
                      </div>
                      <div className="flex-none">{actions(u)}</div>
                    </li>
                  ))}
                </ul>

                {/* -- md and up: the table --------------------------------- */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[880px]">
                    <thead>
                      <tr className={`border-t ${ROW_LINE} ${TABLE_HEAD}`}>
                        <th scope="col" className="px-5 py-[10px] font-semibold">Gebruiker</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Status</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Betaling</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Platform</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Notities</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Reeks</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Lid sinds</th>
                        <th scope="col" className="px-3 py-[10px] font-semibold">Laatst actief</th>
                        <th scope="col" className="w-px px-5 py-[10px]">
                          <span className="sr-only">Acties</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(u => (
                        <Fragment key={u._id}>
                        <tr
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
                          <td className="max-w-[240px] px-3 py-3">
                            <BillingSummary user={u} />
                            <BillingToggle
                              open={openBillingId === u._id}
                              onClick={() => setOpenBillingId(openBillingId === u._id ? null : u._id)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Platforms user={u} />
                          </td>
                          <td className="px-3 py-3 text-[12.5px] tabular-nums text-ink-body">{u.noteCount}</td>
                          <td className="px-3 py-3 text-[12.5px] tabular-nums text-ink-body">{u.streak}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-[12.5px] tabular-nums text-ink-muted">{formatDate(u.createdAt)}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <LastActive iso={u.lastStreakDate} />
                          </td>
                          <td className="px-5 py-3 text-right">{actions(u)}</td>
                        </tr>
                        {openBillingId === u._id && (
                          <tr className={`border-t ${ROW_LINE}`}>
                            <td colSpan={9} className="bg-sunken px-5 py-4">
                              <BillingPanel userId={u._id} />
                            </td>
                          </tr>
                        )}
                        </Fragment>
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

/** Same dot and wording as "Laatst actief" in the users card on /beheer. */
function LastActive({ iso }: { iso?: string | null }) {
  return (
    <span className="inline-flex items-center gap-[6px]">
      <span
        className="h-[7px] w-[7px] flex-none rounded-full"
        style={{ backgroundColor: isRecentlyActive(iso) ? "var(--success-fill)" : "var(--line-strong)" }}
        aria-hidden
      />
      <span className="truncate text-[12.5px] text-ink-muted">
        {iso ? relativeTime(iso) : "onbekend"}
      </span>
    </span>
  )
}

/**
 * Where the account was made, then a chip per client it has been used on,
 * most recent first. Hover a chip for when.
 */
function Platforms({ user: u }: { user: AdminUser }) {
  const seen = (Object.keys(PLATFORM_LABEL) as ClientPlatform[])
    .filter(p => u.platformsSeenAt?.[p])
    .sort((a, b) => Date.parse(u.platformsSeenAt![b]!) - Date.parse(u.platformsSeenAt![a]!))
  const signup =
    u.signupPlatform && u.signupPlatform !== "unknown" ? PLATFORM_LABEL[u.signupPlatform] : "onbekend"
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="whitespace-nowrap text-[11.5px] text-ink-muted">Aangemaakt: {signup}</span>
      {seen.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {seen.map(p => (
            <span
              key={p}
              title={`Laatst gebruikt op ${PLATFORM_LABEL[p]}: ${formatDate(u.platformsSeenAt![p]!)}`}
              className={FLAG}
            >
              <PlatformIcon platform={p} />
              {PLATFORM_LABEL[p].toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PlatformIcon({ platform }: { platform: ClientPlatform }) {
  if (platform === "ios") return <Apple size={10} aria-hidden />
  if (platform === "android") return <Smartphone size={10} aria-hidden />
  return <Globe size={10} aria-hidden />
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
      {u.compedProUntil ? (
        <span
          title="Gratis Pro-periode. Stopt automatisch op deze datum; daarna betaalt de gebruiker zelf."
          className={FLAG}
        >
          TOT {shortDate(u.compedProUntil)}
        </span>
      ) : u.isComped ? (
        <span
          title="Pro zonder betaling - reviewaccount of handmatig toegekend. Telt niet mee in MRR."
          className={FLAG}
        >
          GRATIS
        </span>
      ) : null}
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
  onPatch: (id: string, patch: UserPatch) => void
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
        {/* Stops by itself; daarna betaalt de gebruiker zelf of valt terug naar
            gratis. Niet aangeboden aan wie al via Stripe of de store betaalt. */}
        {!u.storePremium && !u.subscriptionStatus && (
          <DropdownMenuItem onClick={() => onPatch(u._id, { compMonths: 1 })}>
            <Gift className="mr-2 h-4 w-4" />
            {u.compedProUntil ? "1 maand Pro opnieuw geven" : "1 maand Pro cadeau"}
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

/* ── Billing: which step, which plan, and whether money moved ─────────── */

const TONE_COLOR: Record<"good" | "info" | "warn" | "bad" | "flat", string | null> = {
  good: GOOD,
  info: "var(--ad-teal)",
  warn: WARN,
  bad: DANGER,
  flat: null,
}

/**
 * The step itself. Deliberately not the same chip as PRO: "PRO" says what the
 * reader can do, this says what the billing is doing - and the whole point of
 * this screen is that those two are not the same thing.
 */
function StageChip({ journey }: { journey: JourneySummary }) {
  const color = TONE_COLOR[STAGE_TONE[journey.stage] ?? "flat"]
  if (!color) {
    return <span className={FLAG} title={journey.explanation}>{journey.label}</span>
  }
  return (
    <span
      title={journey.explanation}
      className="inline-flex items-center whitespace-nowrap rounded-full px-[7px] py-[2px] text-[10.5px] font-semibold"
      style={{ backgroundColor: tint(color, 14), color }}
    >
      {journey.label}
    </span>
  )
}

/**
 * One line under the chip that answers "en is er geld?" without opening
 * anything: the plan, and the next charge or the date the free access stops.
 */
function BillingSummary({ user: u }: { user: AdminUser }) {
  const j = u.journey
  if (!j) return <span className="text-[11.5px] text-ink-faint">-</span>
  const plan = j.interval ? INTERVAL_LABEL[j.interval] : null
  const money = j.willCharge
    ? `Afschrijving ${j.nextChargeAt ? shortDate(j.nextChargeAt) : "onbekend"}`
    : j.accessUntil
      ? `Gratis tot ${shortDate(j.accessUntil)}`
      : j.hasPaid
        ? "Geen nieuwe afschrijving"
        : "Nooit betaald"
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <StageChip journey={j} />
        {j.hasPaid && (
          <span className={FLAG} title="Er is minstens één keer echt geld afgeschreven">
            <Receipt size={10} aria-hidden /> BETAALD
          </span>
        )}
        {j.issues.length > 0 && (
          <span
            title={j.issues.map(i => i.message).join("\n")}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-[7px] py-[2px] text-[10.5px] font-semibold"
            style={{
              backgroundColor: tint(j.issues.some(i => i.level === "error") ? DANGER : WARN, 14),
              color: j.issues.some(i => i.level === "error") ? DANGER : WARN,
            }}
          >
            <AlertTriangle size={10} aria-hidden /> {j.issues.length}
          </span>
        )}
      </div>
      <span className="truncate text-[11.5px] text-ink-muted tabular-nums">
        {plan ? `${plan} · ${money}` : money}
      </span>
    </div>
  )
}

function BillingToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-teal hover:underline"
    >
      {open ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
      {open ? "Verberg betaaldetails" : "Betaaldetails"}
    </button>
  )
}

/**
 * Everything about one account's money, fetched on open.
 *
 * The Stripe half is a live read, which is why it is not in the list: it
 * confirms what the derived step claims against the invoices Stripe actually
 * issued. A missing Stripe key or an unreachable Stripe shows as a line of
 * text, never as an empty panel.
 */
function BillingPanel({ userId }: { userId: string }) {
  const [report, setReport] = useState<BillingReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setReport(null)
    setError(null)
    fetch(`/api/admin/users/${userId}/billing`)
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!alive) return
        if (!res.ok) setError(data?.error || "Kon de betaalgegevens niet laden")
        else setReport(data as BillingReport)
      })
      .catch(() => alive && setError("Netwerkfout"))
    return () => {
      alive = false
    }
  }, [userId])

  if (error) {
    return <p className="text-[12.5px]" style={{ color: DANGER }}>{error}</p>
  }
  if (!report) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }

  const j = report.journey
  const sub = report.stripe.subscription
  const paidInvoices = report.stripe.invoices.filter(i => i.amountPaidCents > 0)

  return (
    <div className="flex flex-col gap-3">
      {/* What is happening, in one sentence. The answer to the question an
          admin actually opened this for. */}
      <div className={`${INSET} flex items-start gap-2 px-3 py-2.5`}>
        <Info size={14} className="mt-[2px] flex-none text-ink-muted" aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-ink-body">{j.explanation}</p>
      </div>

      {j.issues.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {j.issues.map(issue => (
            <li
              key={issue.code}
              className="flex items-start gap-2 rounded-[10px] px-3 py-2 text-[12.5px] leading-relaxed"
              style={{
                backgroundColor: tint(issue.level === "error" ? DANGER : WARN, 10),
                color: issue.level === "error" ? DANGER : WARN,
              }}
            >
              <AlertTriangle size={13} className="mt-[2px] flex-none" aria-hidden />
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Field label="Stap" value={j.label} />
        <Field
          label="Gekozen abonnement"
          value={
            j.plan.interval
              ? `${INTERVAL_LABEL[j.plan.interval]}${sub?.amountCents != null ? ` · ${euros(sub.amountCents, sub.currency ?? "EUR")}` : ""}`
              : "geen"
          }
        />
        <Field
          label="Betaald"
          value={
            j.firstPaidAt
              ? `ja, sinds ${shortDate(j.firstPaidAt)}`
              : report.stripe.totalPaidCents
                ? `ja, ${euros(report.stripe.totalPaidCents)}`
                : "nee"
          }
        />
        <Field
          label={j.willCharge ? "Volgende afschrijving" : "Toegang tot"}
          value={
            j.willCharge
              ? j.nextChargeAt
                ? formatDate(j.nextChargeAt)
                : "onbekend"
              : j.accessUntil
                ? formatDate(j.accessUntil)
                : "-"
          }
        />
        <Field label="Kanaal" value={j.channel ?? "geen"} />
        <Field
          label="Proefperiode"
          value={
            j.trial.kind
              ? `${j.trial.kind === "reverse" ? "gratis dagen" : j.trial.kind === "stripe" ? "Stripe" : "store"}${
                  j.trial.startedAt ? ` vanaf ${shortDate(j.trial.startedAt)}` : ""
                }${j.trial.over ? " (voorbij)" : j.trial.endsAt ? ` tot ${shortDate(j.trial.endsAt)}` : ""}`
              : "geen"
          }
        />
        <Field
          label="Kaart/mandaat"
          value={sub ? (sub.hasPaymentMethod ? "ja" : "nee - er kan niets worden afgeschreven") : "n.v.t."}
        />
        <Field label="Stripe-status" value={sub ? `${sub.status} (${report.stripe.mode})` : "geen abonnement"} />
      </dl>

      {/* The money itself. A trial's EUR 0,00 invoice is marked, because it is
          what makes "heeft betaald" look true when nothing was collected. */}
      <div>
        <h4 className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
          <CreditCard size={13} aria-hidden /> Facturen in Stripe
        </h4>
        {report.stripe.error ? (
          <p className="mt-1 text-[12px]" style={{ color: WARN }}>{report.stripe.error}</p>
        ) : report.stripe.invoices.length === 0 ? (
          <p className="mt-1 text-[12px] text-ink-muted">
            {report.stripe.customerId
              ? "Stripe heeft geen facturen voor deze klant."
              : "Dit account is nooit een Stripe-klant geworden - er is dus ook nooit iets afgeschreven."}
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1">
            {report.stripe.invoices.map(inv => (
              <li key={inv.id} className="flex flex-wrap items-center gap-2 text-[12px] tabular-nums text-ink-body">
                <Clock size={11} className="flex-none text-ink-faint" aria-hidden />
                <span className="text-ink-muted">{shortDate(inv.createdAt)}</span>
                <span className="font-semibold">{euros(inv.amountPaidCents, inv.currency)}</span>
                <span className={FLAG}>{(inv.status ?? "?").toUpperCase()}</span>
                {inv.isTrialInvoice && <span className={FLAG}>PROEF, GEEN BEDRAG</span>}
                {inv.hostedUrl && (
                  <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className="text-teal hover:underline">
                    bekijk
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        {paidInvoices.length === 0 && report.stripe.invoices.length > 0 && (
          <p className="mt-1.5 text-[12px] text-ink-muted">
            Geen enkele factuur is met een bedrag betaald - er is tot nu toe niets geïnd.
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-[2px] break-words text-[12.5px] text-ink-body">{value}</dd>
    </div>
  )
}
