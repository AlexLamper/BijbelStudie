import type { Metadata } from "next";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { JsonLd } from "../../components/seo/JsonLd";
import { CONTACT_EMAIL, absoluteUrl } from "../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode } from "../../lib/seo/structuredData";

/**
 * /contact had no metadata at all, so it inherited the root layout's
 * `alternates.canonical: "/"` and told Google it was a duplicate of the
 * homepage. This layout gives it its own canonical.
 */
export const metadata: Metadata = generatePageMetadata("contact");

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const url = absoluteUrl("/contact");
  const pageGraph = graph(
    {
      ...webPageNode({
        path: "/contact",
        name: "Contact",
        description:
          "Neem contact op met het team van BijbelStudie over de app, je account of je abonnement.",
        type: "ContactPage",
        breadcrumbId: `${url}#breadcrumb`,
      }),
      mainEntity: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        availableLanguage: ["Dutch", "nl"],
      },
    },
    breadcrumbNode(CRUMBS, url)
  );

  return (
    <>
      <JsonLd data={pageGraph} />
      {children}
    </>
  );
}
