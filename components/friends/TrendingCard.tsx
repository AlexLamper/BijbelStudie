"use client"

import Link from "next/link"
import { KringPanel } from "./KringPanel"
import { referenceReaderHref } from "../../lib/friends/references"
import type { TrendingShare } from "../../lib/friends/types"

/**
 * "Veel gedeeld deze week" on the Ontdek tab: the four references shared most
 * often in the last seven days, each with the opening of the verse and how
 * often it went round.
 *
 * A row is a link into the reader when the reference resolves to a real
 * chapter, and plain text when it does not - a post stores its reference as a
 * string, so `referenceReaderHref` is allowed to fail, and a link that opened
 * the wrong chapter would be worse than no link at all.
 */

/** "1,2k" - Dutch decimal comma, and no ",0" tail on a round thousand. */
export function shareCountLabel(count: number): string {
  if (count < 1000) return String(count);
  const thousands = (count / 1000).toFixed(1).replace(/\.0$/, "").replace(".", ",")
  return `${thousands}k`
}

export function TrendingCard({ shares }: { shares: TrendingShare[] }) {
  if (shares.length === 0) return null

  return (
    <KringPanel title="Veel gedeeld deze week">
      <ol className="flex flex-col divide-y divide-line-soft">
        {shares.map((share, index) => {
          const href = referenceReaderHref(share.reference)
          const inner = (
            <>
              <span className="w-[14px] flex-none text-[13px] tabular-nums text-ink-faint">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{share.reference}</span>
                {share.preview && (
                  <span className="mt-[1px] block truncate text-[12px] text-ink-faint">{share.preview}</span>
                )}
              </span>
              <span className="flex-none text-[12px] tabular-nums text-ink-faint">
                {shareCountLabel(share.shareCount)}
              </span>
            </>
          )
          return (
            <li key={share.reference} className="first:-mt-1 last:-mb-1">
              {href ? (
                <Link
                  href={href}
                  prefetch={false}
                  className="flex items-center gap-2.5 py-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                >
                  {inner}
                </Link>
              ) : (
                <span className="flex items-center gap-2.5 py-2">{inner}</span>
              )}
            </li>
          )
        })}
      </ol>
    </KringPanel>
  )
}
