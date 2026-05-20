"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "../i18n/client"
import { redirect } from "next/navigation"
import { ProfileForm } from "../../components/profile/profile-form"
import { ProfileImageUpload } from "../../components/profile/profile-image-upload"
import { SubscriptionStatus } from "../../components/profile/subscription-status"
import { getSession } from "next-auth/react"
import { ShieldCheck, User, Award, Sparkles } from "lucide-react"
import UserBadges from "../../components/profile/badges"
import { LoadingSpinner } from "../../components/ui/loading-spinner"

interface UserData {
  name: string
  email: string
  bio?: string
  image?: string
  _id: string
  enrolledCourses?: string[]
  subscribed?: boolean
  stripeSubscriptionId?: string
  isAdmin?: boolean
  badges?: string[]
}

function SidebarCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
          <Icon size={14} style={{ color: "#0D9488" }} />
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-foreground">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation("profile")

  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    async function fetchUserData() {
      try {
        const session = await getSession()
        if (!session?.user) return redirect("/api/auth/signin")
        const res = await fetch("/api/user")
        if (!res.ok) throw new Error("Failed to fetch user data")
        const data = await res.json()
        if (!data.user) throw new Error("User not found")
        setUser(data.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [mounted])

  if (!mounted || loading) return <LoadingSpinner fullHeight />

  if (error || !user) {
    return (
      <div className="w-full h-full overflow-y-auto">
        <div className="px-6 xl:px-10 py-8">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <p className="font-bold text-red-700 dark:text-red-300">{t("error_loading_profile")}</p>
            <p className="text-sm mt-1 text-red-600 dark:text-red-400">{error || t("user_not_found")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-foreground">{t("your_profile")}</h1>
            {user.isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>
                <ShieldCheck size={11} />
                Admin
              </span>
            )}
            {user.subscribed && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}>
                <Sparkles size={11} />
                Pro
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("profile_description", { defaultValue: "Beheer je accountinstellingen en voorkeuren" })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

          {/* Main column */}
          <div className="flex flex-col gap-5">

            {/* Personal information */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <User size={14} style={{ color: "#0D9488" }} />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-foreground">
                  {t("personal_information")}
                </p>
              </div>
              <div className="p-5">
                <ProfileForm
                  initialName={user.name}
                  initialEmail={user.email}
                  initialBio={user.bio || ""}
                />
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Award size={14} style={{ color: "#0D9488" }} />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-foreground">
                  {t("your_badges", { defaultValue: "Jouw badges" })}
                </p>
              </div>
              <div className="p-5">
                <UserBadges earned={user.badges || []} />
              </div>
            </div>

          </div>

          {/* Sidebar column */}
          <div className="flex flex-col gap-5">

            {/* Profile picture */}
            <SidebarCard title={t("profile_picture")} icon={User}>
              <div className="flex flex-col items-center">
                <ProfileImageUpload
                  initialImage={user.image}
                  userName={user.name}
                />
              </div>
            </SidebarCard>

            {/* Subscription */}
            <SubscriptionStatus
              userId={user._id.toString()}
              subscribed={user.subscribed}
              stripeSubscriptionId={user.stripeSubscriptionId}
              isAdmin={user.isAdmin}
            />

          </div>
        </div>
      </div>
    </div>
  )
}
