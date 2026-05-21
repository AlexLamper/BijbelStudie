import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { fallbackLng, cookieName } from "./app/i18n/settings";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|site.webmanifest|data).*)",
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

  const protectedRoutes = ["/study", "/dashboard", "/admin", "/notes", "/plans", "/profile", "/settings", "/resources", "/groepen"];
  if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return response;
}
