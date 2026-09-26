import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "../../../../components/shell/AppShell";
import { PrevNextNav } from "../../../../components/content/ContentShell";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { BronBlocks } from "../../../../components/bronnen/BronBlocks";
import { RefToggle } from "../../../../components/bronnen/RefToggle";
import { buildMetadata } from "../../../../lib/pageMetadata";
import { absoluteUrl } from "../../../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../../../lib/seo/structuredData";
import { BRONNEN_PATH, sectionPath, workPath } from "../../../../lib/content/bronnen/catalog";
import { loadWork } from "../../../../lib/content/bronnen/load";
import { publishedWorks } from "../../../../lib/content/bronnen/published";
import { pluralNoun, sectionPreview } from "../../../../lib/content/bronnen/labels";

/**
 * /bronnen/<werk>/<deel> - the reader: one zondag, artikel, hoofdstuk or
 * formulier, with the Scripture references under each answer. Prerendered for
 * every section of every published work.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedWorks().flatMap(work => work.sectionIds.map(id => ({ werk: work.slug, deel: id })));
}

interface PageProps {
  params: Promise<{ werk: string; deel: string }>;
}

async function resolve(params: PageProps["params"]) {
  const { werk, deel } = await params;
  const work = await loadWork(werk);
  const index = work ? work.sections.findIndex(s => s.id === deel) : -1;
  if (!work || index < 0) return null;
  return { work, index, section: work.sections[index] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return {};
  const { work, section } = found;
  const heading = section.title ? `${section.label}: ${section.title}` : section.label;
  return buildMetadata({
    title: `${work.title} ${heading}`,
    description: sectionPreview(section),
    path: sectionPath(work.slug, section.id),
    type: "article",
    ogEyebrow: work.title,
  });
}

export default async function SectionPage({ params }: PageProps) {
  const found = await resolve(params);
  if (!found) notFound();
  const { work, index, section } = found;

  const path = sectionPath(work.slug, section.id);
  const trail = [
    { name: "Bronnen", path: BRONNEN_PATH },
    { name: work.title, path: workPath(work.slug) },
    { name: section.label, path },
  ];
  const pageGraph = graph(
    webPageNode({
      path,
      name: `${work.title} ${section.label}`,
      description: sectionPreview(section),
      breadcrumbId: `${absoluteUrl(path)}#breadcrumb`,
    }),
    breadcrumbNode(trail, absoluteUrl(path)),
  );

  const prev = work.sections[index - 1];
  const next = work.sections[index + 1];
  const hasRefText = section.blocks.some(
    b => b.type !== "heading" && b.refs?.some(r => "text" in r && r.text && r.text.length > 0),
  );
  // Numbered sections (zondagen, artikelen, hoofdstukken) index as a grid of
  // numbers; named ones (formulieren, creeds) as a list of names.
  const numbered = work.sections.every(s => s.number != null) && work.sections.length > 8;

  return (
    <AppShell title="Bronnen" ownHeading>
      <JsonLd data={pageGraph} />
      <div className="mx-auto grid w-full max-w-[72rem] gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <Link
            href={workPath(work.slug)}
            className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted no-underline hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {work.title}
          </Link>

          <article className="rounded-card border border-line bg-surface px-5 py-6 sm:px-9 sm:py-9">
            <header className="mb-8 flex flex-col gap-4 border-b border-line-soft pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1.4px] text-teal-dark dark:text-teal-400">
                  {work.title}
                </p>
                <h1 className="text-[24px] font-bold leading-tight tracking-[-0.4px] text-ink sm:text-[28px]">
                  {section.label}
                </h1>
                {section.title && (
                  <p className="mt-1.5 font-serif text-[17px] italic leading-snug text-ink-muted">{section.title}</p>
                )}
              </div>
              {hasRefText && <RefToggle />}
            </header>

            <div className="max-w-[44rem]">
              <BronBlocks blocks={section.blocks} />
            </div>
          </article>

          <div className="mt-6">
            <PrevNextNav
              label={`Andere ${pluralNoun(work.sectionNoun)}`}
              previous={prev ? { href: sectionPath(work.slug, prev.id), label: prev.label } : undefined}
              next={next ? { href: sectionPath(work.slug, next.id), label: next.label } : undefined}
            />
          </div>
        </div>

        <aside aria-label="Inhoud" className="lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1.2px] text-ink-faint">Inhoud</p>
            {numbered ? (
              <ol className="grid grid-cols-6 gap-1.5">
                {work.sections.map(s => {
                  const current = s.id === section.id;
                  return (
                    <li key={s.id}>
                      <Link
                        href={sectionPath(work.slug, s.id)}
                        aria-current={current ? "page" : undefined}
                        title={s.title ? `${s.label} · ${s.title}` : s.label}
                        className={`flex h-8 items-center justify-center rounded-[8px] text-[12.5px] font-semibold tabular-nums no-underline transition-colors ${
                          current ? "text-white" : "text-ink-muted hover:bg-line-soft hover:text-ink"
                        }`}
                        style={current ? { backgroundColor: "#0D9488" } : undefined}
                      >
                        {s.number}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <ol className="max-h-[60vh] space-y-0.5 overflow-auto">
                {work.sections.map(s => {
                  const current = s.id === section.id;
                  return (
                    <li key={s.id}>
                      <Link
                        href={sectionPath(work.slug, s.id)}
                        aria-current={current ? "page" : undefined}
                        className={`block rounded-[8px] px-2.5 py-2 text-[13px] leading-snug no-underline transition-colors ${
                          current
                            ? "bg-teal-faint font-semibold text-teal-dark dark:text-teal-400"
                            : "text-ink-muted hover:bg-line-soft hover:text-ink"
                        }`}
                      >
                        {s.title ?? s.label}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <p className="mt-3 px-1 text-[11.5px] leading-[1.55] text-ink-faint">
            {work.rights} Schriftteksten uit de Statenvertaling.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
