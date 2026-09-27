"use client";

import Link from "next/link";
import { sectionPath } from "../../lib/content/bronnen/catalog";
import { readCount } from "../../lib/content/bronnen/progress";
import { LABEL, TEAL } from "./parts";
import { useBronProgress } from "./useBronProgress";

/**
 * The reader's right rail: every section as a number (read ones dimmed, the
 * current one filled), the titles around the current section, and the
 * source line.
 */
export function ReaderRail({
  slug,
  sections,
  current,
  credit,
}: {
  slug: string;
  sections: { id: string; kicker: string; title: string | null }[];
  current: number;
  credit: string;
}) {
  const progress = useBronProgress();
  const ids = sections.map(s => s.id);
  const read = new Set(progress.read[slug] ?? []);
  const count = readCount(progress, slug, ids);

  // Two before, one after: "4–7" around 6, shifted inward at either end.
  const start = Math.max(0, Math.min(current - 2, sections.length - 4));
  const near = sections.slice(start, start + 4);

  return (
    <aside aria-label="Inhoud" className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
      {sections.length > 1 && (
        <nav aria-labelledby="rail-inhoud" className="rounded-card border border-line bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p id="rail-inhoud" className={LABEL}>
              Inhoud
            </p>
            <span className="text-[12px] tabular-nums text-ink-faint">
              {count} / {sections.length} gelezen
            </span>
          </div>
          <ol className="grid grid-cols-6 gap-1.5">
            {sections.map((s, i) => {
              const isCurrent = i === current;
              const isDone = read.has(s.id);
              return (
                <li key={s.id}>
                  <Link
                    href={sectionPath(slug, s.id)}
                    aria-current={isCurrent ? "page" : undefined}
                    aria-label={`${s.title ? `${s.kicker} · ${s.title}` : s.kicker}${isDone ? " (gelezen)" : ""}`}
                    title={s.title ? `${s.kicker} · ${s.title}` : s.kicker}
                    className={`flex h-8 items-center justify-center rounded-[8px] text-[12.5px] font-semibold tabular-nums no-underline transition-colors ${
                      isCurrent
                        ? "text-white"
                        : isDone
                          ? "bg-line-soft text-ink-faint hover:text-ink-muted"
                          : "text-ink-body hover:bg-line-soft hover:text-ink"
                    }`}
                    style={isCurrent ? TEAL : undefined}
                  >
                    {i + 1}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {near.length > 1 && (
        <nav aria-labelledby="rail-dit-deel" className="rounded-card border border-line bg-surface p-2">
          <p id="rail-dit-deel" className={`${LABEL} px-2 pb-1.5 pt-2`}>
            Dit deel
          </p>
          <ol>
            {near.map((s, j) => {
              const isCurrent = start + j === current;
              return (
                <li key={s.id}>
                  <Link
                    href={sectionPath(slug, s.id)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`block rounded-btn px-2.5 py-2 no-underline transition-colors ${
                      isCurrent ? "bg-[var(--teal-wash)]" : "hover:bg-line-soft"
                    }`}
                  >
                    <span
                      className={`block text-[11.5px] font-semibold ${
                        isCurrent ? "text-teal-dark dark:text-teal-400" : "text-ink-faint"
                      }`}
                    >
                      {s.kicker}
                    </span>
                    {s.title && (
                      <span
                        className={`mt-0.5 line-clamp-2 block text-[13px] leading-snug ${
                          isCurrent ? "font-semibold text-teal-dark dark:text-teal-400" : "text-ink-body"
                        }`}
                      >
                        {s.title}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <p className="px-1 text-[11.5px] leading-[1.55] text-ink-faint">{credit}</p>
    </aside>
  );
}
