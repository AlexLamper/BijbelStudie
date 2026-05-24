"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  MessageSquareText, Bug, Lightbulb, Heart, MessageCircle,
  Star, Send, Loader2, CheckCircle2, AlertCircle, ArrowRight,
} from "lucide-react"

const TEAL = "#0D9488"

type Category = "bug" | "feature" | "praise" | "other"

const CATEGORIES: { value: Category; label: string; description: string; icon: React.ElementType }[] = [
  { value: "bug",     label: "Bug melden",    description: "Iets werkt niet zoals verwacht",    icon: Bug           },
  { value: "feature", label: "Functie idee",  description: "Een idee om de app te verbeteren", icon: Lightbulb     },
  { value: "praise",  label: "Compliment",    description: "Laat weten wat je waardeert",      icon: Heart         },
  { value: "other",   label: "Iets anders",   description: "Vraag, opmerking of suggestie",    icon: MessageCircle },
]

type Status = "idle" | "sending" | "success" | "error"

export default function FeedbackPage() {
  const pathname = usePathname()
  const [category, setCategory] = useState<Category>("other")
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "success") return
    const t = setTimeout(() => {
      setMessage("")
      setRating(0)
      setStatus("idle")
    }, 4000)
    return () => clearTimeout(t)
  }, [status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "sending") return
    if (message.trim().length < 4) {
      setErrorMsg("Vertel ons iets meer (minimaal 4 tekens).")
      setStatus("error")
      return
    }
    setStatus("sending")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating: rating || undefined,
          message: message.trim(),
          page: pathname || "",
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.error || "Versturen mislukt")
        setStatus("error")
        return
      }
      setStatus("success")
    } catch {
      setErrorMsg("Netwerkfout")
      setStatus("error")
    }
  }

  const active = CATEGORIES.find((c) => c.value === category)!

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 xl:px-10 pt-7 pb-5 border-b border-border bg-background flex-shrink-0">
        <h1 className="text-xl font-bold text-foreground">Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Jouw input helpt om BijbelStudie te verbeteren - laat het ons weten
        </p>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 xl:px-10 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

          {/* Left column - form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 min-w-0">

            {/* Category selector */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <MessageSquareText size={14} style={{ color: TEAL }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Waar gaat je feedback over?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Kies een categorie zodat we het juist kunnen verwerken</p>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-1.5">
                {CATEGORIES.map((c) => {
                  const isActive = category === c.value
                  const Icon = c.icon
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all"
                      style={{
                        borderColor: isActive ? TEAL : "transparent",
                        backgroundColor: isActive ? "rgba(13,148,136,0.06)" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isActive ? "rgba(13,148,136,0.12)" : "rgba(0,0,0,0.04)",
                        }}
                      >
                        <Icon size={13} style={{ color: isActive ? TEAL : "#9CA3AF" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight" style={{ color: isActive ? "#0F766E" : "var(--foreground)" }}>{c.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{c.description}</p>
                      </div>
                      <div
                        className="h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: isActive ? TEAL : "#D1D5DB",
                          backgroundColor: isActive ? TEAL : "transparent",
                        }}
                      >
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Rating */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <Star size={14} style={{ color: TEAL }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Hoe beoordeel je BijbelStudie? <span className="text-xs font-normal text-muted-foreground">(optioneel)</span></p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (hoverRating || rating) >= n
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n === rating ? 0 : n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-md hover:bg-gray-50 dark:hover:bg-secondary transition-colors"
                        aria-label={`${n} sterren`}
                      >
                        <Star
                          size={26}
                          strokeWidth={1.5}
                          style={{
                            color: filled ? "#F59E0B" : "#D1D5DB",
                            fill: filled ? "#F59E0B" : "transparent",
                            transition: "all 0.12s",
                          }}
                        />
                      </button>
                    )
                  })}
                  {rating > 0 && (
                    <button
                      type="button"
                      onClick={() => setRating(0)}
                      className="ml-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Wissen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                  <active.icon size={14} style={{ color: TEAL }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Je bericht</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {category === "bug" && "Beschrijf wat er gebeurde en wat je verwachtte."}
                    {category === "feature" && "Wat zou de app voor jou nog beter maken?"}
                    {category === "praise" && "Wat vind je goed werken aan BijbelStudie?"}
                    {category === "other" && "Deel je vraag, opmerking of suggestie."}
                  </p>
                </div>
              </div>
              <div className="p-5">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={7}
                  maxLength={4000}
                  placeholder={
                    category === "bug"
                      ? "Bijv. 'Wanneer ik op X klik, gebeurt Y in plaats van Z. Ik gebruik Chrome op Windows...'"
                      : category === "feature"
                      ? "Bijv. 'Ik zou graag X kunnen doen omdat...'"
                      : category === "praise"
                      ? "Bijv. 'De inductieve studie heeft me echt geholpen om...'"
                      : "Vertel ons wat er op je hart ligt..."
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white dark:bg-secondary/40 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] resize-y"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-muted-foreground">
                    Minimaal 4 tekens · max 4000
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {message.length} / 4000
                  </p>
                </div>
              </div>
            </div>

            {/* Error / success banner */}
            {status === "error" && errorMsg && (
              <div className="flex items-start gap-2 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10">
                <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}
            {status === "success" && (
              <div
                className="flex items-start gap-2 p-3.5 rounded-xl border"
                style={{ backgroundColor: "rgba(13,148,136,0.06)", borderColor: "rgba(13,148,136,0.25)" }}
              >
                <CheckCircle2 size={16} style={{ color: TEAL }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEAL }}>Dank je wel!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Je feedback is verzonden. We nemen elke reactie serieus mee.
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={status === "sending" || message.trim().length < 4}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: TEAL }}
              >
                {status === "sending" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Versturen...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Verstuur feedback
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-3 text-muted-foreground">
                Waarom feedback geven?
              </p>
              <p className="text-sm text-foreground leading-relaxed mb-4">
                BijbelStudie wordt actief ontwikkeld en jouw input bepaalt mee wat we als volgende bouwen. Elke bug, elk idee en elk compliment komt direct bij ons terecht.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Bugs worden snel opgepakt en gefixt",
                  "Functie-ideeen gaan op de roadmap",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ArrowRight size={11} style={{ color: TEAL, marginTop: 3, flexShrink: 0 }} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-2xl p-5 border"
              style={{ backgroundColor: "rgba(13,148,136,0.05)", borderColor: "rgba(13,148,136,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: TEAL }}>
                Tip
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                Bij een bug: vermeld de stappen om het te reproduceren en welke browser/apparaat je gebruikt. Hoe specifieker, hoe sneller we het kunnen oplossen.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
