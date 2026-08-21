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

const SESSION_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host");

  if (host === "bijbel-studie.com") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.host = "www.bijbel-studie.com";
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "https://www.bijbel-studie.com");
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

  // Dutch route names. The old English entries (/study, /notes, /plans, ...) no
  // longer prefix-matched anything after the rename, so those pages were open.
  // /studies and /hulpbronnen stay public on purpose: they are the crawlable
  // SEO surface (pro content inside /hulpbronnen/:slug is gated server-side).
  const protectedRoutes = [
    "/studie", "/lezen", "/dashboard", "/admin", "/notities",
    "/leesplannen", "/profiel", "/instellingen", "/groepen", "/feedback",
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
