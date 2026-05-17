"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "../../components/ui/button"
import { CheckCircle, BookOpen, Sparkles, Calendar } from "lucide-react"
import { useSession } from "next-auth/react"
import { LoadingSpinner } from "../../components/ui/loading-spinner"
import { useTranslation } from "../i18n/client"

export default function SuccessPage() {
  const { t } = useTranslation("success")
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session_id")
  const [status, setStatus] = useState("loading")
  const { update } = useSession()

  useEffect(() => {
    // Redirect if no sessionId is found
    if (!sessionId) {
      router.replace("/subscribe")
      return
    }

    const verifySession = async () => {
      try {
      
        const response = await fetch("/api/verify-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        })

        if (response.ok) {
          await update()
          setStatus("success")
        } else {
          router.replace("/subscribe")
        }
      } catch {
        router.replace("/subscribe")
      }
    }

    verifySession()
  }, [sessionId, router, update])

  return (
    <div className="w-full pb-6 pt-0">
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-black px-4">
        <div className="w-full max-w-2xl">
          {status === "loading" ? (
            <LoadingSpinner fullHeight message={t("verifying")} />
          ) : (
            <div className="shadow-lg border dark:shadow-gray-900/20 bg-white dark:bg-[#23263a]">
              {/* Header */}
              <div className="p-8 border-b border-border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h1 className="text-3xl  font-bold text-center text-foreground mb-2">
                  {t("title")}
                </h1>
                <p className="text-center text-muted-foreground ">
                  {t("subtitle")}
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                <h2 className="text-xl  font-semibold text-center text-foreground mb-3">
                  {t("status")}
                </h2>

                <p className="text-center text-muted-foreground max-w-xl mx-auto mb-8 ">
                  {t("message")}
                </p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="p-6 border border-border bg-white dark:bg-[#1a1d2e] shadow-sm">
                    <div className="flex items-center mb-3">
                      <BookOpen className="h-5 w-5 text-teal-600 mr-3" />
                      <h3 className=" font-semibold text-foreground">{t("features.full_access")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground ">
                      {t("features.full_access_desc")}
                    </p>
                  </div>

                  <div className="p-6 border border-border bg-white dark:bg-[#1a1d2e] shadow-sm">
                    <div className="flex items-center mb-3">
                      <Sparkles className="h-5 w-5 text-teal-600 mr-3" />
                      <h3 className=" font-semibold text-foreground">{t("features.advanced")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground ">
                      {t("features.advanced_desc")}
                    </p>
                  </div>

                  <div className="p-6 border border-border bg-white dark:bg-[#1a1d2e] shadow-sm">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-5 w-5 text-teal-600 mr-3" />
                      <h3 className=" font-semibold text-foreground">{t("features.billing")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground ">
                      {t("features.billing_desc")}
                    </p>
                  </div>
                </div>

                {sessionId && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center  mb-8">
                    {t("reference")} {sessionId.substring(0, 16)}...
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-center gap-4">
                  <Link href={`/study`}>
                    <Button className="bg-[#798777] hover:bg-[#6a7a68] text-white  rounded-lg">
                      {t("cta_study")}
                    </Button>
                  </Link>
                  <Link href={`/courses`}>
                    <Button variant="outline" className="border-border text-foreground hover:bg-gray-50 dark:hover:bg-gray-800  rounded-lg">
                      {t("cta_courses")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

