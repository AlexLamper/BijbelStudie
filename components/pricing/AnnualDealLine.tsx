import { euro, type AnnualDeal } from "../../lib/pricing"

/**
 * "€119,88 (12 x maandprijs) → €89,99 per jaar - bespaar 25%, €7,50 per maand".
 *
 * The struck-through amount is twelve monthly payments at today's monthly
 * price, never a former price, and it always carries that label - see
 * `annualDeal` in lib/pricing.ts for why. Renders nothing without a deal.
 */
export default function AnnualDealLine({ deal, className = "" }: { deal: AnnualDeal | null; className?: string }) {
  if (!deal) return null
  return (
    <span className={`block tabular-nums ${className}`}>
      <span className="line-through decoration-1">{euro(deal.monthlyTimesTwelveCents)}</span>{" "}
      <span className="text-ink-faint">(12 x maandprijs)</span>{" "}
      <span aria-hidden>→</span>
      <span className="sr-only">nu</span> <span className="font-semibold text-ink">{euro(deal.annualCents)} per jaar</span>
      {" - "}bespaar {deal.savePercent}%, {euro(deal.perMonthCents)} per maand
    </span>
  )
}
