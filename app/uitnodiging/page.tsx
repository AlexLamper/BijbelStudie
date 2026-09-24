import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { generatePageMetadata } from "../../lib/pageMetadata";
import SessionProvider from "../../components/providers/SessionProvider";
import InviteDetails from "./InviteDetails";

/**
 * /uitnodiging?code=ABCD2345 - where a shared invite link lands.
 *
 * Static on purpose: the code is read in the browser (InviteDetails), so a
 * link going round a group chat costs no server render per tap. The page does
 * not look the code up either - it never says who sent it, so nobody can find
 * out whose code is whose by guessing codes. Whether it is valid is decided
 * when the new account uses it (/api/v1/referral/claim).
 *
 * InviteDetails reads the session, and the root layout mounts no
 * SessionProvider, so the provider is mounted here - handed no session, the
 * same as app/help/page.tsx: a static render cannot read the cookie, so the
 * browser fetches the session and a signed-in visitor gets "Uitnodiging
 * gebruiken" once it is known. Without the provider `useSession()` returns
 * undefined in a production build, and the prerender of this page failed the
 * whole build.
 */
export const metadata: Metadata = generatePageMetadata("invite");
export const dynamic = "force-static";

export default function InvitePage() {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col items-center justify-center bg-line-soft px-5 py-16 dark:bg-background">
        <div className="w-full max-w-sm text-center">
          <Image src="/images/logo.svg" alt="" width={44} height={44} className="mx-auto" priority />
          <Suspense fallback={null}>
            <InviteDetails />
          </Suspense>
        </div>
      </div>
    </SessionProvider>
  );
}
