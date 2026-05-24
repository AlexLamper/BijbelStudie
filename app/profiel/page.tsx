"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getSession } from "next-auth/react"
import {
  User as UserIcon, ShieldCheck, Sparkles, Award, Crown,
  Camera, Loader2, Check, X, Mail, Flame,
} from "lucide-react"
import UserBadges from "../../components/profile/badges"
import { LoadingSpinner } from "../../components/ui/loading-spinner"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"

const TEAL = "#0D9488"

interface UserData {
  _id: string
  name: string
  email: string
  bio?: string
  image?: string
  subscribed?: boolean
  stripeSubscriptionId?: string
  isAdmin?: boolean
  badges?: string[]
  streak?: number
  createdAt?: string
}

type Status = "idle" | "saving" | "success" | "error"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // editing state
  const [editing, setEditing] = useState<"name" | "bio" | null>(null)
  const [draftName, setDraftName] = useState("")
  const [draftBio, setDraftBio] = useState("")
  const [nameStatus, setNameStatus] = useState<Status>("idle")
  const [bioStatus, setBioStatus] = useState<Status>("idle")

  // image upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageStatus, setImageStatus] = useState<Status>("idle")
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    async function fetchUserData() {
      try {
        const session = await getSession()
        if (!session?.user) {
          router.push("/auth/signin")
          return
        }
        const res = await fetch("/api/user")
        if (!res.ok) throw new Error("Profiel kon niet worden geladen")
        const data = await res.json()
        if (!data.user) throw new Error("Gebruiker niet gevonden")
        setUser(data.user)
        setDraftName(data.user.name || "")
        setDraftBio(data.user.bio || "")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Onbekende fout")
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [mounted, router])

  // auto-clear status indicators
  useEffect(() => {
    if (nameStatus === "success" || nameStatus === "error") {
      const t = setTimeout(() => setNameStatus("idle"), 2500)
      return () => clearTimeout(t)
    }
  }, [nameStatus])
  useEffect(() => {
    if (bioStatus === "success" || bioStatus === "error") {
      const t = setTimeout(() => setBioStatus("idle"), 2500)
      return () => clearTimeout(t)
    }
  }, [bioStatus])
  useEffect(() => {
    if (imageStatus === "success" || imageStatus === "error") {
      const t = setTimeout(() => setImageStatus("idle"), 2500)
      return () => clearTimeout(t)
    }
  }, [imageStatus])

  async function saveName() {
    if (!user) return
    const trimmed = draftName.trim()
    if (!trimmed) {
      setNameStatus("error")
      return
    }
    if (trimmed === user.name) {
      setEditing(null)
      return
    }
    setNameStatus("saving")
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, bio: user.bio || "" }),
      })
      if (!res.ok) throw new Error()
      setUser({ ...user, name: trimmed })
      setNameStatus("success")
      setEditing(null)
    } catch {
      setNameStatus("error")
    }
  }

  async function saveBio() {
    if (!user) return
    const trimmed = draftBio.trim()
    if (trimmed === (user.bio || "")) {
      setEditing(null)
      return
    }
    setBioStatus("saving")
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, bio: trimmed }),
      })
      if (!res.ok) throw new Error()
      setUser({ ...user, bio: trimmed })
      setBioStatus("success")
      setEditing(null)
    } catch {
      setBioStatus("error")
    }
  }

  function cancelEdit() {
    if (!user) return
    setDraftName(user.name || "")
    setDraftBio(user.bio || "")
    setEditing(null)
    setNameStatus("idle")
    setBioStatus("idle")
  }

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Bestand is groter dan 5MB")
      setImageStatus("error")
      return
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Selecteer een afbeelding")
      setImageStatus("error")
      return
    }

    setImageUploading(true)
    setImageError(null)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => resolve(ev.target?.result as string)
        reader.onerror = () => reject(new Error("Kon afbeelding niet lezen"))
        reader.readAsDataURL(file)
      })
      const res = await fetch("/api/user/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl }),
      })
      if (!res.ok) throw new Error("Upload mislukt")
      setUser({ ...user, image: dataUrl })
      setImageStatus("success")
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload mislukt")
      setImageStatus("error")
    } finally {
      setImageUploading(false)
    }
  }

  if (!mounted || loading) return <LoadingSpinner fullHeight />

  if (error || !user) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background">
          <h1 className="text-xl font-bold text-foreground">Profiel</h1>
        </div>
        <div className="px-6 xl:px-10 py-6">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-6">
            <p className="font-bold text-red-700 dark:text-red-300">Profiel laden mislukt</p>
            <p className="text-sm mt-1 text-red-600 dark:text-red-400">{error || "Gebruiker niet gevonden"}</p>
          </div>
        </div>
      </div>
    )
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
    : null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">Profiel</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Beheer je accountgegevens en uiterlijk
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {user.isAdmin && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}
              >
                <ShieldCheck size={11} /> Admin
              </span>
            )}
            {user.subscribed && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
                style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#D97706" }}
              >
                <Crown size={11} /> Pro
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

          {/* Left column */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* Identity / account card */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <UserIcon size={14} style={{ color: TEAL }} />
                </div>
                <p className="text-sm font-bold text-foreground">Accountgegevens</p>
              </div>

              <div className="p-5 space-y-5">
                {/* Name field */}
                <FieldRow label="Gebruikersnaam">
                  {editing === "name" ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName()
                          if (e.key === "Escape") cancelEdit()
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-secondary/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                        maxLength={60}
                      />
                      <button
                        onClick={saveName}
                        disabled={nameStatus === "saving"}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white disabled:opacity-60"
                        style={{ backgroundColor: TEAL }}
                        title="Opslaan"
                      >
                        {nameStatus === "saving" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-secondary text-muted-foreground"
                        title="Annuleren"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate flex-1">{user.name}</p>
                      {nameStatus === "success" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: TEAL }}>
                          <Check size={11} /> Opgeslagen
                        </span>
                      )}
                      {nameStatus === "error" && (
                        <span className="text-[11px] text-destructive">Mislukt</span>
                      )}
                      <button
                        onClick={() => setEditing("name")}
                        className="text-xs font-medium hover:underline"
                        style={{ color: TEAL }}
                      >
                        Bewerken
                      </button>
                    </div>
                  )}
                </FieldRow>

                <div className="h-px bg-border" />

                {/* Email field */}
                <FieldRow label="E-mailadres" hint="Kan niet worden gewijzigd">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={13} />
                    {user.email}
                  </div>
                </FieldRow>

                <div className="h-px bg-border" />

                {/* Bio field */}
                <FieldRow label="Over jou" align="start">
                  {editing === "bio" ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        autoFocus
                        value={draftBio}
                        onChange={(e) => setDraftBio(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Vertel iets over jezelf..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-secondary/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveBio}
                          disabled={bioStatus === "saving"}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-white disabled:opacity-60"
                          style={{ backgroundColor: TEAL }}
                        >
                          {bioStatus === "saving" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Opslaan
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary"
                        >
                          Annuleren
                        </button>
                        <span className="text-[11px] text-muted-foreground ml-auto">{draftBio.length}/500</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <p className={`text-sm flex-1 ${user.bio ? "text-foreground" : "text-muted-foreground italic"}`}>
                        {user.bio || "Nog geen biografie. Voeg er een toe om jezelf voor te stellen."}
                      </p>
                      {bioStatus === "success" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: TEAL }}>
                          <Check size={11} /> Opgeslagen
                        </span>
                      )}
                      <button
                        onClick={() => setEditing("bio")}
                        className="text-xs font-medium hover:underline flex-shrink-0"
                        style={{ color: TEAL }}
                      >
                        {user.bio ? "Bewerken" : "Toevoegen"}
                      </button>
                    </div>
                  )}
                </FieldRow>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Award size={14} style={{ color: TEAL }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Jouw badges</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verdien badges door je dagelijkse studie en mijlpalen te bereiken
                  </p>
                </div>
              </div>
              <div className="p-5">
                <UserBadges earned={user.badges || []} />
              </div>
            </div>

          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">

            {/* Profile image */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Camera size={14} style={{ color: TEAL }} />
                </div>
                <p className="text-sm font-bold text-foreground">Profielfoto</p>
              </div>
              <div className="p-5 flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar className="w-28 h-28 ring-2 ring-border">
                    <AvatarImage src={user.image || ""} alt={user.name} className="object-cover" />
                    <AvatarFallback className="text-2xl font-semibold" style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}>
                      {user.name?.charAt(0)?.toUpperCase() || "G"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={onImageChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-secondary disabled:opacity-60 transition-colors"
                >
                  {imageUploading ? (
                    <><Loader2 size={12} className="animate-spin" /> Uploaden...</>
                  ) : (
                    <><Camera size={12} /> Foto wijzigen</>
                  )}
                </button>
                {imageStatus === "success" && (
                  <p className="mt-2 text-[11px] font-medium flex items-center gap-1" style={{ color: TEAL }}>
                    <Check size={11} /> Bijgewerkt
                  </p>
                )}
                {imageStatus === "error" && (
                  <p className="mt-2 text-[11px] text-destructive">{imageError || "Mislukt"}</p>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground text-center">
                  JPG of PNG · Max 5MB
                </p>
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Crown size={14} style={{ color: TEAL }} />
                </div>
                <p className="text-sm font-bold text-foreground">Abonnement</p>
              </div>
              <div className="p-5">
                {user.subscribed || user.isAdmin ? (
                  <div className="space-y-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}
                    >
                      <Sparkles size={11} />
                      {user.isAdmin ? "Admin toegang" : "Pro actief"}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {user.isAdmin
                        ? "Als admin heb je toegang tot alle Pro-functies."
                        : "Je hebt een actief Pro-abonnement met toegang tot alle premium functies."}
                    </p>
                    {user.stripeSubscriptionId && !user.isAdmin && (
                      <p className="text-[10px] text-muted-foreground font-mono break-all">
                        ID: {user.stripeSubscriptionId}
                      </p>
                    )}
                    {!user.isAdmin && (
                      <Link
                        href="/abonnement"
                        className="inline-flex items-center text-xs font-semibold no-underline"
                        style={{ color: TEAL }}
                      >
                        Beheer abonnement →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upgrade naar Pro voor commentaren, historische context en meer studiehulpmiddelen.
                    </p>
                    <Link
                      href="/abonnement"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 no-underline"
                      style={{ backgroundColor: TEAL }}
                    >
                      <Sparkles size={14} />
                      Upgrade naar Pro
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick info */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Account
              </p>
              <div className="space-y-2.5">
                {memberSince && (
                  <InfoLine label="Lid sinds" value={memberSince} />
                )}
                <InfoLine
                  label="Dagelijkse reeks"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <Flame size={11} style={{ color: user.streak ? "#EA580C" : undefined }} />
                      {user.streak || 0} dag{user.streak === 1 ? "" : "en"}
                    </span>
                  }
                />
                <InfoLine label="Badges verdiend" value={`${(user.badges || []).length}`} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function FieldRow({
  label, hint, children, align = "center",
}: {
  label: string
  hint?: string
  children: React.ReactNode
  align?: "center" | "start"
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:${align === "start" ? "items-start" : "items-center"} gap-2 sm:gap-4`}>
      <div className="sm:w-40 flex-shrink-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1 min-w-0 w-full">{children}</div>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
