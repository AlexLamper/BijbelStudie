"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Check, Copy, Share2 } from "lucide-react"
import { Card, Skeleton } from "../kit/primitives"
import type { ReferralOverview } from "../../lib/referral"

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })
}

/**
 * "Nodig een vriend uit" on /profiel: the reader's link, one tap to share or
 * copy it, how many friends came in through it, and - in the account's first
 * week - a field to enter someone else's code.
 *
 * Same data as the app's card (GET /api/v1/referral), so the two never
 * disagree about the counts.
 */
export default function InviteCard() {
  const router = useRouter()
  const { update } = useSession()
  const [overview, setOverview] = useState<ReferralOverview | null>(null)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [codeInput, setCodeInput] = useState("")
  const [claiming, setClaiming] = useState(false)
  const [claimMessage, setClaimMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/referral", { cache: "no-store" })
      if (!res.ok) throw new Error(String(res.status))
      setOverview((await res.json()) as ReferralOverview)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [load])

  async function copyLink() {
    if (!overview) return
    try {
      await navigator.clipboard.writeText(overview.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the link is visible to select by hand.
    }
  }

  async function share() {
    if (!overview) return
    try {
      await navigator.share({ title: "BijbelStudie", text: overview.shareText })
    } catch {
      // Dismissed, or the share sheet failed: nothing to report.
    }
  }

  async function claim() {
    setClaiming(true)
    setClaimMessage(null)
    try {
      const res = await fetch("/api/v1/referral/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput }),
      })
      const data = (await res.json().catch(() => null)) as { proUntil?: string | null; message?: string } | null
      if (res.ok) {
        setClaimMessage({
          ok: true,
          text: data?.proUntil ? `Je week Pro is gestart, tot ${formatDay(data.proUntil)}.` : "Je week Pro is gestart.",
        })
        await update()
        router.refresh()
        void load()
      } else {
        setClaimMessage({ ok: false, text: data?.message ?? "Dat lukte niet. Probeer het later opnieuw." })
      }
    } catch {
      setClaimMessage({ ok: false, text: "Dat lukte niet. Probeer het later opnieuw." })
    } finally {
      setClaiming(false)
    }
  }

  if (failed) return null

  return (
    <Card className="flex-none p-[15px]">
      <div className="text-[14.5px] font-bold text-ink">Nodig een vriend uit</div>
      <div className="mt-3 h-px bg-line" />

      {!overview ? (
        <Skeleton className="mt-[13px] h-24 w-full" />
      ) : (
        <>
          <p className="mt-[13px] text-[13px] leading-relaxed text-ink-body">
            Maakt een vriend via jouw link een account, dan krijgt die meteen een week Pro.
            {overview.youEarn ? " Gaat je vriend echt aan de slag, dan krijg jij er ook een week bij." : ""}
          </p>

          <div className="mt-3 truncate rounded-btn border border-line bg-line-soft px-3 py-2 text-[12.5px] text-ink-muted" title={overview.url}>
            {overview.url.replace(/^https:\/\//, "")}
          </div>

          <div className="mt-[10px] flex gap-2">
            {canShare && (
              <button
                type="button"
                onClick={share}
                data-track="referral_share"
                className="press inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-btn text-[13px] font-semibold text-white"
                style={{ backgroundColor: "#0D9488" }}
              >
                <Share2 size={15} aria-hidden /> Delen
              </button>
            )}
            <button
              type="button"
              onClick={copyLink}
              data-track="referral_copy"
              className={`press inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-btn text-[13px] font-semibold ${
                canShare ? "border border-line text-ink hover:bg-line-soft" : "text-white"
              }`}
              style={canShare ? undefined : { backgroundColor: "#0D9488" }}
            >
              {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
              {copied ? "Gekopieerd" : "Link kopiëren"}
            </button>
          </div>

          {(overview.joined > 0 || (overview.youEarn && overview.proUntil)) && (
            <div className="mt-[13px] space-y-1 text-[12.5px] text-ink-muted">
              {overview.joined > 0 && (
                <p>
                  {overview.joined} {overview.joined === 1 ? "vriend" : "vrienden"} via jouw link
                  {overview.active > 0 ? ` · ${overview.active} al aan de slag` : ""}
                </p>
              )}
              {overview.youEarn && overview.proUntil && <p>Je hebt Pro tot {formatDay(overview.proUntil)}.</p>}
            </div>
          )}

          {overview.claim.eligible && (
            <details className="mt-[13px] border-t border-line-soft pt-[10px]">
              <summary className="cursor-pointer text-[12.5px] font-semibold text-teal">
                Heb je zelf een uitnodigingscode?
              </summary>
              <div className="mt-2 flex gap-2">
                <input
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value)}
                  placeholder="ABCD 2345"
                  aria-label="Uitnodigingscode"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 text-[13px] uppercase tracking-wider text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
                />
                <button
                  type="button"
                  onClick={claim}
                  disabled={claiming || codeInput.trim().length === 0}
                  data-track="referral_claim_profile"
                  className="press h-9 rounded-btn px-3 text-[13px] font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: "#0D9488" }}
                >
                  {claiming ? "Bezig…" : "Gebruiken"}
                </button>
              </div>
              {claimMessage && (
                <p className={`mt-2 text-[12.5px] ${claimMessage.ok ? "text-teal" : "text-ink-muted"}`} role="status">
                  {claimMessage.text}
                </p>
              )}
            </details>
          )}
        </>
      )}
    </Card>
  )
}
