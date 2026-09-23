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
import { ContentShell, RelatedLinks } from "../../components/content/ContentShell";
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
        "Alle 66 boeken van de Bijbel met schrijver, ontstaanstijd, genre, kernthema en hoofdlijn.",
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <header className="mb-10">
          <p
            className="mb-2 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400"
          >
            Naslag
          </p>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[34px]">
            De 66 bijbelboeken op een rij
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">
            Van Genesis tot Openbaring: per boek de schrijver, de ontstaanstijd,
            het genre, het kernthema en de hoofdlijn - plus studievragen om er
            zelf mee aan de slag te gaan.
          </p>
        </header>

        <div className="mb-10 grid grid-cols-3 gap-2 sm:mb-12 sm:gap-[13px]">
          <Stat label="Boeken" value="66" />
          <Stat label="Oude Testament" value={String(ot.length)} />
          <Stat label="Nieuwe Testament" value={String(nt.length)} />
        </div>

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

        <section id="veelgestelde-vragen" className="mt-16 scroll-mt-24">
          <h2 className="mb-4 text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">
            Veelgestelde vragen over de bijbelboeken
          </h2>
          <div className="rounded-card border border-line bg-surface px-4 py-1 sm:px-[22px]">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className={`py-4 ${i === 0 ? "" : "border-t border-line-soft"}`}>
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
    <section className="mb-14">
      <h2 className="text-[19px] font-bold tracking-[-0.2px] text-ink sm:text-[21px]">{title}</h2>
      <p className="mb-6 mt-2 text-[13.5px] leading-[1.7] text-ink-muted">
        {description}
      </p>

      {genres.map(genre => (
        <GenreGroup
          key={genre}
          genre={genre}
          books={books.filter(b => b.genre === genre)}
        />
      ))}
    </section>
  );
}

function GenreGroup({ genre, books }: { genre: BookGenre; books: BibleBook[] }) {
  return (
    <div className="mb-7">
      <h3 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
        {genre}
        <span className="ml-2 font-medium normal-case tracking-normal">
          ({books.length})
        </span>
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {books.map(book => (
          <li key={book.slug}>
            <Link
              href={`/bijbelboeken/${book.slug}`}
              className="group flex items-baseline gap-3 rounded-btn border border-line bg-surface px-4 py-3 no-underline transition-colors hover:border-line-strong"
            >
              <span
                className="text-[10px] font-bold tabular-nums shrink-0 w-5 text-teal-dark dark:text-teal-400"
                aria-hidden
              >
                {book.position}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
                  {book.name}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-faint">
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
