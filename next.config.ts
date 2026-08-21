import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Every route is Dutch. These 308s keep old English URLs (and anything already
  // indexed or bookmarked) alive and pass their link equity to the new path.
  // A permanent redirect must never shadow a real route - /plans used to point at
  // /studies, which made the whole Leesplannen page unreachable from the sidebar.
  async redirects() {
    return [
      { source: "/study",                 destination: "/studie",                  permanent: true },
      { source: "/study/:path*",          destination: "/studie/:path*",           permanent: true },
      { source: "/read",                  destination: "/lezen",                   permanent: true },
      { source: "/read/:path*",           destination: "/lezen/:path*",            permanent: true },
      { source: "/plans",                 destination: "/leesplannen",             permanent: true },
      { source: "/plans/:path*",          destination: "/leesplannen/:path*",      permanent: true },
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
  // Restricted Bible data lives in ./private (synced at build time, never in
  // /public). Dynamic fs reads aren't auto-traced, so force-include it into the
  // bible API serverless bundles or the files would be missing at runtime.
  outputFileTracingIncludes: {
    "/api/bible/**": ["./private/**/*"],
    // The AI chat route reads chapter text via getChapter() from ./private too.
    "/api/ai/**": ["./private/**/*"],
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
