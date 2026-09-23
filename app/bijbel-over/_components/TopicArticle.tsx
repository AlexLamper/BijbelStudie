import Link from "next/link";
import { RelatedLinks } from "../../../components/content/ContentShell";
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
const TEAL = "#0D9488";
const TEAL_TEXT = "text-teal-dark dark:text-teal-400";

const H2 = "mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]";
const BODY = "text-[15px] leading-[1.75] text-ink-body";

/**
 * One "Wat zegt de Bijbel over ...?" page.
 *
 * A server component with everything in the initial HTML: no accordions, no
 * "lees meer". The short answer sits directly under the H1 so it is the first
 * paragraph a crawler (and a hurried reader) meets. Passage references link to
 * the chapter in the reader with rel="nofollow" - /lezen is disallowed in
 * robots.txt, and a plain <a> keeps next/link from prefetching fifteen reader
 * routes per page view.
 */
export function TopicArticle({ topic }: { topic: Topic }) {
  const heading = topicHeading(topic);
  const minutes = topicReadingMinutes(topic);

  const toc = [
    ...topic.sections.map(s => ({ id: s.id, heading: s.heading })),
    { id: "misverstanden", heading: `Wat de Bijbel niet zegt over ${topic.subject}` },
    { id: "in-de-praktijk", heading: topic.practiceHeading },
    { id: "veelgestelde-vragen", heading: "Veelgestelde vragen" },
  ];

  const relatedTopics = topic.relatedTopics
    .map(getTopic)
    .filter((t): t is Topic => Boolean(t))
    .map(t => ({ href: topicPath(t), label: topicHeading(t), description: t.summary }));

  const otherTopics = TOPICS.filter(t => t.slug !== topic.slug);

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <header className="mb-10">
        <p className={`mb-2 text-[10.5px] font-semibold uppercase tracking-[1.1px] ${TEAL_TEXT}`}>
          Bijbelse onderwerpen
        </p>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]">
          {heading}
        </h1>

        {/* The direct answer. Kept as one plain paragraph right under the H1:
            this is the text a featured snippet would lift. */}
        <div
          className="mt-5 rounded-card border-l-4 p-5"
          style={{ borderColor: TEAL, backgroundColor: "rgba(13,148,136,0.06)" }}
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-muted">
            Kort antwoord
          </p>
          <p className="mt-1.5 text-[16px] leading-[1.7] text-ink sm:text-[17px]">
            {topic.answer}
          </p>
        </div>

        <p className="mt-4 text-[12.5px] text-ink-muted">
          {minutes} minuten lezen · Bijgewerkt op{" "}
          <time dateTime={topic.dateModified}>{formatDutchDate(topic.dateModified)}</time>
        </p>
      </header>

      <nav aria-label="Inhoudsopgave" className="mb-12 rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
          In dit artikel
        </h2>
        <ol className="space-y-1.5">
          {toc.map((item, i) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="text-[14px] text-ink-body no-underline hover:underline">
                <span className={`mr-2 tabular-nums ${TEAL_TEXT}`}>{String(i + 1).padStart(2, "0")}</span>
                {item.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12">
        {topic.sections.map(section => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className={H2}>{section.heading}</h2>
            <div className="space-y-4">
              {section.body.map((paragraph, i) => (
                <p key={i} className={BODY}>
                  {paragraph}
                </p>
              ))}
            </div>
            {section.passages && section.passages.length > 0 && (
              <ul className="mt-6 space-y-3">
                {section.passages.map(p => (
                  <Passage key={passageRef(p)} passage={p} />
                ))}
              </ul>
            )}
          </section>
        ))}

        <section id="misverstanden" className="scroll-mt-24">
          <h2 className={H2}>Wat de Bijbel niet zegt over {topic.subject}</h2>
          <ul className="space-y-3">
            {topic.misunderstandings.map(item => (
              <li key={item.title} className="rounded-btn border border-line bg-surface p-4">
                <h3 className="text-[14.5px] font-bold text-ink">{item.title}</h3>
                <p className="mt-1 text-[14px] leading-[1.7] text-ink-body">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="in-de-praktijk" className="scroll-mt-24">
          <h2 className={H2}>{topic.practiceHeading}</h2>
          <ol className="space-y-4">
            {topic.practice.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums text-white"
                  style={{ backgroundColor: TEAL }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14.5px] font-bold text-ink">{step.title}</h3>
                  <p className="mt-0.5 text-[14px] leading-[1.7] text-ink-body">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {topic.careNote && (
            <aside
              className="mt-6 rounded-card border-l-4 p-4"
              style={{ borderColor: TEAL, backgroundColor: "rgba(13,148,136,0.06)" }}
            >
              <p className="text-[14px] leading-[1.7] text-ink">{topic.careNote}</p>
            </aside>
          )}
        </section>

        <section id="veelgestelde-vragen" className="scroll-mt-24">
          <h2 className={H2}>Veelgestelde vragen over {topic.subject}</h2>
          <div className="rounded-card border border-line bg-surface px-4 py-1 sm:px-[22px]">
            {topic.faqs.map((faq, i) => (
              <div key={faq.q} className={`py-4 ${i === 0 ? "" : "border-t border-line-soft"}`}>
                {/* h3 + visible answer, not a <details>: the FAQPage markup
                    must describe text that is actually on the page. */}
                <h3 className="text-[14.5px] font-bold text-ink">{faq.q}</h3>
                <p className="mt-1.5 text-[14px] leading-[1.7] text-ink-body">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-16 rounded-card border border-line bg-surface p-5 text-center sm:p-6">
        <h2 className="text-[16.5px] font-bold text-ink">Lees de teksten zelf, in hun context</h2>
        <p className="mx-auto mt-1.5 max-w-lg text-[13.5px] leading-[1.6] text-ink-muted">
          Met een gratis account lees je elk hoofdstuk in de Statenvertaling en andere vertalingen,
          met commentaar, grondtekst en je eigen notities ernaast.
        </p>
        <div className="mt-4 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <Link
            href="/registreren"
            className="inline-flex h-11 items-center justify-center rounded-btn px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            Gratis account aanmaken
          </Link>
          <Link
            href="/studies"
            className="inline-flex h-11 items-center justify-center rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
          >
            Begeleide studies bekijken
          </Link>
        </div>
      </section>

      <RelatedLinks links={[...relatedTopics, ...topic.related]} />

      {/* Every other topic, so each page links the whole cluster and a crawler
          that lands on one topic reaches all of them without the hub. */}
      <nav aria-label="Meer onderwerpen" className="mt-12">
        <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
          Meer onderwerpen
        </h2>
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

      <p className="mt-10 text-[12px] leading-[1.6] text-ink-faint">
        Bijbelcitaten uit de Statenvertaling (publiek domein). Verwijzingen volgen de
        versnummering van de Statenvertaling; in sommige andere vertalingen, vooral Engelse,
        wijkt de nummering van psalmverzen af.
      </p>
    </article>
  );
}

function Passage({ passage }: { passage: TopicPassage }) {
  const ref = passageRef(passage);
  const href = passageReaderHref(passage);
  const chip =
    "inline-block rounded-[7px] bg-teal-faint px-2 py-1 text-[12px] font-bold tabular-nums text-teal-dark dark:text-teal-400";

  return (
    <li className="rounded-btn border border-line bg-surface p-4">
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

/** "23 september 2026" from an ISO date. */
function formatDutchDate(iso: string): string {
  const months = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}
