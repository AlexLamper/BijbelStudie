import type { Metadata } from "next"
import LandingPage from "../components/landing/LandingPage"
import { JsonLd } from "../components/seo/JsonLd"
import { HOME_FAQS } from "../lib/content/homeFaq"
import { HOW_IT_WORKS_STEPS } from "../lib/content/howItWorks"
import { BASE_URL, ogImageUrl, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, SITE_NAME, TWITTER_HANDLE, SITE_LOCALE } from "../lib/seo/constants"
import { graph, webPageNode, faqNode, howToNode } from "../lib/seo/structuredData"

const HOME_TITLE = "Bijbelstudie Online - Gratis de Bijbel Bestuderen | BijbelStudie"
const HOME_DESCRIPTION =
  "Online bijbelstudie in het Nederlands. Lees de Bijbel in vier Nederlandse vertalingen, bekijk bijbelcommentaren en de grondtekst, volg begeleide studies en stel je vragen aan een AI-assistent. Gratis beginnen, geen creditcard nodig."

const HOME_OG = ogImageUrl({
  title: "Bijbelstudie online",
  subtitle:
    "Vertalingen, commentaren, grondtekst, begeleide studies en een AI-assistent. Gratis beginnen.",
})

export const metadata: Metadata = {
  // `absolute` bypasses the "%s | BijbelStudie" template so the homepage title
  // is not brand-suffixed twice.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: `${BASE_URL}/`,
    languages: {
      "nl-NL": `${BASE_URL}/`,
      "x-default": `${BASE_URL}/`,
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: `${BASE_URL}/`,
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [{
      url: HOME_OG,
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
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [HOME_OG],
  },
}

/**
 * Prerendered, not rendered per request.
 *
 * Nothing on this page varies by visitor: the copy is fixed, the prices come
 * from lib/pricing at build time, and the studies list from lib/bookStudies.
 * The one thing that used to make it dynamic was a `getServerSession()` guard
 * redirecting a logged-in visitor to /dashboard - and middleware.ts already
 * does exactly that, before this page is ever reached
 * (`if (session && pathname === "/") redirect("/dashboard")`). The guard was
 * belt-and-braces over a belt that runs first and cannot be bypassed: the
 * middleware matcher covers "/".
 *
 * The cost of those braces was that the busiest public URL on the site - the
 * one every search result, every crawler and every first-time visitor lands on
 * - re-rendered the entire landing component in a serverless function on every
 * single hit. On Vercel's Fluid pricing that is Active CPU per visit, for HTML
 * that is byte-for-byte identical every time. Now it is built once.
 *
 * If middleware's `getToken` throws on a stale cookie it falls through without
 * redirecting, and that visitor sees this page - exactly as they did before,
 * because the guard below would have read the same unreadable cookie as null.
 */
export const dynamic = "force-static"

export default async function Page() {
  const homeUrl = `${BASE_URL}/`
  const pageGraph = graph(
    webPageNode({
      path: "/",
      name: HOME_TITLE,
      description: HOME_DESCRIPTION,
      primaryImage: HOME_OG,
    }),
    // FAQPage must describe text that is actually on the page - the accordion
    // renders every answer into the HTML (collapsed, not unmounted) so this
    // stays truthful.
    faqNode(HOME_FAQS, homeUrl),
    howToNode({
      name: "Zo begin je met online bijbelstudie",
      description:
        "In drie stappen van een leeg scherm naar bijbelstudie met commentaren, grondtekst en notities.",
      pageUrl: homeUrl,
      steps: HOW_IT_WORKS_STEPS.map(s => ({ name: s.title, text: s.desc })),
      totalTime: "PT20M",
    })
  )

  return (
    <>
      <JsonLd data={pageGraph} />
      <LandingPage />
    </>
  )
}
