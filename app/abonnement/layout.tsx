import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { Header } from "../../components/layout/header";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

import { JsonLd } from "../../components/seo/JsonLd";
import { PLANS } from "../../lib/pricing";
import { absoluteUrl, BASE_URL, ORG_ID } from "../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../lib/seo/structuredData";

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
 */
function pricingGraph() {
  const url = absoluteUrl("/abonnement");
  return graph(
    webPageNode({
      path: "/abonnement",
      name: "Prijzen en abonnement",
      description:
        "BijbelStudie is gratis te gebruiken, inclusief het KingComments-commentaar. Pro ontgrendelt Matthew Henry, Dachsel en Meyer, 200 AI-vragen per dag en de volledige grondtekst.",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    {
      "@type": "Product",
      "@id": `${url}#product`,
      name: "BijbelStudie Pro",
      description:
        "De commentaren van Matthew Henry, Dachsel en Meyer, 200 AI-vragen per dag en de volledige Hebreeuwse en Griekse grondtekst, boven op alles wat gratis blijft - inclusief KingComments.",
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
    }
  );
}



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
    <div className="antialiased bg-background h-screen flex flex-col overflow-hidden">
      <JsonLd data={pricingGraph()} />
      <SessionProvider session={session}>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <Header />
            <div className="flex-1 min-h-0 overflow-y-auto">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </SessionProvider>
    </div>
  );
}



