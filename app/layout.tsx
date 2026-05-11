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
  metadataBase: new URL("https://www.bijbel-studie.com"),
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  alternates: {
    canonical: "/",
  },
  title: {
    default: "BijbelStudie - Online Bijbelstudie & Digitale Bijbelcursussen",
    template: "%s | BijbelStudie",
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
    type: "website",
    locale: "nl_NL",
    url: "https://www.bijbel-studie.com",
    title: "BijbelStudie - Online Bijbelstudie & Bijbelcursussen",
    description: "Bijbel studie online met interactieve cursussen, commentaren en studiematerialen. Leer systematisch Gods Woord met BijbelStudie.",
    siteName: "BijbelStudie",
    images: [
      {
        url: "https://www.bijbel-studie.com/og-image.svg",
        width: 1200,
        height: 630,
        alt: "BijbelStudie - Online Bijbelstudie en Bijbelcursussen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BijbelStudie - Online Bijbelstudie",
    description: "Bijbel studie online - Interactieve cursussen, commentaren en studiematerialen voor serieuze bijbelstudenten.",
    images: ["https://www.bijbel-studie.com/og-image.svg"],
  },
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
    "@id": "https://www.bijbel-studie.com/#organization",
    url: "https://www.bijbel-studie.com",
    logo: "https://www.bijbel-studie.com/icon.svg",
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
      url: "https://www.bijbel-studie.com/contact",
    },
  };

  const webSiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://www.bijbel-studie.com/#website",
    url: "https://www.bijbel-studie.com",
    name: "BijbelStudie",
    publisher: {
      "@id": "https://www.bijbel-studie.com/#organization",
    },
  };

  return (
    <html lang={lng}>
      <head>
        <meta charSet="UTF-8" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteData) }}
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
