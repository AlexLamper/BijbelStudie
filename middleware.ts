import { NextResponse } from "next/server";
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { fallbackLng, languages, cookieName } from "./app/i18n/settings";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|site.webmanifest|data).*)",
  ],
};

function getLocale(request: NextRequest): string {
  const savedLocale = request.cookies.get(cookieName)?.value;
  if (savedLocale && languages.includes(savedLocale)) {
    return savedLocale;
  }

  const acceptLanguageHeader = request.headers.get('accept-language');
  if (acceptLanguageHeader) {
    const headers = { 'accept-language': acceptLanguageHeader };
    const userLanguages = new Negotiator({ headers }).languages();
    const matchedLocale = match(userLanguages, languages, fallbackLng);
    return matchedLocale;
  }
  return fallbackLng;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "https://bijbel-studie.com");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  }

  const locale = getLocale(req);
  const response = NextResponse.next();

  if (!req.cookies.has(cookieName) || req.cookies.get(cookieName)?.value !== locale) {
    response.cookies.set(cookieName, locale, { 
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (session && pathname === `/`) {
    return NextResponse.redirect(new URL(`/study`, req.url));
  }
  
  if (!session && (pathname.startsWith("/study") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL(`/`, req.url));
  }

  return response;
}
