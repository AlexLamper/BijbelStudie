import type { Metadata } from "next";
import Link from "next/link";
import { chapterStudyPath } from "../../../lib/chapterStudyRef";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { buildMetadata } from "../../../lib/pageMetadata";
import {
  BIBLE_BOOKS,
  getBibleBook,
  adjacentBooks,
  readerHref,
} from "../../../lib/content/bibleBooks";
import { bookStudyId } from "../../../lib/bookStudies";
import { ContentShell, RelatedLinks } from "../../../components/content/ContentShell";
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

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return BIBLE_BOOKS.map(book => ({ slug: book.slug }));
}

function bookTitle(name: string): string {
  const full = `${name}: samenvatting, schrijver en uitleg`;
  return `${SITE_NAME} | ${full}`.length <= 60 ? full : `${name}: samenvatting en uitleg`;
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
      `${book.name.toLowerCase()} uitleg`,
      `wie schreef ${book.name.toLowerCase()}`,
      "bijbelboeken",
      "bijbelstudie",
    ],
  });
}

export default async function BijbelboekPage({ params }: PageProps) {
  const { slug } = await params;
  const book = getBibleBook(slug);
  if (!book) notFound();

  const path = `/bijbelboeken/${book.slug}`;
  const url = absoluteUrl(path);
  const { previous, next } = adjacentBooks(book.slug);
  const testamentLabel =
    book.testament === "oude-testament" ? "Oude Testament" : "Nieuwe Testament";

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Bijbelboeken", path: "/bijbelboeken" },
    { name: book.name, path },
  ];

  const pageGraph = graph(
    webPageNode({
      path,
      name: `${book.name}: samenvatting, schrijver en uitleg`,
      description: book.blurb,
      type: "WebPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(crumbs, url),
    bibleBookNode({
      name: book.name,
      path,
      description: book.blurb,
      genre: book.genre,
      position: book.position,
    })
  );

  return (
    <ContentShell crumbs={crumbs}>
      <JsonLd data={pageGraph} />
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <header className="mb-8">
          <p
            className="mb-2 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400"
          >
            {testamentLabel} · boek {book.position} van 66
          </p>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]">
            {book.name}
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">
            {book.theme}
          </p>
        </header>

        {/* Fact table. Answers "wie schreef X", "wanneer is X geschreven" and
            "hoeveel hoofdstukken heeft X" above the fold, which is what those
            queries want. */}
        <dl
          className="mb-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2"
        >
          <Fact label="Schrijver" value={book.author} />
          <Fact label="Ontstaanstijd" value={book.written} />
          <Fact label="Genre" value={book.genre} />
          <Fact
            label="Omvang"
            value={`${book.chapters} ${book.chapters === 1 ? "hoofdstuk" : "hoofdstukken"}`}
          />
        </dl>

        <section className="mb-12">
          <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
            Waar gaat {book.name} over?
          </h2>
          <div className="space-y-4">
            {book.summary.map((paragraph, i) => (
              <p
                key={i}
                className="text-[15px] leading-[1.75] text-ink-body"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
            Hoofdlijn van {book.name}
          </h2>
          <ol className="space-y-3">
            {book.outline.map(section => (
              <li
                key={section.range}
                className="flex gap-3 rounded-btn border border-line bg-surface p-4 sm:gap-4"
              >
                <span
                  className="h-fit shrink-0 whitespace-nowrap rounded-[7px] bg-teal-faint px-2 py-1 text-[12px] font-bold tabular-nums text-teal-dark dark:text-teal-400"
                >
                  {section.range}
                </span>
                <span className="min-w-0">
                  <strong className="block text-[14px] font-bold text-ink">
                    {section.title}
                  </strong>
                  <span className="mt-0.5 block text-[13.5px] leading-[1.65] text-ink-muted">
                    {section.summary}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
            Kernverzen
          </h2>
          <ul className="flex flex-wrap gap-2">
            {book.keyVerses.map(verse => (
              <li
                key={verse}
                className="rounded-full border border-line bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-body"
              >
                {verse}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
            Studievragen bij {book.name}
          </h2>
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
        </section>

        <section
          className="rounded-card border border-line bg-surface p-5 text-center sm:p-6"
        >
          <h2 className="text-[16.5px] font-bold text-ink">
            Lees {book.name} online
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-muted">
            In de Statenvertaling en drie andere Nederlandse vertalingen, met
            commentaar en grondtekst ernaast. Een gratis account is genoeg.
          </p>
          <div className="mt-4 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
            <Link
              href={readerHref(book)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-btn bg-teal px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              {book.name} 1 openen
            </Link>
            {/* The same book, as a guided study: one lesson per chapter, with
                commentary, reflection and the assistant alongside. Reading and
                studying are two intents, and this page previously offered only
                the first. */}
            <Link
              href={`/studies/${bookStudyId(book.slug)}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
            >
              {book.name} bestuderen
            </Link>
          </div>
          {/* A third intent: one chapter, today, without starting a study. */}
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
        </section>

        {/* Prev/next keeps the 66 detail pages linked in a chain, so a crawler
            that lands on one can reach all of them without the hub. */}
        <nav
          aria-label="Andere bijbelboeken"
          className="mt-10 grid gap-3 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={`/bijbelboeken/${previous.slug}`}
              className="flex min-w-0 items-center gap-2 rounded-btn border border-line bg-surface px-4 py-3 text-[13.5px] no-underline transition-colors hover:border-line-strong"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
              <span className="text-ink-muted">
                Vorige:{" "}
                <span className="font-semibold text-ink">
                  {previous.name}
                </span>
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
                Volgende:{" "}
                <span className="font-semibold text-ink">
                  {next.name}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
            </Link>
          )}
        </nav>

        <RelatedLinks
          links={[
            {
              href: "/bijbelboeken",
              label: "Alle 66 bijbelboeken",
              description: "Terug naar het volledige overzicht.",
            },
            {
              href: "/bijbelstudie/methoden",
              label: "Zo doe je een boekstudie",
              description: "De methode om een heel bijbelboek te bestuderen.",
            },
            {
              href: "/bijbelstudie",
              label: "Bijbelstudie: de complete gids",
              description: "Methoden, hulpmiddelen en een stappenplan.",
            },
            {
              href: "/studies",
              label: "Begeleide studies",
              description: "Uitgewerkte studies om direct te volgen.",
            },
          ]}
        />
      </article>
    </ContentShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] leading-[1.6] text-ink">
        {value}
      </dd>
    </div>
  );
}
