import type { Metadata } from "next";
import { Inter, Lora, Merriweather } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/providers/theme-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/authOptions";
import { OnboardingWrapper } from "../components/onboarding/onboarding-wrapper";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PrefetchProvider } from "../components/providers/prefetch-provider";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bijbel-studie.com"),
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/images/favicon.ico", type: "image/x-icon" }],
    shortcut: "/images/favicon.ico",
    apple: "/images/favicon.ico",
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
    "bijbelstudie", "bijbel studie", "bijbel studie online", "online bijbelstudie",
    "bijbel lezen", "bijbel studie app", "online bijbelcursussen", "bijbelcursus online",
    "bijbelcommentaren", "gids bijbelstudie", "leesplan bijbel", "bijbelboeken",
    "christelijk onderwijs", "bijbelse educatie", "theologie online", "bijbelkennis",
    "schriftstudie", "bijbelstudies", "bijbellessen", "bijbelcommunity",
    "bible study course", "Christian education", "biblical knowledge", "spiritual growth"
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
    description: "Bijbel studie online met interactieve cursussen, commentaren en studiematerialen.",
    siteName: "BijbelStudie",
    images: [{
      url: "https://www.bijbel-studie.com/og-image.svg",
      width: 1200,
      height: 630,
      alt: "BijbelStudie",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BijbelStudie - Online Bijbelstudie",
    description: "Bijbel studie online - Interactieve cursussen, commentaren en studiematerialen.",
    images: ["https://www.bijbel-studie.com/og-image.svg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Stale JWT cookies from old sessions can fail to decrypt — catch gracefully
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // non-critical — user will be treated as unauthenticated
  }
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.bijbel-studie.com/#organization",
    url: "https://www.bijbel-studie.com",
    logo: "https://www.bijbel-studie.com/images/favicon.ico",
    name: "BijbelStudie",
    alternateName: ["Bijbel Studie", "Bijbelstudie"],
    description: "BijbelStudie - Online bijbelstudie platform met interactieve bijbelcursussen, commentaren en leesplannen.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Klantenservice",
      url: "https://www.bijbel-studie.com/contact",
    },
  };

  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" href="/images/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
              <OnboardingWrapper shouldShow={!session.user.onboardingCompleted} />
            )}
          </PrefetchProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
