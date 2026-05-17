"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "../i18n/client"
import { redirect } from "next/navigation"
import { ProfileForm } from "../../components/profile/profile-form"
import { ProfileImageUpload } from "../../components/profile/profile-image-upload"
import { SubscriptionStatus } from "../../components/profile/subscription-status"
import { getSession } from "next-auth/react"
import { ShieldCheck } from "lucide-react"
import UserBadges from "../../components/profile/badges"
import { LoadingSpinner } from "../../components/ui/loading-spinner"

export default function ProfilePage() {
  const { t } = useTranslation("profile")
  interface User {
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

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Add this effect to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function fetchUserData() {
      try {
        const session = await getSession()

        if (!session || !session.user) {
          return redirect("/api/auth/signin")
        }

        const response = await fetch("/api/user")
        if (!response.ok) {
          throw new Error("Failed to fetch user data")
        }

        const data = await response.json()
        if (!data.user) {
          throw new Error("User not found")
        }

        setUser(data.user)
      } catch (err) {
        console.error("Error fetching user:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [mounted]) // Only depend on mounted state

  if (!mounted || loading) {
    return <LoadingSpinner fullHeight />
  }

  if (error || !user) {
    return (
      <div className="w-full pb-6 pt-0">
        <div className="p-4 shadow-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <h2 className=" text-lg font-bold text-red-700 dark:text-red-300">{t("error_loading_profile")}</h2>
          <p className=" mt-2 text-red-600 dark:text-red-400">{error || t("user_not_found")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t("your_profile")}
              </h1>
              {user.isAdmin && (
                <span className="text-xs px-2 py-1 bg-purple-600 text-white flex items-center gap-1 shadow-sm rounded-sm">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Admin</span>
                </span>
              )}
            </div>
            <p className=" text-muted-foreground">
              {t("profile_description", { defaultValue: "Manage your account settings and preferences" })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-card rounded-lg border border-border">
              <div className="p-6 border-b border-border">
                <h2 className=" text-lg font-bold text-foreground">
                  {t("personal_information")}
                </h2>
              </div>
              <div className="p-6">
                <ProfileForm 
                  initialName={user.name} 
                  initialEmail={user.email} 
                  initialBio={user.bio || ""} 
                />
              </div>
            </div>

            {/* Badges Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-border">
              <div className="p-6 border-b border-border">
                <h2 className=" text-lg font-bold text-foreground">
                  {t("your_badges", { defaultValue: "Your Badges" })}
                </h2>
              </div>
              <div className="p-6">
                <UserBadges earned={user.badges || []} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Profile Picture */}
            <div className="bg-white dark:bg-card rounded-lg border border-border">
              <div className="p-6 border-b border-border">
                <h2 className=" text-lg font-bold text-foreground">
                  {t("profile_picture")}
                </h2>
              </div>
              <div className="p-6 flex flex-col items-center">
                <ProfileImageUpload 
                  initialImage={user.image} 
                  userName={user.name} 
                />
              </div>
            </div>

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

