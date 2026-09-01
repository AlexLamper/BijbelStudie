import Link from "next/link";

// Index voor de admin-sandbox. G1, G2 en G3 zijn drie uitwerkingen van versie
// G: dezelfde inhoud (verder waar je was → één aanbevolen start → startsporen →
// boekenkast), een andere indeling. Alle drie op volle schermbreedte.
const VERSIONS = [
  {
    slug: "g1",
    name: "Versie G1 — Kolommen",
    blurb:
      "Dashboard-indeling: links de beslissing (aanbevolen start + startsporen), rechts een smalle rail met je voortgang en de boekenkast. Alles in één blik op een breed scherm. Een spoor openen vervangt het scherm.",
  },
  {
    slug: "g2",
    name: "Versie G2 — Band",
    blurb:
      "De aanbevolen start is een schermbrede teal band, daaronder de startsporen als één rij en de boekenkast als chipstrip. In het detailscherm blijft de sporenrail staan, dus je springt van spoor naar spoor zonder terug.",
  },
  {
    slug: "g3",
    name: "Versie G3 — Split",
    blurb:
      "Master-detail: vaste rail links met start, sporen en categorieën; rechts het paneel dat meeverandert. Niets vervangt ooit het scherm. Onder lg valt de rail om in een chipstrip boven het paneel.",
  },
];

export default function StudiesLabIndex() {
  return (
    <div className="px-5 sm:px-8 xl:px-10 py-8 w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">
        Studies — ontwerpvarianten
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
        Alleen zichtbaar voor admins. Drie uitwerkingen van versie G voor{" "}
        <code>/studies</code>.
      </p>
      <ul className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3 list-none p-0">
        {VERSIONS.map(v => (
          <li key={v.slug}>
            <Link
              href={`/studies-lab/${v.slug}`}
              className="block h-full no-underline rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4 transition-colors hover:border-teal-400"
            >
              <span className="block font-semibold text-gray-900 dark:text-foreground">
                {v.name}
              </span>
              <span className="mt-1 block text-[13px] text-gray-500 dark:text-muted-foreground">
                {v.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
