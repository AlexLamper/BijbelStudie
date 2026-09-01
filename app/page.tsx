import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../lib/authOptions"
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

export default async function Page() {
  // Server-side guard: logged-in users skip the marketing landing entirely.
  // Middleware already redirects, but this prevents any chance of the landing
  // page HTML being rendered for an authenticated session.
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // ignore - treat as unauthenticated
  }
  if (session?.user) {
    redirect("/dashboard")
  }

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
