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

/** #0D9488 is 3.7:1 on white - fine as a fill, short of AA as type. */
const TEAL_TEXT = "#0F766E";

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
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        <header className="mb-10">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: TEAL_TEXT }}
          >
            Naslag
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-gray-900 dark:text-foreground">
            De 66 bijbelboeken op een rij
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-muted-foreground">
            Van Genesis tot Openbaring: per boek de schrijver, de ontstaanstijd,
            het genre, het kernthema en de hoofdlijn - plus studievragen om er
            zelf mee aan de slag te gaan.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-3 mb-12">
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
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-foreground">
            Veelgestelde vragen over de bijbelboeken
          </h2>
          <div className="space-y-5">
            {FAQS.map(faq => (
              <div key={faq.q}>
                <h3 className="font-bold text-base text-gray-900 dark:text-foreground">
                  {faq.q}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
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
              href: "/hulpbronnen",
              label: "Bibliotheek",
              description: "Gratis commentaren en klassieke werken.",
            },
          ]}
        />
      </div>
    </ContentShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border bg-white dark:bg-card p-4 text-center"
      style={{ borderColor: "#E5E7EB" }}
    >
      <div className="text-2xl font-extrabold tabular-nums" style={{ color: TEAL_TEXT }}>
        {value}
      </div>
      <div className="text-xs mt-0.5 text-gray-500 dark:text-muted-foreground">
        {label}
      </div>
    </div>
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">{title}</h2>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
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
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500 dark:text-muted-foreground">
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
              className="group flex items-baseline gap-3 rounded-lg border bg-white dark:bg-card px-4 py-3 transition-colors hover:border-teal-500 no-underline"
              style={{ borderColor: "#E5E7EB" }}
            >
              <span
                className="text-[10px] font-bold tabular-nums shrink-0 w-5"
                style={{ color: TEAL_TEXT }}
                aria-hidden
              >
                {book.position}
              </span>
              <span className="min-w-0">
                <span className="font-semibold text-sm block text-gray-900 dark:text-foreground group-hover:underline">
                  {book.name}
                </span>
                <span className="text-xs mt-0.5 block text-gray-500 dark:text-muted-foreground">
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
