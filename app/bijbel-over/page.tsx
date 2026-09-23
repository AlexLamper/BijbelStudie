import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "../../lib/pageMetadata";
import {
  TOPICS,
  TOPIC_GROUPS,
  TOPIC_HUB,
  topicHeading,
  topicPath,
  topicsInGroup,
} from "../../lib/content/topics";
import { ContentShell, RelatedLinks } from "../../components/content/ContentShell";
import { JsonLd } from "../../components/seo/JsonLd";
import { absoluteUrl } from "../../lib/seo/constants";
import {
  graph,
  webPageNode,
  breadcrumbNode,
  itemListNode,
} from "../../lib/seo/structuredData";

/* Teal type is text-teal-dark (#0F766E): #0D9488 is 3.7:1 on white - fine as a
   fill, short of AA as type. On dark it lifts to teal-400. */

export const metadata: Metadata = buildMetadata({
  title: TOPIC_HUB.title,
  description: TOPIC_HUB.description,
  path: TOPIC_HUB.path,
  ogEyebrow: "Wat zegt de Bijbel",
  keywords: [
    "wat zegt de bijbel",
    "wat zegt de bijbel over",
    "bijbelse onderwerpen",
    "bijbelteksten per onderwerp",
    "bijbel uitleg",
  ],
});

/**
 * Fully static, like /bijbelstudie and /bijbelboeken: the list never depends
 * on who is reading. force-static also keeps the root layout's session read
 * from turning this into a per-request render.
 */
export const dynamic = "force-static";

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: TOPIC_HUB.crumb, path: TOPIC_HUB.path },
];

export default function BijbelOverHubPage() {
  const url = absoluteUrl(TOPIC_HUB.path);

  const pageGraph = graph(
    webPageNode({
      path: TOPIC_HUB.path,
      name: TOPIC_HUB.h1,
      description: TOPIC_HUB.description,
      datePublished: TOPIC_HUB.datePublished,
      dateModified: TOPIC_HUB.dateModified,
      type: "CollectionPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    itemListNode({
      pageUrl: url,
      name: "Wat zegt de Bijbel over ...?",
      items: TOPICS.map(topic => ({
        name: topicHeading(topic),
        path: topicPath(topic),
        description: topic.summary,
      })),
    })
  );

  return (
    <ContentShell crumbs={CRUMBS}>
      <JsonLd data={pageGraph} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <header className="mb-10">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400">
            Bijbelse onderwerpen
          </p>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]">
            {TOPIC_HUB.h1}
          </h1>
          <div className="mt-3 space-y-3">
            {TOPIC_HUB.intro.map((paragraph, i) => (
              <p key={i} className="text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">
                {paragraph}
              </p>
            ))}
          </div>
        </header>

        {TOPIC_GROUPS.map(group => (
          <section key={group.id} className="mb-12">
            <h2 className="text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
              {group.label}
            </h2>
            <p className="mb-5 mt-1.5 text-[13.5px] leading-[1.7] text-ink-muted">
              {group.description}
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {topicsInGroup(group.id).map(topic => (
                <li key={topic.slug}>
                  <Link
                    href={topicPath(topic)}
                    className="group block h-full rounded-btn border border-line bg-surface px-4 py-3 no-underline transition-colors hover:border-line-strong"
                  >
                    <span className="block text-[14px] font-semibold text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
                      {topicHeading(topic)}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.55] text-ink-muted">
                      {topic.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-16">
          <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
            Hoe deze pagina&apos;s gemaakt zijn
          </h2>
          <ol className="rounded-card border border-line bg-surface px-4 py-1 sm:px-[22px]">
            {TOPIC_HUB.principles.map((item, i) => (
              <li
                key={item.title}
                className={`flex gap-3 py-[13px] ${i === 0 ? "" : "border-t border-line-soft"}`}
              >
                <span
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-teal-faint text-[12px] font-bold tabular-nums text-teal-dark dark:text-teal-400"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 pt-[3px]">
                  <h3 className="text-[14px] font-bold text-ink">{item.title}</h3>
                  <p className="mt-0.5 text-[13.5px] leading-[1.65] text-ink-body">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <RelatedLinks
          links={[
            {
              href: "/bijbelboeken",
              label: "Alle 66 bijbelboeken",
              description: "Per boek de schrijver, het thema, de hoofdlijn en studievragen.",
            },
            {
              href: "/studies",
              label: "Begeleide studies",
              description: "Uitgewerkte studies over personen, thema's en bijbelboeken.",
            },
            {
              href: "/bijbelstudie",
              label: "Bijbelstudie: de complete gids",
              description: "Wat bijbelstudie is en hoe je het aanpakt.",
            },
            {
              href: "/bijbelstudie/methoden",
              label: "Bijbelstudie methoden",
              description: "Onder meer de thematische studie: een onderwerp door de hele Bijbel volgen.",
            },
          ]}
        />
      </div>
    </ContentShell>
  );
}
