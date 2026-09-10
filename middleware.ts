import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { fallbackLng, cookieName } from "./app/i18n/settings";

export const config = {
  matcher: [
    // `og` and the crawler-facing files are excluded so a social crawler or
    // Googlebot never pays for a getToken() round-trip just to fetch an image
    // or robots.txt.
    "/((?!api|og|_next/static|_next/image|assets|favicon.ico|icon.svg|robots.txt|sitemap.xml|sitemap|sw.js|site.webmanifest|data).*)",
  ],
};

// Set client-side (see components/landing/LandingPage.tsx) once a guest
// leaves "/" for the app. Not httpOnly: the landing page itself needs to set
// it from the browser at the moment of navigation, and it carries no
// sensitive data - tampering with it only ever skips a marketing page, never
// grants access to anything gated.
export const GUEST_SEEN_LANDING_COOKIE = "bs_seen_landing";

const SESSION_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host");

  // www is canonical - see the comment on BASE_URL in lib/seo/constants.ts for
  // why this is the opposite of the apex->www pattern you'd expect. This must
  // stay consistent with Vercel's own domain-level redirect (Settings ->
  // Domains), which is not visible or changeable from this codebase: Vercel
  // already redirects the apex to www at the edge, before this middleware ever
  // runs, so redirecting www back to the apex here created an infinite loop
  // ("redirected you too many times") rather than a real host mismatch.
  if (host === "bijbelstudie.io") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.host = "www.bijbelstudie.io";
    return NextResponse.redirect(redirectUrl, 308);
  }

  // The domain moved from bijbel-studie.com to bijbelstudie.io. Both old hosts
  // still resolve (Hostinger DNS + Vercel keep serving this same deployment
  // under them) and must 301/308 straight to the new domain - not just to
  // themselves - because that single-hop redirect is what Search Console's
  // Change of Address tool requires before it will transfer ranking signals,
  // and what carries an existing visitor's or search result's link equity
  // across. Redirects straight to www (the canonical host, see above) rather
  // than the apex, so this never has to bounce through Vercel's apex->www
  // redirect as a second hop. 301 rather than 308: the redirect target's
  // method may as well always be GET, and 301 is what Google's migration
  // tooling explicitly checks for.
  if (host === "bijbel-studie.com" || host === "www.bijbel-studie.com") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.protocol = "https";
    redirectUrl.host = "www.bijbelstudie.io";
    return NextResponse.redirect(redirectUrl, 301);
  }

  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "https://www.bijbelstudie.io");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  }

  // Always set Dutch
  const response = NextResponse.next();
  if (req.cookies.get(cookieName)?.value !== fallbackLng) {
    response.cookies.set(cookieName, fallbackLng, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  // Decode token - auto-clear stale/corrupt cookies instead of looping errors
  let session = null;
  try {
    session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch {
    // Stale JWT cookie (wrong secret or old format) - clear it automatically
    const clearResponse = NextResponse.next();
    for (const name of SESSION_COOKIES) {
      clearResponse.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    clearResponse.cookies.set(cookieName, fallbackLng, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return clearResponse;
  }

  if (session && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Guest mode (Phase 1 MVP): a visitor who has already seen the landing page
  // once (marked by GUEST_SEEN_LANDING_COOKIE, set client-side when they leave
  // "/" for the app) skips straight past the marketing page on repeat visits -
  // there is no session yet, so the `session && pathname === "/"` redirect
  // above never fires for them.
  if (!session && pathname === "/" && req.cookies.get(GUEST_SEEN_LANDING_COOKIE)?.value === "1") {
    return NextResponse.redirect(new URL("/lezen", req.url));
  }

  // Dutch route names. The old English entries (/study, /notes, /plans, ...) no
  // longer prefix-matched anything after the rename, so those pages were open.
  // /studies and /hulpbronnen stay public on purpose: they are the crawlable
  // SEO surface (pro content inside /hulpbronnen/:slug is gated server-side).
  //
  // /studie and /lezen are deliberately NOT in this list (Phase 1 guest mode):
  // reading is fully client-side against static /data/*.json, and every
  // account-bound action underneath it (AI chat, TTS, study-progress writes,
  // guided-study enrollment) already gates itself server-side via
  // requireUser()/getServerSession() in its own route or page - so an
  // anonymous visitor gets the reading/study *shell* here and hits a real
  // 401 or an /inloggen redirect only where an account is actually needed.
  const protectedRoutes = [
    "/dashboard", "/admin", "/notities",
    "/profiel", "/instellingen", "/groepen", "/feedback",
  ];
  // Match the route itself or a path segment under it - never a bare prefix.
  // `"/studies".startsWith("/studie")` is true, so the plain prefix test sent
  // every anonymous visitor (and Googlebot) on /studies back to "/", which is
  // exactly what the comment above says must not happen.
  const isProtected = protectedRoutes.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (!session && isProtected) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return response;
}
