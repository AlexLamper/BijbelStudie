import type { Metadata } from "next";
import { Inter, Lora, Merriweather } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/providers/theme-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/authOptions";
import { OnboardingWrapper } from "../components/onboarding/onboarding-wrapper";
import { GuidedTourLauncher } from "../components/onboarding/guided-tour";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PrefetchProvider } from "../components/providers/prefetch-provider";
import { JsonLd } from "../components/seo/JsonLd";
import {
  BASE_URL,
  SITE_NAME,
  SITE_LOCALE,
  TWITTER_HANDLE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  ogImageUrl,
} from "../lib/seo/constants";
import {
  graph,
  organizationNode,
  websiteNode,
  softwareApplicationNode,
} from "../lib/seo/structuredData";
import { PLANS } from "../lib/pricing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

const ROOT_OG_IMAGE = ogImageUrl({
  title: "Bijbelstudie online",
  subtitle:
    "Lees en bestudeer de Bijbel met commentaren, grondtekst, leesplannen en een AI-assistent.",
});

/**
 * Site-wide defaults. Individual routes override title/description/canonical
 * through lib/pageMetadata.ts - a route that does NOT do so inherits the
 * canonical below and competes with the homepage for the same URL, so every
 * public route must supply its own.
 */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  manifest: "/site.webmanifest",
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/images/favicon.ico", type: "image/x-icon" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/images/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/images/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/images/favicon.ico",
    // iOS ignores .ico for the home-screen icon and needs a PNG.
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180" }],
  },
  alternates: {
    canonical: "/",
    languages: {
      // Dutch-only site: a self-referencing nl-NL plus x-default tells Google
      // there is no other language version to look for.
      "nl-NL": `${BASE_URL}/`,
      "x-default": `${BASE_URL}/`,
    },
  },
  title: {
    default: "BijbelStudie - Online Bijbelstudie, Gratis Beginnen",
    template: "%s | BijbelStudie",
  },
  description:
    "Bijbelstudie online in het Nederlands. Lees de Bijbel in meerdere vertalingen, bekijk bijbelcommentaren en de grondtekst, volg leesplannen en stel je vragen aan een AI-assistent. Gratis te beginnen.",
  authors: [{ name: "BijbelStudie", url: BASE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  // Paste the token from Search Console -> Instellingen -> Eigendomsverificatie
  // -> HTML-tag into GOOGLE_SITE_VERIFICATION. Left out entirely when unset so
  // an empty content="" tag never ships.
  ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.GOOGLE_SITE_VERIFICATION
            ? { google: process.env.GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.BING_SITE_VERIFICATION
            ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
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
    locale: SITE_LOCALE,
    url: `${BASE_URL}/`,
    title: "BijbelStudie - Online Bijbelstudie, Gratis Beginnen",
    description:
      "Lees en bestudeer de Bijbel online: meerdere vertalingen, bijbelcommentaren, grondtekst, leesplannen en een AI-assistent.",
    siteName: SITE_NAME,
    images: [{
      url: ROOT_OG_IMAGE,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: "BijbelStudie - online bijbelstudie",
      type: "image/png",
    }],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: "BijbelStudie - Online Bijbelstudie",
    description:
      "Bijbelstudie online: vertalingen, commentaren, grondtekst, leesplannen en een AI-assistent.",
    images: [ROOT_OG_IMAGE],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Stale JWT cookies from old sessions can fail to decrypt - catch gracefully
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // non-critical - user will be treated as unauthenticated
  }
  // Site-wide entity graph. Declared once here and referenced by @id from every
  // page-level graph, so Google resolves one Organization and one WebSite for
  // the whole domain instead of a different copy per URL. The Organization
  // logo must be a raster image - Google rejects the .ico this used to point at.
  const siteGraph = graph(
    organizationNode(),
    websiteNode(),
    softwareApplicationNode({
      monthlyPrice: PLANS.monthly.amountCents / 100,
      annualPrice: PLANS.annual.amountCents / 100,
      currency: "EUR",
    })
  );

  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" href="/images/favicon.ico" sizes="any" />
        {/* No preconnect to fonts.googleapis.com / fonts.gstatic.com: the three
            faces above come from next/font/google, which downloads them at
            build time and serves them from this origin. Those hosts are never
            contacted at runtime, so the hints only cost two DNS lookups and
            TLS handshakes that go nowhere. */}
        <JsonLd data={siteGraph} />
      </head>
      <body className={`antialiased bg-background ${inter.variable} ${lora.variable} ${merriweather.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="bijbelstudie-theme-v2"
        >
          <PrefetchProvider>
            <div id="main-content" className="min-h-screen mx-auto w-full">
              {children}
            </div>
            {session?.user && (
              <>
                <OnboardingWrapper shouldShow={!session.user.onboardingCompleted} />
                {/* Numbered first-time tour: launches after a tiny delay if
                    localStorage flag isn't set. Won't fight the OnboardingModal
                    because the launcher's setTimeout starts immediately but
                    the modal blocks interaction until dismissed. */}
                <GuidedTourLauncher canShow={!!session.user.onboardingCompleted} tourCompleted={!!session.user.tourCompleted} isSubscribed={!!session.user.isSubscribed} />
              </>
            )}
          </PrefetchProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
