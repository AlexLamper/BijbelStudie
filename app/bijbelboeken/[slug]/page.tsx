import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { buildMetadata } from "../../../lib/pageMetadata";
import {
  BIBLE_BOOKS,
  getBibleBook,
  adjacentBooks,
  type BibleBook,
} from "../../../lib/content/bibleBooks";
import {
  getBookDetail,
  BOOK_DETAIL_UPDATED,
  type BookDetail,
} from "../../../lib/content/bibleBooks/detail";
import { bookStudyId } from "../../../lib/bookStudies";
import { chapterStudyPath } from "../../../lib/chapterStudyRef";
import { ContentShell, RelatedLinks } from "../../../components/content/ContentShell";
import { topicHeading, topicPath, topicsCiting } from "../../../lib/content/topics";
import { JsonLd } from "../../../components/seo/JsonLd";
import { absoluteUrl, SITE_NAME } from "../../../lib/seo/constants";
import {
  graph,
  webPageNode,
  breadcrumbNode,
  bibleBookNode,
} from "../../../lib/seo/structuredData";

/* Teal type is text-teal-dark (#0F766E): #0D9488 is 3.7:1 on white - fine as a
   fill, short of AA as type. On dark it lifts to teal-400. */

/*
 * WHY THIS PAGE IS BUILT THE WAY IT IS
 *
 * Search Console reported these pages as "Dubbele pagina, Google heeft een
 * andere canonieke pagina gekozen". The page was ~400 words of book text in a
 * template that repeated on all 66 pages (28% of the words), and that book
 * text - `summary`, `outline`, `theme`, `author`, `written` - is also rendered
 * on /studies/boek-<slug> and in every lesson's context step. So the page now
 * leads with content that exists only here (lib/content/bibleBooks/detail):
 * direct answers to the questions people search ("Waar gaat X over?", "Wie
 * schreef X?", "Wanneer is X geschreven?"), the structure block by block,
 * themes, known passages, the book's place in Scripture and a chapter index.
 * Keep it that way: do not render detail content anywhere else, and do not
 * add boilerplate that repeats on all 66 pages.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;
/*
 * Prerendered, never rendered per request. The root layout reads the session
 * cookie, which would otherwise make every hit `private, no-store` and a cache
 * MISS on Vercel; under force-static the layout renders its signed-out branch,
 * which is right for a public content page (as on /bijbelboeken and /help).
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return BIBLE_BOOKS.map(book => ({ slug: book.slug }));
}

/** Public chapter page. The route is owned by app/bijbel; this page only links. */
function chapterPath(book: BibleBook, chapter: number): string {
  return `/bijbel/${book.slug}/${chapter}`;
}

function bookTitle(name: string): string {
  const full = `${name}: samenvatting, schrijver en uitleg`;
  return `${full} | ${SITE_NAME}`.length <= 60 ? full : `${name}: samenvatting en uitleg`;
}

function chapterCount(n: number): string {
  return `${n} ${n === 1 ? "hoofdstuk" : "hoofdstukken"}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = getBibleBook(slug);
  if (!book) return buildMetadata({
    title: "Bijbelboek niet gevonden",
    description: "Dit bijbelboek bestaat niet.",
    path: "/bijbelboeken",
    indexable: false,
  });

  return buildMetadata({
    // Title leads with the book name because that is the query, then adds the
    // two things people search alongside it. Long names (Deuteronomium,
    // 1 Thessalonicenzen) drop "schrijver" so the whole title, brand included,
    // stays within the ~60 characters Google shows.
    title: bookTitle(book.name),
    description: book.blurb,
    path: `/bijbelboeken/${book.slug}`,
    type: "article",
    ogEyebrow: book.testament === "oude-testament" ? "Oude Testament" : "Nieuwe Testament",
    keywords: [
      book.name.toLowerCase(),
      `${book.name.toLowerCase()} samenvatting`,
      `waar gaat ${book.name.toLowerCase()} over`,
      `wie schreef ${book.name.toLowerCase()}`,
      `wanneer is ${book.name.toLowerCase()} geschreven`,
      `${book.name.toLowerCase()} uitleg`,
    ],
  });
}

export default async function BijbelboekPage({ params }: PageProps) {
  const { slug } = await params;
  const book = getBibleBook(slug);
  if (!book) notFound();
  const detail = getBookDetail(book.slug);

  const path = `/bijbelboeken/${book.slug}`;
  const url = absoluteUrl(path);
  const bookId = `${url}#biblebook`;
  const { previous, next } = adjacentBooks(book.slug);
  const testamentLabel =
    book.testament === "oude-testament" ? "Oude Testament" : "Nieuwe Testament";

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Bijbelboeken", path: "/bijbelboeken" },
    { name: book.name, path },
  ];

  const pageGraph = graph(
    {
      ...webPageNode({
        path,
        name: `${book.name}: samenvatting, schrijver en uitleg`,
        description: book.blurb,
        type: "WebPage",
        breadcrumbId: `${url}#breadcrumb`,
        dateModified: detail ? BOOK_DETAIL_UPDATED : undefined,
      }),
      // The page is about the book, not about the publisher.
      about: { "@id": bookId },
      mainEntity: { "@id": bookId },
    },
    breadcrumbNode(crumbs, url),
    bibleBookNode({
      name: book.name,
      path,
      description: book.blurb,
      genre: book.genre,
      position: book.position,
    })
  );

  const citingTopics = topicsCiting(book.slug);

  const relatedBooks = (detail?.related ?? [])
    .map(r => ({ book: getBibleBook(r.slug), reason: r.reason }))
    .filter((r): r is { book: BibleBook; reason: string } => !!r.book);

  return (
    <ContentShell crumbs={crumbs}>
      <JsonLd data={pageGraph} />
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <header className="mb-8">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400">
            {testamentLabel} · boek {book.position} van 66
          </p>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]">
            {book.name}
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">
            {book.theme}
          </p>
        </header>

        {/* Quick facts. Authorship and date are answered in full below, each
            under its own question, so they are not repeated here. */}
        <dl className="mb-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
          <Fact label="Genre" value={book.genre} />
          <Fact label="Omvang" value={chapterCount(book.chapters)} />
          <Fact label="Kernverzen" value={book.keyVerses.join(" · ")} />
        </dl>

        <Section title={`Waar gaat ${book.name} over?`}>
          {detail && <Answer>{detail.aboutAnswer}</Answer>}
          <div className="space-y-4">
            {book.summary.map((paragraph, i) => (
              <Paragraph key={i}>{paragraph}</Paragraph>
            ))}
          </div>
        </Section>

        {detail ? (
          <>
            <Section title={`Wie schreef ${book.name}?`}>
              <Answer>{detail.author.answer}</Answer>
              <Paragraph>{detail.author.detail}</Paragraph>
            </Section>

            <Section title={`Wanneer is ${book.name} geschreven?`}>
              <Answer>{detail.date.answer}</Answer>
              <Paragraph>{detail.date.detail}</Paragraph>
            </Section>

            <StructureSection book={book} detail={detail} />
            <ThemesSection book={book} detail={detail} />
            <PassagesSection book={book} detail={detail} />

            <Section title={`${book.name} in het geheel van de Bijbel`}>
              <div className="space-y-4">
                {detail.inScripture.map((paragraph, i) => (
                  <Paragraph key={i}>{paragraph}</Paragraph>
                ))}
              </div>
            </Section>
          </>
        ) : (
          <FallbackFacts book={book} />
        )}

        <Section title={`Studievragen bij ${book.name}`}>
          <ol className="rounded-card border border-line bg-surface px-4 py-1 sm:px-[22px]">
            {book.studyQuestions.map((question, i) => (
              <li key={question} className={`flex gap-3 py-[13px] ${i === 0 ? "" : "border-t border-line-soft"}`}>
                <span
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-teal-faint text-[12px] font-bold tabular-nums text-teal dark:text-teal-400"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 pt-[3px] text-[14px] leading-[1.65] text-ink-body">
                  {question}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <ChapterSection book={book} detail={detail} />

        {/* Prev/next keeps the 66 detail pages linked in a chain, so a crawler
            that lands on one can reach all of them without the hub. */}
        <nav aria-label="Vorig en volgend bijbelboek" className="mt-10 grid gap-3 sm:grid-cols-2">
          {previous ? (
            <Link
              href={`/bijbelboeken/${previous.slug}`}
              className="flex min-w-0 items-center gap-2 rounded-btn border border-line bg-surface px-4 py-3 text-[13.5px] no-underline transition-colors hover:border-line-strong"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
              <span className="text-ink-muted">
                Vorige: <span className="font-semibold text-ink">{previous.name}</span>
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={`/bijbelboeken/${next.slug}`}
              className="flex min-w-0 items-center justify-end gap-2 rounded-btn border border-line bg-surface px-4 py-3 text-[13.5px] no-underline transition-colors hover:border-line-strong"
            >
              <span className="text-ink-muted">
                Volgende: <span className="font-semibold text-ink">{next.name}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
            </Link>
          )}
        </nav>

        {/* The topic pages that read this book, straight from their passages. */}
        {citingTopics.length > 0 && (
          <RelatedLinks
            title={`${book.name} in "Wat zegt de Bijbel over..."`}
            links={citingTopics.slice(0, 4).map(topic => ({
              href: topicPath(topic),
              label: topicHeading(topic),
              description: topic.description,
            }))}
          />
        )}

        {/* Book-specific reading suggestions instead of the same four generic
            cards on all 66 pages. */}
        <RelatedLinks
          title={`Lees verder na ${book.name}`}
          links={[
            ...relatedBooks.map(r => ({
              href: `/bijbelboeken/${r.book.slug}`,
              label: r.book.name,
              description: r.reason,
            })),
            {
              href: "/bijbelboeken",
              label: "Alle 66 bijbelboeken",
              description: "Het overzicht van Genesis tot Openbaring.",
            },
          ]}
        />
      </article>
    </ContentShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The one-to-two sentence answer directly under a question heading. */
function Answer({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[15.5px] font-medium leading-[1.7] text-ink">
      {children}
    </p>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[1.75] text-ink-body">{children}</p>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] leading-[1.6] text-ink">{value}</dd>
    </div>
  );
}

function StructureSection({ book, detail }: { book: BibleBook; detail: BookDetail }) {
  return (
    <Section title={`Opbouw van ${book.name}`}>
      <ol className="space-y-3">
        {detail.structure.map(block => (
          <li
            key={`${block.range}-${block.title}`}
            className="rounded-btn border border-line bg-surface p-4 sm:p-5"
          >
            <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px] font-bold text-ink">
              <Link
                href={chapterPath(book, block.chapter)}
                prefetch={false}
                className="whitespace-nowrap rounded-[7px] bg-teal-faint px-2 py-0.5 text-[12px] font-bold tabular-nums text-teal-dark no-underline hover:underline dark:text-teal-400"
              >
                <span className="sr-only">{book.name} </span>
                {block.range}
              </Link>
              <span>{block.title}</span>
            </h3>
            <p className="mt-2 text-[14.5px] leading-[1.7] text-ink-body">{block.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function ThemesSection({ book, detail }: { book: BibleBook; detail: BookDetail }) {
  return (
    <Section title={`Kernthema's in ${book.name}`}>
      <div className="space-y-5">
        {detail.themes.map(theme => (
          <div key={theme.title}>
            <h3 className="text-[15.5px] font-bold text-ink">{theme.title}</h3>
            <p className="mt-1.5 text-[15px] leading-[1.75] text-ink-body">{theme.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PassagesSection({ book, detail }: { book: BibleBook; detail: BookDetail }) {
  return (
    <Section title={`Bekende gedeelten uit ${book.name}`}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {detail.passages.map(passage => (
          <li key={`${passage.ref}-${passage.title}`} className="rounded-btn border border-line bg-surface p-4">
            <h3 className="text-[14.5px] font-bold text-ink">{passage.title}</h3>
            <Link
              href={chapterPath(book, passage.chapter)}
              prefetch={false}
              className="mt-0.5 inline-block text-[12.5px] font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
            >
              {passage.ref}
            </Link>
            <p className="mt-1.5 text-[13.5px] leading-[1.65] text-ink-muted">{passage.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * Every chapter as a plain, server-rendered link to its public page, plus the
 * book-specific reading advice. /studie/hoofdstuk is robots-blocked, so the
 * chapter pages are the primary route in; the study links stay for readers.
 */
function ChapterSection({ book, detail }: { book: BibleBook; detail?: BookDetail }) {
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  return (
    <Section title={`${book.name} lezen`}>
      {detail && <Paragraph>{detail.readingTip}</Paragraph>}
      <h3 className="mb-3 mt-6 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
        {book.chapters === 1
          ? `${book.name} heeft één hoofdstuk`
          : `De ${book.chapters} hoofdstukken van ${book.name}`}
      </h3>
      {/* prefetch={false}: Psalmen alone would otherwise prefetch 150 chapter
          payloads as soon as the grid scrolls into view. */}
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
        {chapters.map(n => (
          <li key={n}>
            <Link
              href={chapterPath(book, n)}
              prefetch={false}
              className="flex h-11 items-center justify-center rounded-btn border border-line bg-surface text-[13.5px] font-semibold tabular-nums text-ink-body no-underline transition-colors hover:border-teal-500 hover:text-teal-dark dark:hover:text-teal-400"
            >
              <span className="sr-only">{book.name} </span>
              {n}
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
        <Link
          href={chapterPath(book, 1)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Begin bij {book.name} 1
        </Link>
        {/* Reading and studying are two intents: the guided study takes the
            book one lesson per chapter, with commentary and questions. */}
        <Link
          href={`/studies/${bookStudyId(book.slug)}`}
          className="inline-flex h-11 items-center justify-center rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
        >
          {book.name} bestuderen
        </Link>
      </div>
      {/* A third intent: one chapter, today, without starting a study. The
          route is robots-blocked (/studie/), hence nofollow; the chapter
          links above are the crawlable way in. */}
      <p className="mt-3 text-[13px] text-ink-muted">
        <Link
          href={chapterStudyPath(book.slug, 1)}
          data-track="chapter_study_book_page"
          rel="nofollow"
          className="font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
        >
          Of bestudeer alleen {book.name} 1
        </Link>
      </p>
    </Section>
  );
}

/**
 * Only reached if a book has no detail entry, which tests/bijbelboekenDetail
 * forbids. Kept so a missing entry degrades to the old page, not to a crash.
 */
function FallbackFacts({ book }: { book: BibleBook }) {
  return (
    <>
      <Section title={`Wie schreef ${book.name}?`}>
        <Paragraph>{book.author}</Paragraph>
      </Section>
      <Section title={`Wanneer is ${book.name} geschreven?`}>
        <Paragraph>{book.written}</Paragraph>
      </Section>
      <Section title={`Opbouw van ${book.name}`}>
        <ol className="space-y-3">
          {book.outline.map(section => (
            <li key={section.range} className="rounded-btn border border-line bg-surface p-4">
              <strong className="block text-[14px] font-bold text-ink">
                {section.range} · {section.title}
              </strong>
              <span className="mt-0.5 block text-[13.5px] leading-[1.65] text-ink-muted">
                {section.summary}
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
