import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buildMetadata } from "../../../../lib/pageMetadata";
import { adjacentChapter, chapterStudyPath, readerChapterHref } from "../../../../lib/chapterStudyRef";
import { bookStudyId } from "../../../../lib/bookStudies";
import { APP_STORE_URL } from "../../../../lib/appStore";
import { OPENBIBLE_CROSSREF_ATTRIBUTION } from "../../../../lib/mobileLicensing";
import {
  CHAPTER_PAGE_VERSION,
  CHAPTER_PAGES_UPDATED,
  chapterDescription,
  chapterLabel,
  chapterPageParams,
  chapterPagePath,
  chapterPageTitle,
  keyVersesIn,
  outlineSectionsFor,
  resolveChapterPage,
  testamentLabel,
} from "../../../../lib/chapterPages";
import { loadChapterCrossRefs, loadSvChapter } from "../../../../lib/chapterPagesData";
import { ContentShell } from "../../../../components/content/ContentShell";
import { JsonLd } from "../../../../components/seo/JsonLd";
import {
  absoluteUrl,
  ogImageUrl,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_NAME,
} from "../../../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../../../lib/seo/structuredData";
import { topicHeading, topicPath, topicsCiting } from "../../../../lib/content/topics";

/*
 * /bijbel/<slug>/<chapter> - every chapter of the Bible as a public page, in
 * the Statenvertaling (public domain) and nothing else. See lib/chapterPages.ts
 * for the licensing rule, the verse-numbering repair and the metadata rules.
 *
 * RENDERING. All 1,189 pages are built once at deploy time and served from the
 * CDN; no request ever renders one. Two settings make that true:
 *
 * - `dynamicParams = false` with generateStaticParams: only the 1,189 real
 *   chapters exist, everything else is a 404 without running a function.
 * - `dynamic = "force-static"`: the root layout calls getServerSession(), which
 *   reads the session cookie. Without this line that cookie read makes every
 *   page under the layout dynamic, generateStaticParams or not - production
 *   serves /bijbelboeken/<slug> (which lacks it) with `private, no-store` and
 *   X-Vercel-Cache MISS on every hit, while the force-static pages come back as
 *   HIT. force-static hands the layout an empty cookie jar, so it renders its
 *   signed-out branch for everyone: no onboarding gate, no guest-progress
 *   migration, the Levensboom provider idle. None of that belongs on a public
 *   reading page (the guest onboarding only opens on /studies, /lezen and
 *   /studie), and ContentShell's header does not read the session at all, so a
 *   signed-in visitor sees exactly what a crawler sees - the same trade
 *   /bijbelboeken, /bijbelstudie and /help already make.
 *
 * Teal type is text-teal-dark (#0F766E): #0D9488 is 3.7:1 on white - fine as a
 * fill, short of AA as type. On dark it lifts to teal-400.
 */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return chapterPageParams();
}

interface PageProps {
  params: Promise<{ slug: string; chapter: string }>;
}

const BRAND_TEAL = "#0D9488";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, chapter } = await params;
  const resolved = resolveChapterPage(slug, chapter);
  if (!resolved) {
    return buildMetadata({
      title: "Hoofdstuk niet gevonden",
      description: "Dit bijbelhoofdstuk bestaat niet.",
      path: "/bijbelboeken",
      indexable: false,
    });
  }

  const { book, chapter: n } = resolved;
  const [{ verses }, crossRefs] = await Promise.all([
    loadSvChapter(book.slug, n),
    loadChapterCrossRefs(book.slug, n),
  ]);
  const label = chapterLabel(book, n);
  const title = chapterPageTitle(book, n);
  const base = buildMetadata({
    title,
    description: chapterDescription(book, n, verses, crossRefs.length > 0),
    path: chapterPagePath(book.slug, n),
    type: "article",
    ogEyebrow: testamentLabel(book),
    keywords: [
      label.toLowerCase(),
      `${label.toLowerCase()} statenvertaling`,
      `${book.name.toLowerCase()} ${n} bijbel`,
    ],
  });

  // One share card per BOOK, not per chapter. buildMetadata keys the card on
  // the title and description, which would make 1,189 distinct /og URLs, each
  // rendered on its first fetch. 66 cards cover the same ground.
  const card = ogImageUrl({
    title: `${book.name} - Statenvertaling`,
    subtitle: "De volledige tekst, hoofdstuk voor hoofdstuk, met context en kruisverwijzingen.",
    eyebrow: testamentLabel(book),
  });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: [
        {
          url: card,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${SITE_NAME} - ${book.name} in de Statenvertaling`,
          type: "image/png",
        },
      ],
    },
    twitter: { ...base.twitter, images: [card] },
  };
}

export default async function BijbelHoofdstukPage({ params }: PageProps) {
  const { slug, chapter } = await params;
  const resolved = resolveChapterPage(slug, chapter);
  if (!resolved) notFound();

  const { book, chapter: n } = resolved;
  const [{ verses }, crossRefs] = await Promise.all([
    loadSvChapter(book.slug, n),
    loadChapterCrossRefs(book.slug, n),
  ]);
  // A chapter without text would be a thin page with a verse count of zero.
  // The tests assert all 1,189 have text; this only guards a data regression,
  // and failing the build is better than shipping an empty page.
  if (verses.length === 0) {
    throw new Error(`No ${CHAPTER_PAGE_VERSION} text for ${book.slug} ${n}`);
  }

  const label = chapterLabel(book, n);
  const title = chapterPageTitle(book, n);
  const path = chapterPagePath(book.slug, n);
  const url = absoluteUrl(path);
  const bookPath = `/bijbelboeken/${book.slug}`;
  const previous = adjacentChapter(book.slug, n, -1);
  const next = adjacentChapter(book.slug, n, 1);
  const sections = outlineSectionsFor(book, n);
  /** Topic pages that read this very chapter. */
  const citingTopics = topicsCiting(book.slug, n);
  const keyVerses = keyVersesIn(book, n);
  const isKeyVerse = (v: number) => keyVerses.some(k => v >= k.from && v <= k.to);
  const isPsalm = book.slug === "psalmen";

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Bijbelboeken", path: "/bijbelboeken" },
    { name: book.name, path: bookPath },
    { name: label, path },
  ];

  const pageGraph = graph(
    webPageNode({
      path,
      name: title,
      description: chapterDescription(book, n, verses, crossRefs.length > 0),
      breadcrumbId: `${url}#breadcrumb`,
      dateModified: CHAPTER_PAGES_UPDATED,
    }),
    breadcrumbNode(crumbs, url)
  );

  const verseCount = verses.length === 1 ? "1 vers" : `${verses.length} verzen`;
  const position =
    book.chapters === 1
      ? `Het enige hoofdstuk van ${book.name} · ${verseCount}`
      : `${isPsalm ? "Psalm" : "Hoofdstuk"} ${n} van ${book.chapters} in ${book.name} · ${verseCount}`;

  return (
    <ContentShell crumbs={crumbs}>
      <JsonLd data={pageGraph} />
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <header className="mb-8">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400">
            {testamentLabel(book)} · {book.genre}
          </p>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]">
            {label} <span className="font-semibold text-ink-muted">- Statenvertaling</span>
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">{position}</p>
        </header>

        {/* The text. Verse markup is kept to <p id><sup>n</sup>text</p> and
            styled from the container: Psalm 119 has 176 verses and every byte
            of per-verse class names is sent twice (HTML and the RSC payload).
            `:target` tints the verse a cross-reference link landed on. */}
        <section aria-label={`Bijbeltekst van ${label}`} className="mb-10 rounded-card border border-line bg-surface px-4 py-6 sm:px-8 sm:py-8">
          <div className="max-w-[42rem] font-serif text-[17px] leading-[1.8] text-scripture [&>p]:-mx-1 [&>p]:mb-[14px] [&>p]:scroll-mt-24 [&>p]:rounded-[4px] [&>p]:px-1 [&>p:target]:bg-[var(--teal-wash)] [&_sup]:mr-[5px] [&_sup]:font-sans [&_sup]:text-[11px] [&_sup]:font-semibold [&_sup]:text-ink-faint">
            {verses.map(verse => (
              <p key={verse.n} id={`v${verse.n}`} className={isKeyVerse(verse.n) ? "bg-teal-faint" : undefined}>
                <sup>{verse.n}</sup>
                {verse.text}
              </p>
            ))}
          </div>
          <p className="mt-6 border-t border-line-soft pt-3 text-[11.5px] leading-snug text-ink-muted">
            Bijbeltekst: Statenvertaling, publiek domein.
            {isPsalm &&
              " In de Statenvertaling hoort het opschrift van een psalm bij de verzen, daardoor kunnen versnummers afwijken van andere vertalingen."}
          </p>
        </section>

        {/* Into the product. Both targets are disallowed in robots.txt (the
            study flow and the reader are app surfaces, not landing pages), so
            the links carry nofollow like the one on /bijbelboeken/<slug>. Both
            are rendered per request, so no prefetch either: a prefetch is a
            server render for every visitor who merely sees the button. */}
        <section className="mb-12 rounded-card border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-[16.5px] font-bold text-ink">Bestudeer {label}</h2>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-muted">
            Een begeleide les bij dit hoofdstuk: inleiding, bijbelse context, verdieping, vragen
            en toepassing. Of lees verder met commentaar, grondtekst en andere vertalingen
            ernaast. Je kunt zonder account beginnen.
          </p>
          <div className="mt-4 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
            {/* `?van=` makes the lesson's close button come back here rather
                than drop the visitor into the reader. */}
            <Link
              href={`${chapterStudyPath(book.slug, n)}?van=${encodeURIComponent(path)}`}
              prefetch={false}
              rel="nofollow"
              data-track="chapter_study_chapter_page"
              className="inline-flex h-11 items-center justify-center rounded-btn px-5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: BRAND_TEAL }}
            >
              Bestudeer dit hoofdstuk
            </Link>
            <Link
              href={readerChapterHref(book, n, CHAPTER_PAGE_VERSION)}
              prefetch={false}
              rel="nofollow"
              className="inline-flex h-11 items-center justify-center rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
            >
              Lees verder in de bijbellezer
            </Link>
          </div>
          <p className="mt-3 text-[13px] text-ink-muted">
            <a
              href={APP_STORE_URL}
              rel="noopener"
              className="font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
            >
              Of lees en studeer in de app voor iPhone
            </a>
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
            Over {label}
          </h2>
          <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            <Fact label="Bijbelboek">
              <Link href={bookPath} prefetch={false} className="font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400">
                {book.name}
              </Link>
              , boek {book.position} van 66
            </Fact>
            <Fact label="Testament">{testamentLabel(book)}</Fact>
            <Fact label="Genre">{book.genre}</Fact>
            <Fact label="Plaats in het boek">
              {book.chapters === 1
                ? "Het enige hoofdstuk"
                : `${isPsalm ? "Psalm" : "Hoofdstuk"} ${n} van ${book.chapters}${n === book.chapters ? (isPsalm ? " (de laatste)" : " (het laatste)") : ""}`}
            </Fact>
          </dl>

          {sections.length > 0 && (
            <div className="mt-4 space-y-3">
              {sections.map(section => (
                <div key={section.range} className="flex gap-3 rounded-btn border border-line bg-surface p-4 sm:gap-4">
                  <span className="h-fit shrink-0 whitespace-nowrap rounded-[7px] bg-teal-faint px-2 py-1 text-[12px] font-bold tabular-nums text-teal-dark dark:text-teal-400">
                    {isPsalm ? `Ps. ${section.range}` : `hfst. ${section.range}`}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[14px] font-bold text-ink">
                      {book.chapters === 1
                        ? `${book.name}: ${section.title}`
                        : `${isPsalm ? "Deze psalm" : "Dit hoofdstuk"} hoort bij: ${section.title}`}
                    </strong>
                    <span className="mt-0.5 block text-[13.5px] leading-[1.65] text-ink-muted">
                      {section.summary}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {keyVerses.length > 0 && (
            <p className="mt-4 text-[14px] leading-[1.65] text-ink-body">
              {keyVerses.length === 1 ? "Kernvers" : "Kernverzen"} van {book.name} in {isPsalm ? "deze psalm" : "dit hoofdstuk"}:{" "}
              {keyVerses.map((k, i) => (
                <span key={k.ref}>
                  {i > 0 && ", "}
                  <a href={`#v${k.from}`} className="font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400">
                    {k.from === k.to ? `vers ${k.from}` : `vers ${k.from}-${k.to}`}
                  </a>
                </span>
              ))}
              .
            </p>
          )}
        </section>

        {crossRefs.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-1.5 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
              Kruisverwijzingen bij {label}
            </h2>
            <p className="mb-4 text-[13.5px] leading-[1.6] text-ink-muted">
              Andere bijbelteksten die over hetzelfde spreken, de meest genoemde eerst.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {crossRefs.map(ref => (
                <li
                  key={ref.href}
                  className="flex items-baseline justify-between gap-3 rounded-btn border border-line bg-surface px-4 py-2.5"
                >
                  {/* No prefetch: twelve targets per page, most never opened,
                      each prefetch a ~30 KB payload download. */}
                  <Link
                    href={ref.href}
                    prefetch={false}
                    className="min-w-0 text-[14px] font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
                  >
                    {ref.label}
                  </Link>
                  <a href={`#v${ref.fromVerse}`} className="shrink-0 text-[12.5px] text-ink-muted no-underline hover:underline">
                    bij vers {ref.fromVerse}
                  </a>
                </li>
              ))}
            </ul>
            {/* CC BY: credit, source and the "bewerkt" clause, verbatim from
                lib/mobileLicensing.ts - the same string the reader shows. */}
            <p className="mt-3 text-[11px] leading-snug text-ink-muted">
              {OPENBIBLE_CROSSREF_ATTRIBUTION}
            </p>
          </section>
        )}

        {citingTopics.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
              {label} bij een onderwerp
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {citingTopics.map(topic => (
                <li key={topic.slug}>
                  <Link
                    href={topicPath(topic)}
                    prefetch={false}
                    className="block rounded-btn border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-teal-dark no-underline hover:underline dark:text-teal-400"
                  >
                    {topicHeading(topic)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Prev/next across book boundaries keeps all 1,189 pages in one chain,
            so a crawler that lands on any of them can reach the rest. */}
        <nav aria-label="Andere hoofdstukken" className="grid gap-3 sm:grid-cols-2">
          {previous ? (
            <Link
              href={chapterPagePath(previous.book.slug, previous.chapter)}
              className="flex min-w-0 items-center gap-2 rounded-btn border border-line bg-surface px-4 py-3 text-[13.5px] no-underline transition-colors hover:border-line-strong"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
              <span className="text-ink-muted">
                Vorige:{" "}
                <span className="font-semibold text-ink">{chapterLabel(previous.book, previous.chapter)}</span>
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={chapterPagePath(next.book.slug, next.chapter)}
              className="flex min-w-0 items-center justify-end gap-2 rounded-btn border border-line bg-surface px-4 py-3 text-[13.5px] no-underline transition-colors hover:border-line-strong"
            >
              <span className="text-ink-muted">
                Volgende:{" "}
                <span className="font-semibold text-ink">{chapterLabel(next.book, next.chapter)}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" aria-hidden />
            </Link>
          )}
        </nav>

        <MoreLinks
          links={[
            {
              href: bookPath,
              label: `Alles over ${book.name}`,
              description: "Samenvatting, schrijver, opbouw en alle hoofdstukken.",
            },
            {
              href: `/studies/${bookStudyId(book.slug)}`,
              label: `${book.name} bestuderen`,
              description: "Een begeleide studie door het hele boek, les voor les.",
            },
            {
              href: "/bijbelboeken",
              label: "Alle 66 bijbelboeken",
              description: "Het volledige overzicht van Oude en Nieuwe Testament.",
            },
            {
              href: "/bijbelstudie",
              label: "Bijbelstudie: de complete gids",
              description: "Methoden, hulpmiddelen en een stappenplan.",
            },
          ]}
        />
      </article>
    </ContentShell>
  );
}

/**
 * ContentShell's RelatedLinks, with prefetch off. /studies/<id> is rendered per
 * request (force-dynamic) and /bijbelboeken/<slug> is today too, so a default
 * <Link> would run a server render for every visitor who scrolls this far - on
 * 1,189 pages. Same markup and classes as RelatedLinks otherwise.
 */
function MoreLinks({ links }: { links: { href: string; label: string; description: string }[] }) {
  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-foreground">Verder lezen</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className="group block rounded-xl border border-line bg-surface p-4 no-underline transition-colors hover:border-teal-500"
          >
            <span className="block text-sm font-semibold text-teal-dark group-hover:underline dark:text-teal-400">
              {link.label}
            </span>
            <span className="mt-1 block text-sm text-gray-500 dark:text-muted-foreground">{link.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[14px] leading-[1.6] text-ink">{children}</dd>
    </div>
  );
}
