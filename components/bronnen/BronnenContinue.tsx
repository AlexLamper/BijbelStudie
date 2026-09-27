"use client";

import Link from "next/link";
import { sectionPath } from "../../lib/content/bronnen/catalog";
import { continueTarget, latestPlace, readCount } from "../../lib/content/bronnen/progress";
import type { WorkCard } from "../../lib/content/bronnen/view";
import { BTN_PRIMARY, LABEL, ProgressBar, TEAL, pct } from "./parts";
import { useBronProgress } from "./useBronProgress";

/**
 * /bronnen "Verder lezen" strip above the overview: the last text the reader
 * opened, with its progress. Hidden until something was opened.
 */
export function BronnenContinue({ works }: { works: WorkCard[] }) {
  const progress = useBronProgress();
  const place = latestPlace(progress);
  const work = place ? works.find(w => w.slug === place.slug) : undefined;
  if (!place || !work) return null;
  const ids = work.sections.map(s => s.id);
  const target = continueTarget(progress, work.slug, ids);
  const section = work.sections.find(s => s.id === (target?.id ?? place.id)) ?? work.sections[0];
  const read = readCount(progress, work.slug, ids);

  return (
    <section
      className="mb-6 flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
      aria-labelledby="verder-lezen"
    >
      <div className="min-w-0 flex-1">
        <p id="verder-lezen" className={LABEL}>
          Verder lezen
        </p>
        <p className="mt-2 truncate text-[15px] font-semibold text-ink">{work.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
          {section.title ? `${section.kicker} · ${section.title}` : section.kicker}
        </p>
      </div>
      <div className="sm:w-56">
        <ProgressBar value={pct(read, ids.length)} />
        <p className="mt-1.5 text-[12px] tabular-nums text-ink-faint">
          {read} van {ids.length} gelezen
        </p>
      </div>
      <Link href={sectionPath(work.slug, section.id)} className={`${BTN_PRIMARY} sm:w-auto`} style={TEAL}>
        {target ? "Verder lezen" : "Opnieuw lezen"}
      </Link>
    </section>
  );
}
