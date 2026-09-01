import Link from "next/link";

// Index voor de admin-sandbox. G, H en I combineren elk de sterke punten van
// de eerdere versies D (inhoud), E (eenvoud) en F (flow) op een andere manier.
const VERSIONS = [
  {
    slug: "g",
    name: "Versie G — Traject in kaarten",
    blurb:
      "Het skelet van D (verder waar je was → één aanbevolen start → startsporen), maar elk spoor is een grote tapkaart uit E die schermvullend openklapt. In dat scherm staat de zin in gewone taal uit F. Structuur van D, ritme van E, toon van F.",
  },
  {
    slug: "h",
    name: "Versie H — Twee vragen, één antwoord",
    blurb:
      "De flow van F voorop: hoeveel tijd, wat wil je doen. Maar het antwoord is D's 'start hier'-kaart — één aanbeveling, groot, met waaróm juist die. De rest compact eronder, de categoriekaarten van E dichtgeklapt onderaan.",
  },
  {
    slug: "i",
    name: "Versie I — Drie deuren",
    blurb:
      "De stapsgewijze schil van E, maar stap 1 is geen boekenkast: drie deuren voor drie soorten lezers. 'Weet niet waar te beginnen' → D, 'ik heb even tijd' → F, 'ik zoek iets specifieks' → de catalogus. Per scherm precies één ding.",
  },
];

export default function StudiesLabIndex() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">
        Studies — ontwerpvarianten
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
        Alleen zichtbaar voor admins. Drie combinaties van{" "}
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
