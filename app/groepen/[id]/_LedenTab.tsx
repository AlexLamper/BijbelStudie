"use client"

import { useState } from "react"
import { Check, Copy, Shield, UserMinus, ChevronDown } from "lucide-react"

interface Member {
  _id: string; name: string; image?: string
}
interface GroupMember {
  userId: Member; role: string; joinedAt: string
}
interface Group {
  _id: string; name: string; description: string; isPublic: boolean
  inviteCode?: string; members: GroupMember[]
}

function Avatar({ name, size = 9 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: "#0D9488", fontSize: size <= 8 ? 11 : 13 }}>
      {initials}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
}

export default function LedenTab({
  group,
  currentUserId,
  currentUserRole,
  onGroupUpdate,
}: {
  group: Group
  currentUserId: string
  currentUserRole: "leader" | "member" | null
  onGroupUpdate: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Group settings form (leader only)
  const [settingsName, setSettingsName] = useState(group.name)
  const [settingsDesc, setSettingsDesc] = useState(group.description)
  const [settingsPublic, setSettingsPublic] = useState(group.isPublic)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  const copyCode = () => {
    if (!group.inviteCode) return
    navigator.clipboard.writeText(group.inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleRoleChange = async (memberId: string, newRole: "leader" | "member") => {
    setActionLoading(memberId + newRole)
    try {
      const res = await fetch(`/api/groepen/${group._id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) onGroupUpdate()
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Weet u zeker dat u ${memberName} wilt verwijderen uit de groep?`)) return
    setActionLoading(memberId + "remove")
    try {
      const res = await fetch(`/api/groepen/${group._id}/members/${memberId}`, { method: "DELETE" })
      if (res.ok) onGroupUpdate()
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setSettingsError(null)
    setSettingsSuccess(false)
    try {
      const res = await fetch(`/api/groepen/${group._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: settingsName, description: settingsDesc, isPublic: settingsPublic }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Opslaan mislukt")
      }
      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 2500)
      onGroupUpdate()
    } catch (e) {
      setSettingsError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Member list */}
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground">
            Leden ({group.members.length})
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-border">
          {group.members.map(m => {
            const isLeader = m.role === "leader"
            const isCurrentUser = m.userId._id === currentUserId
            const loadKey = m.userId._id
            return (
              <div key={m.userId._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.userId.name} size={9} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-foreground truncate">
                      {m.userId.name} {isCurrentUser && <span className="text-gray-400">(u)</span>}
                    </span>
                    {isLeader && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}>
                        <Shield size={8} /> Leider
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-muted-foreground">
                    Lid sinds {formatDate(m.joinedAt)}
                  </p>
                </div>

                {/* Leader actions */}
                {currentUserRole === "leader" && !isCurrentUser && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleRoleChange(m.userId._id, isLeader ? "member" : "leader")}
                      disabled={actionLoading === loadKey + (isLeader ? "member" : "leader")}
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      {isLeader ? "Degraderen" : "Promoveren"}
                    </button>
                    <button
                      onClick={() => handleRemove(m.userId._id, m.userId.name)}
                      disabled={actionLoading === loadKey + "remove"}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                      title="Verwijder lid"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite code */}
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground mb-3">
          Uitnodigingscode
        </p>
        {group.inviteCode ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <code className="font-mono text-xl font-bold tracking-widest text-gray-900 dark:text-foreground">
                {group.inviteCode}
              </code>
              <button onClick={copyCode}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary transition-colors">
                {copied ? <Check size={13} style={{ color: "#0D9488" }} /> : <Copy size={13} />}
                {copied ? "Gekopieerd!" : "Kopieer"}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-muted-foreground">
              Deel deze code om anderen uit te nodigen voor de groep.
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-muted-foreground">Geen uitnodigingscode beschikbaar.</p>
        )}
      </div>

      {/* Group settings — leaders only */}
      {currentUserRole === "leader" && (
        <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground mb-4">
            Groepsinstellingen
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground block mb-1">Naam</label>
              <input
                type="text"
                value={settingsName}
                onChange={e => setSettingsName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-border rounded-lg text-sm bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#0D9488' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-muted-foreground block mb-1">Beschrijving</label>
              <textarea
                value={settingsDesc}
                onChange={e => setSettingsDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 dark:border-border rounded-lg text-sm bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none focus:ring-2 resize-none"
                style={{ '--tw-ring-color': '#0D9488' } as React.CSSProperties}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-foreground">Openbare groep</p>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">Iedereen kan de groep zien en aanvragen</p>
              </div>
              <button
                onClick={() => setSettingsPublic(!settingsPublic)}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${settingsPublic ? "bg-[#0D9488]" : "bg-gray-300 dark:bg-gray-600"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settingsPublic ? "left-5" : "left-1"}`} />
              </button>
            </div>

            {settingsError && (
              <p className="text-xs text-red-600">{settingsError}</p>
            )}
            {settingsSuccess && (
              <p className="text-xs" style={{ color: "#0D9488" }}>Instellingen opgeslagen!</p>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0D9488" }}>
              {settingsSaving ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Opslaan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
