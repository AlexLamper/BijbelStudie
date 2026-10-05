"use client";

import { Flame } from "lucide-react";

/**
 * The reading streak as an object instead of a bare number.
 *
 * A number on its own ("2") says nothing about what is being counted, which is
 * why the app replaced its own corner number with a flame pill
 * (`features/dashboard/present/widgets/home_header_actions.dart`,
 * `StreakFlamePill`, RETENTION_PLAN.md §3.1). This is that pill on the web, so
 * both platforms mark the streak the same way: a surface plate with a hairline,
 * an orange flame and the count in bold.
 *
 * The flame is `--warn`, the one orange the palette has and the same orange the
 * streak badges on /profiel already use - so it is not a decorative icon but
 * the mark that identifies which number this is.
 *
 * `withLabel` spells the unit out ("2 dagen op rij") for a surface with room
 * for it; without it the pill is flame + count, for a row of chips.
 */
export default function StreakPill({
  streak,
  withLabel = false,
  className = "",
}: {
  streak: number;
  withLabel?: boolean;
  className?: string;
}) {
  const days = Math.max(0, Math.floor(streak));
  const word = days === 1 ? "dag" : "dagen";
  const label = `Reeks van ${days} ${word}`;
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-line bg-surface py-[5px] pl-[8px] pr-[10px] text-[13px] font-bold leading-none text-ink ${className}`}
    >
      <Flame size={15} strokeWidth={2.1} className="flex-none text-warn" aria-hidden />
      <span className="tabular-nums">{days}</span>
      {withLabel && <span className="font-semibold text-ink-muted">{word} op rij</span>}
    </span>
  );
}
