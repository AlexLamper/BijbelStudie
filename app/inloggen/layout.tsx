import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('signin', lng);
}

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
