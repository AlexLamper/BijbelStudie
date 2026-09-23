import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { fallbackLng, cookieName } from "./app/i18n/settings";
import { memberRedirectFor } from "./lib/memberRedirects";

export const config = {
  matcher: [
    // `og` and the crawler-facing files are excluded so a social crawler or
    // Googlebot never pays for a getToken() round-trip just to fetch an image
    // or robots.txt. `images/` is all static files from public/ (icons, the
    // touch icon Google reads for search results, photos) - no page lives there.
    "/((?!api|og|_next/static|_next/image|assets|favicon.ico|icon.svg|robots.txt|sitemap.xml|sitemap|sw.js|site.webmanifest|data|images/).*)",
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

  // Members never see the public reference pages (/bijbelboeken,
  // /bijbelboeken/<slug>, /bijbel/<slug>/<chapter>): each has a page inside
  // the app that does the same job - see lib/memberRedirects.ts for the table
  // and why each target. Guests and crawlers get the static page untouched.
  // 307, not 308: the public URL stays the canonical one, and a browser must
  // not remember the redirect for when the member signs out. Unknown slugs and
  // out-of-range chapters return null here and fall through to the 404.
  if (session) {
    const memberTarget = memberRedirectFor(pathname);
    if (memberTarget) {
      return NextResponse.redirect(new URL(memberTarget, req.url), 307);
    }
  }

  // Guest mode (Phase 1 MVP): a visitor who has already seen the landing page
  // once (marked by GUEST_SEEN_LANDING_COOKIE, set client-side when they leave
  // "/" for the app) skips straight past the marketing page on repeat visits -
  // there is no session yet, so the `session && pathname === "/"` redirect
  // above never fires for them.
  if (!session && pathname === "/" && req.cookies.get(GUEST_SEEN_LANDING_COOKIE)?.value === "1") {
    return NextResponse.redirect(new URL("/studies", req.url));
  }

  // Only /beheer is closed at the edge. Everything else is open to a guest:
  //
  //  - /studies is the crawlable SEO surface.
  //  - /studie and /lezen are the guest-mode shell: reading is client-side
  //    against static /data/*.json, a lesson can be stepped through without an
  //    account, and every account-bound WRITE underneath (AI chat, TTS,
  //    study-progress, enrollment) gates itself with requireUser() in its own
  //    API route.
  //  - /notities, /profiel, /instellingen, /groepen and /feedback used to be
  //    listed here and 307'd a guest to "/", which made every one of those
  //    links in the rail a dead end. Each of their LAYOUTS now reads the
  //    session itself and renders components/auth/GuestGate.tsx for a guest,
  //    so the page component never mounts without a session. Do not add a
  //    route back here without removing that guard, or the guard will never be
  //    reached; do not remove a guard without adding the route back here.
  //  - /dashboard is the one exception: its layout renders the real page for a
  //    guest too, degraded to a generic empty state (app/dashboard/layout.tsx).
  //
  // The old English entries (/study, /notes, /plans, ...) are long gone: after
  // the rename they prefix-matched nothing.
  const protectedRoutes = ["/beheer"];
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
