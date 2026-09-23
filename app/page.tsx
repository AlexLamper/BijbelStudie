import type { Metadata } from "next"
import LandingPage from "../components/landing/LandingPage"
import { reviewsDataFromSummary } from "../components/landing/ReviewsRow"
import { getStoreReviewSummary } from "../lib/storeReviews"
import { JsonLd } from "../components/seo/JsonLd"
import { HOME_FAQS } from "../lib/content/homeFaq"
import { BASE_URL, ogImageUrl, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, SITE_NAME, TWITTER_HANDLE, SITE_LOCALE } from "../lib/seo/constants"
import { graph, webPageNode, faqNode } from "../lib/seo/structuredData"

const HOME_TITLE = "Bijbelstudie Online - Gratis de Bijbel Bestuderen | BijbelStudie"
// Kept under ~155 characters: Google cuts a longer snippet off mid-sentence.
const HOME_DESCRIPTION =
  "Online bijbelstudie in het Nederlands: vier vertalingen, bijbelcommentaren, grondtekst, begeleide studies en een AI-assistent. Gratis, zonder creditcard."

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
 *
 * Built once, then rebuilt at most once an hour. The hero's trust row now
 * shows the real App Store average, which lives in MongoDB, so the HTML is no
 * longer identical forever - but it still must not cost a query per visitor.
 *
 * Both lines are needed. `revalidate` alone is NOT enough to stay static:
 * nothing in the landing tree reads cookies, but the root layout does - it
 * calls getServerSession() - and a route whose render reads the request is
 * rendered per request, try/catch or not. That is visible on the live site:
 * /bijbelboeken/[slug] has generateStaticParams but no `force-static`, and
 * every one of those pages is served `private, no-store`, rendered in a
 * function. Here that would mean a render AND a MongoDB query per visit.
 * `force-static` makes the layout's session read return nothing (the page is
 * the same for everyone - middleware already sends a signed-in visitor on to
 * /dashboard), and the explicit `revalidate` keeps the hourly rebuild, so the
 * rating is not frozen at deploy day.
 */
export const dynamic = "force-static"
export const revalidate = 3600

export default async function Page() {
  const homeUrl = `${BASE_URL}/`
  // Null before the first import, and null again if the database is
  // unreachable during a build (getStoreReviewSummary swallows that itself) -
  // in both cases the trust row renders nothing rather than a placeholder.
  const reviews = reviewsDataFromSummary(await getStoreReviewSummary())
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
    // Structured data must describe text that is on the page: the three-step
    // "hoe het werkt" section is gone (the lesson demo shows it instead), so
    // its HowTo node went with it. Google stopped showing HowTo rich results
    // in 2023, so nothing is lost.
    faqNode(HOME_FAQS, homeUrl)
  )

  return (
    <>
      <JsonLd data={pageGraph} />
      <LandingPage reviews={reviews} />
    </>
  )
}
