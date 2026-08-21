import { Metadata } from 'next';
import {
  BASE_URL,
  SITE_NAME,
  SITE_LOCALE,
  TWITTER_HANDLE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  ogImageUrl,
} from './seo/constants';

export { BASE_URL };

interface PageMetadataConfig {
  /** Goes in <title> after the brand prefix. Keep the head keyword first. */
  title: string;
  description: string;
  path: string;
  type?: string;
  indexable?: boolean;
  /** Overrides the eyebrow on the generated OG card. */
  ogEyebrow?: string;
}

/**
 * Single source of truth for canonical URLs. Every path here must be a real,
 * non-redirecting Dutch route - a canonical pointing at a 308 redirect makes
 * Google drop the page from the index. Keep in sync with app/sitemap.ts.
 *
 * A page with NO entry here inherits the root layout's metadata, which
 * canonicalises to "/". Two pages claiming "/" as their canonical is how
 * /help and /contact used to get folded into the homepage and dropped from the
 * index - so every public route needs an entry.
 */
const pageConfigs: Record<string, PageMetadataConfig> = {
  home: {
    title: 'Bijbelstudie online',
    description: 'Studeer de Bijbel online met commentaren, leesplannen, begeleide studies en een AI-assistent. Gratis te beginnen.',
    path: '/',
    type: 'website'
  },
  dashboard: {
    title: 'Dashboard',
    description: 'Je persoonlijke dashboard: volg je voortgang, je leesplannen en je streak.',
    path: '/dashboard',
    type: 'website',
    indexable: false
  },
  study: {
    title: 'Bijbelstudie',
    description: 'Verken de Bijbel online met commentaren, grondtekst en studiehulpmiddelen. De complete bijbelstudie-omgeving van BijbelStudie.',
    path: '/studie',
    type: 'website',
    // Redirects anonymous visitors to "/" (middleware protectedRoutes), so it
    // can never render for a crawler. Advertising it as indexable only earns a
    // "Pagina met omleiding" report in Search Console.
    indexable: false
  },
  read: {
    title: 'Bijbel lezen',
    description: 'Lees de Bijbel online in meerdere vertalingen. Gebruik onze interactieve tools voor diepgaande bijbelstudie.',
    path: '/lezen',
    type: 'website',
    indexable: false
  },
  plans: {
    title: 'Leesplannen',
    description: 'Volg bijbelleesplannen op jouw tempo en houd je voortgang bij. Bijbelleesplannen voor serieuze bijbelstudenten.',
    path: '/leesplannen',
    type: 'website',
    indexable: false
  },
  studies: {
    title: 'Begeleide bijbelstudies',
    description: 'Tien begeleide bijbelstudies over personen, themas, gebeurtenissen en bijbelboeken. Stap voor stap door de Schrift, gratis te volgen.',
    path: '/studies',
    type: 'website'
  },
  groups: {
    title: 'Groepen',
    description: 'Studeer samen in een bijbelstudiegroep, deel notities en volg elkaars voortgang.',
    path: '/groepen',
    type: 'website',
    indexable: false
  },
  notes: {
    title: 'Notities',
    description: 'Beheer al je bijbelstudienotities en markeringen op een plek.',
    path: '/notities',
    type: 'website',
    indexable: false
  },
  resources: {
    title: 'Hulpbronnen: gratis bijbelstudieboeken',
    description: 'Een groeiende bibliotheek met gratis, publiek-domein bijbels, bijbelcommentaren, prekenbundels en dogmatische werken. Direct online te lezen.',
    path: '/hulpbronnen',
    type: 'website'
  },
  profile: {
    title: 'Profiel',
    description: 'Beheer je BijbelStudie-profiel, volg je voortgang en personaliseer je ervaring.',
    path: '/profiel',
    type: 'profile',
    indexable: false
  },
  settings: {
    title: 'Instellingen',
    description: 'Beheer je accountinstellingen en voorkeuren.',
    path: '/instellingen',
    type: 'website',
    indexable: false
  },
  feedback: {
    title: 'Feedback',
    description: 'Deel je feedback en help BijbelStudie verbeteren.',
    path: '/feedback',
    type: 'website',
    indexable: false
  },
  subscribe: {
    title: 'Prijzen en abonnement',
    // Keep any price in this snippet identical to what Stripe actually charges
    // (lib/pricing.ts). A derived per-week/per-month figure without its billing
    // period is exactly what the EU Omnibus price-indication rules forbid.
    description: 'BijbelStudie is gratis te gebruiken. Met Pro ontgrendel je alle bijbelcommentaren, een onbeperkte AI-assistent en historische context: €9,99 per maand of €89,99 per jaar.',
    path: '/abonnement',
    type: 'website'
  },
  help: {
    title: 'Help en veelgestelde vragen',
    description: 'Antwoorden op de meestgestelde vragen over BijbelStudie: accounts, vertalingen, leesplannen, de AI-assistent, Pro en privacy.',
    path: '/help',
    type: 'website'
  },
  contact: {
    title: 'Contact',
    description: 'Neem contact op met het team van BijbelStudie. We beantwoorden vragen over de app, je account en je abonnement.',
    path: '/contact',
    type: 'website'
  },
  admin: {
    title: 'Beheer',
    description: 'Beheeromgeving van BijbelStudie.',
    path: '/admin',
    type: 'website',
    indexable: false
  },
  success: {
    title: 'Gelukt',
    description: 'Je abonnement is geactiveerd. Welkom bij BijbelStudie Pro.',
    path: '/succes',
    type: 'website',
    indexable: false
  },
  canceled: {
    title: 'Betaling geannuleerd',
    description: 'De betaling is geannuleerd.',
    path: '/geannuleerd',
    type: 'website',
    indexable: false
  },
  signin: {
    title: 'Inloggen',
    description: 'Log in op BijbelStudie om verder te gaan met je bijbelstudie.',
    path: '/inloggen',
    type: 'website',
    indexable: false
  },
  register: {
    title: 'Registreren',
    description: 'Maak een gratis BijbelStudie-account aan en begin vandaag met bijbelstudie.',
    path: '/registreren',
    type: 'website',
    indexable: false
  },
  forgotPassword: {
    title: 'Wachtwoord vergeten',
    description: 'Herstel je BijbelStudie-wachtwoord.',
    path: '/wachtwoord-vergeten',
    type: 'website',
    indexable: false
  },
  resetPassword: {
    title: 'Wachtwoord herstellen',
    description: 'Stel een nieuw wachtwoord in voor je BijbelStudie-account.',
    path: '/wachtwoord-herstellen',
    type: 'website',
    indexable: false
  },
  privacyPolicy: {
    title: 'Privacybeleid',
    description: 'Het privacybeleid van BijbelStudie: welke gegevens we verwerken, waarom, en welke rechten je hebt.',
    path: '/privacybeleid',
    type: 'website'
  },
  termsOfService: {
    title: 'Algemene voorwaarden',
    description: 'De algemene voorwaarden van BijbelStudie.',
    path: '/algemene-voorwaarden',
    type: 'website'
  },

  /* ─── Content hub: the crawlable, keyword-targeted surface ──── */

  guideHub: {
    title: 'Bijbelstudie: de complete gids',
    description: 'Wat is bijbelstudie, welke methoden zijn er en hoe begin je? Een complete Nederlandse gids met zes beproefde studiemethoden, hulpmiddelen en een stappenplan.',
    path: '/bijbelstudie',
    type: 'article',
    ogEyebrow: 'Gids',
  },
  guideMethods: {
    title: 'Bijbelstudie methoden: 6 beproefde manieren',
    description: 'Inductieve studie, verzenanalyse, thematische studie, biografische studie, boekstudie en woordstudie - uitgelegd met een concreet voorbeeld per methode.',
    path: '/bijbelstudie/methoden',
    type: 'article',
    ogEyebrow: 'Gids',
  },
  guideStart: {
    title: 'Bijbelstudie voor beginners: zo begin je',
    description: 'Nooit eerder de Bijbel bestudeerd? Dit stappenplan brengt je in dertig dagen van je eerste hoofdstuk naar een vaste studiegewoonte.',
    path: '/bijbelstudie/beginnen',
    type: 'article',
    ogEyebrow: 'Gids',
  },
  guideOnline: {
    title: 'Online bijbelstudie: wat digitaal beter kan',
    description: 'Wat levert online bijbelstudie op ten opzichte van papier? Vertalingen vergelijken, commentaren, grondtekst, zoeken en doorzoekbare notities - met de valkuilen erbij.',
    path: '/bijbelstudie/online',
    type: 'article',
    ogEyebrow: 'Gids',
  },
  guideFree: {
    title: 'Gratis bijbelstudie: alles wat gratis kan',
    description: 'Een compleet overzicht van gratis bijbelstudiemateriaal in het Nederlands: vertalingen, commentaren, leesplannen, begeleide studies en publiek-domein boeken.',
    path: '/bijbelstudie/gratis',
    type: 'article',
    ogEyebrow: 'Gids',
  },
  bibleBooks: {
    title: 'De 66 bijbelboeken op een rij',
    description: 'Alle 66 boeken van de Bijbel met schrijver, ontstaanstijd, genre, kernthema en hoofdlijn. Het overzicht om snel je weg te vinden in de Schrift.',
    path: '/bijbelboeken',
    type: 'website',
    ogEyebrow: 'Naslag',
  },
};

export function getPageConfig(pageKey: string): PageMetadataConfig | undefined {
  return pageConfigs[pageKey];
}

export function getIndexablePaths(): string[] {
  return Object.values(pageConfigs)
    .filter(c => c.indexable ?? true)
    .map(c => c.path);
}

/** Paths that must be kept out of the index and out of the sitemap. */
export function getNonIndexablePaths(): string[] {
  return Object.values(pageConfigs)
    .filter(c => !(c.indexable ?? true))
    .map(c => c.path);
}

/**
 * Robots directives. `max-image-preview: large` is what makes Google show the
 * big thumbnail in Discover and mobile results; `max-snippet: -1` lifts the
 * snippet-length cap.
 */
export function robotsFor(indexable: boolean): Metadata['robots'] {
  return {
    index: indexable,
    follow: true,
    googleBot: {
      index: indexable,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}

/**
 * Build the full Metadata object for a page.
 *
 * The `lng` argument is kept so the many `generatePageMetadata(key, lng)` call
 * sites keep compiling, but the site is Dutch-only - it no longer branches.
 */
export function generatePageMetadata(
  pageKey: string,
  lng: string = 'nl',
  customTitle?: string,
  customDescription?: string
): Metadata {
  void lng;

  const config = pageConfigs[pageKey];

  if (!config) {
    // Never silently fall back to a bare title: a page without a canonical
    // inherits the root layout's "/" and competes with the homepage.
    return {
      title: SITE_NAME,
      description: 'Bijbelstudie online - lees, studeer en groei.',
      robots: robotsFor(false),
    };
  }

  const pageTitle = customTitle || config.title;
  const fullUrl = config.path === '/' ? `${BASE_URL}/` : `${BASE_URL}${config.path}`;
  const isIndexable = config.indexable ?? true;
  const description = customDescription || config.description;
  const fullTitle = `${SITE_NAME} | ${pageTitle}`;

  const image = ogImageUrl({
    title: pageTitle,
    subtitle: description,
    eyebrow: config.ogEyebrow ?? SITE_NAME,
  });

  return {
    title: {
      absolute: fullTitle,
    },
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${SITE_NAME} - ${pageTitle}`,
          type: 'image/png',
        },
      ],
      locale: SITE_LOCALE,
      type: (config.type as 'website' | 'profile' | 'article') || 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      images: [image],
    },
    robots: robotsFor(isIndexable),
    alternates: {
      canonical: fullUrl,
    },
  };
}

/**
 * Metadata for pages that are not in `pageConfigs` - dynamic routes such as
 * /bijbelboeken/:slug and /hulpbronnen/:slug. Same shape, explicit canonical.
 */
export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  indexable?: boolean;
  type?: 'website' | 'article' | 'book' | 'profile';
  ogEyebrow?: string;
  keywords?: string[];
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const fullUrl = `${BASE_URL}${opts.path}`;
  const fullTitle = `${SITE_NAME} | ${opts.title}`;
  const indexable = opts.indexable ?? true;
  const image = ogImageUrl({
    title: opts.title,
    subtitle: opts.description,
    eyebrow: opts.ogEyebrow ?? SITE_NAME,
  });

  return {
    title: { absolute: fullTitle },
    description: opts.description,
    ...(opts.keywords?.length ? { keywords: opts.keywords } : {}),
    openGraph: {
      title: fullTitle,
      description: opts.description,
      url: fullUrl,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: opts.type === 'article' ? 'article' : 'website',
      ...(opts.type === 'article' && opts.publishedTime
        ? { publishedTime: opts.publishedTime, modifiedTime: opts.modifiedTime }
        : {}),
      images: [
        {
          url: image,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${SITE_NAME} - ${opts.title}`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: opts.description,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      images: [image],
    },
    robots: robotsFor(indexable),
    alternates: { canonical: fullUrl },
  };
}
