import type { Metadata } from "next";
import Link from "next/link";
import { generatePageMetadata } from "../../lib/pageMetadata";
import {
  BIBLE_BOOKS,
  getBooksByTestament,
  GENRE_ORDER,
  type BibleBook,
  type BookGenre,
} from "../../lib/content/bibleBooks";
import {
  CONTENT_H2,
  CONTENT_PAGE,
  ContentHeader,
  ContentShell,
  RelatedLinks,
} from "../../components/content/ContentShell";
import { Card } from "../../components/kit/primitives";
import { JsonLd } from "../../components/seo/JsonLd";
import { absoluteUrl } from "../../lib/seo/constants";
import {
  graph,
  webPageNode,
  breadcrumbNode,
  itemListNode,
  faqNode,
} from "../../lib/seo/structuredData";

export const metadata: Metadata = generatePageMetadata("bibleBooks");
export const dynamic = "force-static";

/* Teal type is text-teal-dark (#0F766E): #0D9488 is 3.7:1 on white - fine as a
   fill, short of AA as type. On dark it lifts to teal-400. */

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Bijbelboeken", path: "/bijbelboeken" },
];

const FAQS = [
  {
    q: "Hoeveel boeken heeft de Bijbel?",
    a: "De protestantse Bijbel telt 66 boeken: 39 in het Oude Testament en 27 in het Nieuwe Testament. De rooms-katholieke en oosters-orthodoxe canon bevatten daarnaast de deuterocanonieke boeken, waardoor die uitgaven op een hoger aantal uitkomen.",
  },
  {
    q: "Wat is het langste en het kortste boek van de Bijbel?",
    a: "Psalmen heeft met 150 hoofdstukken de meeste hoofdstukken; Jeremia is qua woordaantal het langste boek. De kortste boeken zijn Obadja in het Oude Testament (21 verzen) en 3 Johannes in het Nieuwe Testament (15 verzen).",
  },
  {
    q: "In welke volgorde lees je de bijbelboeken het beste?",
    a: "Niet per se in de gedrukte volgorde. Voor een eerste kennismaking werkt Markus goed, daarna Genesis 1-12 voor de fundamenten en Filippenzen als eerste brief. Boeken als Leviticus, Ezechiël en Openbaring veronderstellen veel achtergrond en zijn beter voor later.",
  },
  {
    q: "Wie heeft de bijbelboeken geschreven?",
    a: "De Bijbel is over ruim duizend jaar door tientallen schrijvers samengesteld. Sommige boeken noemen hun schrijver expliciet, zoals de meeste brieven van Paulus. Veel andere zijn anoniem overgeleverd en dragen een traditionele toeschrijving, zoals de vijf boeken van Mozes. Per boek staat op deze site vermeld wat er wel en niet over bekend is.",
  },
];

export default function BijbelboekenPage() {
  const url = absoluteUrl("/bijbelboeken");
  const ot = getBooksByTestament("oude-testament");
  const nt = getBooksByTestament("nieuwe-testament");

  const pageGraph = graph(
    webPageNode({
      path: "/bijbelboeken",
      name: "De 66 bijbelboeken op een rij",
      description:
        "Alle 66 boeken van de Bijbel: waar ze over gaan, wie ze schreef en wanneer, de opbouw, kernthema's en bekende gedeelten.",
      type: "CollectionPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    itemListNode({
      pageUrl: url,
      name: "De 66 boeken van de Bijbel",
      items: BIBLE_BOOKS.map(book => ({
        name: book.name,
        path: `/bijbelboeken/${book.slug}`,
        description: book.theme,
      })),
    }),
    faqNode(FAQS, url)
  );

  return (
    <ContentShell crumbs={CRUMBS}>
      <JsonLd data={pageGraph} />
      <div className={CONTENT_PAGE}>
        {/* The stat tiles sit beside the title from lg up, under it below. */}
        <ContentHeader
          eyebrow="Naslag"
          title="De 66 bijbelboeken op een rij"
          lede={
            <>
              Van Genesis tot Openbaring: per boek waar het over gaat, wie het
              schreef en wanneer, de opbouw, de kernthema&apos;s en de bekendste
              gedeelten - plus studievragen en alle hoofdstukken om direct te
              lezen.
            </>
          }
          aside={
            <div className="grid grid-cols-3 gap-2 sm:gap-[13px]">
              <Stat label="Boeken" value="66" />
              <Stat label="Oude Testament" value={String(ot.length)} />
              <Stat label="Nieuwe Testament" value={String(nt.length)} />
            </div>
          }
        />

        <TestamentSection
          title="Het Oude Testament"
          description="Negenendertig boeken, geschreven over ruim duizend jaar, van de schepping tot de terugkeer uit de ballingschap."
          books={ot}
        />

        <TestamentSection
          title="Het Nieuwe Testament"
          description="Zevenentwintig boeken uit de eerste eeuw: vier evangeliën, de geschiedenis van de eerste gemeenten, eenentwintig brieven en de Openbaring."
          books={nt}
        />

        <section id="veelgestelde-vragen" className="mt-10 scroll-mt-24 lg:mt-12">
          <h2 className={`${CONTENT_H2} mb-4`}>
            Veelgestelde vragen over de bijbelboeken
          </h2>
          {/* Two across from md, all four in one row on a wide screen. */}
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {FAQS.map(faq => (
              <div key={faq.q} className="rounded-card border border-line bg-surface p-5">
                <h3 className="text-[14.5px] font-bold text-ink">
                  {faq.q}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.7] text-ink-body">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              href: "/bijbelstudie",
              label: "Bijbelstudie: de complete gids",
              description: "Wat bijbelstudie is en hoe je het aanpakt.",
            },
            {
              href: "/bijbelstudie/methoden",
              label: "Bijbelstudie methoden",
              description: "Zes methoden, waaronder de boekstudie.",
            },
            {
              href: "/studies",
              label: "Begeleide studies",
              description: "Uitgewerkte studies over personen en bijbelboeken.",
            },
            {
              href: "/bijbelstudie/beginnen",
              label: "Bijbelstudie voor beginners",
              description: "Een stappenplan van dertig dagen.",
            },
          ]}
        />
      </div>
    </ContentShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-3 py-3 text-center sm:px-[17px] sm:py-[15px]">
      <div className="text-[22px] font-bold tracking-[-0.5px] tabular-nums text-teal-dark dark:text-teal-400 sm:text-[25px]">
        {value}
      </div>
      <div className="mt-[2px] text-[11px] leading-tight text-ink-muted sm:text-[12px]">
        {label}
      </div>
    </Card>
  );
}

function TestamentSection({
  title,
  description,
  books,
}: {
  title: string;
  description: string;
  books: BibleBook[];
}) {
  const genres = GENRE_ORDER.filter(g => books.some(b => b.genre === g));

  return (
    <section className="mt-8 lg:mt-10">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className={CONTENT_H2}>{title}</h2>
        <span className="text-[12.5px] text-ink-faint tabular-nums">{books.length} boeken</span>
      </div>
      <p className="mb-5 mt-1.5 max-w-[48rem] text-[13.5px] leading-[1.7] text-ink-muted">
        {description}
      </p>

      <div className="space-y-6">
        {genres.map(genre => (
          <GenreGroup
            key={genre}
            genre={genre}
            books={books.filter(b => b.genre === genre)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * One genre as a grid of book tiles that adds a column each time another
 * ~15 rem fits: two on a phone held sideways, three at lg, five at 2xl, seven
 * on a 1920 px screen. Tiles in a row share its height.
 */
function GenreGroup({ genre, books }: { genre: BookGenre; books: BibleBook[] }) {
  return (
    <div>
      <h3 className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
        {genre}
        <span className="ml-2 font-medium normal-case tracking-normal">
          ({books.length})
        </span>
      </h3>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2.5">
        {books.map(book => (
          <li key={book.slug}>
            <Link
              href={`/bijbelboeken/${book.slug}`}
              className="group flex h-full items-start gap-3 rounded-card border border-line bg-surface px-4 py-3.5 no-underline transition-colors hover:border-line-strong"
            >
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-teal-faint text-[11px] font-bold tabular-nums text-teal-dark dark:text-teal-400"
                aria-hidden
              >
                {book.position}
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
                  {book.name}
                </span>
                <span className="mt-0.5 block text-[12px] leading-[1.5] text-ink-muted">
                  {book.chapters} {book.chapters === 1 ? "hoofdstuk" : "hoofdstukken"} · {book.theme}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
