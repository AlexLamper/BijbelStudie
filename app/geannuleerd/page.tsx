import { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import CanceledClient from "./CanceledClient";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('canceled', lng);
}

export default async function CanceledPage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string }>;
}) {
  // Stripe's cancel_url carries the interval the user backed out of, which is
  // the only thing that distinguishes an abandoned monthly from an abandoned
  // annual in the funnel.
  const { interval } = await searchParams;
  return <CanceledClient interval={interval === "annual" ? "annual" : "monthly"} />;
}
