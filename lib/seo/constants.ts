/**
 * Single source of truth for every hard-coded SEO string on the site.
 *
 * Anything that ends up in a <link rel="canonical">, a sitemap entry or a
 * JSON-LD @id has to come from here - a mismatch between two hard-coded copies
 * of the origin is the classic way to get a page silently dropped from the
 * index.
 */

/**
 * Canonical origin. www is canonical; middleware 308s the apex onto it.
 *
 * This is the opposite of what you'd guess from how the domain is usually
 * written. Vercel's own edge-level domain redirect (Settings -> Domains, not
 * anything in this codebase) redirects the apex to www, and there is no way to
 * change that from the Vercel CLI - only the dashboard. Making www canonical
 * here matches what Vercel already does; the alternative was two redirects
 * pointing at each other, which is an infinite loop and exactly the
 * "redirected you too many times" error this fixed.
 */
export const BASE_URL = "https://www.bijbelstudie.io";

export const SITE_NAME = "BijbelStudie";

export const SITE_LOCALE = "nl_NL";
export const SITE_LANG = "nl-NL";

/**
 * Twitter/X handle used for `twitter:site`. Kept in one place so a rename does
 * not leave half the pages pointing at a dead account.
 */
export const TWITTER_HANDLE = "@BijbelStudieEdu";

/** Public contact address shown in Organization structured data. */
export const CONTACT_EMAIL = "info@bijbelstudie.io";

/**
 * Stable JSON-LD node ids. Using @id lets every page reference the same
 * Organization/WebSite node instead of re-declaring it, which is what lets
 * Google merge the graph across the whole domain.
 */
export const ORG_ID = `${BASE_URL}/#organization`;
export const WEBSITE_ID = `${BASE_URL}/#website`;

/**
 * Raster OG image. Facebook, LinkedIn, WhatsApp, Slack and X all refuse to
 * render an SVG og:image - the site previously pointed at og-image.svg, so
 * every share unfurled blank. This PNG is the static fallback; most pages get
 * a per-page image from /og instead.
 */
export const OG_IMAGE_FALLBACK = `${BASE_URL}/og_image.png`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * Logo used in Organization structured data. Google rejects .ico here and
 * wants a real raster image, so this points at the 512px PNG.
 */
export const ORG_LOGO = `${BASE_URL}/images/icon-512.png`;

/** Absolute URL for a per-page OG card rendered by app/og/route.tsx. */
export function ogImageUrl(opts: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}): string {
  const params = new URLSearchParams({ title: opts.title });
  if (opts.subtitle) params.set("subtitle", opts.subtitle);
  if (opts.eyebrow) params.set("eyebrow", opts.eyebrow);
  return `${BASE_URL}/og?${params.toString()}`;
}

/** Join the origin with a root-relative path without doubling the slash. */
export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) return `${BASE_URL}/${path}`;
  return path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`;
}
