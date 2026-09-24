import type { Metadata, Viewport } from "next";
import { Inter, Lora, Merriweather } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/providers/theme-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/authOptions";
import { OnboardingWrapper } from "../components/onboarding/onboarding-wrapper";
import { GuestOnboardingWrapper } from "../components/onboarding/guest-onboarding-wrapper";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Suspense } from "react";
import { PrefetchProvider } from "../components/providers/prefetch-provider";
import { StudyStyleProvider } from "../components/providers/study-style-provider";
import { LevensboomProvider } from "../components/providers/levensboom-provider";
import AnalyticsTracker from "../components/providers/AnalyticsTracker";
import GoogleAnalytics from "../components/providers/GoogleAnalytics";
import GuestProgressMigration from "../components/auth/GuestProgressMigration";
import ReferralClaim from "../components/referral/ReferralClaim";
import { JsonLd } from "../components/seo/JsonLd";
import EnvironmentBanner from "../components/layout/EnvironmentBanner";
import AppPromoBanner from "../components/layout/AppPromoBanner";
import { Toaster } from "../components/ui/toaster";
import ProOfferDialog from "../components/pricing/ProOfferDialog";
import CookieConsent from "../components/ui/CookieConsent";
import { APP_STORE_URL } from "../lib/appStore";
import { appStoreIdFromUrl } from "../lib/mobilePlatform";
import { appEnv } from "../lib/appEnv";
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

/** Safari on iOS turns this into its Smart App Banner (apple-itunes-app). */
const APP_STORE_ID = appStoreIdFromUrl(APP_STORE_URL);

const ROOT_OG_IMAGE = ogImageUrl({
  title: "Bijbelstudie online",
  subtitle:
    "Lees en bestudeer de Bijbel met commentaren, grondtekst, begeleide studies en een AI-assistent.",
});

/**
 * Explicit so the phone layout never depends on a framework default: the page
 * is laid out at the device width and starts unzoomed. No maximumScale - pinch
 * zoom stays available.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

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
  // Every icon, declared here and only here: there is deliberately no
  // app/favicon.ico / app/icon.* / app/apple-icon.* file convention (it adds a
  // second <link rel="icon"> with a misleading sizes="16x16", and a public file
  // on the same URL fails the build). One mark everywhere: the #262626 tile
  // with the #F9F9F9 cross of public/images/logo.svg, which is the App Store
  // icon's geometry. Google picks ANY of these for the search-result favicon
  // (it had picked a touch icon whose cross was shrunk to 62%), so none may
  // differ from the mark. The touch and maskable PNGs are that same mark full
  // bleed, because iOS and Android apply their own corner mask.
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
        sizes: "16x16 32x32 48x48 64x64 96x96 128x128 256x256",
      },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/images/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/images/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    // iOS ignores .ico for the home-screen icon and needs an opaque PNG.
    apple: [{ url: "/images/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
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
    "Bijbelstudie online in het Nederlands. Lees de Bijbel in meerdere vertalingen, bekijk bijbelcommentaren en de grondtekst, volg begeleide studies en stel je vragen aan een AI-assistent. Gratis te beginnen.",
  authors: [{ name: "BijbelStudie", url: BASE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  ...(APP_STORE_ID ? { itunes: { appId: APP_STORE_ID } } : {}),
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
      "Lees en bestudeer de Bijbel online: meerdere vertalingen, bijbelcommentaren, grondtekst, begeleide studies en een AI-assistent.",
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
      "Bijbelstudie online: vertalingen, commentaren, grondtekst, begeleide studies en een AI-assistent.",
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
        {/* No <meta charSet> or icon <link> here: Next already emits the
            charset, and `metadata.icons` above emits every icon - a second
            copy of each was duplicated in the head. */}
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
          enableSystem
          disableTransitionOnChange
          storageKey="bijbelstudie-theme-v2"
        >
          {/* Onboarding's guided-vs-self answer, handed to the client from the
              one render that always has the enriched session. The sidebar is a
              client component; reordering its nav after a fetch resolved made
              the menu visibly rearrange itself on load, so the order is decided
              here, before the HTML is sent. See study-style-provider.tsx. */}
          <StudyStyleProvider initial={session?.user?.studyStyle}>
            <PrefetchProvider>
              {/* The reader's Levensboom, fetched once per page load for the
                  navbar, the profile, the studio and the lesson card alike.
                  Idle when nobody is signed in. See levensboom-provider.tsx. */}
              <LevensboomProvider enabled={Boolean(session?.user)} userKey={session?.user?.email ?? null}>
                {/* Page views and clicks for /beheer/inzichten. Renders nothing and
                    never blocks - see components/providers/AnalyticsTracker.tsx. */}
                <Suspense fallback={null}>
                  <AnalyticsTracker />
                </Suspense>
                <div id="main-content" className="min-h-screen mx-auto w-full">
                  {children}
                </div>
                {session?.user ? (
                  <>
                    {/* Everything the reader did as a guest, replayed onto the
                        account they just made. Renders nothing and fetches
                        nothing when this browser has no guest lessons - see
                        components/auth/GuestProgressMigration.tsx. */}
                    <GuestProgressMigration />
                    {/* An invite code this browser kept from /uitnodiging, used
                        once there is an account. Renders nothing - see
                        components/referral/ReferralClaim.tsx. */}
                    <ReferralClaim />
                    {/* The first-run questions - and, before them, the
                        handover of whatever this browser answered while it was
                        still a guest, so nobody is asked the same five things
                        twice. See components/onboarding/onboarding-wrapper.tsx. */}
                    <OnboardingWrapper shouldShow={!session.user.onboardingCompleted} />
                  </>
                ) : (
                  // The same first-run flow, for a visitor without an
                  // account: same questions, answers kept in this browser until
                  // there is an account to move them to - see
                  // components/onboarding/guest-onboarding-wrapper.tsx. Idle on
                  // the marketing, pricing, legal and auth pages.
                  <GuestOnboardingWrapper />
                )}
              </LevensboomProvider>
            </PrefetchProvider>
          </StudyStyleProvider>
        </ThemeProvider>
        {/* Renders nothing in production. On a preview it names the branch and
            the database, so a test deployment can never be mistaken for the
            live site. */}
        <EnvironmentBanner />
        {/* Phone browsers Safari's Smart App Banner does not reach (Chrome on
            iOS, in-app browsers). Client-only, renders nothing on desktop -
            see components/layout/AppPromoBanner.tsx. */}
        <AppPromoBanner />
        {/* Draws every `toast(...)` from hooks/use-toast.ts. Top of the screen
            on a phone, so it never lands on the promo banner or the tab bar;
            bottom-right from md up - see components/ui/toast.tsx. */}
        <Toaster />
        {/* The Pro offer (free trial or upgrade), raised by a paywall through
            lib/proOffer.ts - never on its own. Renders nothing until then. */}
        <ProOfferDialog />
        {/* Asks once, remembers the answer, and gates the usage statistics in
            lib/analytics.ts behind it. Renders nothing until mounted, nothing
            once answered, and nothing inside the /studie flow - see
            components/ui/CookieConsent.tsx. */}
        <CookieConsent />
        {/* Google Analytics, behind the same "Accepteren" and only on the live
            site - previews and local dev would pollute the property. Nothing is
            downloaded before consent; see lib/googleAnalytics.ts. */}
        <GoogleAnalytics enabled={appEnv() === "production"} />
        <SpeedInsights />
      </body>
    </html>
  );
}
