import type { Metadata } from "next";
import Link from "next/link";
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
import { absoluteUrl } from "../../../lib/seo/constants";
import {
  graph,
  webPageNode,
  breadcrumbNode,
  bibleBookNode,
} from "../../../lib/seo/structuredData";

const TEAL = "#0D9488";
/** #0D9488 is 3.7:1 on white - fine as a fill, short of AA as type. */
const TEAL_TEXT = "#0F766E";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return BIBLE_BOOKS.map(book => ({ slug: book.slug }));
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
    // two things people search alongside it.
    title: `${book.name}: samenvatting, schrijver en uitleg`,
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
      <article className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <header className="mb-8">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: TEAL_TEXT }}
          >
            {testamentLabel} · boek {book.position} van 66
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-foreground">
            {book.name}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-600 dark:text-muted-foreground">
            {book.theme}
          </p>
        </header>

        {/* Fact table. Answers "wie schreef X", "wanneer is X geschreven" and
            "hoeveel hoofdstukken heeft X" above the fold, which is what those
            queries want. */}
        <dl
          className="grid gap-px rounded-xl overflow-hidden border mb-10 sm:grid-cols-2"
          style={{ backgroundColor: "#E5E7EB", borderColor: "#E5E7EB" }}
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
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-foreground">
            Waar gaat {book.name} over?
          </h2>
          <div className="space-y-4">
            {book.summary.map((paragraph, i) => (
              <p
                key={i}
                className="text-base leading-relaxed text-gray-700 dark:text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-foreground">
            Hoofdlijn van {book.name}
          </h2>
          <ol className="space-y-3">
            {book.outline.map(section => (
              <li
                key={section.range}
                className="rounded-lg border bg-white dark:bg-card p-4 flex gap-4"
                style={{ borderColor: "#E5E7EB" }}
              >
                <span
                  className="shrink-0 text-xs font-bold tabular-nums px-2 py-1 rounded-md h-fit"
                  style={{ backgroundColor: "rgba(13,148,136,0.10)", color: TEAL_TEXT }}
                >
                  {section.range}
                </span>
                <span>
                  <strong className="block text-sm font-bold text-gray-900 dark:text-foreground">
                    {section.title}
                  </strong>
                  <span className="text-sm leading-relaxed mt-0.5 block text-gray-600 dark:text-muted-foreground">
                    {section.summary}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-foreground">
            Kernverzen
          </h2>
          <ul className="flex flex-wrap gap-2">
            {book.keyVerses.map(verse => (
              <li
                key={verse}
                className="text-sm font-medium px-3 py-1.5 rounded-lg border bg-white dark:bg-card text-gray-800 dark:text-foreground"
                style={{ borderColor: "#E5E7EB" }}
              >
                {verse}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-foreground">
            Studievragen bij {book.name}
          </h2>
          <ol className="space-y-3">
            {book.studyQuestions.map((question, i) => (
              <li key={question} className="flex gap-4">
                <span
                  className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white tabular-nums"
                  style={{ backgroundColor: TEAL }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-1 text-gray-700 dark:text-muted-foreground">
                  {question}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="rounded-2xl p-6 border text-center"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-foreground">
            Lees {book.name} online
          </h2>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-muted-foreground">
            In de Statenvertaling en drie andere Nederlandse vertalingen, met
            commentaar en grondtekst ernaast. Een gratis account is genoeg.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href={readerHref(book)}
              className="inline-flex items-center justify-center gap-2 font-semibold text-white px-5 py-2.5 rounded-xl no-underline"
              style={{ backgroundColor: TEAL }}
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
              className="inline-flex items-center justify-center gap-2 font-semibold px-5 py-2.5 rounded-xl border no-underline text-gray-700 dark:text-foreground"
              style={{ borderColor: "#E5E7EB" }}
            >
              {book.name} bestuderen
            </Link>
          </div>
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
              className="flex items-center gap-2 rounded-xl border bg-white dark:bg-card px-4 py-3 text-sm no-underline hover:border-teal-500 transition-colors"
              style={{ borderColor: "#E5E7EB" }}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" style={{ color: TEAL_TEXT }} aria-hidden />
              <span className="text-gray-500 dark:text-muted-foreground">
                Vorige:{" "}
                <span className="font-semibold text-gray-900 dark:text-foreground">
                  {previous.name}
                </span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/bijbelboeken/${next.slug}`}
              className="flex items-center justify-end gap-2 rounded-xl border bg-white dark:bg-card px-4 py-3 text-sm no-underline hover:border-teal-500 transition-colors"
              style={{ borderColor: "#E5E7EB" }}
            >
              <span className="text-gray-500 dark:text-muted-foreground">
                Volgende:{" "}
                <span className="font-semibold text-gray-900 dark:text-foreground">
                  {next.name}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: TEAL_TEXT }} aria-hidden />
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
    <div className="bg-white dark:bg-card p-4">
      <dt className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm mt-1 leading-relaxed text-gray-900 dark:text-foreground">
        {value}
      </dd>
    </div>
  );
}
