"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, ChevronRight } from "lucide-react";
import { sectionPath } from "../../lib/content/bronnen/catalog";
import { continueTarget, latestPlace, readCount, zondagForDate } from "../../lib/content/bronnen/progress";
import type { WorkCard, ZondagCard } from "../../lib/content/bronnen/view";
import { BTN_PRIMARY, BTN_SECONDARY, GROUP_ICON, LABEL, ProgressBar, TEAL, pct } from "./parts";
import { useBronProgress } from "./useBronProgress";

/**
 * /bronnen side column: Verder lezen (hidden until something was opened),
 * the Heidelberg zondag of this week, and a short list of much-read texts
 * with the reader's own bookmarks on top.
 */

const CARD = "rounded-card border border-line bg-surface p-4 sm:p-5";

/** Much-read texts, by id; a row whose work or section is missing is skipped. */
const QUICK: { slug: string; id: string; label: string }[] = [
  { slug: "drie-algemene-belijdenissen", id: "apostolische-geloofsbelijdenis", label: "Apostolische Geloofsbelijdenis" },
  { slug: "heidelbergse-catechismus", id: "zondag-1", label: "Zondag 1 · De enige troost" },
  { slug: "christelijke-gebeden", id: "morgengebed", label: "Morgengebed" },
  { slug: "christelijke-gebeden", id: "avondgebed", label: "Avondgebed" },
  { slug: "christelijke-gebeden", id: "gebed-voor-het-eten", label: "Gebed vóór het eten" },
];

export function BronnenSide({ works, zondagen }: { works: WorkCard[]; zondagen: ZondagCard[] }) {
  return (
    <aside aria-label="Snel verder" className="flex flex-col gap-4 xl:sticky xl:top-0 xl:self-start">
      <ContinueCard works={works} />
      {zondagen.length > 0 && <ThisWeekCard zondagen={zondagen} />}
      <QuickCard works={works} />
    </aside>
  );
}

function ContinueCard({ works }: { works: WorkCard[] }) {
  const progress = useBronProgress();
  const place = latestPlace(progress);
  const work = place ? works.find(w => w.slug === place.slug) : undefined;
  if (!place || !work) return null;
  const ids = work.sections.map(s => s.id);
  const target = continueTarget(progress, work.slug, ids);
  const section = work.sections.find(s => s.id === (target?.id ?? place.id)) ?? work.sections[0];
  const read = readCount(progress, work.slug, ids);

  return (
    <section className={CARD} aria-labelledby="verder-lezen">
      <p id="verder-lezen" className={LABEL}>
        Verder lezen
      </p>
      <p className="mt-2.5 truncate text-[15px] font-semibold text-ink">{work.title}</p>
      <p className="mt-0.5 truncate text-[13px] text-ink-muted">
        {section.title ? `${section.kicker} · ${section.title}` : section.kicker}
      </p>
      <ProgressBar value={pct(read, ids.length)} className="mt-3.5" />
      <p className="mt-1.5 text-[12px] tabular-nums text-ink-faint">
        {read} van {ids.length} gelezen
      </p>
      <Link href={sectionPath(work.slug, section.id)} className={`${BTN_PRIMARY} mt-4 w-full`} style={TEAL}>
        {target ? "Verder lezen" : "Opnieuw lezen"}
      </Link>
    </section>
  );
}

function ThisWeekCard({ zondagen }: { zondagen: ZondagCard[] }) {
  // The week is the reader's, not the build's: the page is prerendered, so
  // the zondag is picked in the browser after hydration.
  const [week, setWeek] = useState<number | null>(null);
  useEffect(() => setWeek(zondagForDate(new Date())), []);

  const current = week == null ? undefined : zondagen.find(z => z.number === week);
  const at = current ? zondagen.indexOf(current) : -1;
  const start = Math.max(0, Math.min(at - 3, zondagen.length - 7));
  const around = at < 0 ? [] : zondagen.slice(start, start + 7);

  return (
    <section className={CARD} aria-labelledby="deze-week">
      <p id="deze-week" className={LABEL}>
        Deze week
      </p>
      {current ? (
        <>
          <p className="mt-2.5 text-[15px] font-semibold text-ink">
            Heidelbergse Catechismus, zondag {current.number}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {[current.questions, current.topic].filter(Boolean).join(" · ")}
          </p>
          <ol className="mt-3.5 flex gap-1.5" aria-label="Omliggende zondagen">
            {around.map(z => {
              const active = z.number === current.number;
              return (
                <li key={z.id} className="flex-1">
                  <Link
                    href={sectionPath("heidelbergse-catechismus", z.id)}
                    aria-current={active ? "date" : undefined}
                    title={z.topic ? `Zondag ${z.number} · ${z.topic}` : `Zondag ${z.number}`}
                    className={`flex h-8 items-center justify-center rounded-[8px] text-[12px] font-semibold tabular-nums no-underline transition-colors ${
                      active ? "text-white" : "border border-line text-ink-muted hover:bg-line-soft hover:text-ink"
                    }`}
                    style={active ? TEAL : undefined}
                  >
                    {z.number}
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link
            href={sectionPath("heidelbergse-catechismus", current.id)}
            className={`${BTN_SECONDARY} mt-4 w-full`}
          >
            Lees zondag {current.number}
          </Link>
        </>
      ) : (
        // Same height as the filled card, so nothing jumps when the week lands.
        <div aria-hidden className="h-[152px]" />
      )}
    </section>
  );
}

function QuickCard({ works }: { works: WorkCard[] }) {
  const progress = useBronProgress();
  const find = (slug: string, id: string) => {
    const work = works.find(w => w.slug === slug);
    const section = work?.sections.find(s => s.id === id);
    return work && section ? { work, section } : null;
  };

  const bookmarks = progress.bookmarks.flatMap(b => {
    const hit = find(b.slug, b.id);
    return hit ? [{ key: `b-${b.slug}/${b.id}`, bookmark: true, ...hit, label: hit.section.title ?? hit.section.kicker }] : [];
  });
  const quick = QUICK.flatMap(q => {
    const hit = find(q.slug, q.id);
    return hit && !bookmarks.some(b => b.work.slug === q.slug && b.section.id === q.id)
      ? [{ key: `q-${q.slug}/${q.id}`, bookmark: false, ...hit, label: q.label }]
      : [];
  });
  const rows = [...bookmarks, ...quick];
  if (rows.length === 0) return null;

  return (
    <section className={`${CARD} !px-2 !pb-2`} aria-labelledby="snel-naar">
      <p id="snel-naar" className={`${LABEL} px-2`}>
        Snel naar
      </p>
      <ul className="mt-2">
        {rows.map(row => {
          const Icon = row.bookmark ? Bookmark : GROUP_ICON[row.work.group];
          return (
            <li key={row.key}>
              <Link
                href={sectionPath(row.work.slug, row.section.id)}
                className="group flex items-center gap-3 rounded-btn px-2 py-2 no-underline transition-colors hover:bg-line-soft"
              >
                <Icon
                  className="h-4 w-4 flex-none text-teal-dark dark:text-teal-400"
                  aria-label={row.bookmark ? "Bladwijzer" : undefined}
                  aria-hidden={row.bookmark ? undefined : true}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{row.label}</span>
                  <span className="block truncate text-[11.5px] text-ink-faint">{row.work.shortTitle}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-none text-ink-faint group-hover:text-ink-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
