import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "../../../lib/pageMetadata";
import { GUIDE_PAGES, getGuide } from "../../../lib/content/guides";
import { GuideArticle } from "../../../components/content/GuideArticle";
import { ContentShell } from "../../../components/content/ContentShell";
import { JsonLd } from "../../../components/seo/JsonLd";
import { absoluteUrl } from "../../../lib/seo/constants";
import {
  graph,
  webPageNode,
  articleNode,
  breadcrumbNode,
  faqNode,
} from "../../../lib/seo/structuredData";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Pre-render every guide at build time. `dynamicParams: false` makes any other
 * slug a 404 instead of an on-demand render, so /bijbelstudie/willekeurig can
 * never become a thin soft-404 that Google indexes.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_PAGES.map(guide => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide || guide.slug === "") return generatePageMetadata("unknown");
  return generatePageMetadata(guide.metadataKey);
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  // The hub lives at /bijbelstudie and owns slug "". Serving it here too would
  // put identical content on two URLs.
  if (!guide || guide.slug === "") notFound();

  const url = absoluteUrl(guide.path);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Bijbelstudie", path: "/bijbelstudie" },
    { name: guide.h1, path: guide.path },
  ];

  const pageGraph = graph(
    webPageNode({
      path: guide.path,
      name: guide.h1,
      description: guide.intro,
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(crumbs, url),
    articleNode({
      headline: guide.h1,
      description: guide.intro,
      path: guide.path,
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
    }),
    guide.faqs ? faqNode(guide.faqs, url) : null
  );

  return (
    <ContentShell crumbs={crumbs}>
      <JsonLd data={pageGraph} />
      <GuideArticle guide={guide} />
    </ContentShell>
  );
}
