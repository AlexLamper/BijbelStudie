"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Chip } from "../kit/primitives";
import { sectionPath } from "../../lib/content/bronnen/catalog";
import { pluralNoun } from "../../lib/content/bronnen/labels";
import { continueTarget, isRead, readCount } from "../../lib/content/bronnen/progress";
import { nounTitle, type ThemeRange } from "../../lib/content/bronnen/themes";
import type { WorkCard } from "../../lib/content/bronnen/view";
import { BTN_PRIMARY, GROUP_ICON, LABEL, TEAL } from "./parts";
import { useBronProgress } from "./useBronProgress";

/**
 * /bronnen/<werk>: a compact header card (the work, its progress and the
 * "Verder" button), the theme navigation and a card per section. The theme
 * filter and the reader's progress apply in the browser; the static HTML
 * holds every section card under "Alle".
 */
export function WorkView({ work, themes }: { work: WorkCard; themes: ThemeRange[] }) {
  const progress = useBronProgress();
  const [themeIndex, setThemeIndex] = useState<number | null>(null);

  const ids = work.sections.map(s => s.id);
  const total = ids.length;
  const read = readCount(progress, work.slug, ids);
  const target = continueTarget(progress, work.slug, ids);
  const targetSection = target ? work.sections.find(s => s.id === target.id) : undefined;
  const currentId = target?.started ? target.id : null;

  const plural = pluralNoun(work.sectionNoun);
  const Icon = GROUP_ICON[work.group];
  const theme = themeIndex == null ? null : themes[themeIndex];
  const visible = theme ? work.sections.slice(theme.from, theme.to + 1) : work.sections;
  const visibleRead = visible.filter(s => isRead(progress, work.slug, s.id)).length;

  const button = !target
    ? { href: sectionPath(work.slug, ids[0]), label: "Opnieuw lezen" }
    : !target.started || !targetSection
      ? { href: sectionPath(work.slug, target.id), label: "Begin met lezen" }
      : { href: sectionPath(work.slug, target.id), label: `Verder bij ${targetSection.kicker.toLowerCase()}` };

  const themeNav = themes.length > 0;
  const allLabel = `Alle ${plural}`;

  return (
    <>
      <header className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-teal-faint text-teal-dark dark:text-teal-400">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1 className="text-[18px] font-bold leading-snug tracking-[-0.2px] text-ink">{work.title}</h1>
              <span className="text-[12.5px] text-ink-faint">
                {[work.author, work.year, work.countLabel].filter(Boolean).join(" · ")}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-ink-muted" title={work.description}>
              {work.description}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-4">
          <span className="text-[13px] font-semibold tabular-nums text-ink-muted" aria-label={`${read} van ${total} gelezen`}>
            {read} / {total}
          </span>
          <Link href={button.href} className={`${BTN_PRIMARY} flex-1 sm:flex-none`} style={TEAL}>
            {button.label}
          </Link>
        </div>
      </header>

      <div className={`mt-6 grid gap-6 ${themeNav ? "lg:grid-cols-[230px_minmax(0,1fr)]" : ""}`}>
        {themeNav && (
          <nav aria-label="Thema's" className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            {/* Phones and tablets: one scrolling row of chips. */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
              <Chip label={allLabel} active={themeIndex == null} onClick={() => setThemeIndex(null)} />
              {themes.map((t, i) => (
                <span key={t.label} className="flex-none">
                  <Chip label={t.label} active={themeIndex === i} onClick={() => setThemeIndex(i)} />
                </span>
              ))}
            </div>
            <ul className="hidden rounded-card border border-line bg-surface p-2 lg:block">
              <ThemeRow label={allLabel} range={`${total}`} active={themeIndex == null} onClick={() => setThemeIndex(null)} />
              {themes.map((t, i) => (
                <ThemeRow key={t.label} label={t.label} range={t.range} active={themeIndex === i} onClick={() => setThemeIndex(i)} />
              ))}
            </ul>
          </nav>
        )}

        <section aria-labelledby="onderdelen" className="min-w-0">
          <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="onderdelen" className="text-[17px] font-bold tracking-[-0.2px] text-ink">
              {theme ? theme.label : allLabel}
            </h2>
            <span className="text-[12.5px] tabular-nums text-ink-faint">
              {theme ? `${nounTitle(work.sectionNoun)} ${theme.range}` : `${total} ${plural}`} · {visibleRead} van{" "}
              {visible.length} gelezen
            </span>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(section => {
              const done = isRead(progress, work.slug, section.id);
              const current = section.id === currentId;
              return (
                <li key={section.id} className="min-w-0">
                  <Link
                    href={sectionPath(work.slug, section.id)}
                    aria-current={current ? "step" : undefined}
                    className={`group flex h-full flex-col rounded-card border bg-surface p-4 no-underline transition-colors ${
                      current ? "" : "border-line hover:border-line-strong"
                    }`}
                    style={current ? { borderColor: "#0D9488", boxShadow: "0 0 0 1px #0D9488" } : undefined}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={`${LABEL} min-w-0 truncate`}>{section.kicker}</span>
                      {current ? (
                        <span className="flex-none rounded-full bg-teal-faint px-2 py-0.5 text-[11px] font-semibold text-teal-dark dark:text-teal-400">
                          Verder lezen
                        </span>
                      ) : done ? (
                        <span className="inline-flex flex-none items-center gap-1 text-[11.5px] font-semibold text-teal-dark dark:text-teal-400">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Gelezen
                        </span>
                      ) : null}
                    </span>
                    {section.title && (
                      <span className="mt-2 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
                        {section.title}
                      </span>
                    )}
                    {section.opening && (
                      <span className="mt-1.5 line-clamp-2 font-serif text-[13.5px] leading-[1.6] text-ink-muted">
                        {section.opening}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}

function ThemeRow({
  label,
  range,
  active,
  onClick,
}: {
  label: string;
  range: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex w-full items-baseline justify-between gap-3 rounded-btn px-3 py-2 text-left text-[13.5px] transition-colors ${
          active
            ? "bg-[var(--teal-wash)] font-semibold text-teal-dark dark:text-teal-400"
            : "font-medium text-ink-body hover:bg-line-soft"
        }`}
      >
        <span className="min-w-0">{label}</span>
        <span className={`flex-none text-[12px] tabular-nums ${active ? "" : "text-ink-faint"}`}>{range}</span>
      </button>
    </li>
  );
}
