import type { MetadataRoute } from "next";
import { BASE_URL } from "../lib/seo/constants";

/**
 * Generated rather than a static robots.txt so the sitemap URL and the host can
 * never drift from lib/seo/constants.
 *
 * Rules of thumb applied here:
 * - Only disallow what genuinely must not be crawled. Every extra Disallow is
 *   a chance to accidentally block a page that should rank.
 * - No blanket `Allow:` lines. Allow is the default; listing paths explicitly
 *   adds nothing and creates a second place to forget to update.
 * - Robots.txt controls crawling, not indexing. A URL that must stay out of the
 *   index needs `noindex` in its metadata (lib/pageMetadata.ts does this) - and
 *   a page blocked here can still be indexed URL-only from external links,
 *   which is why the auth-protected routes carry noindex as well.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    "/admin",
    "/inloggen",
    "/registreren",
    "/wachtwoord-vergeten",
    "/wachtwoord-herstellen",
    "/dashboard",
    // Anchored: a bare "/studie" would also block the public /studies page.
    // Googlebot and Bingbot both honour "$" as an end-of-URL anchor; a crawler
    // that does not simply matches nothing here, which fails safe.
    "/studie$",
    "/studie?",
    // The guided flow: /studie/<studyId>/<day>. Neither anchor above matches a
    // sub-path, so without this the lesson pages are crawlable but redirect to
    // sign-in, which Search Console reports as "Pagina met omleiding".
    "/studie/",
    "/lezen",
    "/notities",
    "/profiel",
    "/instellingen",
    "/groepen",
    "/feedback",
    "/succes",
    "/geannuleerd",
    "/preview/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      {
        // The OG card endpoint lives at /og and must stay fetchable: a blocked
        // og:image is a blank unfurl on every social platform.
        userAgent: "Googlebot-Image",
        allow: ["/og", "/images/", "/_next/image"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
