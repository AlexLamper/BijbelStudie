export type LibraryCategory =
  | "bijbels"
  | "bijbeluitleg"
  | "preken"
  | "dogmatiek"
  | "belijdenis";

export type LibrarySource =
  | "DBNL"
  | "Project Gutenberg"
  | "Archive.org"
  | "Delpher"
  | "UU Repository";

export interface LibraryItem {
  slug: string;
  title: string;
  author?: string;
  year?: string;
  description: string;
  category: LibraryCategory;
  source: LibrarySource;
  sourceUrl: string;
  embedUrl?: string;
  canEmbed: boolean;
  isPro?: boolean;
  rightsNote: string;
}

export interface CategoryMeta {
  id: LibraryCategory;
  label: string;
  color: string;
  tint: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "bijbels",      label: "Bijbels & Psalters", color: "#0D9488", tint: "rgba(13,148,136,0.1)" },
  { id: "bijbeluitleg", label: "Bijbeluitleg",       color: "#3B82F6", tint: "rgba(59,130,246,0.1)" },
  { id: "preken",       label: "Preken",             color: "#E11D48", tint: "rgba(225,29,72,0.1)" },
  { id: "dogmatiek",    label: "Dogmatiek",          color: "#7C3AED", tint: "rgba(124,58,237,0.1)" },
  { id: "belijdenis",   label: "Belijdenis",         color: "#D97706", tint: "rgba(217,119,6,0.1)" },
];

export const LIBRARY: LibraryItem[] = [
  {
    slug: "revius-psalmen-davids-1640",
    title: "Psalmen Davids",
    author: "Jacobus Revius",
    year: "1640",
    description:
      "De volledige berijming van de Psalmen door de dichter en predikant Jacobus Revius. Een klassiek werk uit de Gouden Eeuw met poëtische kracht en theologische diepgang.",
    category: "bijbels",
    source: "DBNL",
    sourceUrl: "https://www.dbnl.org/tekst/revi001clps01_01/",
    embedUrl: "https://www.dbnl.org/tekst/revi001clps01_01/",
    canEmbed: false,
    rightsNote: "Auteur † 1658 — publiek domein in Nederland (auteursrecht: leven + 70 jaar).",
  },
  {
    slug: "boek-der-psalmen-1773",
    title: "Het Boek der Psalmen",
    year: "1773",
    description:
      "De officiële Staten-kerkpsalmen uit 1773 — de berijming die ruim twee eeuwen in de Nederlandse hervormde kerken werd gezongen.",
    category: "bijbels",
    source: "DBNL",
    sourceUrl: "https://www.dbnl.org/tekst/_boe008boek00/",
    embedUrl: "https://www.dbnl.org/tekst/_boe008boek00/",
    canEmbed: false,
    rightsNote: "Uitgave 1773 — ruim buiten de auteursrechtelijke termijn; publiek domein.",
  },
  {
    slug: "utenhove-psalmen-1557",
    title: "Psalmen",
    author: "Jan Utenhove",
    year: "1557–1559",
    description:
      "Een van de vroegste Nederlandstalige Psalmberijmingen, voorafgaand aan de bekende Datheen-berijming. Belangrijk werk uit de tijd van de Reformatie.",
    category: "bijbels",
    source: "DBNL",
    sourceUrl: "https://www.dbnl.org/tekst/uten001psal01_01/",
    embedUrl: "https://www.dbnl.org/tekst/uten001psal01_01/",
    canEmbed: false,
    rightsNote: "Auteur † 1566 — publiek domein in Nederland.",
  },
  {
    slug: "nbg-nieuwe-testament-1879",
    title: "Het Nieuwe Testament (1879)",
    author: "Nederlands Bijbelgenootschap",
    year: "1879",
    description:
      "Negentiende-eeuwse uitgave van het Nieuwe Testament door het Nederlands Bijbelgenootschap. Een historisch document met de taal en typografie van die tijd.",
    category: "bijbels",
    source: "UU Repository",
    sourceUrl: "https://hdl.handle.net/20.500.14918/235981",
    canEmbed: false,
    rightsNote:
      "Uitgave 1879, gepubliceerd door NBG — ruim buiten de auteursrechtelijke termijn; publiek domein.",
  },
  {
    slug: "portielje-bijbelsch-magazijn-1864",
    title: "Bijbelsch magazijn voor alle standen",
    author: "Gerrit Portielje",
    year: "1864",
    description:
      "Een toegankelijk negentiende-eeuws naslagwerk over de Bijbel: geschreven voor mensen uit alle lagen van de samenleving. Bevat verhalen, uitleg en achtergrond.",
    category: "bijbeluitleg",
    source: "DBNL",
    sourceUrl: "https://www.dbnl.org/tekst/port015bijb02_01/",
    embedUrl: "https://www.dbnl.org/tekst/port015bijb02_01/",
    canEmbed: false,
    rightsNote: "Auteur † 1900 — publiek domein in Nederland.",
  },
  {
    slug: "uit-de-diepte-leerredenen-1887",
    title: "Uit de diepte — Leerredenen",
    year: "1887–1888",
    description:
      "Een prekenbundel uit het laatste kwart van de negentiende eeuw. Klassieke leerredenen die het zielsleven van de gelovige in beeld brengen.",
    category: "preken",
    source: "DBNL",
    sourceUrl: "https://www.dbnl.org/tekst/_die006diep01_01/",
    embedUrl: "https://www.dbnl.org/tekst/_die006diep01_01/",
    canEmbed: false,
    rightsNote: "Uitgave 1887–1888 — auteurs ruim meer dan 70 jaar overleden; publiek domein.",
  },
  {
    slug: "schilder-preken-deel-2",
    title: "Preken — deel 2",
    author: "K. Schilder",
    year: "1954",
    description:
      "Tweede deel van de prekenverzameling van de gereformeerde theoloog Klaas Schilder. Diepgaande exegese gecombineerd met heldere toepassing.",
    category: "preken",
    source: "DBNL",
    sourceUrl: "https://www.dbnl.org/tekst/schi008prek02_01/",
    embedUrl: "https://www.dbnl.org/tekst/schi008prek02_01/",
    canEmbed: false,
    isPro: true,
    rightsNote:
      "Auteur † 1952 — sinds 2023 publiek domein in Nederland (leven + 70 jaar).",
  },
  {
    slug: "schilder-preken-deel-3",
    title: "Preken — deel 3",
    author: "K. Schilder",
    year: "1955",
    description:
      "Derde deel van de prekenverzameling. Postuum uitgegeven werk dat de theologische bezinning van Schilder voortzet.",
    category: "preken",
    source: "DBNL",
    sourceUrl: "https://www.dbnl.org/tekst/schi008prek03_01/",
    embedUrl: "https://www.dbnl.org/tekst/schi008prek03_01/",
    canEmbed: false,
    isPro: true,
    rightsNote:
      "Auteur † 1952 — sinds 2023 publiek domein in Nederland (leven + 70 jaar).",
  },
  {
    slug: "bavinck-gereformeerde-dogmatiek-1",
    title: "Gereformeerde Dogmatiek — Deel 1",
    author: "Herman Bavinck",
    year: "1906–1911",
    description:
      "Het eerste deel van Bavincks magnum opus over de gereformeerde geloofsleer. Inleiding op de prolegomena en de leer van de Heilige Schrift.",
    category: "dogmatiek",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/51052",
    embedUrl: "https://www.gutenberg.org/cache/epub/51052/pg51052-images.html",
    canEmbed: true,
    isPro: true,
    rightsNote: "Auteur † 1921 — publiek domein in Nederland en de VS.",
  },
  {
    slug: "bavinck-gereformeerde-dogmatiek-2",
    title: "Gereformeerde Dogmatiek — Deel 2",
    author: "Herman Bavinck",
    year: "1906–1911",
    description:
      "Tweede deel: de leer over God en de schepping. Een grondige uitwerking van de klassieke gereformeerde theologie.",
    category: "dogmatiek",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/67966",
    embedUrl: "https://www.gutenberg.org/cache/epub/67966/pg67966-images.html",
    canEmbed: true,
    isPro: true,
    rightsNote: "Auteur † 1921 — publiek domein in Nederland en de VS.",
  },
  {
    slug: "bavinck-gereformeerde-dogmatiek-4",
    title: "Gereformeerde Dogmatiek — Deel 4",
    author: "Herman Bavinck",
    year: "1906–1911",
    description:
      "Vierde deel: de leer over de heilsorde en de laatste dingen. Sluitstuk van Bavincks vierdelige systematische theologie.",
    category: "dogmatiek",
    source: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/69005",
    embedUrl: "https://www.gutenberg.org/cache/epub/69005/pg69005-images.html",
    canEmbed: true,
    isPro: true,
    rightsNote: "Auteur † 1921 — publiek domein in Nederland en de VS.",
  },
];

export function getCategoryMeta(id: LibraryCategory): CategoryMeta {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];
}

export function getLibraryItem(slug: string): LibraryItem | undefined {
  return LIBRARY.find(item => item.slug === slug);
}
