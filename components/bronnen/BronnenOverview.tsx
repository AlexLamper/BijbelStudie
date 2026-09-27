"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { Chip } from "../kit/primitives";
import { workPath } from "../../lib/content/bronnen/catalog";
import { readCount } from "../../lib/content/bronnen/progress";
import type { BronGroup } from "../../lib/content/bronnen/types";
import type { WorkCard } from "../../lib/content/bronnen/view";
import { BookCover, WorkProgressMark } from "./parts";
import { useBronPref, useBronProgress } from "./useBronProgress";

/**
 * /bronnen main column: filter chips, the grid/list switch and the works per
 * group. Server-rendered with "Alles" and the grid, so the full catalogue is
 * in the static HTML; the filter and the reader's progress apply in the browser.
 */

export interface OverviewGroup {
  id: BronGroup;
  label: string;
  /** The chip's shorter name. */
  chip: string;
  description: string;
}

type Filter = "alles" | BronGroup;

export function BronnenOverview({ groups, works }: { groups: OverviewGroup[]; works: WorkCard[] }) {
  const progress = useBronProgress();
  const [filter, setFilter] = useState<Filter>("alles");
  const [view, setView] = useBronPref("view", "grid");
  const list = view === "list";

  const present = groups
    .map(group => ({ ...group, works: works.filter(w => w.group === group.id) }))
    .filter(group => group.works.length > 0);
  const shown = present.filter(group => filter === "alles" || group.id === filter);

  const readOf = (work: WorkCard) =>
    readCount(
      progress,
      work.slug,
      work.sections.map(s => s.id),
    );

  return (
    <div className="min-w-0">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter op soort">
          <Chip
            label={<FilterLabel label="Alles" count={works.length} />}
            active={filter === "alles"}
            onClick={() => setFilter("alles")}
          />
          {present.map(group => (
            <Chip
              key={group.id}
              label={<FilterLabel label={group.chip} count={group.works.length} />}
              active={filter === group.id}
              onClick={() => setFilter(group.id)}
            />
          ))}
        </div>
        <div role="group" aria-label="Weergave" className="flex gap-[3px] rounded-btn bg-line-soft p-[3px]">
          {(
            [
              { value: "grid", label: "Rasterweergave", Icon: LayoutGrid },
              { value: "list", label: "Lijstweergave", Icon: List },
            ] as const
          ).map(({ value, label, Icon }) => {
            const active = (value === "list") === list;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                aria-label={label}
                title={label}
                onClick={() => setView(value)}
                className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                  active
                    ? "bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)]"
                    : "text-ink-muted hover:text-ink-body"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-9">
        {shown.map(group => (
          <section key={group.id} aria-labelledby={`groep-${group.id}`}>
            <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`groep-${group.id}`} className="text-[17px] font-bold tracking-[-0.2px] text-ink">
                {group.label}
              </h2>
              <p className="min-w-0 text-[13px] text-ink-muted sm:truncate">{group.description}</p>
            </div>

            {list ? (
              <ul className="overflow-hidden rounded-card border border-line bg-surface">
                {group.works.map((work, i) => (
                  <li key={work.slug} className={i > 0 ? "border-t border-line-soft" : ""}>
                    <Link
                      href={workPath(work.slug)}
                      className="group flex items-center gap-4 px-4 py-3 no-underline transition-colors hover:bg-line-soft sm:px-5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
                          {work.title}
                        </span>
                        <span className="block truncate text-[12.5px] text-ink-faint">
                          {[work.author, work.year].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="hidden flex-none text-[12px] text-ink-faint sm:block">{work.countLabel}</span>
                      <WorkProgressMark read={readOf(work)} total={work.sections.length} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.works.map(work => (
                  <Link
                    key={work.slug}
                    href={workPath(work.slug)}
                    className="group flex gap-4 rounded-card border border-line bg-surface p-4 no-underline transition-colors hover:border-line-strong"
                  >
                    <BookCover title={work.shortTitle} year={work.year} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-semibold leading-snug text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
                        {work.title}
                      </span>
                      <span className="mt-0.5 truncate text-[12.5px] text-ink-faint">
                        {[work.author, work.year].filter(Boolean).join(" · ")}
                      </span>
                      <span className="mt-1.5 line-clamp-2 text-[13px] leading-[1.55] text-ink-muted">
                        {work.description}
                      </span>
                      <span className="mt-auto flex items-center justify-between gap-3 pt-3">
                        <span className="min-w-0 truncate text-[12px] text-ink-faint">{work.countLabel}</span>
                        <WorkProgressMark read={readOf(work)} total={work.sections.length} />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function FilterLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label}
      <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
    </>
  );
}
