"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Sparkles, X, Check } from "lucide-react"

const TEAL = "#0D9488"

interface TourStep {
  /** Anchor element selector via [data-tour="…"] */
  target: string
  title: string
  description: string
  /** Path the user must be on for this step. Tour navigates if mismatched. */
  page: string
  /** Tooltip placement around the target */
  side?: "right" | "left" | "top" | "bottom"
}

const STEPS: TourStep[] = [
  {
    target: "dashboard-hero",
    title: "Je dashboard",
    description: "Hier zie je in één oogopslag waar je gebleven was. De grote kaart brengt je direct terug naar je laatste hoofdstuk.",
    page: "/dashboard",
    side: "bottom",
  },
  {
    target: "nav-studie",
    title: "Bijbelstudie",
    description: "Dit is het hart van de app. Klik hier om naar de leespagina te gaan waar je de bijbeltekst en commentaren naast elkaar ziet.",
    page: "/dashboard",
    side: "right",
  },
  {
    target: "bible-text",
    title: "De bijbeltekst",
    description: "Aan de linkerkant van de studiepagina lees je de bijbeltekst. Je kunt verzen markeren en notities maken door erop te klikken.",
    page: "/studie",
    side: "right",
  },
  {
    target: "bible-selector",
    title: "Kies vertaling, boek en hoofdstuk",
    description: "Met deze balk wissel je snel van vertaling, boek of hoofdstuk. Vijf Nederlandse vertalingen zijn beschikbaar.",
    page: "/studie",
    side: "bottom",
  },
  {
    target: "commentary",
    title: "Het commentaargedeelte",
    description: "Aan de rechterkant zie je commentaren, historische context en geografische afbeeldingen. Hier kies je welk commentaar je naast de tekst wilt.",
    page: "/studie",
    side: "left",
  },
  {
    target: "nav-studies",
    title: "Begeleide studies",
    description: "Klaargestoomde studies leiden je stap voor stap door een persoon, thema of bijbelgedeelte - met gerichte vragen per les.",
    page: "/studie",
    side: "right",
  },
  {
    target: "nav-notities",
    title: "Je notities",
    description: "Alle notities en markeringen die je tijdens het lezen maakt, vind je hier overzichtelijk terug - filterbaar op boek, tag of kleur.",
    page: "/studie",
    side: "right",
  },
  {
    target: "nav-groepen",
    title: "Bijbelgroepen",
    description: "Studeer samen: maak een groep of word lid, deel notities en bespreek bijbelgedeeltes met anderen.",
    page: "/studie",
    side: "right",
  },
  {
    target: "pro-cta",
    title: "Upgrade naar Pro",
    description: "Pro ontgrendelt alle commentaren en historische context bij elk hoofdstuk. Het gratis plan blijft altijd beschikbaar.",
    page: "/studie",
    side: "right",
  },
  {
    target: "nav-feedback",
    title: "Geef feedback",
    description: "Hier kun je bugs melden of ideeën delen. Jouw input helpt de app verbeteren.",
    page: "/studie",
    side: "right",
  },
]

const PADDING = 8 // spotlight padding around the target

interface Rect { top: number; left: number; width: number; height: number }

function getRect(el: Element): Rect {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

interface GuidedTourProps {
  open: boolean
  onClose: () => void
  startStep?: number
  steps?: TourStep[]
}

export function GuidedTour({ open, onClose, startStep = 0, steps: stepsProp }: GuidedTourProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [step, setStep] = useState(startStep)
  const [rect, setRect] = useState<Rect | null>(null)
  const [mounted, setMounted] = useState(false)

  const activeSteps = stepsProp ?? STEPS

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) setStep(startStep)
  }, [open, startStep])

  const current = activeSteps[step]
  const isLast = step === activeSteps.length - 1

  /** When step changes, navigate if needed and wait for target to appear. */
  useEffect(() => {
    if (!open || !current) return
    let cancelled = false

    function locate() {
      const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`)
      if (el) {
        // Scroll into view if needed
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
        setRect(getRect(el))
        return true
      }
      return false
    }

    // Wrong page? Navigate first.
    if (pathname !== current.page) {
      router.push(current.page)
    }

    // Poll briefly for the element to mount + layout to settle.
    let elapsed = 0
    const interval = setInterval(() => {
      if (cancelled) return
      if (locate()) {
        clearInterval(interval)
      } else if ((elapsed += 100) > 5000) {
        clearInterval(interval)
      }
    }, 100)

    // Also locate immediately if we're already on the right page
    locate()

    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, pathname, current?.target, current?.page])

  /** Recompute rect on scroll/resize so the spotlight follows. */
  useLayoutEffect(() => {
    if (!open) return
    function update() {
      if (!current) return
      const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`)
      if (el) setRect(getRect(el))
    }
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, current])

  /** Keyboard navigation */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1))
      else if (e.key === "ArrowRight") setStep((s) => Math.min(activeSteps.length - 1, s + 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, activeSteps.length])

  const next = useCallback(() => {
    if (isLast) onClose()
    else setStep((s) => Math.min(activeSteps.length - 1, s + 1))
  }, [isLast, onClose, activeSteps.length])

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])

  /** Compute tooltip position based on rect + side preference */
  const tooltipPosition = useMemo(() => {
    if (!rect) return null

    const vw = typeof window !== "undefined" ? window.innerWidth : 1280
    const vh = typeof window !== "undefined" ? window.innerHeight : 800
    const tooltipW = Math.min(360, vw - 32)
    const tooltipH = 220 // approx
    const gap = 16
    const side = current?.side || "right"

    let top = rect.top
    let left = rect.left

    if (side === "right") {
      left = rect.left + rect.width + gap
      top = rect.top + rect.height / 2 - tooltipH / 2
    } else if (side === "left") {
      left = rect.left - tooltipW - gap
      top = rect.top + rect.height / 2 - tooltipH / 2
    } else if (side === "top") {
      top = rect.top - tooltipH - gap
      left = rect.left + rect.width / 2 - tooltipW / 2
    } else {
      top = rect.top + rect.height + gap
      left = rect.left + rect.width / 2 - tooltipW / 2
    }

    // Fallback: if it doesn't fit on the requested side, flip
    if (side === "right" && left + tooltipW > vw - 16) {
      left = rect.left - tooltipW - gap
    }
    if (side === "left" && left < 16) {
      left = rect.left + rect.width + gap
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(vw - tooltipW - 16, left))
    top = Math.max(16, Math.min(vh - tooltipH - 16, top))

    return { top, left, width: tooltipW }
  }, [rect, current?.side])

  /** Number badge position - anchored to top-left of spotlight */
  const badgePosition = useMemo(() => {
    if (!rect) return null
    return {
      top: rect.top - PADDING - 18,
      left: rect.left - PADDING - 18,
    }
  }, [rect])

  if (!open || !mounted) return null

  const spotlight = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rondleiding door BijbelStudie"
      className="fixed inset-0 z-[9999] pointer-events-none"
    >
      {/* Spotlight via SVG mask - covers full viewport with a hole around the target */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ cursor: "default" }}
        onClick={onClose}
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.66)"
          mask="url(#tour-mask)"
          style={{ transition: "opacity 0.2s" }}
        />
      </svg>

      {/* Spotlight border ring (decorative, can't click through) */}
      {spotlight && (
        <div
          className="absolute pointer-events-none rounded-xl transition-all duration-200"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: `0 0 0 2px ${TEAL}, 0 0 0 6px rgba(13,148,136,0.25)`,
          }}
        />
      )}

      {/* Numbered badge */}
      {badgePosition && (
        <div
          className="absolute pointer-events-none flex items-center justify-center rounded-full text-white font-extrabold shadow-lg transition-all duration-200"
          style={{
            top: badgePosition.top,
            left: badgePosition.left,
            width: 36,
            height: 36,
            fontSize: 14,
            background: `linear-gradient(135deg, ${TEAL} 0%, #0F766E 100%)`,
            border: "3px solid #fff",
          }}
        >
          {step + 1}
        </div>
      )}

      {/* Tooltip card */}
      {tooltipPosition && (
        <div
          className="absolute pointer-events-auto bg-white dark:bg-card rounded-2xl shadow-2xl border border-gray-200 dark:border-border overflow-hidden transition-all duration-200"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            width: tooltipPosition.width,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-border">
            <div className="flex items-center justify-between mb-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: TEAL }}
              >
                <Sparkles size={9} /> Rondleiding
              </span>
              <button
                onClick={onClose}
                aria-label="Sluiten"
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Stap {step + 1} / {activeSteps.length}
            </p>
            <h3 className="text-base font-bold text-foreground leading-snug">
              {current?.title}
            </h3>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current?.description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="px-5 pb-3 flex items-center justify-center gap-1">
            {activeSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  height: 5,
                  width: i === step ? 18 : 5,
                  backgroundColor: i <= step ? TEAL : "rgba(13,148,136,0.2)",
                }}
                aria-label={`Ga naar stap ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="px-5 pb-4 flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Overslaan
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={step === 0}
                className="inline-flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-medium border border-border bg-white dark:bg-card text-foreground hover:bg-gray-50 dark:hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft size={12} /> Vorige
              </button>
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}
              >
                {isLast ? (
                  <>
                    <Check size={12} /> Klaar
                  </>
                ) : (
                  <>
                    Volgende <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* While we wait for the target rect, show a centered loading hint */}
      {!rect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-card rounded-xl px-4 py-3 shadow-lg border border-border text-sm text-muted-foreground pointer-events-auto">
            Rondleiding wordt geladen...
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

/**
 * Auto-launches the tour the first time the user is authenticated and has
 * not yet completed it. Completion is stored on the user's account (not in
 * browser storage), so the tour is tied to the account and never reappears
 * on another device or browser. The tour itself handles cross-page
 * navigation via the Next router.
 */
export function GuidedTourLauncher({
  canShow,
  tourCompleted,
  isSubscribed,
}: {
  canShow: boolean
  tourCompleted?: boolean
  isSubscribed?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [armed, setArmed] = useState(false)

  // Arm once after mount so the launcher doesn't re-fire across route
  // changes. Open state is then controlled by user actions.
  useEffect(() => {
    if (!canShow || tourCompleted || armed) return
    const t = setTimeout(() => {
      setOpen(true)
      setArmed(true)
    }, 800)
    return () => clearTimeout(t)
  }, [canShow, tourCompleted, armed])

  const handleClose = useCallback(() => {
    setOpen(false)
    // Persist completion to the account so the tour never reappears on any
    // device. Fire-and-forget: failure just means it may show once more.
    fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourCompleted: true }),
    }).catch(() => {})
  }, [])

  const steps = isSubscribed ? STEPS.filter(s => s.target !== "pro-cta") : STEPS
  return <GuidedTour open={open} onClose={handleClose} steps={steps} />
}
