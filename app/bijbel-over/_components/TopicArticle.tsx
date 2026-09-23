import Link from "next/link";
import {
  ArticleHeader,
  ArticleLayout,
  ArticleSection,
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  CtaCard,
  EYEBROW,
  FaqSection,
  NumberedSteps,
  Prose,
  RelatedCards,
  TEAL_CALLOUT,
  TEAL_FILL,
  TILE,
  formatDutchDate,
  tileColumns,
  type Fact,
  type TocItem,
} from "../../../components/content/GuideArticle";
import {
  TOPICS,
  getTopic,
  passageReaderHref,
  passageRef,
  topicHeading,
  topicPath,
  topicReadingMinutes,
  type Topic,
  type TopicPassage,
} from "../../../lib/content/topics";

/* Brand teal as a fill (#0D9488, inline like GuideArticle). As type it is
   text-teal-dark (#0F766E): #0D9488 is 3.7:1 on white, short of AA for text.
   On dark it lifts to teal-400. */
const TEAL_TEXT = "text-teal-dark dark:text-teal-400";

/**
 * One "Wat zegt de Bijbel over ...?" page.
 *
 * A server component with everything in the initial HTML: no accordions, no
 * "lees meer". The short answer sits directly under the H1 so it is the first
 * paragraph a crawler (and a hurried reader) meets. Passage references link to
 * the chapter in the reader with rel="nofollow" - /lezen is disallowed in
 * robots.txt, and a plain <a> keeps next/link from prefetching fifteen reader
 * routes per page view.
 *
 * Layout: the article kit from GuideArticle - full window width, one card per
 * section, prose at a reading measure, passages and points as tile grids, and
 * a sticky "Op deze pagina" column from lg up.
 */
export function TopicArticle({ topic }: { topic: Topic }) {
  const heading = topicHeading(topic);
  const minutes = topicReadingMinutes(topic);

  const toc: TocItem[] = [
    ...topic.sections.map(s => ({ id: s.id, heading: s.heading })),
    { id: "misverstanden", heading: `Wat de Bijbel niet zegt over ${topic.subject}` },
    { id: "in-de-praktijk", heading: topic.practiceHeading },
    { id: "veelgestelde-vragen", heading: "Veelgestelde vragen" },
  ];

  const passages = topic.sections.flatMap(s => s.passages ?? []);
  const books = new Set(passages.map(p => p.book)).size;
  const facts: Fact[] = [
    { label: "Leestijd", value: `${minutes} ${minutes === 1 ? "minuut" : "minuten"}` },
    {
      label: "Bijbelteksten",
      value: `${passages.length} ${passages.length === 1 ? "tekst" : "teksten"} uit ${books} ${
        books === 1 ? "boek" : "boeken"
      }`,
    },
    {
      label: "Bijgewerkt",
      value: <time dateTime={topic.dateModified}>{formatDutchDate(topic.dateModified)}</time>,
    },
  ];

  const relatedTopics = topic.relatedTopics
    .map(getTopic)
    .filter((t): t is Topic => Boolean(t))
    .map(t => ({ href: topicPath(t), label: topicHeading(t), description: t.summary }));

  const otherTopics = TOPICS.filter(t => t.slug !== topic.slug);

  return (
    <ArticleLayout
      toc={toc}
      header={
        <ArticleHeader eyebrow="Bijbelse onderwerpen" title={heading} facts={facts}>
          {/* The direct answer. Kept as one plain paragraph right under the H1:
              this is the text a featured snippet would lift. */}
          <div className="mt-5 max-w-[46rem] rounded-btn border-l-4 p-5" style={TEAL_CALLOUT}>
            <p className={`${EYEBROW} text-ink-muted`}>Kort antwoord</p>
            <p className="mt-1.5 text-[16px] leading-[1.7] text-ink sm:text-[17px]">{topic.answer}</p>
          </div>
        </ArticleHeader>
      }
    >
      {topic.sections.map(section => (
        <ArticleSection key={section.id} id={section.id} heading={section.heading}>
          <Prose paragraphs={section.body} />
          {section.passages && section.passages.length > 0 && (
            <ul className={`mt-6 grid gap-3 ${tileColumns(section.passages.length, "md")}`}>
              {section.passages.map(p => (
                <Passage key={passageRef(p)} passage={p} />
              ))}
            </ul>
          )}
        </ArticleSection>
      ))}

      <ArticleSection id="misverstanden" heading={`Wat de Bijbel niet zegt over ${topic.subject}`}>
        <ul className={`grid gap-3 ${tileColumns(topic.misunderstandings.length, "md")}`}>
          {topic.misunderstandings.map(item => (
            <li key={item.title} className={`min-w-0 ${TILE}`}>
              <h3 className="text-[14.5px] font-bold text-ink">{item.title}</h3>
              <p className="mt-1 text-[14px] leading-[1.7] text-ink-body">{item.text}</p>
            </li>
          ))}
        </ul>
      </ArticleSection>

      <ArticleSection id="in-de-praktijk" heading={topic.practiceHeading}>
        <NumberedSteps steps={topic.practice} titleAs="h3" />
        {topic.careNote && (
          <aside className="mt-6 max-w-[46rem] rounded-btn border-l-4 p-4" style={TEAL_CALLOUT}>
            <p className="text-[14.5px] leading-[1.7] text-ink">{topic.careNote}</p>
          </aside>
        )}
      </ArticleSection>

      <FaqSection heading={`Veelgestelde vragen over ${topic.subject}`} faqs={topic.faqs} />

      <CtaCard
        title="Lees de teksten zelf, in hun context"
        text="Met een gratis account lees je elk hoofdstuk in de Statenvertaling en andere vertalingen, met commentaar, grondtekst en je eigen notities ernaast."
      >
        <Link href="/registreren" className={BUTTON_PRIMARY} style={TEAL_FILL}>
          Gratis account aanmaken
        </Link>
        <Link href="/studies" className={BUTTON_SECONDARY}>
          Begeleide studies bekijken
        </Link>
      </CtaCard>

      <RelatedCards links={[...relatedTopics, ...topic.related]} />

      {/* Every other topic, so each page links the whole cluster and a crawler
          that lands on one topic reaches all of them without the hub. */}
      <nav aria-label="Meer onderwerpen" className="pt-2">
        <h2 className={`${EYEBROW} mb-3 text-ink-muted`}>Meer onderwerpen</h2>
        <ul className="flex flex-wrap gap-2">
          {otherTopics.map(t => (
            <li key={t.slug}>
              <Link
                href={topicPath(t)}
                className="inline-block rounded-full border border-line bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-body no-underline transition-colors hover:border-line-strong"
              >
                {t.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/bijbel-over"
              className={`inline-block rounded-full border border-line bg-surface px-3 py-[6px] text-[12.5px] font-semibold no-underline transition-colors hover:border-line-strong ${TEAL_TEXT}`}
            >
              Alle onderwerpen
            </Link>
          </li>
        </ul>
      </nav>

      <p className="max-w-[46rem] text-[12px] leading-[1.6] text-ink-muted">
        Bijbelcitaten uit de Statenvertaling (publiek domein). Verwijzingen volgen de
        versnummering van de Statenvertaling; in sommige andere vertalingen, vooral Engelse,
        wijkt de nummering van psalmverzen af.
      </p>
    </ArticleLayout>
  );
}

function Passage({ passage }: { passage: TopicPassage }) {
  const ref = passageRef(passage);
  const href = passageReaderHref(passage);
  const chip =
    "inline-block rounded-[7px] bg-teal-faint px-2 py-1 text-[12px] font-bold tabular-nums text-teal-dark dark:text-teal-400";

  return (
    <li className={`min-w-0 ${TILE}`}>
      {href ? (
        <a
          href={href}
          rel="nofollow"
          title={`Lees ${ref} in de Statenvertaling`}
          className={`${chip} no-underline hover:underline`}
        >
          {ref}
        </a>
      ) : (
        <span className={chip}>{ref}</span>
      )}
      {passage.quote && (
        <blockquote className="mt-3 border-l-2 border-line-strong pl-3 font-serif text-[15px] italic leading-[1.7] text-ink">
          &ldquo;{passage.quote}&rdquo;
        </blockquote>
      )}
      <p className="mt-2 text-[14px] leading-[1.7] text-ink-body">{passage.text}</p>
    </li>
  );
}
