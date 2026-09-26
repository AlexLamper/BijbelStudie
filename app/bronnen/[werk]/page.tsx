import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "../../../components/shell/AppShell";
import { JsonLd } from "../../../components/seo/JsonLd";
import { buildMetadata } from "../../../lib/pageMetadata";
import { absoluteUrl } from "../../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../../lib/seo/structuredData";
import { BRONNEN_PATH, sectionPath, workPath } from "../../../lib/content/bronnen/catalog";
import { loadWork } from "../../../lib/content/bronnen/load";
import { publishedWorks } from "../../../lib/content/bronnen/published";
import { sectionPreview, workCountLabel } from "../../../lib/content/bronnen/labels";

/**
 * /bronnen/<werk> - one work: our introduction, the table of contents and
 * where the text comes from. Prerendered for every work that has a data file.
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

  const first = work.sections[0];
  // A short list (a few formulieren, three creeds) reads best with a line of
  // preview under each title; 52 zondagen or 30 chapters as a dense grid.
  const dense = work.sections.length > 12;

  return (
    <AppShell title="Bronnen" ownHeading>
      <JsonLd data={pageGraph} />
      <div className="mx-auto w-full max-w-[64rem]">
        <Link
          href={BRONNEN_PATH}
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted no-underline hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Bronnen
        </Link>

        <header className="rounded-card border border-line bg-surface p-6 sm:p-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.4px] text-teal-dark dark:text-teal-400">
            {[work.author, work.year].filter(Boolean).join(" · ")}
          </p>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[32px]">
            {work.title}
          </h1>
          <p className="mt-3 max-w-[46rem] text-[15px] leading-[1.7] text-ink-muted">{work.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href={sectionPath(work.slug, first.id)}
              className="inline-flex h-10 items-center rounded-full px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0D9488" }}
            >
              Begin met lezen
            </Link>
            <span className="text-[13px] text-ink-faint">{workCountLabel(work)}</span>
          </div>
        </header>

        <section aria-labelledby="inhoud" className="mt-8">
          <h2 id="inhoud" className="mb-4 text-[18px] font-bold tracking-[-0.2px] text-ink sm:text-[19px]">
            Inhoud
          </h2>
          {dense ? (
            <ol className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
              {work.sections.map(section => (
                <li key={section.id}>
                  <Link
                    href={sectionPath(work.slug, section.id)}
                    className="flex h-full items-baseline gap-2 rounded-[12px] border border-line bg-surface px-4 py-3 no-underline transition-colors hover:border-line-strong"
                  >
                    <span className="flex-none text-[13.5px] font-semibold text-ink">{section.label}</span>
                    {section.title && (
                      <span className="min-w-0 truncate text-[12.5px] text-ink-faint">{section.title}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="overflow-hidden rounded-card border border-line bg-surface">
              {work.sections.map((section, i) => (
                <li key={section.id} className={i > 0 ? "border-t border-line-soft" : ""}>
                  <Link
                    href={sectionPath(work.slug, section.id)}
                    className="block px-5 py-4 no-underline transition-colors hover:bg-line-soft"
                  >
                    <span className="block text-[15px] font-semibold text-ink">
                      {section.title ?? section.label}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-[13px] leading-[1.55] text-ink-muted">
                      {sectionPreview(section, 180)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="over-de-tekst" className="mt-8 rounded-card border border-line bg-surface p-5 sm:p-6">
          <h2 id="over-de-tekst" className="text-[15px] font-semibold text-ink">
            Over deze tekst
          </h2>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-ink-muted">{work.rights}</p>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-ink-muted">
            Tekst: {work.source.edition ? `${work.source.edition}, ` : ""}
            via{" "}
            <a
              href={work.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-dark underline-offset-2 hover:underline dark:text-teal-400"
            >
              {work.source.name}
            </a>
            . Schriftteksten uit de Statenvertaling.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
