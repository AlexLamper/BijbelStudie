import { Metadata } from "next";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import SessionProvider from "../../components/providers/SessionProvider";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import AppShell from "../../components/shell/AppShell";
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

  // The shared app shell, the same frame as /abonnement where the checkout
  // started. Its sidebar and top bar read the session, and this route sits
  // under the root layout, which mounts no SessionProvider - so the provider is
  // mounted here, seeded from the server. `authOptions` is required: without it
  // NextAuth skips the `session` callback that attaches isAdmin/isSubscribed.
  // The shell is safe signed out (an "Inloggen" button, no redirect).
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      <AppShell title="Abonnement">
        <CanceledClient interval={interval === "annual" ? "annual" : "monthly"} />
      </AppShell>
    </SessionProvider>
  );
}
