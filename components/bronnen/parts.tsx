import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, MessageCircleQuestion, ScrollText, type LucideIcon } from "lucide-react";
import type { BronGroup } from "../../lib/content/bronnen/types";

/**
 * Small pieces the three Bronnen pages share. Presentation only: they take
 * numbers and draw them; progress comes from useBronProgress in the caller.
 */

/** Identifies what kind of text a work is: a confession, a catechism, a form or prayer. */
export const GROUP_ICON: Record<BronGroup, LucideIcon> = {
  belijdenis: ScrollText,
  catechese: MessageCircleQuestion,
  liturgie: BookOpen,
};

export const LABEL = "text-[11px] font-semibold uppercase tracking-[1.2px] text-ink-faint";

export const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-btn px-4 text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2";

export const BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-btn border border-line bg-surface px-4 text-[13.5px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]";

export const TEAL = { backgroundColor: "#0D9488" } as const;

export function pct(read: number, total: number): number {
  return total > 0 ? Math.round((read / total) * 100) : 0;
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span aria-hidden className={`block h-1.5 overflow-hidden rounded-full bg-line ${className}`}>
      <span className="block h-full rounded-full" style={{ ...TEAL, width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}

/** A work's state in one glance: an arrow (not begun), a bar with percentage, or "Gelezen". */
export function WorkProgressMark({ read, total }: { read: number; total: number }) {
  if (read <= 0) {
    return (
      <ArrowRight
        className="h-4 w-4 flex-none text-ink-faint transition-colors group-hover:text-teal-dark dark:group-hover:text-teal-400"
        aria-label="Nog niet begonnen"
      />
    );
  }
  if (read >= total) {
    return (
      <span className="inline-flex flex-none items-center gap-1 text-[12px] font-semibold text-teal-dark dark:text-teal-400">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Gelezen
      </span>
    );
  }
  const value = pct(read, total);
  return (
    <span className="inline-flex flex-none items-center gap-2" aria-label={`${value}% gelezen`}>
      <ProgressBar value={value} className="w-14" />
      <span className="text-[12px] font-semibold tabular-nums text-ink-muted">{value}%</span>
    </span>
  );
}

/**
 * A plain book: a dark teal plate with a spine down the left edge, the year,
 * the title and a rule at the foot. Decoration of the card, so hidden from
 * assistive technology - the card's own text says the same.
 */
export function BookCover({ title, year }: { title: string; year: string }) {
  return (
    <span
      aria-hidden
      className="relative flex aspect-[3/4] w-[86px] flex-none flex-col overflow-hidden rounded-[6px] bg-teal-dark py-2.5 pl-[15px] pr-2 text-white"
    >
      <span className="absolute inset-y-0 left-0 w-[7px] bg-black/25" />
      <span className="absolute inset-y-0 left-[7px] w-px bg-white/15" />
      <span className="text-[9px] font-medium tabular-nums text-white/70">{year}</span>
      <span className="mt-1.5 line-clamp-4 font-serif text-[11px] font-semibold leading-[1.25]">{title}</span>
      <span className="absolute bottom-2.5 left-[15px] right-2.5 h-px bg-white/40" />
    </span>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted no-underline hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}
