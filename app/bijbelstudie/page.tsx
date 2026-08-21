import type { Metadata } from "next";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { GUIDE_HUB } from "../../lib/content/guides";
import { GuideArticle } from "../../components/content/GuideArticle";
import { ContentShell } from "../../components/content/ContentShell";
import { JsonLd } from "../../components/seo/JsonLd";
import { absoluteUrl } from "../../lib/seo/constants";
import {
  graph,
  webPageNode,
  articleNode,
  breadcrumbNode,
  faqNode,
} from "../../lib/seo/structuredData";

export const metadata: Metadata = generatePageMetadata("guideHub");

/**
 * Fully static. There is no session-dependent content on this page, so it can
 * be served from the CDN - which is both the fastest thing a crawler can get
 * and the cheapest thing to serve.
 */
export const dynamic = "force-static";

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Bijbelstudie", path: "/bijbelstudie" },
];

export default function BijbelstudieHubPage() {
  const url = absoluteUrl(GUIDE_HUB.path);

  const pageGraph = graph(
    webPageNode({
      path: GUIDE_HUB.path,
      name: GUIDE_HUB.h1,
      description: GUIDE_HUB.intro,
      datePublished: GUIDE_HUB.datePublished,
      dateModified: GUIDE_HUB.dateModified,
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    articleNode({
      headline: GUIDE_HUB.h1,
      description: GUIDE_HUB.intro,
      path: GUIDE_HUB.path,
      datePublished: GUIDE_HUB.datePublished,
      dateModified: GUIDE_HUB.dateModified,
      keywords: [
        "bijbelstudie",
        "bijbel studie",
        "bijbelstudie methoden",
        "bijbel bestuderen",
        "inductieve bijbelstudie",
      ],
    }),
    GUIDE_HUB.faqs ? faqNode(GUIDE_HUB.faqs, url) : null
  );

  return (
    <ContentShell crumbs={CRUMBS}>
      <JsonLd data={pageGraph} />
      <GuideArticle guide={GUIDE_HUB} />
    </ContentShell>
  );
}
