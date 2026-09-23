import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

import { JsonLd } from "../../components/seo/JsonLd";
import { PLANS } from "../../lib/pricing";
import { absoluteUrl, BASE_URL, ORG_ID } from "../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode, faqNode } from "../../lib/seo/structuredData";
import { ABONNEMENT_FAQ } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('subscribe', lng);
}

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Abonnement", path: "/abonnement" },
];

/**
 * Prices come from lib/pricing.ts, the same module the page renders from, so
 * the structured data can never advertise an amount Stripe does not charge -
 * which is both a Google policy violation and an EU price-indication problem.
 *
 * The FAQPage node is built from ABONNEMENT_FAQ, the list page.tsx renders
 * visibly. It is the only FAQPage on this URL: the root layout's graph carries
 * Organization/WebSite/WebApplication and no FAQ.
 */
function pricingGraph() {
  const url = absoluteUrl("/abonnement");
  return graph(
    webPageNode({
      path: "/abonnement",
      name: "Prijzen en abonnement",
      description:
        "Wat gratis blijft en wat BijbelStudie Pro toevoegt: KingComments, begeleide studies en 5 AI-vragen per dag zijn gratis. Pro ontgrendelt Matthew Henry, Calvijn en Dachsel, 200 AI-vragen per dag en de volledige grondtekst.",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    {
      "@type": "Product",
      "@id": `${url}#product`,
      name: "BijbelStudie Pro",
      description:
        "De commentaren van Matthew Henry, Calvijn en Dachsel, 200 AI-vragen per dag en de volledige Hebreeuwse en Griekse grondtekst, boven op alles wat gratis blijft - inclusief KingComments.",
      brand: { "@id": ORG_ID },
      url,
      offers: [
        {
          "@type": "Offer",
          name: "Pro maandelijks",
          price: (PLANS.monthly.amountCents / 100).toFixed(2),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url,
          seller: { "@id": ORG_ID },
        },
        {
          "@type": "Offer",
          name: "Pro jaarlijks",
          price: (PLANS.annual.amountCents / 100).toFixed(2),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url,
          seller: { "@id": ORG_ID },
        },
        {
          "@type": "Offer",
          name: "Gratis",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: `${BASE_URL}/registreren`,
          seller: { "@id": ORG_ID },
        },
      ],
    },
    faqNode(ABONNEMENT_FAQ, url)
  );
}

/**
 * Providers and the pricing graph only - no chrome.
 *
 * The page now sits in the shared app shell (components/shell/AppShell.tsx),
 * the same sidebar-and-top-bar frame as /dashboard, /notities, /profiel and
 * every other converted route, rather than the immersive scene backdrop this
 * page used to draw for itself. A layout in the App Router can only ADD
 * chrome, never replace what a parent rendered, so AppShell is drawn by
 * `page.tsx` itself - the same shape as app/notities/layout.tsx and
 * app/dashboard/layout.tsx.
 *
 * This route is reachable signed OUT (a visitor arriving from search or a
 * paywall with no account yet) as well as signed in. AppShell already
 * supports that: TopBar renders "Inloggen" in place of the account controls
 * and Sidebar renders the guest footer instead of the account row - the same
 * as /lezen, which is deliberately open to a visitor without an account.
 */
export default async function SubscribeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `authOptions` is required, not optional. Without it NextAuth returns only
  // the default session ({name, email, image}) and skips the `session` callback
  // in lib/authOptions that attaches isAdmin, isSubscribed and studyStyle - so
  // any client-side check on those fields read undefined on this route, and a
  // Pro user rendered as not-Pro.
  const session = await getServerSession(authOptions);

  return (
    <>
      <JsonLd data={pricingGraph()} />
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </>
  );
}
