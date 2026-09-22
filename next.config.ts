import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Lets a build run against its own output directory
  // (`NEXT_DIST_DIR=.next-verify next build`) so a verification build cannot
  // overwrite the chunks a running `next dev` is serving - which corrupts both
  // and shows up as "Cannot find module './1234.js'".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Every route is Dutch. These 308s keep old English URLs (and anything already
  // indexed or bookmarked) alive and pass their link equity to the new path.
  // A permanent redirect must never shadow a real route - /plans used to point at
  // /studies, which made the whole Leesplannen page unreachable from the sidebar.
  async redirects() {
    return [
      { source: "/admin",                 destination: "/beheer",                  permanent: true },
      { source: "/admin/users",           destination: "/beheer/gebruikers",       permanent: true },
      { source: "/admin/insights",        destination: "/beheer/inzichten",        permanent: true },
      { source: "/admin/:path*",          destination: "/beheer/:path*",           permanent: true },
      { source: "/study",                 destination: "/studie",                  permanent: true },
      { source: "/study/:path*",          destination: "/studie/:path*",           permanent: true },
      { source: "/read",                  destination: "/lezen",                   permanent: true },
      { source: "/read/:path*",           destination: "/lezen/:path*",            permanent: true },
      // /leesplannen was removed with the reading-plans feature, so these two
      // permanent redirects pointed at a 404 - exactly the failure the note
      // above warns about. Guided studies are what replaced them.
      { source: "/plans",                 destination: "/studies",                 permanent: true },
      { source: "/plans/:path*",          destination: "/studies",                 permanent: true },
      { source: "/leesplannen",           destination: "/studies",                 permanent: true },
      { source: "/leesplannen/:path*",    destination: "/studies",                 permanent: true },
      { source: "/notes",                 destination: "/notities",                permanent: true },
      { source: "/notes/:path*",          destination: "/notities/:path*",         permanent: true },
      { source: "/resources",             destination: "/hulpbronnen",             permanent: true },
      { source: "/resources/:path*",      destination: "/hulpbronnen/:path*",      permanent: true },
      { source: "/profile",               destination: "/profiel",                 permanent: true },
      { source: "/settings",              destination: "/instellingen",            permanent: true },
      { source: "/subscribe",             destination: "/abonnement",              permanent: true },
      { source: "/success",               destination: "/succes",                  permanent: true },
      { source: "/canceled",              destination: "/geannuleerd",             permanent: true },
      { source: "/community",             destination: "/groepen",                 permanent: true },
      { source: "/groups",                destination: "/groepen",                 permanent: true },
      { source: "/groups/:path*",         destination: "/groepen/:path*",          permanent: true },
      { source: "/auth/signin",           destination: "/inloggen",                permanent: true },
      { source: "/auth/register",         destination: "/registreren",             permanent: true },
      { source: "/auth/forgot-password",  destination: "/wachtwoord-vergeten",     permanent: true },
      { source: "/auth/reset-password",   destination: "/wachtwoord-herstellen",   permanent: true },
      { source: "/privacy-policy",        destination: "/privacybeleid",           permanent: true },
      { source: "/terms-of-service",      destination: "/algemene-voorwaarden",    permanent: true },
    ]
  },
  // Fixes "multiple lockfiles" workspace root warning
  outputFileTracingRoot: path.join(__dirname),
  // Licensed text lives in ./private (synced at build time by
  // scripts/sync-data.mjs, never in /public). Dynamic fs reads aren't
  // auto-traced, so every route that reads it through lib/local-data.ts must be
  // listed here or the files are missing at runtime. Bibles and commentaries
  // are split so a bible route doesn't carry KingComments' 46 MB.
  outputFileTracingIncludes: {
    "/api/bible/**": ["./private/data/bibles/**/*"],
    "/api/ai/**": ["./private/data/bibles/**/*"],
    "/api/v1/ai/**": ["./private/data/bibles/**/*"],
    "/api/v1/daytext": ["./private/data/bibles/**/*"],
    "/api/v1/daytext/history": ["./private/data/bibles/**/*"],
    "/api/v1/dashboard": ["./private/data/bibles/**/*"],
    "/api/v1/notifications/copy": ["./private/data/bibles/**/*"],
    "/api/v1/bibles/**": ["./private/data/bibles/**/*"],
    "/api/v1/search": ["./private/data/bibles/**/*"],
    "/api/v1/study-lesson-state": ["./private/data/bibles/**/*"],
    "/api/v1/study-progress": ["./private/data/bibles/**/*"],
    "/api/commentary": ["./private/data/commentaries/**/*"],
    "/api/v1/commentaries/**": ["./private/data/commentaries/**/*"],
    // Cross-reference shards are CC BY, so they live in ./public rather than
    // ./private - but the reason they are listed here is the same one: the
    // route builds its path at runtime, nothing static-analyses that, and an
    // untraced file is simply absent from the lambda. The website reads the
    // very same files straight off the CDN and needs no entry.
    "/api/v1/crossrefs/**": ["./public/data/crossrefs/v1/**/*"],
  },
  /**
   * Headers that affect Core Web Vitals or crawling. Nothing decorative here -
   * every entry either speeds up a repeat visit or tells a crawler something
   * it cannot infer.
   */
  async headers() {
    return [
      {
        // Fingerprinted build output never changes under the same URL.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // OG cards are a pure function of their query string.
        source: "/og",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Cross-reference shards. The website reads these directly, so this
        // header is the whole caching story for the web path - no function is
        // involved at all. The URL carries the dataset version (`/v1/`) and a
        // data change bumps it to `/v2/`, which is what makes a year on the
        // shared copy safe; the browser copy stays a day so a reader is never
        // more than that behind a corrected shard.
        source: "/data/crossrefs/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Loaded cross-origin by the external slideshow generator (canvas
        // needs CORS to export an image that contains it).
        source: "/images/appstore-badge.png",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          // HSTS: without it the first request to http:// still costs a
          // redirect hop, which shows up in field data as slower LCP.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  experimental: {
    // Icon and primitive barrels: an `import { X } from "lucide-react"` pulls
    // the whole barrel into the module graph, which is thousands of modules
    // per route in dev and a bigger client chunk in production. This rewrites
    // each named import to its own deep import at build time. Next already
    // does this for a handful of well-known packages; these are the ones this
    // app uses that are not on that list, plus the two that are, so the set is
    // explicit and survives a Next upgrade.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
    ],
  },
  images: {
    // AVIF first, WebP as fallback. Images are the largest LCP element on the
    // landing page and the study cards.
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75, 85, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
