import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "../../../../components/shell/AppShell";
import { PrevNextNav } from "../../../../components/content/ContentShell";
import { JsonLd } from "../../../../components/seo/JsonLd";
import { BronBlocks } from "../../../../components/bronnen/BronBlocks";
import { ReaderHeader } from "../../../../components/bronnen/ReaderHeader";
import { ReaderRail } from "../../../../components/bronnen/ReaderRail";
import { ReaderTracker } from "../../../../components/bronnen/ReaderTracker";
import { BackLink } from "../../../../components/bronnen/parts";
import { buildMetadata } from "../../../../lib/pageMetadata";
import { absoluteUrl } from "../../../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../../../lib/seo/structuredData";
import { BRONNEN_PATH, sectionPath, workPath } from "../../../../lib/content/bronnen/catalog";
import { loadWork } from "../../../../lib/content/bronnen/load";
import { publishedWorks } from "../../../../lib/content/bronnen/published";
import { pluralNoun, sectionPreview } from "../../../../lib/content/bronnen/labels";
import { nounTitle, sectionTitle } from "../../../../lib/content/bronnen/themes";
import { workCard } from "../../../../lib/content/bronnen/view";

/**
 * /bronnen/<werk>/<deel> - the reader: one zondag, artikel, hoofdstuk or
 * formulier, its Scripture references as numbered labels in the text, and a
 * rail with every section and the reader's progress. Prerendered for
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
  const hasRefs = section.blocks.some(b => b.type !== "heading" && (b.refs?.length ?? 0) > 0);
  const card = workCard(work, false);
  const navLabel = (i: number) => {
    const s = card.sections[i];
    return s.title ? `${s.kicker} · ${s.title}` : s.kicker;
  };
  const total = work.sections.length;
  const kicker =
    total > 1 ? `${work.shortTitle} · ${nounTitle(work.sectionNoun)} ${index + 1} van ${total}` : work.shortTitle;
  const prevHref = prev ? sectionPath(work.slug, prev.id) : undefined;
  const nextHref = next ? sectionPath(work.slug, next.id) : undefined;

  return (
    <AppShell title="Bronnen" ownHeading>
      <JsonLd data={pageGraph} />
      <div className="w-full">
        <BackLink href={workPath(work.slug)} label={work.title} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <article className="rounded-card border border-line bg-surface px-5 py-6 sm:px-9 sm:py-9">
              <ReaderHeader
                slug={work.slug}
                sectionId={section.id}
                kicker={kicker}
                title={section.label}
                subtitle={sectionTitle(work.slug, section)}
                shareTitle={`${work.title} · ${section.label}`}
                hasRefs={hasRefs}
              />
              <div className="max-w-[46rem]">
                <BronBlocks blocks={section.blocks} />
              </div>
              <ReaderTracker slug={work.slug} sectionId={section.id} prevHref={prevHref} nextHref={nextHref} />
            </article>

            <div className="mt-6">
              <PrevNextNav
                label={`Andere ${pluralNoun(work.sectionNoun)}`}
                previous={prevHref ? { href: prevHref, label: navLabel(index - 1) } : undefined}
                next={nextHref ? { href: nextHref, label: navLabel(index + 1) } : undefined}
              />
            </div>
          </div>

          <ReaderRail
            slug={work.slug}
            sections={card.sections}
            current={index}
            credit={`${work.rights} Tekst via ${work.source.name}. Schriftteksten uit de Statenvertaling.`}
          />
        </div>
      </div>
    </AppShell>
  );
}
