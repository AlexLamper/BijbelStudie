"use client"

import { ArrowRight, CheckCircle, Loader2, Sparkles, Shield, BookOpen, Zap } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useToast } from "../../hooks/use-toast"
import getStripe from "../../lib/stripe-client"
import { useRouter } from "next/navigation"

type BillingInterval = "monthly" | "annual"

const FEATURES = [
  "Toegang tot bijbelcommentaren",
  "Onbeperkt notities & markeringen",
  "Onbeperkt bijbelleesplannen",
  "Historische context & locaties",
  "Studiegroepen aanmaken",
  "Streak-bevriezingen gebruiken",
]

const WHY_MONTHLY = [
  { icon: Zap,      title: "Direct starten",     body: "Geen jaarlijkse verplichting. Betaal maandelijks en stop wanneer je wil." },
  { icon: Shield,   title: "Altijd opzegbaar",   body: "Volledig flexibel. Geen verborgen kosten, geen gedoe." },
  { icon: BookOpen, title: "Volledige toegang",  body: "Dezelfde functies als het jaarplan - geen verschil in inhoud." },
]

export default function SubscribePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [billing, setBilling] = useState<BillingInterval>("monthly")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function checkSubscription() {
      if (!session) { setCheckingSubscription(false); return }
      try {
        const r = await fetch("/api/user")
        if (r.ok) {
          const d = await r.json()
          if (d.user?.subscribed) setIsSubscribed(true)
        }
      } catch { /* noop */ } finally {
        setCheckingSubscription(false)
      }
    }
    checkSubscription()
  }, [session])

  const handleCheckout = async (interval: BillingInterval) => {
    if (!session) {
      toast({ title: "Niet ingelogd", description: "Log eerst in om te abonneren.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const priceId = interval === "annual"
        ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || "Betaling mislukt")

      const data = await res.json()
      if (!data.sessionId) throw new Error("Geen sessie-ID ontvangen")

      const stripe = await getStripe()
      if (!stripe) throw new Error("Stripe kon niet worden geladen")

      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
      if (error) throw error
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Afrekenen mislukt",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0D9488" }} />
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
          <CheckCircle className="h-8 w-8" style={{ color: "#0D9488" }} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Je bent al Pro!</h1>
        <p className="text-gray-500 mb-6 max-w-sm">
          Bedankt dat je een premium lid bent. Je hebt volledige toegang tot alle functies.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "#0D9488" }}
        >
          Terug naar dashboard <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }}>
            <Sparkles size={12} />
            BijbelStudie Pro
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
            Studeer dieper.<br />Begin vandaag.
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-base">
            Onbeperkte toegang tot commentaren, leesplannen, notities en meer - zonder jaarlijkse verplichting.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">

          {/* Monthly — recommended */}
          <div className="relative rounded-2xl border-2 p-6 bg-white dark:bg-card flex flex-col"
            style={{ borderColor: "#0D9488" }}>
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#0D9488" }}>
                Meest gekozen
              </span>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Maandelijks</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">€9,99</span>
                <span className="text-gray-400 text-sm mb-1">/maand</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Maandelijks gefactureerd · Altijd opzegbaar</p>
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle size={14} style={{ color: "#0D9488", flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("monthly")}
              disabled={loading || !session}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#0D9488" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Starten voor €9,99 <ArrowRight size={14} /></>}
            </button>
          </div>

          {/* Annual */}
          <div className="rounded-2xl border p-6 bg-white dark:bg-card flex flex-col" style={{ borderColor: "#E5E7EB" }}>
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Jaarlijks</p>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                  42% korting
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">€69,99</span>
                <span className="text-gray-400 text-sm mb-1">/jaar</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">≈ €5,83 per maand · Jaarlijks gefactureerd</p>
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle size={14} className="text-gray-300 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("annual")}
              disabled={loading || !session}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 border dark:border-gray-700"
              style={{ color: "#374151", backgroundColor: "#F9FAFB" }}
            >
              Kies jaarplan <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Why monthly */}
        <div className="mb-10">
          <h2 className="text-center text-base font-semibold text-gray-800 dark:text-white mb-5">
            Waarom kiezen voor maandelijks?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {WHY_MONTHLY.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl p-4 bg-white dark:bg-card border" style={{ borderColor: "#E5E7EB" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Icon size={15} style={{ color: "#0D9488" }} />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust line */}
        <p className="text-center text-xs text-gray-400">
          🔒 Veilige betaling via Stripe &nbsp;·&nbsp; Altijd opzegbaar &nbsp;·&nbsp; Geen verborgen kosten
        </p>

        {!session && (
          <p className="text-center text-xs text-gray-400 mt-3">
            <button onClick={() => router.push("/auth/signin")} className="underline text-teal-600">Log in</button> om te kunnen abonneren.
          </p>
        )}

      </div>
    </div>
  )
}
