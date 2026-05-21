"use client"

import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "../../app/i18n/client"

export default function SidebarProCTA() {
  const { t } = useTranslation("sidebar")
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSubscription() {
      if (!session) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/user")
        if (response.ok) {
          const data = await response.json()
          if (data.user?.subscribed) {
            setIsSubscribed(true)
          }
        }
      } catch (error) {
        console.error("Failed to check subscription", error)
      } finally {
        setLoading(false)
      }
    }

    checkSubscription()
  }, [session])

  if (loading || isSubscribed) {
    return null
  }

  return (
    <div className="mt-auto px-3 pb-4">
      <div
        onClick={() => router.push("/abonnement")}
        className="bg-[#798777]/8 dark:bg-[#798777]/12 shadow-sm border border-[#798777]/20 dark:border-[#798777]/30 overflow-hidden transition-colors duration-300 p-3 cursor-pointer flex items-center justify-between hover:bg-[#798777]/12 dark:hover:bg-[#798777]/16"
      >
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-[#798777] dark:text-[#9aaa98]" />
          <span className="font-medium text-gray-800 dark:text-gray-200">{t("try_pro_now")}</span>
        </div>
      </div>
    </div>
  )
}

