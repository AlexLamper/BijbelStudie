import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

import { JsonLd } from "../../components/seo/JsonLd";
import { PLANS } from "../../lib/pricing";
import { absoluteUrl, BASE_URL, ORG_ID } from "../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../lib/seo/structuredData";
import SceneShell from "../../components/scene/SceneShell";
import { SCENE_TREE, sceneSvg } from "../../components/scene/scene-svg";

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

/**
 * Providers, the pricing graph, and the scene - no chrome of its own.
 *
 * The shell lives here rather than in the page because the page is a client
 * component and `scene-svg.ts` pulls in the tree generator, which has no
 * business in a browser bundle: rendered here on the server, the landscape is
 * in the HTML of the first paint and is what crawlers get. `backdrop` therefore
 * stays "static" - this route is reachable signed OUT (the page sends a visitor
 * with no account into /registreren and resumes the chosen plan afterwards), so
 * the reader-tree backdrop, which needs a guaranteed session, is not an option.
 *
 * The navbar and the rail both read the session and `components/layout/header`
 * pushes an unauthenticated visitor to the sign-in page, which would hijack a
 * pricing page mid-decision. They are shown only when the server already has a
 * session, which `SessionProvider` then seeds so the client never sees a
 * moment of "unauthenticated".
 *
 * The old `h-screen overflow-hidden` wrapper is gone: the depth engine in
 * components/scene/useSceneDepth.ts measures `window.scrollY`, so the DOCUMENT
 * has to be what scrolls.
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
  const signedIn = Boolean(session?.user);

  return (
    <>
      <JsonLd data={pricingGraph()} />
      <SessionProvider session={session}>
        <SidebarProvider>
          {/* `gateId` names the hero: the still SVG upgrades to the live canvas
              only while that screen is on view, and the loop stops past it. The
              "Je bent al Pro" branch has no such element, and SceneBackdrop
              leaves the SVG alone when the gate is not on the page. */}
          <SceneShell
            svg={sceneSvg()}
            {...SCENE_TREE}
            gateId="abonnement-hero"
            header={signedIn}
            rail={signedIn}
          >
            {children}
          </SceneShell>
        </SidebarProvider>
      </SessionProvider>
    </>
  );
}
