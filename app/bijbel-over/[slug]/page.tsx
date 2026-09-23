import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "../../../lib/pageMetadata";
import {
  TOPICS,
  TOPIC_HUB,
  getTopic,
  topicHeading,
  topicPath,
  topicWordCount,
} from "../../../lib/content/topics";
import { ContentShell } from "../../../components/content/ContentShell";
import { JsonLd } from "../../../components/seo/JsonLd";
import { absoluteUrl } from "../../../lib/seo/constants";
import {
  graph,
  webPageNode,
  breadcrumbNode,
  articleNode,
  faqNode,
} from "../../../lib/seo/structuredData";
import { TopicArticle } from "../_components/TopicArticle";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Every topic is built once, at build time, and served from the CDN.
 *
 * `dynamicParams = false` turns any other slug into a real 404 instead of an
 * on-demand render. `force-static` is needed on top of generateStaticParams:
 * the root layout calls getServerSession(), which reads cookies, and that
 * alone would otherwise make each topic render per request. Under
 * force-static those reads return nothing, the layout renders its signed-out
 * branch - exactly what /bijbelstudie, /bijbelboeken and /help already do -
 * and nothing on this page depends on who is reading.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return TOPICS.map(topic => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) {
    return buildMetadata({
      title: "Onderwerp niet gevonden",
      description: "Dit onderwerp bestaat niet.",
      path: TOPIC_HUB.path,
      indexable: false,
    });
  }

  return buildMetadata({
    // The question itself is the title: it is the exact query, and at most
    // 45 characters it fits Google's ~60 with the "BijbelStudie | " prefix.
    title: topicHeading(topic),
    description: topic.description,
    path: topicPath(topic),
    type: "article",
    ogEyebrow: "Wat zegt de Bijbel",
    keywords: topic.keywords,
    publishedTime: topic.datePublished,
    modifiedTime: topic.dateModified,
  });
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const path = topicPath(topic);
  const url = absoluteUrl(path);
  const heading = topicHeading(topic);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: TOPIC_HUB.crumb, path: TOPIC_HUB.path },
    { name: topic.label, path },
  ];

  const pageGraph = graph(
    webPageNode({
      path,
      name: heading,
      description: topic.description,
      datePublished: topic.datePublished,
      dateModified: topic.dateModified,
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(crumbs, url),
    articleNode({
      headline: heading,
      description: topic.description,
      path,
      datePublished: topic.datePublished,
      dateModified: topic.dateModified,
      wordCount: topicWordCount(topic),
      keywords: topic.keywords,
    }),
    faqNode(topic.faqs, url)
  );

  return (
    <ContentShell crumbs={crumbs}>
      <JsonLd data={pageGraph} />
      <TopicArticle topic={topic} />
    </ContentShell>
  );
}
