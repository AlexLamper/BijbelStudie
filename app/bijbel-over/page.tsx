import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "../../lib/pageMetadata";
import {
  TOPICS,
  TOPIC_GROUPS,
  TOPIC_HUB,
  topicHeading,
  topicPath,
  topicReadingMinutes,
  topicsInGroup,
  type Topic,
} from "../../lib/content/topics";
import { CONTENT_FRAME, ContentShell } from "../../components/content/ContentShell";
import {
  CARD,
  CARD_PAD,
  EYEBROW,
  H1,
  H2,
  PROSE,
  RelatedCards,
} from "../../components/content/GuideArticle";
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
      {/* Full window width (CONTENT_FRAME). The header card carries the intro
          at a reading measure and, beside it from lg, a jump list of the three
          groups; under it the groups take the width as topic-card grids (2 / 3
          / 4 across) with the principles in a side column from lg. */}
      <div className={`${CONTENT_FRAME} py-6 sm:py-8 lg:py-10`}>
        <header className={`${CARD} ${CARD_PAD}`}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10 2xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0">
              <p className={`${EYEBROW} mb-2 text-teal-dark dark:text-teal-400`}>
                Bijbelse onderwerpen
              </p>
              <h1 className={H1}>{TOPIC_HUB.h1}</h1>
              <div className={`mt-3 space-y-3 ${PROSE}`}>
                {TOPIC_HUB.intro.map((paragraph, i) => (
                  <p key={i} className="text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* A plain label, not a heading: the page's heading outline stays
                h1, the three group h2s, the principles and "Verder lezen". */}
            <nav
              aria-label="Inhoudsopgave"
              className="self-start rounded-btn border border-line bg-sunken p-2"
            >
              <p className={`${EYEBROW} px-2 pb-1 pt-1.5 text-ink-muted`}>Op deze pagina</p>
              <ul>
                {TOPIC_GROUPS.map(group => {
                  const count = topicsInGroup(group.id).length;
                  return (
                    <li key={group.id}>
                      <a
                        href={`#${group.id}`}
                        className="flex items-baseline gap-3 rounded-[8px] px-2 py-2 text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft hover:text-ink"
                      >
                        <span className="min-w-0 flex-1">{group.label}</span>
                        <span className="flex-none text-[12.5px] font-normal tabular-nums text-ink-muted">
                          {count} {count === 1 ? "onderwerp" : "onderwerpen"}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:gap-x-10">
          <div className="min-w-0 space-y-10">
            {TOPIC_GROUPS.map(group => {
              const topics = topicsInGroup(group.id);
              return (
                <section key={group.id} id={group.id} className="scroll-mt-24">
                  <h2 className={H2}>{group.label}</h2>
                  <p className={`mb-4 mt-1 text-[13.5px] leading-[1.7] text-ink-muted ${PROSE}`}>
                    {group.description}
                  </p>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4">
                    {topics.map(topic => (
                      <li key={topic.slug} className="min-w-0">
                        <TopicCard topic={topic} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <aside className="min-w-0 lg:self-start">
            <section className={`${CARD} p-5 sm:p-6`}>
              <h2 className="mb-2 text-[17px] font-bold leading-snug text-ink">
                Hoe deze pagina&apos;s gemaakt zijn
              </h2>
              <ol>
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
          </aside>
        </div>

        <div className="mt-10">
          <RelatedCards
            gridClassName="sm:grid-cols-2 xl:grid-cols-4"
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
      </div>
    </ContentShell>
  );
}

/** Passages a topic reads, across its sections - the card's "12 teksten". */
function passageCount(topic: Topic): number {
  return topic.sections.reduce((sum, s) => sum + (s.passages?.length ?? 0), 0);
}

/** A topic as an app card: the question, its one-line summary, and its size. */
function TopicCard({ topic }: { topic: Topic }) {
  const passages = passageCount(topic);
  const minutes = topicReadingMinutes(topic);
  return (
    <Link
      href={topicPath(topic)}
      className={`group flex h-full flex-col ${CARD} p-4 no-underline transition-colors hover:border-line-strong`}
    >
      <span className="block text-[14.5px] font-semibold leading-snug text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
        {topicHeading(topic)}
      </span>
      <span className="mt-1 block flex-1 text-[13px] leading-[1.55] text-ink-muted">
        {topic.summary}
      </span>
      <span className="mt-3 block text-[12px] tabular-nums text-ink-muted">
        {passages} {passages === 1 ? "tekst" : "teksten"} · {minutes} min lezen
      </span>
    </Link>
  );
}
