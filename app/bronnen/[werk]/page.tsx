import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "../../../components/shell/AppShell";
import { JsonLd } from "../../../components/seo/JsonLd";
import { buildMetadata } from "../../../lib/pageMetadata";
import { absoluteUrl } from "../../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../../lib/seo/structuredData";
import { BRONNEN_PATH, workPath } from "../../../lib/content/bronnen/catalog";
import { loadWork } from "../../../lib/content/bronnen/load";
import { publishedWorks } from "../../../lib/content/bronnen/published";
import { workCard, workThemes } from "../../../lib/content/bronnen/view";
import { WorkView } from "../../../components/bronnen/WorkView";
import { BackLink } from "../../../components/bronnen/parts";

/**
 * /bronnen/<werk> - one work: a compact header, the themes and a card per
 * section, and where the text comes from. Prerendered for every work that has a data file.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedWorks().map(work => ({ werk: work.slug }));
}

interface PageProps {
  params: Promise<{ werk: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { werk } = await params;
  const work = await loadWork(werk);
  if (!work) return {};
  return buildMetadata({
    title: work.title,
    description: work.seoDescription,
    path: workPath(work.slug),
    type: "article",
    ogEyebrow: "Bronnen",
  });
}

export default async function WorkPage({ params }: PageProps) {
  const { werk } = await params;
  const work = await loadWork(werk);
  if (!work) notFound();

  const path = workPath(work.slug);
  const trail = [
    { name: "Bronnen", path: BRONNEN_PATH },
    { name: work.title, path },
  ];
  const pageGraph = graph(
    webPageNode({ path, name: work.title, description: work.seoDescription, breadcrumbId: `${absoluteUrl(path)}#breadcrumb` }),
    breadcrumbNode(trail, absoluteUrl(path)),
  );

  return (
    <AppShell title="Bronnen" ownHeading>
      <JsonLd data={pageGraph} />
      <div className="w-full">
        <BackLink href={BRONNEN_PATH} label="Bronnen" />
        <WorkView work={workCard(work)} themes={workThemes(work)} />
        <p className="mt-8 max-w-[60rem] text-[12px] leading-[1.6] text-ink-faint">
          {work.rights} Tekst: {work.source.edition ? `${work.source.edition}, ` : ""}via{" "}
          <a
            href={work.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-muted underline-offset-2 hover:underline"
          >
            {work.source.name}
          </a>
          . Schriftteksten uit de Statenvertaling.
        </p>
      </div>
    </AppShell>
  );
}
