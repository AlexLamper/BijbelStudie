"use client"

import { Button } from "../../components/ui/button"
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react"
import { useTranslation } from "../i18n/client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useToast } from "../../hooks/use-toast"
import getStripe from "../../lib/stripe-client"
import { useRouter } from "next/navigation"

export default function SubscribePage() {
  const { t } = useTranslation("subscribe")
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const sellingPoints = t("selling_points", { returnObjects: true }) as string[]
  const features = t("features", { returnObjects: true }) as string[]

  useEffect(() => {
    async function checkSubscription() {
      if (!session) {
        setCheckingSubscription(false)
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
        setCheckingSubscription(false)
      }
    }

    checkSubscription()
  }, [session])

  const handleCheckout = async () => {
    if (!session) {
      toast({
        title: "Not logged in",
        description: "Please sign in to subscribe.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[Subscribe] Checkout API error:", errorData)
        throw new Error(errorData?.error || "Failed to start checkout")
      }

      const data = await response.json()

      if (!data.sessionId) {
        throw new Error("No session ID returned from checkout")
      }

      const stripe = await getStripe()
      if (!stripe) {
        throw new Error("Failed to load Stripe")
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
      if (error) {
        throw error
      }
    } catch (error) {
      console.error("[Subscribe] Checkout error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <main className="mt-12 flex flex-col items-center justify-center bg-background overflow-hidden min-h-[60vh]">
        <div className="w-full max-w-lg text-center px-6">
          <div className="p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl  font-bold text-gray-800 dark:text-white mb-2">
              {t("already_subscribed_title")}
            </h1>
            <p className="text-muted-foreground mb-6 ">
              {t("already_subscribed_message")}
            </p>
            <Button
              onClick={() => router.push("/profile")}
              className="bg-teal-600 hover:bg-teal-700 text-white  rounded-lg"
            >
              {t("go_to_profile")}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mt-12 bg-gray-100 flex flex-col items-center justify-center bg-background overflow-hidden mb-12">
      <div className="w-full max-w-lg text-center px-6">
        <header className="mb-8">
          <h1 className="text-4xl  font-bold text-gray-800 dark:text-white mb-2">
            {t("title")}
          </h1>
          <p className="text-lg  text-muted-foreground">
            {t("subtitle")}
          </p>
        </header>

        <div className="bg-white dark:bg-card border border-gray-200 dark:border-none rounded-2xl p-8 shadow-lg dark:shadow-gray-900/20">
          <div className="mb-6">
            <div className="text-5xl  font-bold text-gray-800 dark:text-white mb-1">
              €9.99
            </div>
            <div className="text-muted-foreground  text-xs">
              {t("billing_info")}
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleCheckout}
            disabled={loading || !session}
            className="w-full px-4 py-4 bg-teal-600 hover:bg-teal-700 text-white  font-normal text-lg rounded-lg"
          >
            {loading ? "Processing..." : t("cta")}
            {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>

          <div className="space-y-2 mt-5">
            {sellingPoints.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-center text-xs  text-muted-foreground"
              >
                <CheckCircle className="h-3 w-3 mr-2 text-teal-600 dark:text-[#9aaa98]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="mt-10 text-gray-700 dark:text-gray-400  text-sm leading-relaxed max-w-md mx-auto">
          <p className="mb-3">{t("description")}</p>
          <ul className="space-y-1">
            {features.map((feature, index) => (
              <li key={index}>• {feature}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
