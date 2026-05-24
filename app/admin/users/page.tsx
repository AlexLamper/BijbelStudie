"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Search, ShieldCheck, Sparkles, MoreVertical,
  Trash2, ShieldOff, ShieldPlus, Crown, UserX, X, Users as UsersIcon,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu"
import { Input } from "../../../components/ui/input"

interface AdminUser {
  _id: string
  name: string
  email: string
  image?: string
  isAdmin: boolean
  subscribed: boolean
  streak: number
  createdAt: string
  lastStreakDate?: string
  hasStripe: boolean
  onboardingCompleted: boolean
  noteCount: number
}

type Filter = "all" | "pro" | "free" | "admin"

const TEAL = "#0D9488"

function formatDate(d?: string): string {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
}

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
      if (filter === "pro" && !u.subscribed) return false
      if (filter === "free" && u.subscribed) return false
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
    pro: users.filter(u => u.subscribed).length,
    free: users.filter(u => !u.subscribed).length,
    admin: users.filter(u => u.isAdmin).length,
  }), [users])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground no-underline mb-1.5">
              <ArrowLeft size={12} /> Terug naar overzicht
            </Link>
            <h1 className="text-xl font-bold text-foreground">Gebruikersbeheer</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? "Laden..." : `${counts.all} gebruikers · ${counts.pro} Pro · ${counts.admin} admin${counts.admin === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 space-y-5">

          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam of e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-card"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
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
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      active
                        ? "border-transparent text-white"
                        : "border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-secondary text-foreground",
                    ].join(" ")}
                    style={active ? { backgroundColor: TEAL } : undefined}
                  >
                    {opt.label} <span className={active ? "opacity-80" : "text-muted-foreground"}>· {opt.n}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 rounded animate-pulse bg-gray-100 dark:bg-secondary" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Geen gebruikers gevonden</h3>
                <p className="text-sm text-muted-foreground">
                  Pas je zoekopdracht of filters aan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-secondary/40 border-b border-border">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Gebruiker</th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Notities</th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Streak</th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Aangemeld</th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const busy = pendingId === u._id
                      return (
                        <tr key={u._id} className="border-b border-border last:border-b-0 hover:bg-gray-50/60 dark:hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}>
                                {(u.name || u.email).slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{u.name || "Naamloos"}</p>
                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {u.subscribed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#D97706" }}>
                                  <Crown size={9} /> PRO
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-secondary text-muted-foreground">
                                  GRATIS
                                </span>
                              )}
                              {u.isAdmin && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}>
                                  <ShieldCheck size={9} /> ADMIN
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-foreground">{u.noteCount}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-foreground">{u.streak}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{formatDate(u.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  disabled={busy}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-secondary text-muted-foreground disabled:opacity-50"
                                >
                                  <MoreVertical size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                {u.isAdmin ? (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { isAdmin: false })}>
                                    <ShieldOff className="h-4 w-4 mr-2" /> Admin-rechten intrekken
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { isAdmin: true })}>
                                    <ShieldPlus className="h-4 w-4 mr-2" /> Tot admin maken
                                  </DropdownMenuItem>
                                )}
                                {u.subscribed ? (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { subscribed: false })}>
                                    <UserX className="h-4 w-4 mr-2" /> Pro deactiveren
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => patchUser(u._id, { subscribed: true })}>
                                    <Sparkles className="h-4 w-4 mr-2" /> Pro activeren
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => deleteUser(u)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" /> Verwijderen
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
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div
            className={[
              "flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-sm",
              toast.type === "ok"
                ? "bg-white dark:bg-card border-border text-foreground"
                : "bg-destructive/10 border-destructive/40 text-destructive",
            ].join(" ")}
          >
            {toast.type === "ok" ? (
              <ShieldCheck size={14} style={{ color: TEAL }} />
            ) : (
              <X size={14} />
            )}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
