"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Star, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import SceneShell from "../../components/scene/SceneShell"
import { Panel, SectionHeading } from "../../components/scene/pieces"
import { EYEBROW, TEAL_DEEP, TEAL_ON_DARK, TILE } from "../../components/scene/tokens"

type Category = "bug" | "feature" | "praise" | "other"

/**
 * The four categories, without the icon each one used to carry.
 *
 * A bug got a bug, a compliment got a heart: the picture said nothing the Dutch
 * word beside it did not, and the row already has a radio marker telling the
 * reader which one is chosen. On the landscape that is two decorations per row
 * competing with the copy.
 */
const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: "bug",     label: "Bug melden",    description: "Iets werkt niet zoals verwacht"    },
  { value: "feature", label: "Functie idee",  description: "Een idee om de app te verbeteren"  },
  { value: "praise",  label: "Compliment",    description: "Laat weten wat je waardeert"       },
  { value: "other",   label: "Iets anders",   description: "Vraag, opmerking of suggestie"     },
]

type Status = "idle" | "sending" | "success" | "error"

/**
 * Feedback, in the shared immersive shell.
 *
 * Three layers: a short sky, the category chooser on the horizon - it is the
 * first decision the page asks for and therefore what should break the fold -
 * and the message itself on the desk, with the two standing notes beside it.
 *
 * Nothing about the submission changed: the same POST /api/feedback with the
 * same body (category, rating, message, page, website), the same honeypot, the
 * same four-second reset after a success and the same minimum of four
 * characters.
 */
export default function FeedbackPage() {
  const pathname = usePathname()
  const [category, setCategory] = useState<Category>("other")
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Honeypot. Left empty by anyone who can see the form; a bot fills
  // every input it finds. The server answers 200 and writes nothing when
  // this arrives filled - see app/api/feedback/route.ts.
  const [website, setWebsite] = useState("")

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
    <SceneShell backdrop="reader" header rail>
      {/* -- The sky ---------------------------------------------------- */}
      <section aria-labelledby="feedback-titel" className="pb-10 pt-6">
        <div className="scene-sky max-w-[40rem]">
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Feedback</p>
          <h1 id="feedback-titel" className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Wat kan beter?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            BijbelStudie wordt actief ontwikkeld. Jouw bericht komt direct bij ons terecht.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit}>
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

        {/* -- The horizon: the one decision the page asks for ---------- */}
        <div className="scene-horizon">
          <fieldset className={`p-5 shadow-lg shadow-black/20 ${TILE}`}>
            <legend className={`${EYEBROW} px-1`}>Waar gaat je feedback over?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const isActive = category === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setCategory(c.value)}
                    className={`press flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                      isActive ? "border-white/40 bg-white/10" : "border-white/15 bg-black/20 hover:bg-black/30"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                      style={{
                        borderColor: isActive ? TEAL_ON_DARK : "rgba(255,255,255,0.4)",
                        backgroundColor: isActive ? TEAL_ON_DARK : "transparent",
                      }}
                    >
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#0B1220]" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight text-white">{c.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-white/65">{c.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        </div>

        {/* -- The desk ------------------------------------------------- */}
        <div className="grid grid-cols-1 items-start gap-6 pb-24 pt-12 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* Rating */}
            <Panel className="p-5" labelledBy="feedback-cijfer">
              <SectionHeading
                id="feedback-cijfer"
                title={<>Hoe beoordeel je BijbelStudie? <span className="font-normal text-white/60">(optioneel)</span></>}
              />
              <div className="mt-3 flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = (hoverRating || rating) >= n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n === rating ? 0 : n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="rounded-md p-1 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
                      aria-label={`${n} sterren`}
                      aria-pressed={rating >= n}
                    >
                      <Star
                        size={26}
                        strokeWidth={1.5}
                        aria-hidden
                        style={{
                          color: filled ? "#FBBF24" : "rgba(255,255,255,0.4)",
                          fill: filled ? "#FBBF24" : "transparent",
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
                    className="ml-3 rounded text-xs font-semibold text-white/70 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Wissen
                  </button>
                )}
              </div>
            </Panel>

            {/* Message */}
            <Panel className="p-5" labelledBy="feedback-bericht">
              <SectionHeading
                id="feedback-bericht"
                title="Je bericht"
                subtitle={
                  category === "bug" ? "Beschrijf wat er gebeurde en wat je verwachtte."
                  : category === "feature" ? "Wat zou de app voor jou nog beter maken?"
                  : category === "praise" ? "Wat vind je goed werken aan BijbelStudie?"
                  : "Deel je vraag, opmerking of suggestie."
                }
              />
              <label htmlFor="feedback-tekst" className="sr-only">Je bericht</label>
              <textarea
                id="feedback-tekst"
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
                className="mt-4 w-full resize-y rounded-lg border border-white/20 bg-black/30 px-3 py-2.5 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/45 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-white/60">Minimaal 4 tekens · max 4000</p>
                <p className="text-[11px] tabular-nums text-white/60">{message.length} / 4000</p>
              </div>
            </Panel>

            {/* Error / success banner */}
            {status === "error" && errorMsg && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-950/40 p-3.5">
                <AlertCircle size={16} aria-hidden className="mt-0.5 flex-shrink-0 text-red-300" />
                <p className="text-sm text-red-200">{errorMsg}</p>
              </div>
            )}
            {status === "success" && (
              <div role="status" className="flex items-start gap-2 rounded-xl border border-white/20 bg-black/40 p-3.5">
                <CheckCircle2 size={16} aria-hidden className="mt-0.5 flex-shrink-0" style={{ color: TEAL_ON_DARK }} />
                <div>
                  <p className="text-sm font-semibold text-white">Dank je wel!</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    Je feedback is verzonden. We nemen elke reactie serieus mee.
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={status === "sending" || message.trim().length < 4}
                className="press inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: TEAL_DEEP }}
              >
                {status === "sending" ? (
                  <><Loader2 size={14} aria-hidden className="animate-spin" /> Versturen...</>
                ) : (
                  "Verstuur feedback"
                )}
              </button>
            </div>
          </div>

          {/* The standing notes beside it */}
          <aside className="flex flex-col gap-4">
            <Panel className="p-5" labelledBy="feedback-waarom">
              <SectionHeading id="feedback-waarom" title="Waarom feedback geven?" />
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                BijbelStudie wordt actief ontwikkeld en jouw input bepaalt mee wat we als volgende
                bouwen. Elke bug, elk idee en elk compliment komt direct bij ons terecht.
              </p>
              <ul className="mt-4 space-y-2 border-t border-white/15 pt-4 text-xs text-white/65">
                <li>Bugs worden snel opgepakt en gefixt</li>
                <li>Functie-ideeen gaan op de roadmap</li>
              </ul>
            </Panel>

            <Panel className="p-5" labelledBy="feedback-tip">
              <SectionHeading id="feedback-tip" title="Tip" />
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                Bij een bug: vermeld de stappen om het te reproduceren en welke browser/apparaat je
                gebruikt. Hoe specifieker, hoe sneller we het kunnen oplossen.
              </p>
            </Panel>
          </aside>
        </div>
      </form>
    </SceneShell>
  )
}
