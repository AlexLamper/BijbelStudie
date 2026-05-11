import { Metadata } from 'next';

interface PageMetadataConfig {
  titleKey: string;
  descriptionKey: string;
  path: string;
  type?: string;
  indexable?: boolean;
}

const pageConfigs: Record<string, PageMetadataConfig> = {
  dashboard: {
    titleKey: 'dashboard',
    descriptionKey: 'Access your personalized dashboard on BijbelStudie to manage courses, track progress, and engage with the community.',
    path: '/dashboard',
    type: 'website'
  },
  study: {
    titleKey: 'study',
    descriptionKey: 'Verken de Bijbel online met geavanceerde studiehulpmiddelen. BijbelStudie biedt de beste bijbelstudie online ervaring.',
    path: '/study',
    type: 'website'
  },
  plans: {
    titleKey: 'plans',
    descriptionKey: 'Volg bijbelleesplannen en verbeter je bijbelstudie. BijbelStudie leesprogramma\'s voor serieuze bijbelstudenten.',
    path: '/plans',
    type: 'website'
  },
  notes: {
    titleKey: 'notes',
    descriptionKey: 'Manage all your Bible study notes and highlights in one place.',
    path: '/notes',
    type: 'website'
  },
  quizzes: {
    titleKey: 'quizzes',
    descriptionKey: 'Engage with interactive Bible quizzes. Test your biblical knowledge with BijbelStudie\'s online bible courses and quizzes.',
    path: '/quizzes',
    type: 'website'
  },
  profile: {
    titleKey: 'profile',
    descriptionKey: 'Manage your BijbelStudie user profile, track your progress, and personalize your experience.',
    path: '/profile',
    type: 'profile'
  },
  resources: {
    titleKey: 'resources',
    descriptionKey: 'Verken een uitgebreide verzameling bijbelstudiematerialen en -resources. Alles wat je nodig hebt voor serieuze bijbelstudie online.',
    path: '/resources',
    type: 'website'
  },
  settings: {
    titleKey: 'settings',
    descriptionKey: 'Manage your BijbelStudie account settings and preferences.',
    path: '/settings',
    type: 'website'
  },
  read: {
    titleKey: 'study',
    descriptionKey: 'Lees en bestudeer de Bijbel online. Gebruik onze interactieve tools voor diepgaande bijbelstudie.',
    path: '/read',
    type: 'website'
  },
  community: {
    titleKey: 'community',
    descriptionKey: 'Sluit je aan bij de BijbelStudie-gemeenschap. Ontmoet andere bijbelstudenten en groei spiritueel.',
    path: '/community',
    type: 'website'
  },
  admin: {
    titleKey: 'admin',
    descriptionKey: 'Admin dashboard for managing BijbelStudie platform.',
    path: '/admin',
    type: 'website',
    indexable: false
  },
  subscribe: {
    titleKey: 'subscribe',
    descriptionKey: 'Abonneer je op BijbelStudie voor exclusieve bijbelstudie resources. Ontgrendel al onze premium bijbelcursussen en commentaren.',
    path: '/subscribe',
    type: 'website'
  },
  success: {
    titleKey: 'success',
    descriptionKey: 'Subscription successful! Welcome to BijbelStudie.',
    path: '/success',
    type: 'website',
    indexable: false
  },
  home: {
    titleKey: 'home',
    descriptionKey: 'BijbelStudie - Online Bible Study & Biblical Education Platform',
    path: '/',
    type: 'website'
  },
  signin: {
    titleKey: 'signin',
    descriptionKey: 'Sign in to BijbelStudie to access your courses and community.',
    path: '/auth/signin',
    type: 'website',
    indexable: false
  },
  register: {
    titleKey: 'register',
    descriptionKey: 'Create a BijbelStudie account to start your biblical education journey.',
    path: '/auth/register',
    type: 'website',
    indexable: false
  },
  forgotPassword: {
    titleKey: 'forgotPassword',
    descriptionKey: 'Reset your BijbelStudie password.',
    path: '/auth/forgot-password',
    type: 'website',
    indexable: false
  },
  resetPassword: {
    titleKey: 'resetPassword',
    descriptionKey: 'Set a new password for your BijbelStudie account.',
    path: '/auth/reset-password',
    type: 'website',
    indexable: false
  },
  privacyPolicy: {
    titleKey: 'privacyPolicy',
    descriptionKey: 'BijbelStudie Privacy Policy.',
    path: '/privacy-policy',
    type: 'website'
  },
  termsOfService: {
    titleKey: 'termsOfService',
    descriptionKey: 'BijbelStudie Terms of Service.',
    path: '/terms-of-service',
    type: 'website'
  },
  canceled: {
    titleKey: 'canceled',
    descriptionKey: 'Payment canceled.',
    path: '/canceled',
    type: 'website',
    indexable: false
  }
};

export function generatePageMetadata(
  pageKey: string, 
  lng: string = 'en', 
  customTitle?: string,
  customDescription?: string
): Metadata {
  const config = pageConfigs[pageKey];
  
  if (!config) {
    return {
      title: 'BijbelStudie',
      description: 'Interactive Bible Learning Platform'
    };
  }

  const titleTranslations: Record<string, Record<string, string>> = {
    en: {
      dashboard: 'Dashboard',
      study: 'Study',
      plans: 'Reading Plans',
      notes: 'Notes',
      quizzes: 'Quizzes',
      profile: 'Profile',
      resources: 'Resources',
      settings: 'Settings',
      community: 'Community',
      admin: 'Admin',
      read: 'Read',
      subscribe: 'Subscribe',
      success: 'Success',
      home: 'Home',
      signin: 'Sign In',
      register: 'Register',
      forgotPassword: 'Forgot Password',
      resetPassword: 'Reset Password',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      canceled: 'Payment Canceled'
    },
    nl: {
      dashboard: 'Dashboard',
      study: 'Studie',
      plans: 'Leesplannen',
      notes: 'Notities',
      quizzes: 'Quizzen',
      profile: 'Profiel',
      resources: 'Hulpbronnen',
      settings: 'Instellingen',
      community: 'Gemeenschap',
      admin: 'Beheer',
      read: 'Lezen',
      subscribe: 'Abonneren',
      success: 'Succes',
      home: 'Home',
      signin: 'Inloggen',
      register: 'Registreren',
      forgotPassword: 'Wachtwoord vergeten',
      resetPassword: 'Wachtwoord resetten',
      privacyPolicy: 'Privacybeleid',
      termsOfService: 'Algemene Voorwaarden',
      canceled: 'Betaling Geannuleerd'
    },
    de: {
      dashboard: 'Dashboard',
      study: 'Studium',
      plans: 'Lesepläne',
      notes: 'Notizen',
      quizzes: 'Quizze',
      profile: 'Profil',
      resources: 'Ressourcen',
      settings: 'Einstellungen',
      community: 'Gemeinschaft',
      admin: 'Verwaltung',
      read: 'Lesen',
      subscribe: 'Abonnieren',
      success: 'Erfolg',
      home: 'Startseite',
      signin: 'Anmelden',
      register: 'Registrieren',
      forgotPassword: 'Passwort vergessen',
      resetPassword: 'Passwort zurücksetzen',
      privacyPolicy: 'Datenschutzerklärung',
      termsOfService: 'Nutzungsbedingungen',
      canceled: 'Zahlung Abgebrochen'
    }
  };

  const pageTitle = customTitle || titleTranslations[lng]?.[config.titleKey] || titleTranslations['en'][config.titleKey] || 'BijbelStudie';
  const baseUrl = 'https://www.bijbel-studie.com';
  const fullUrl = `${baseUrl}${config.path}`;
  const isIndexable = config.indexable ?? true;

  return {
    title: {
      absolute: `BijbelStudie | ${pageTitle}`,
    },
    description: customDescription || config.descriptionKey,
    openGraph: {
      title: `BijbelStudie | ${pageTitle}`,
      description: customDescription || config.descriptionKey,
      url: fullUrl,
      siteName: 'BijbelStudie',
      images: [
        {
          url: `${baseUrl}/og-image.svg`,
          width: 1200,
          height: 630,
          alt: `BijbelStudie - ${pageTitle}`,
        },
      ],
      locale: lng === 'en' ? 'en_US' : lng === 'nl' ? 'nl_NL' : 'de_DE',
      type: (config.type as 'website' | 'profile') || 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `BijbelStudie | ${pageTitle}`,
      description: customDescription || config.descriptionKey,
      site: '@BijbelStudieEdu',
      creator: '@BijbelStudieEdu',
      images: [`${baseUrl}/og-image.svg`],
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
