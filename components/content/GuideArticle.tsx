import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Guide, GuideSection } from "../../lib/content/guides";
import { CONTENT_FRAME } from "./ContentShell";

const TEAL = "#0D9488";
/** Teal type: #0F766E (3.7:1 for #0D9488 on white is short of AA), teal-400 on dark. */
const TEAL_TEXT = "text-teal-dark dark:text-teal-400";
const TEAL_WASH = "rgba(13,148,136,0.06)";

/* ── Article kit ──────────────────────────────────────────────────────────────
   Shared by the guides (/bijbelstudie) and the topic pages (/bijbel-over), so
   both read as the same platform the signed-in app is: white `rounded-card`
   surfaces with a hairline on the page ground, the ink scale for type, tiles
   one step down (`bg-sunken`) inside a card.

   The page takes the full window width (CONTENT_FRAME). Running prose keeps a
   reading measure (PROSE) on the text block itself; the rest of the width goes
   to structure - a sticky side column from lg up, and card grids that gain
   columns on xl/2xl. Everything is server-rendered markup. */

export const CARD = "rounded-card border border-line bg-surface";
/** One padding for every card, so the left edges line up down the column. */
export const CARD_PAD = "p-5 sm:p-7 2xl:p-8";
/** Reading measure for paragraphs: roughly 70-80 characters at 16 px. */
export const PROSE = "max-w-[42rem]";
export const EYEBROW = "text-[10.5px] font-semibold uppercase tracking-[1.1px]";
export const H1 =
  "break-words text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]";
export const H2 = "text-[19px] font-bold leading-snug tracking-[-0.2px] text-ink sm:text-[21px]";
export const BODY = "text-[15px] leading-[1.75] text-ink-body sm:text-[16px]";
/** A tile inside a card: one step down from the card's own surface. */
export const TILE = "rounded-btn border border-line bg-sunken p-4";
export const BUTTON_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] px-[22px] text-[15px] font-semibold text-white no-underline transition-opacity hover:opacity-90";
export const BUTTON_SECONDARY =
  "inline-flex h-12 items-center justify-center rounded-[12px] border border-line bg-surface px-[22px] text-[15px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft";
export const TEAL_FILL = { backgroundColor: TEAL } as const;
export const TEAL_CALLOUT = { borderColor: TEAL, backgroundColor: TEAL_WASH } as const;

export interface TocItem {
  /** An id that already exists on the page - a stable slug from the content. */
  id: string;
  heading: string;
}

export interface Fact {
  label: string;
  value: React.ReactNode;
}

/**
 * Tile grid columns for a list of `n` cards: two from `from` up, three on 2xl
 * - except for two or four cards, which stay a clean 2 × n instead of 3 + 1.
 */
export function tileColumns(n: number, from: "sm" | "md" = "sm"): string {
  const base = from === "sm" ? "sm:grid-cols-2" : "md:grid-cols-2";
  return n <= 2 || n === 4 ? base : `${base} 2xl:grid-cols-3`;
}

/**
 * Two columns from lg up: the article at `1fr` and a side column holding the
 * table of contents and a call to action, sticky under the 64 px site header.
 *
 * The side column sits in the DOM between the header and the body, so on a
 * phone the contents list lands right under the H1, where it always was; from
 * lg it moves beside the article and spans both rows.
 */
export function ArticleLayout({
  header,
  toc,
  children,
}: {
  header: React.ReactNode;
  toc: TocItem[];
  children: React.ReactNode;
}) {
  return (
    <div className={`${CONTENT_FRAME} py-6 sm:py-8 lg:py-10`}>
      <article className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_21rem] 2xl:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">{header}</div>

        <aside
          className={`min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 ${
            toc.length === 0 ? "max-lg:hidden" : ""
          }`}
        >
          <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:overscroll-contain">
            {toc.length > 0 && <PageToc items={toc} />}
            <SideCta />
          </div>
        </aside>

        <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-2">{children}</div>
      </article>
    </div>
  );
}

/** The article's own header card: eyebrow, H1, the caller's intro, key facts. */
export function ArticleHeader({
  eyebrow,
  title,
  facts,
  children,
}: {
  eyebrow: string;
  title: string;
  facts: Fact[];
  children?: React.ReactNode;
}) {
  return (
    <header className={`${CARD} ${CARD_PAD}`}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <p className={`${EYEBROW} mb-2 ${TEAL_TEXT}`}>{eyebrow}</p>
          <h1 className={`${H1} max-w-[48rem]`}>{title}</h1>
          {children}
        </div>
        <FactList facts={facts} />
      </div>
    </header>
  );
}

/**
 * Key facts as one hairline-divided block, like the facts row on the book
 * pages: two across on a phone (an odd last fact takes the whole row), one row
 * across from sm, and a stacked column beside the H1 on xl.
 */
export function FactList({ facts }: { facts: Fact[] }) {
  const smCols =
    facts.length >= 4 ? "sm:grid-cols-4" : facts.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const odd = facts.length % 2 === 1;
  return (
    <dl
      className={`grid grid-cols-2 gap-px self-start overflow-hidden rounded-btn border border-line bg-line ${smCols} xl:grid-cols-1`}
    >
      {facts.map((fact, i) => (
        <div
          key={fact.label}
          className={`min-w-0 bg-sunken px-4 py-3 ${
            odd && i === facts.length - 1 ? "col-span-2 sm:col-span-1" : ""
          }`}
        >
          <dt className={`${EYEBROW} text-ink-muted`}>{fact.label}</dt>
          <dd className="mt-0.5 text-[14px] font-semibold leading-snug text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One card per H2 section; `id` is the anchor the contents list points at. */
export function ArticleSection({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${CARD} ${CARD_PAD}`}>
      <h2 className={`${H2} mb-4 max-w-[48rem]`}>{heading}</h2>
      {children}
    </section>
  );
}

/** Paragraphs at the reading measure. */
export function Prose({ paragraphs, className = "" }: { paragraphs: string[]; className?: string }) {
  return (
    <div className={`${PROSE} min-w-0 space-y-4 ${className}`}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className={BODY}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/**
 * Numbered steps as a grid that reads row by row. The number is a teal-faint
 * square with teal-dark type (AA), the same marker the book and hub pages use.
 * `titleAs` keeps each page's existing heading structure: the guides title a
 * step with <strong>, the topic pages with <h3>.
 */
export function NumberedSteps({
  steps,
  titleAs = "strong",
  className = "",
}: {
  steps: { title: string; text: string }[];
  titleAs?: "strong" | "h3";
  className?: string;
}) {
  const Title = titleAs;
  return (
    <ol className={`grid gap-x-8 gap-y-5 ${tileColumns(steps.length, "md")} ${className}`}>
      {steps.map((step, i) => (
        <li key={step.title} className="flex min-w-0 gap-3">
          <span
            className={`flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-teal-faint text-[12px] font-bold tabular-nums ${TEAL_TEXT}`}
            aria-hidden
          >
            {i + 1}
          </span>
          <div className="min-w-0 pt-[3px]">
            <Title className="block text-[14.5px] font-bold text-ink">{step.title}</Title>
            <p className="mt-0.5 text-[14px] leading-[1.7] text-ink-body">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Visible FAQ: h3 + answer, never a <details> - the FAQPage markup must
 * describe text that is on the page. Two columns from xl, hairlines between.
 */
export function FaqSection({
  heading,
  faqs,
}: {
  heading: React.ReactNode;
  faqs: { q: string; a: string }[];
}) {
  return (
    <ArticleSection id="veelgestelde-vragen" heading={heading}>
      <div className="-mb-4 grid gap-x-10 xl:grid-cols-2">
        {faqs.map((faq, i) => (
          <div
            key={faq.q}
            className={`min-w-0 border-line-soft pb-4 ${
              i === 0 ? "" : i === 1 ? "border-t pt-4 xl:border-t-0 xl:pt-0" : "border-t pt-4"
            }`}
          >
            <h3 className="text-[15px] font-bold text-ink">{faq.q}</h3>
            <p className="mt-1.5 max-w-[42rem] text-[14.5px] leading-[1.7] text-ink-body">{faq.a}</p>
          </div>
        ))}
      </div>
    </ArticleSection>
  );
}

/** The closing call to action: text on the left, the buttons on the right. */
export function CtaCard({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARD} ${CARD_PAD} flex flex-wrap items-center gap-x-10 gap-y-5`}>
      <div className="min-w-[min(100%,16rem)] flex-1">
        <h2 className="text-[18px] font-bold leading-snug text-ink sm:text-[20px]">{title}</h2>
        <p className="mt-1.5 max-w-[42rem] text-[14px] leading-[1.65] text-ink-muted sm:text-[15px]">
          {text}
        </p>
      </div>
      <div className="flex flex-col gap-2.5 max-sm:w-full sm:flex-row sm:items-center">{children}</div>
    </section>
  );
}

/**
 * Internal links as a card grid on the page ground, the way the dashboard
 * lists studies: two across from sm, three on xl, four on 2xl by default.
 */
export function RelatedCards({
  title = "Verder lezen",
  links,
  gridClassName = "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
}: {
  title?: string;
  links: { href: string; label: string; description: string }[];
  gridClassName?: string;
}) {
  return (
    <section id="verder-lezen" className="scroll-mt-24 pt-4">
      <h2 className={`${H2} mb-4`}>{title}</h2>
      <ul className={`grid gap-3 ${gridClassName}`}>
        {links.map(link => (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              className={`group flex h-full flex-col ${CARD} p-4 no-underline transition-colors hover:border-line-strong`}
            >
              <span className={`text-[14.5px] font-semibold group-hover:underline ${TEAL_TEXT}`}>
                {link.label}
              </span>
              <span className="mt-1 text-[13px] leading-[1.55] text-ink-muted">{link.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Op deze pagina": rows like the app sidebar's, numbered in teal. */
function PageToc({ items }: { items: TocItem[] }) {
  return (
    <nav aria-label="Inhoudsopgave" className={`${CARD} p-3 sm:p-4`}>
      <h2 className={`${EYEBROW} mb-1.5 px-2 pt-1 text-ink-muted`}>Op deze pagina</h2>
      <ol>
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex gap-2.5 rounded-[8px] px-2 py-[7px] text-[13.5px] leading-[1.45] text-ink-body no-underline transition-colors hover:bg-line-soft hover:text-ink"
            >
              <span className={`flex-none pt-px text-[12px] font-semibold tabular-nums ${TEAL_TEXT}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">{item.heading}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The side column's call to action, lg and up only. No heading element: the
 * page's own closing CTA carries the h2, and this copy only exists beside it.
 */
function SideCta() {
  return (
    <div className={`${CARD} hidden p-5 lg:block`}>
      <p className="text-[15px] font-bold text-ink">Zelf aan de slag</p>
      <p className="mt-1 text-[13px] leading-[1.6] text-ink-muted">
        Lees de Bijbel met commentaar, grondtekst, begeleide studies en je eigen notities.
        Gratis te beginnen, geen creditcard nodig.
      </p>
      <Link
        href="/registreren"
        className="mt-4 flex h-11 items-center justify-center rounded-btn px-4 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        style={TEAL_FILL}
      >
        Gratis account aanmaken
      </Link>
      <Link
        href="/studies"
        className="mt-2 flex h-11 items-center justify-center rounded-btn border border-line bg-surface px-4 text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
      >
        Begeleide studies bekijken
      </Link>
    </div>
  );
}

/* ── Guide ────────────────────────────────────────────────────────────────── */

/**
 * Renders one guide from lib/content/guides.
 *
 * Everything here is static markup - no accordions, no "lees meer" toggles.
 * Content hidden behind an interaction is still indexed, but it does not
 * anchor the page for the query the way visible body copy does, and these
 * pages exist to rank.
 */
export function GuideArticle({ guide }: { guide: Guide }) {
  const faqs = guide.faqs ?? [];

  const toc: TocItem[] =
    guide.sections.length > 2
      ? [
          ...guide.sections.map(s => ({ id: s.id, heading: s.heading })),
          ...(faqs.length > 0 ? [{ id: "veelgestelde-vragen", heading: "Veelgestelde vragen" }] : []),
        ]
      : [];

  const sectionCount = guide.sections.length;
  const facts: Fact[] = [
    { label: "Leestijd", value: `${guide.readingMinutes} minuten` },
    {
      label: "Inhoud",
      value:
        `${sectionCount} ${sectionCount === 1 ? "onderdeel" : "onderdelen"}` +
        (faqs.length > 0 ? `, ${faqs.length} ${faqs.length === 1 ? "vraag" : "vragen"}` : ""),
    },
    {
      label: "Bijgewerkt",
      value: <time dateTime={guide.dateModified}>{formatDutchDate(guide.dateModified)}</time>,
    },
  ];

  return (
    <ArticleLayout
      toc={toc}
      header={
        <ArticleHeader eyebrow="Gids" title={guide.h1} facts={facts}>
          <p className={`mt-3 ${PROSE} text-[15px] leading-[1.7] text-ink-muted sm:text-[17px]`}>
            {guide.intro}
          </p>
        </ArticleHeader>
      }
    >
      {guide.sections.map(section => (
        <GuideSectionCard key={section.id} section={section} />
      ))}

      {faqs.length > 0 && <FaqSection heading="Veelgestelde vragen" faqs={faqs} />}

      <CtaCard
        title="Begin vandaag met bijbelstudie"
        text="Lees de Bijbel in meerdere vertalingen, met commentaren, grondtekst, begeleide studies en notities. Gratis te beginnen, geen creditcard nodig."
      >
        <Link href="/registreren" className={`${BUTTON_PRIMARY} max-sm:w-full`} style={TEAL_FILL}>
          Gratis account aanmaken
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </CtaCard>

      <RelatedCards links={guide.related} />
    </ArticleLayout>
  );
}

/**
 * One guide section. The prose keeps its measure; a list or steps run the full
 * card width as a tile grid under it. On 2xl, where the card is far wider than
 * the measure, the callout moves up beside the prose instead of under the
 * list - grid placement only, the DOM order stays body, list, steps, callout.
 */
function GuideSectionCard({ section }: { section: GuideSection }) {
  return (
    <ArticleSection id={section.id} heading={section.heading}>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,42rem)_minmax(16rem,1fr)] 2xl:gap-x-12">
        <Prose paragraphs={section.body} className="2xl:row-start-1" />

        {section.list && (
          <ul className={`grid gap-3 ${tileColumns(section.list.length)} 2xl:col-span-2`}>
            {section.list.map(item => (
              <li key={item.title} className={`min-w-0 ${TILE}`}>
                <strong className="block text-[14.5px] font-bold text-ink">{item.title}</strong>
                <span className="mt-1 block text-[14px] leading-[1.65] text-ink-body">{item.text}</span>
              </li>
            ))}
          </ul>
        )}

        {section.steps && <NumberedSteps steps={section.steps} className="2xl:col-span-2" />}

        {section.callout && (
          <aside
            className="rounded-btn border-l-4 p-4 2xl:col-start-2 2xl:row-start-1 2xl:max-w-[28rem] 2xl:self-start"
            style={TEAL_CALLOUT}
          >
            <p className={`${PROSE} text-[14.5px] leading-[1.7] text-ink`}>{section.callout}</p>
          </aside>
        )}
      </div>
    </ArticleSection>
  );
}

/** "21 augustus 2026" from an ISO date, without pulling in a date library. */
export function formatDutchDate(iso: string): string {
  const months = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}
