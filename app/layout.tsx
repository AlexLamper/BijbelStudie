import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ThemeProvider } from "../components/providers/theme-provider";
import { cookieName, fallbackLng } from "./i18n/settings";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/authOptions";
import { OnboardingWrapper } from "../components/onboarding/onboarding-wrapper";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PrefetchProvider } from "../components/providers/prefetch-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bijbel-studie.com'),
  title: {
    default: "BijbelStudie - Online Bijbelstudie & Digitale Bijbelcursussen",
    template: "%s | BijbelStudie"
  },
  description: "BijbelStudie - Bijbel studie online voor iedereen! Ontdek interactieve bijbelcursussen, gids bibelstudies, bijbelcommentaren en online bijbellessen. Start je gratis vandaag.",
  keywords: [
    "bijbelstudie",
    "bijbel studie",
    "bijbel studie online",
    "online bijbelstudie",
    "bijbel lezen",
    "bijbel studie app",
    "online bijbelcursussen",
    "bijbelcursus online",
    "bijbelcommentaren",
    "gids bijbelstudie",
    "leesplan bijbel",
    "bijbelboeken",
    "christelijk onderwijs",
    "bijbelse educatie",
    "theologie online",
    "bijbelkennis",
    "schriftstudie",
    "bijbelversussen",
    "heilige bijbel online",
    "bijbelstudies",
    "bijbellessen",
    "bijbelconferences",
    "bijbelcommunity",
    "faith learning",
    "theology course",
    "bible study course",
    "scripture study online",
    "Christian education",
    "biblical knowledge",
    "spiritual growth"
  ],
  authors: [{ name: "BijbelStudie Team" }],
  creator: "BijbelStudie",
  publisher: "BijbelStudie",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: 'https://bijbel-studie.com',
    title: 'BijbelStudie - Online Bijbelstudie & Bijbelcursussen',
    description: 'Bijbel studie online met interactieve cursussen, commentaren en studiematerialen. Leer systematisch Gods Woord met BijbelStudie.',
    siteName: 'BijbelStudie',
    images: [
      {
        url: "https://bijbel-studie.com/og-image.svg",
        width: 1200,
        height: 630,
        alt: "BijbelStudie - Online Bijbelstudie en Bijbelcursussen",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BijbelStudie - Online Bijbelstudie',
    description: 'Bijbel studie online - Interactieve cursussen, commentaren en studiematerialen voor serieuze bijbelstudenten.',
    images: ["https://bijbel-studie.com/og-image.svg"],
  }
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;

  // Structured Data for search engines using JSON-LD
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://bijbel-studie.com",
    url: "https://bijbel-studie.com",
    logo: "https://bijbel-studie.com/favicon.ico",
    name: "BijbelStudie",
    alternateName: ["Bijbel Studie", "Bijbelstudie", "Bible Study Online"],
    description: "BijbelStudie - Online bijbelstudie platform met interactieve bijbelcursussen, commentaren, leesplannen en een ondersteunende christelijke gemeenschap.",
    sameAs: [
      "https://www.facebook.com/BijbelStudie",
      "https://www.twitter.com/BijbelStudie",
      "https://www.instagram.com/BijbelStudie",
      "https://github.com/AlexLamper/BijbelStudie"
    ],
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      offers: [
        {
          "@type": "Offer",
          name: "Basis Plan",
          price: "0",
          priceCurrency: "EUR",
          description: "Gratis toegang tot basis bijbelstudie tools"
        },
        {
          "@type": "Offer",
          name: "Pro Plan",
          price: "9.99",
          priceCurrency: "EUR",
          priceValidUntil: "2027-12-31",
          description: "Maandelijks abonnement voor serieuze bijbelstudenten"
        }
      ]
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      url: "https://bijbel-studie.com/contact"
    }
  };

  return (
    <html lang={lng}>
      <head>
        <meta charSet="UTF-8" />

        {/* Essential meta tags for responsiveness */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="BijbelStudie - Online Bible Courses, Quizzes & Community for Biblical Education"
        />
        <meta
          name="keywords"
          content="Bible,Online Bible Courses,Bible Study,Biblical Education,Scripture,Faith,Christian Learning,Quizzes,Online Quizzes,Bible Quizzes,BijbelStudie,Bible Lessons,Bible Courses,Biblical Knowledge,Bible Community,Religious Education,Theology,Christelijk onderwijs,Bijbelstudie,Bijbelcursus,Bijbelse educatie,Bijbelse kennis,Christelijk geloof,Online bijbelcursussen,Online leren,Online onderwijs,Spirituele groei,Geloof,Heilige Schrift,Bijbel,Bible Verses,Bible Quotes,Scripture Study,Online Learning,Educational Platform,Bible Education Platform,Bible Quizzes Platform,Interactive Quizzes,Learning Community,Spiritual Community,Online Community,Biblical Studies,Christian Community,Biblical Courses,Bible Training,Faith Education,Bible Insights,Biblical Insights,Biblical Wisdom,Christian Insights,Bible Trivia,Religious Trivia,Biblical Trivia,Bible Challenges,Learning Bible,Digital Bible Learning,Scripture Learning,Bible Tools,Bible Study Tools,Online Faith Courses,Digital Church,Modern Bible Study,Bible Curriculum,Bible Education Resources,Biblical Resources,Theology Courses,Online Theology,Church Education,Gospel,Online Gospel Studies,Spiritual Learning,Divine Wisdom,Holy Bible Studies,Scripture Education,Bible Community Platform,Christian Platform,Religious Learning Platform,Bible Knowledge Hub,Faith Community,Biblical Community,Bible Study Community,Bible Quiz App,Bible Learning App,Mobile Bible Courses,Mobile Bible Study,Digital Bible Courses,E-Learning Bible,Biblical E-Learning,Faith Based Learning,God’s Word,Divine Learning,Bible App,Christelijk platform,Bijbelse quizzen,Bijbel leren,Geloofscursus,Bijbelse trivia,Bijbelse uitdagingen,Online kerk,Bijbelse wijsheid"
        />

        {/* Canonical URL */}
        <link rel="canonical" href="https://bijbel-studie.com" />

        {/* Favicons and Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`antialiased bg-gray-100 ${inter.variable} ${merriweather.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PrefetchProvider>
            <div id="main-content" className="min-h-screen mx-auto w-full">
              {children}
            </div>
            {session?.user && (
              <OnboardingWrapper shouldShow={!session.user.onboardingCompleted} />
            )}
          </PrefetchProvider>
        </ThemeProvider>
        {/* Load External Scripts After Interactive */}
        <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" />
        <SpeedInsights />
      </body>
    </html>
  );
}
