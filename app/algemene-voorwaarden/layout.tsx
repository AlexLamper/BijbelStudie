import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

/**
 * Prerendered: the terms are the same for everyone. Under force-static the
 * language cookie reads as absent, so the metadata falls back to Dutch - the
 * only language the site ships.
 */
export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('termsOfService', lng);
}

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
