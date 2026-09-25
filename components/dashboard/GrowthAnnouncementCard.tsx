"use client"

import { useState } from "react"
import Link from "next/link"
import { useLevensboom } from "../../hooks/useLevensboom"
import { Card } from "../kit/primitives"
import { GROWTH_ANNOUNCEMENT, GROWTH_ANNOUNCEMENT_KEY, showsGrowthAnnouncement } from "../../lib/levensboom/growthCopy"
import { track } from "../../lib/analytics"

const TEAL = "#0D9488"

/**
 * The one-time growth-v2 card (LEVENSBOOM_GROWTH_PLAN.md §9.6).
 *
 * Only for accounts from before the launch (`announceGrowth`, decided by the
 * server) that have not dismissed it: both buttons record `growth-v2` in
 * `levensboom.seenItems` through the same PATCH the studio's "Nieuw" dots use,
 * so it is gone on the phone too. New accounts never see it - their tree starts
 * at the kiem and has nothing to be told about.
 *
 * It hides the moment either button is pressed, whatever the write does: a
 * failed save rolls the seen-list back in the provider, and a card that came
 * back after "Sluiten" would be worse than one that shows again next visit.
 */
export default function GrowthAnnouncementCard() {
  const { data, markItemsSeen } = useLevensboom()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !showsGrowthAnnouncement(data?.levensboom)) return null

  const close = (action: "open" | "close") => {
    setDismissed(true)
    track("tree_announcement_seen", { action })
    void markItemsSeen([GROWTH_ANNOUNCEMENT_KEY])
  }

  return (
    <Card className="flex-none border-teal/30 bg-teal-faint px-6 py-5 max-md:px-5">
      <section aria-labelledby="groei-aankondiging">
        <h2 id="groei-aankondiging" className="text-[16px] font-bold text-ink">
          {GROWTH_ANNOUNCEMENT.title}
        </h2>
        <p className="mt-[6px] max-w-[62ch] text-[13.5px] leading-[1.65] text-ink-body">{GROWTH_ANNOUNCEMENT.body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/profiel/boom?tab=groei"
            onClick={() => close("open")}
            className="inline-flex h-9 items-center rounded-btn px-4 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            {GROWTH_ANNOUNCEMENT.open}
          </Link>
          <button
            type="button"
            onClick={() => close("close")}
            className="text-[13px] font-semibold text-ink-body transition-colors hover:text-teal dark:hover:text-teal-400"
          >
            {GROWTH_ANNOUNCEMENT.close}
          </button>
        </div>
      </section>
    </Card>
  )
}
