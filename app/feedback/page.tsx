"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Star, Loader2, CheckCircle2, AlertCircle, Check } from "lucide-react"
import AppShell from "../../components/shell/AppShell"
import { Card } from "../../components/kit/primitives"
import MyFeedbackList from "../../components/feedback/MyFeedbackList"

type Category = "bug" | "feature" | "praise" | "other"

/**
 * The four choices, in the design's row of four boxes.
 *
 * The design labels them Idee · Probleem · Vraag · Anders. The API has four
 * categories and "vraag" is not one of them, so the third box keeps the value
 * that does exist (`praise`) under its own Dutch word rather than sending two
 * different boxes to `other` - see app/api/feedback/route.ts, which the admin
 * feedback view filters on.
 */
const CATEGORIES: { value: Category; label: string }[] = [
  { value: "feature", label: "Idee" },
  { value: "bug", label: "Probleem" },
  { value: "praise", label: "Compliment" },
  { value: "other", label: "Anders" },
]

const REASONS = [
  {
    title: "Het wordt echt gelezen",
    body: "Elke inzending komt direct binnen, er zit geen supportafdeling tussen.",
  },
  {
    title: "Het bepaalt de volgorde",
    body: "De meest genoemde punten gaan als eerste op de lijst.",
  },
  {
    title: "Je ziet wat ermee gebeurt",
    body: "Je ziet in Mijn feedback wat ermee gebeurt: bekeken, gepland of opgelost. Komt er een antwoord, dan staat dat daar ook.",
  },
]

type Status = "idle" | "sending" | "success" | "error"

/**
 * /feedback (design_handoff_web/PAGES.md §9).
 *
 * One card at full width beside a 350 px rail: the rating block, the four kinds,
 * a subject, the message, and the send row. No max-width of 700 on the form -
 * the card IS the column.
 *
 * The submission is the one this page always made: POST /api/feedback with
 * {category, rating, message, page, website}, the same honeypot, the same
 * four-second reset after a success and the same minimum of four characters.
 *
 * "Onderwerp" is its own field (`subject` on the document). The tick box
 * appends the browser's user-agent string to the message, and only when the
 * reader has ticked it. `context` carries `platform: "web"` and the path, which
 * the route folds to a route key.
 *
 * Two tabs: the form, and "Mijn feedback" (`?tab=mijn`), where a reader follows
 * what happened to what they sent and reads any answer.
 */
export default function FeedbackPage() {
  const pathname = usePathname()
  const [category, setCategory] = useState<Category>("feature")
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sendDevice, setSendDevice] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Honeypot. Left empty by anyone who can see the form; a bot fills
  // every input it finds. The server answers 200 and writes nothing when
  // this arrives filled - see app/api/feedback/route.ts.
  const [website, setWebsite] = useState("")
  const [tab, setTab] = useState<"nieuw" | "mijn">("nieuw")

  // `?tab=mijn` (the reply email and the dashboard card link here). Read from
  // window: useSearchParams would need a Suspense boundary around the page.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "mijn") setTab("mijn")
  }, [])

  function switchTab(next: "nieuw" | "mijn") {
    setTab(next)
    window.history.replaceState(null, "", next === "mijn" ? "/feedback?tab=mijn" : "/feedback")
  }

  useEffect(() => {
    if (status !== "success") return
    const t = setTimeout(() => {
      setSubject("")
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

    const body = [
      message.trim(),
      sendDevice && typeof navigator !== "undefined" ? `- ${navigator.userAgent}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating: rating || undefined,
          subject: subject.trim(),
          message: body,
          page: pathname || "",
          context: { platform: "web", path: pathname || "/feedback" },
          website,
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

  return (
    <AppShell title="Feedback">
      {/* Tabs: the form, and what became of earlier feedback. */}
      <div role="tablist" aria-label="Feedback" className="mb-4 inline-flex max-w-full rounded-[10px] border border-line bg-surface p-[3px]">
        {([
          { id: "nieuw", label: "Nieuw bericht" },
          { id: "mijn", label: "Mijn feedback" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`h-8 rounded-[8px] px-3.5 text-[13px] font-semibold transition-colors ${
              tab === t.id ? "bg-teal text-white" : "text-ink-muted hover:bg-line-soft hover:text-ink-body"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Below lg the rail stacks under the form instead of squeezing it. */}
      <div className="flex min-h-full gap-5 max-lg:flex-col">
        {tab === "mijn" ? (
          <div className="min-w-0 flex-1">
            <MyFeedbackList />
          </div>
        ) : (
        /* ── The form ─────────────────────────────────────────────── */
        <form onSubmit={handleSubmit} className="min-w-0 flex-1">
          {/* Honeypot: off-screen rather than display:none, which some bots
              skip, and aria-hidden + tabIndex so it is invisible to assistive
              technology and to the keyboard. */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />

          <Card className="p-[22px]">
            <h2 className="text-[19px] font-bold tracking-[-0.2px] text-ink">Wat kan er beter?</h2>
            <p className="mt-[6px] max-w-[520px] text-[13.5px] leading-[1.6] text-ink-muted">
              Alles wordt gelezen. Vertel gerust wat er misgaat of wat je mist - hoe concreter, hoe beter.
            </p>

            {/* Rating */}
            <div className="mt-[18px] flex flex-wrap items-center gap-x-[18px] gap-y-3 rounded-[12px] border border-line bg-sunken px-[18px] py-[15px]">
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-ink">Hoe beoordeel je BijbelStudie?</p>
                <p className="mt-[3px] text-[12px] text-ink-faint">Optioneel - één tik</p>
              </div>
              <div className="flex gap-[5px]">
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = (hoverRating || rating) >= n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n === rating ? 0 : n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="rounded-[6px] outline-none transition-transform hover:scale-110"
                      aria-label={`${n} sterren`}
                      aria-pressed={rating >= n}
                    >
                      <Star
                        size={30}
                        strokeWidth={1.5}
                        aria-hidden
                        className={filled ? "fill-gold text-gold" : "fill-transparent text-line-strong"}
                      />
                    </button>
                  )
                })}
              </div>
              <span className="w-6 text-right text-[15px] font-bold text-gold-ink tabular-nums">
                {rating || ""}
              </span>
            </div>

            {/* Kind */}
            <FieldLabel className="mt-5">Soort</FieldLabel>
            <div className="mt-[9px] grid grid-cols-2 gap-[10px] sm:grid-cols-4">
              {CATEGORIES.map((c) => {
                const active = category === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c.value)}
                    className={[
                      "rounded-[11px] p-[13px] text-center text-[13.5px] font-semibold transition-colors",
                      active
                        ? "border-2 border-teal bg-[var(--teal-wash-2)] text-teal dark:text-teal-400"
                        : "border border-line bg-surface text-ink-body hover:border-line-strong",
                    ].join(" ")}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            {/* Subject */}
            <FieldLabel className="mt-[18px]" htmlFor="feedback-onderwerp">Onderwerp</FieldLabel>
            <input
              id="feedback-onderwerp"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder="Kort samengevat"
              className="mt-2 h-11 w-full rounded-btn border border-line px-[14px] text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-teal"
            />

            {/* Message */}
            <FieldLabel className="mt-4" htmlFor="feedback-tekst">Toelichting</FieldLabel>
            <textarea
              id="feedback-tekst"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              placeholder="Wat gebeurde er, en wat had je verwacht?"
              className="mt-2 h-[116px] w-full resize-y rounded-btn border border-line px-[14px] py-[13px] text-[14px] leading-[1.6] text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-teal"
            />
            <p className="mt-[6px] text-[11.5px] text-ink-faint tabular-nums">
              Minimaal 4 tekens · {message.length} / 4000
            </p>

            {/* Device */}
            <label className="mt-[14px] flex cursor-pointer items-center gap-[10px]">
              <input
                type="checkbox"
                checked={sendDevice}
                onChange={(e) => setSendDevice(e.target.checked)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={[
                  "flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border transition-colors",
                  sendDevice ? "border-teal bg-teal text-white" : "border-line-strong bg-surface",
                ].join(" ")}
              >
                {sendDevice && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="text-[13.5px] text-ink-body">Stuur mijn browser en apparaat mee</span>
            </label>

            {/* Banners */}
            {status === "error" && errorMsg && (
              <div role="alert" className="mt-4 flex items-start gap-2 rounded-[10px] border border-line bg-sunken p-3.5">
                <AlertCircle size={16} aria-hidden className="mt-0.5 flex-shrink-0 text-danger" />
                <p className="text-[13.5px] text-danger">{errorMsg}</p>
              </div>
            )}
            {status === "success" && (
              <div role="status" className="mt-4 flex items-start gap-2 rounded-[10px] border border-line bg-teal-faint p-3.5">
                <CheckCircle2 size={16} aria-hidden className="mt-0.5 flex-shrink-0 text-teal" />
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">Dank je wel!</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    Je feedback is verzonden. Je ziet in{" "}
                    <button type="button" onClick={() => switchTab("mijn")} className="font-semibold text-teal underline-offset-2 hover:underline dark:text-teal-400">
                      Mijn feedback
                    </button>{" "}
                    wat ermee gebeurt.
                  </p>
                </div>
              </div>
            )}

            {/* Send */}
            <div className="mt-[18px] flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={status === "sending" || message.trim().length < 4}
                className="inline-flex h-11 items-center gap-2 rounded-btn bg-teal px-[22px] text-[14px] font-semibold text-white outline-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "sending" ? (
                  <><Loader2 size={14} aria-hidden className="animate-spin" /> Versturen…</>
                ) : (
                  "Versturen"
                )}
              </button>
              {/* The design's line beside the button (PAGES.md §9.7) used to print
                  the reader's own address back at them, which tells them nothing
                  they did not already know - and `app/feedback/layout.tsx` gates
                  guests, so there is always an account address behind a
                  submission anyway. What is worth knowing is where an answer
                  shows up: always in Mijn feedback, by mail only when the
                  owner has configured a reply sender. */}
              <p className="text-[12.5px] text-ink-faint">Een antwoord verschijnt in Mijn feedback</p>
            </div>
          </Card>
        </form>
        )}

        {/* ── The rail ─────────────────────────────────────────────── */}
        <aside className="flex w-[350px] flex-none flex-col gap-[18px] max-lg:w-full">
          <Card className="flex-none p-[18px]">
            <h2 className="text-[15px] font-bold text-ink">Waarom feedback geven?</h2>
            <p className="mt-[6px] text-[12.5px] leading-[1.6] text-ink-muted">
              BijbelStudie wordt door één persoon gemaakt. Wat jij opmerkt, bepaalt wat er hierna komt.
            </p>
            <div className="mt-2">
              {REASONS.map((reason, i) => (
                <div key={reason.title} className="flex gap-3 border-t border-line-soft py-[13px]">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-teal-faint text-[12px] font-bold text-teal dark:text-teal-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{reason.title}</p>
                    <p className="mt-[3px] text-[12.5px] leading-[1.55] text-ink-muted">{reason.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex-none p-[18px]">
            <h2 className="text-[15px] font-bold text-ink">Liever direct contact?</h2>
            <p className="mt-[6px] text-[13px] leading-[1.6] text-ink-muted">
              Voor vragen over je abonnement of account gaat mailen sneller.
            </p>
            {/* Straight to the mail client rather than to /contact: that page
                sits in the marketing chrome (landing Header + Footer) and its
                whole content is this same address, so for a reader already
                inside the app shell it was a jump out of the chrome to read one
                line. The address also stands as selectable text beside the
                Versturen button, for anyone with no mail handler. */}
            <a
              href="mailto:info@bijbelstudie.io"
              className="mt-3 flex h-[38px] items-center justify-center rounded-[9px] border border-line text-[13px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
            >
              Mail het team
            </a>
          </Card>
        </aside>
      </div>
    </AppShell>
  )
}

/** The caps label over a field. */
function FieldLabel({
  children,
  className = "",
  htmlFor,
}: {
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  const cls = `block text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint ${className}`
  return htmlFor ? (
    <label htmlFor={htmlFor} className={cls}>{children}</label>
  ) : (
    <p className={cls}>{children}</p>
  )
}
