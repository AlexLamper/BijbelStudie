/**
 * JSON-LD builders.
 *
 * Every page renders exactly one <script type="application/ld+json"> holding a
 * single @graph. Google merges nodes by @id, so the Organization and WebSite
 * nodes are declared once (in the root layout) and referenced by @id everywhere
 * else instead of being repeated - repeating them with different content is how
 * you end up with conflicting entity signals.
 */

import {
  BASE_URL,
  SITE_NAME,
  ORG_ID,
  WEBSITE_ID,
  ORG_LOGO,
  CONTACT_EMAIL,
  absoluteUrl,
} from "./constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = Record<string, any>;

/** Wrap nodes in a @graph document ready for JSON.stringify. */
export function graph(...nodes: (Node | null | undefined)[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}

/* ─── Site-wide nodes (root layout only) ─────────────────────── */

export function organizationNode(): Node {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    alternateName: ["Bijbel Studie", "Bijbelstudie", "Bijbelstudie Online"],
    url: `${BASE_URL}/`,
    logo: {
      "@type": "ImageObject",
      "@id": `${BASE_URL}/#logo`,
      url: ORG_LOGO,
      contentUrl: ORG_LOGO,
      width: 512,
      height: 512,
      caption: SITE_NAME,
    },
    image: { "@id": `${BASE_URL}/#logo` },
    description:
      "BijbelStudie is een Nederlands online bijbelstudieplatform met bijbelcommentaren, begeleide studies, de grondtekst en een AI-studieassistent.",
    email: CONTACT_EMAIL,
    foundingDate: "2025",
    knowsLanguage: ["nl-NL"],
    areaServed: [
      { "@type": "Country", name: "Nederland" },
      { "@type": "Country", name: "België" },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        url: `${BASE_URL}/contact`,
        availableLanguage: ["Dutch", "nl"],
      },
    ],
  };
}

export function websiteNode(): Node {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${BASE_URL}/`,
    name: SITE_NAME,
    alternateName: "Bijbel Studie",
    description:
      "Online bijbelstudie in het Nederlands: bijbel lezen, commentaren, grondtekst en een AI-assistent.",
    publisher: { "@id": ORG_ID },
    inLanguage: "nl-NL",
    // Sitelinks search box. Google only honours this on the homepage and only
    // if the target URL really performs a site search.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/hulpbronnen?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * The product itself. Declaring the free tier as an Offer with price 0 is what
 * makes "gratis" a machine-readable fact rather than a marketing claim.
 */
export function softwareApplicationNode(opts: {
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
}): Node {
  return {
    "@type": "WebApplication",
    "@id": `${BASE_URL}/#webapp`,
    name: SITE_NAME,
    url: `${BASE_URL}/`,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "Bijbelstudie",
    operatingSystem: "Web, iOS",
    browserRequirements: "Vereist JavaScript. Werkt in alle moderne browsers.",
    inLanguage: "nl-NL",
    publisher: { "@id": ORG_ID },
    isAccessibleForFree: true,
    description:
      "Bestudeer de Bijbel online met meerdere vertalingen, bijbelcommentaren, de Hebreeuwse en Griekse grondtekst, notities en een AI-studieassistent.",
    featureList: [
      "Bijbel lezen in meerdere Nederlandse en Engelse vertalingen",
      "Bijbelcommentaren per vers",
      "Hebreeuwse en Griekse grondtekst met woordstudie",
      "Begeleide studies met voortgang en streak",
      "Persoonlijke notities en markeringen",
      "AI-assistent voor vragen over de Schrift",
      "Begeleide bijbelstudies over personen, themas en bijbelboeken",
      "Studiegroepen om samen te studeren",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Gratis",
        price: "0",
        priceCurrency: opts.currency,
        category: "free",
        availability: "https://schema.org/InStock",
        url: `${BASE_URL}/abonnement`,
      },
      {
        "@type": "Offer",
        name: "Pro maandelijks",
        price: opts.monthlyPrice.toFixed(2),
        priceCurrency: opts.currency,
        category: "subscription",
        availability: "https://schema.org/InStock",
        url: `${BASE_URL}/abonnement`,
      },
      {
        "@type": "Offer",
        name: "Pro jaarlijks",
        price: opts.annualPrice.toFixed(2),
        priceCurrency: opts.currency,
        category: "subscription",
        availability: "https://schema.org/InStock",
        url: `${BASE_URL}/abonnement`,
      },
    ],
  };
}

/* ─── Per-page nodes ─────────────────────────────────────────── */

export function webPageNode(opts: {
  path: string;
  name: string;
  description: string;
  /** ISO date the content was last meaningfully edited. */
  dateModified?: string;
  datePublished?: string;
  breadcrumbId?: string;
  primaryImage?: string;
  type?: "WebPage" | "CollectionPage" | "AboutPage" | "ContactPage" | "FAQPage";
}): Node {
  const url = absoluteUrl(opts.path);
  return {
    "@type": opts.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "nl-NL",
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    ...(opts.breadcrumbId ? { breadcrumb: { "@id": opts.breadcrumbId } } : {}),
    ...(opts.primaryImage
      ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            url: opts.primaryImage,
          },
        }
      : {}),
  };
}

/**
 * Breadcrumbs. The first crumb must be the homepage and every item needs an
 * absolute URL, otherwise the rich result is dropped without an error.
 */
export function breadcrumbNode(
  trail: { name: string; path: string }[],
  pageUrl: string
): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqNode(
  faqs: { q: string; a: string }[],
  pageUrl: string
): Node {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function howToNode(opts: {
  name: string;
  description: string;
  pageUrl: string;
  steps: { name: string; text: string }[];
  totalTime?: string;
}): Node {
  return {
    "@type": "HowTo",
    "@id": `${opts.pageUrl}#howto`,
    name: opts.name,
    description: opts.description,
    inLanguage: "nl-NL",
    ...(opts.totalTime ? { totalTime: opts.totalTime } : {}),
    step: opts.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function itemListNode(opts: {
  pageUrl: string;
  items: { name: string; path: string; description?: string }[];
  name?: string;
}): Node {
  return {
    "@type": "ItemList",
    "@id": `${opts.pageUrl}#itemlist`,
    ...(opts.name ? { name: opts.name } : {}),
    numberOfItems: opts.items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: opts.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function courseNode(opts: {
  name: string;
  description: string;
  path: string;
  lessonCount: number;
  image?: string;
  /**
   * Fragment that makes this node's @id unique. Required whenever several
   * courses share one page - duplicate @id values collapse into a single node
   * and Google silently keeps only the last one.
   */
  anchor?: string;
}): Node {
  const url = absoluteUrl(opts.path);
  return {
    "@type": "Course",
    "@id": `${url}#course-${opts.anchor ?? "main"}`,
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: "nl-NL",
    isAccessibleForFree: true,
    educationalLevel: "Beginner tot gevorderd",
    teaches: opts.name,
    provider: { "@id": ORG_ID },
    ...(opts.image ? { image: absoluteUrl(opts.image) } : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${Math.max(1, opts.lessonCount) * 20}M`,
      instructor: { "@id": ORG_ID },
    },
  };
}

/** A public-domain work in the /hulpbronnen library. */
export function bookNode(opts: {
  title: string;
  author?: string;
  year?: string;
  description: string;
  path: string;
  sourceUrl: string;
}): Node {
  const url = absoluteUrl(opts.path);
  return {
    "@type": "Book",
    "@id": `${url}#book`,
    name: opts.title,
    url,
    description: opts.description,
    inLanguage: "nl",
    ...(opts.author ? { author: { "@type": "Person", name: opts.author } } : {}),
    ...(opts.year ? { datePublished: opts.year } : {}),
    sameAs: opts.sourceUrl,
    isAccessibleForFree: true,
    publisher: { "@id": ORG_ID },
  };
}

/**
 * An individual book of the Bible. schema.org has no Bible-specific type, so
 * `Book` + `isPartOf` is the closest accurate modelling.
 */
export function bibleBookNode(opts: {
  name: string;
  path: string;
  description: string;
  author?: string;
  genre: string;
  position: number;
}): Node {
  const url = absoluteUrl(opts.path);
  return {
    "@type": "Book",
    "@id": `${url}#biblebook`,
    name: opts.name,
    alternateName: `Het boek ${opts.name}`,
    url,
    description: opts.description,
    genre: opts.genre,
    inLanguage: "nl",
    isPartOf: {
      "@type": "Book",
      name: "De Bijbel",
      position: opts.position,
    },
    ...(opts.author ? { author: { "@type": "Person", name: opts.author } } : {}),
    publisher: { "@id": ORG_ID },
    isAccessibleForFree: true,
  };
}

/** Long-form guide pages. */
export function articleNode(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  image?: string;
  wordCount?: number;
  keywords?: string[];
}): Node {
  const url = absoluteUrl(opts.path);
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: opts.headline,
    description: opts.description,
    url,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    inLanguage: "nl-NL",
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isAccessibleForFree: true,
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
    ...(opts.keywords ? { keywords: opts.keywords.join(", ") } : {}),
  };
}
