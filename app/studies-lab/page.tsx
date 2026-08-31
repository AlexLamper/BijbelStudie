import Link from "next/link";

// Index for the admin sandbox. Links to the three parallel redesigns.
const VERSIONS = [
  {
    slug: "a",
    name: "Versie A — Boekenplank",
    blurb:
      "De canon als visueel rooster, gegroepeerd per bijbelgenre met kleurbanden. Ruimtelijk geheugen: je onthoudt waar een boek staat.",
  },
  {
    slug: "b",
    name: "Versie B — Cursusgids",
    blurb:
      "Voortgang eerst. Grote 'verder waar je was', daaronder één verticale lijst met rijke rijen: omschrijving, lessen, voortgangsbalk. Filters in een zijbalk.",
  },
  {
    slug: "c",
    name: "Versie C — Commandobalk",
    blurb:
      "Snel en minimaal. Direct-filter zoekbalk met toetsenbordnavigatie, facet-chips per genre, compacte dichte grid. Voor wie weet wat hij zoekt.",
  },
  {
    slug: "d",
    name: "Versie D — Traject",
    blurb:
      "Onboarding-stijl. Eén duidelijke 'start hier', een paar samengestelde startsporen (beginners, leven van Jezus, in 30 dagen), en pas daaronder inklapbaar alle 66 boeken. Minste keuzestress.",
  },
  {
    slug: "e",
    name: "Versie E — Grote categoriekaarten",
    blurb:
      "Mobiel-eerst. Landing toont ~6 grote tapkaarten (OT, NT, Personen, Thema's, Mijn studies, Populair). Tik → schermvullende sublijst. Weinig op het scherm, stapsgewijs.",
  },
  {
    slug: "f",
    name: "Versie F — Op doel & tijd",
    blurb:
      "Kies op intentie, niet op taxonomie. 'Hoeveel tijd heb je?' + 'Wat zoek je?' filteren op uitkomst. Alfabetische lijst als vangnet.",
  },
];

export default function StudiesLabIndex() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">
        Studies — ontwerpvarianten
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
        Alleen zichtbaar voor admins. Drie parallelle herontwerpen van{" "}
        <code>/studies</code>.
      </p>
      <ul className="mt-6 space-y-3">
        {VERSIONS.map(v => (
          <li key={v.slug}>
            <Link
              href={`/studies-lab/${v.slug}`}
              className="block no-underline rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4 transition-colors hover:border-teal-400"
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
