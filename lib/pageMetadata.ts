import { Metadata } from 'next';

interface PageMetadataConfig {
  title: string;
  description: string;
  path: string;
  type?: string;
  indexable?: boolean;
}

/**
 * Single source of truth for canonical URLs. Every path here must be a real,
 * non-redirecting Dutch route - a canonical pointing at a 308 redirect makes
 * Google drop the page from the index. Keep in sync with app/sitemap.ts.
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
    type: 'website'
  },
  read: {
    title: 'Bijbel lezen',
    description: 'Lees de Bijbel online in meerdere vertalingen. Gebruik onze interactieve tools voor diepgaande bijbelstudie.',
    path: '/lezen',
    type: 'website'
  },
  plans: {
    title: 'Leesplannen',
    description: 'Volg bijbelleesplannen op jouw tempo en houd je voortgang bij. Bijbelleesplannen voor serieuze bijbelstudenten.',
    path: '/leesplannen',
    type: 'website'
  },
  studies: {
    title: 'Begeleide studies',
    description: 'Begeleide bijbelstudies over personen, thema\'s, gebeurtenissen en bijbelboeken. Stap voor stap door de Schrift.',
    path: '/studies',
    type: 'website'
  },
  groups: {
    title: 'Groepen',
    description: 'Studeer samen in een bijbelstudiegroep, deel notities en volg elkaars voortgang.',
    path: '/groepen',
    type: 'website'
  },
  notes: {
    title: 'Notities',
    description: 'Beheer al je bijbelstudienotities en markeringen op één plek.',
    path: '/notities',
    type: 'website',
    indexable: false
  },
  resources: {
    title: 'Hulpbronnen',
    description: 'Verken een uitgebreide verzameling bijbelstudiematerialen en hulpbronnen. Alles wat je nodig hebt voor serieuze bijbelstudie online.',
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
    title: 'Abonnement',
    description: 'Word Pro en ontgrendel alle bijbelcommentaren, onbeperkte AI-assistent en historische context.',
    path: '/abonnement',
    type: 'website'
  },
  help: {
    title: 'Help',
    description: 'Veelgestelde vragen en uitleg over het gebruik van BijbelStudie.',
    path: '/help',
    type: 'website'
  },
  contact: {
    title: 'Contact',
    description: 'Neem contact op met het team van BijbelStudie.',
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
    description: 'Het privacybeleid van BijbelStudie.',
    path: '/privacybeleid',
    type: 'website'
  },
  termsOfService: {
    title: 'Algemene voorwaarden',
    description: 'De algemene voorwaarden van BijbelStudie.',
    path: '/algemene-voorwaarden',
    type: 'website'
  }
};

export const BASE_URL = 'https://www.bijbel-studie.com';

export function getPageConfig(pageKey: string): PageMetadataConfig | undefined {
  return pageConfigs[pageKey];
}

export function getIndexablePaths(): string[] {
  return Object.values(pageConfigs)
    .filter(c => c.indexable ?? true)
    .map(c => c.path);
}

/**
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
    return {
      title: 'BijbelStudie',
      description: 'Bijbelstudie online - lees, studeer en groei.'
    };
  }

  const pageTitle = customTitle || config.title;
  const fullUrl = `${BASE_URL}${config.path}`;
  const isIndexable = config.indexable ?? true;
  const description = customDescription || config.description;

  return {
    title: {
      absolute: `BijbelStudie | ${pageTitle}`,
    },
    description,
    openGraph: {
      title: `BijbelStudie | ${pageTitle}`,
      description,
      url: fullUrl,
      siteName: 'BijbelStudie',
      images: [
        {
          url: `${BASE_URL}/og-image.svg`,
          width: 1200,
          height: 630,
          alt: `BijbelStudie - ${pageTitle}`,
        },
      ],
      locale: 'nl_NL',
      type: (config.type as 'website' | 'profile') || 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `BijbelStudie | ${pageTitle}`,
      description,
      site: '@BijbelStudieEdu',
      creator: '@BijbelStudieEdu',
      images: [`${BASE_URL}/og-image.svg`],
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        index: isIndexable,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: fullUrl,
    },
  };
}
