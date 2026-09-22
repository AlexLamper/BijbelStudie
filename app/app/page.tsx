import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../lib/appStore";

/**
 * /app - a bare bio-link landing page for TikTok/Instagram: "link in bio"
 * traffic that just wants the two store links, nothing else. Deliberately not
 * wrapped in PublicFrame (nav + marketing footer) or the immersive scene shell
 * - either would bury the two buttons a phone visitor came here for.
 *
 * noindex (see lib/pageMetadata.ts "appDownload"): two buttons and a tagline
 * is thin content, and nothing here would win a search query that "/" or
 * /studies doesn't already rank on.
 */
export const metadata: Metadata = generatePageMetadata("appDownload");
export const dynamic = "force-static";

/** Apple's mark. Inlined rather than an <img>: same path as the landing
 * page's App Store pill (components/landing/LandingPage.tsx), kept identical
 * so the two buttons a visitor might see on this domain never disagree. */
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" aria-hidden focusable="false" className={className} fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export default function AppDownloadPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-line-soft px-5 py-16 dark:bg-background">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/images/logo.svg"
          alt=""
          width={44}
          height={44}
          className="mx-auto"
          priority
        />

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
          Bijbel<span style={{ color: "#0D9488" }}>Studie</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[26rem] text-sm leading-relaxed text-ink-muted">
          Bijbelstudie, commentaren en de grondtekst - altijd bij de hand. Download de app en lees verder waar je gebleven was.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3">
          {/* Apple's own black pill, matching the hero CTA on "/" exactly. */}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download BijbelStudie in de App Store"
            data-track="app_page_appstore"
            className="press inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-black px-6 text-white no-underline transition-colors hover:bg-gray-800"
          >
            <AppleLogo className="h-6 w-6 shrink-0" />
            <span className="text-left leading-none">
              <span className="block text-[9px] font-medium opacity-80">
                Download voor iOS
              </span>
              <span className="block text-base font-semibold tracking-tight">
                App Store
              </span>
            </span>
          </a>

          {/* Android is not live yet - lib/appStore.ts PLAY_STORE_URL is null
              until the app ships there. Rendering a real button here as soon as
              that constant is filled in is the whole rollout; until then this
              stays a plain, non-clickable state rather than a dead or fake
              store link. */}
          {PLAY_STORE_URL ? (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download BijbelStudie in Google Play"
              data-track="app_page_playstore"
              className="press inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl px-6 text-white no-underline transition-colors"
              style={{ backgroundColor: "#0D9488" }}
            >
              <span className="text-left leading-none">
                <span className="block text-[9px] font-medium opacity-80">
                  Download voor Android
                </span>
                <span className="block text-base font-semibold tracking-tight">
                  Google Play
                </span>
              </span>
            </a>
          ) : (
            <div
              aria-disabled="true"
              className="inline-flex h-14 w-full flex-col items-center justify-center rounded-xl border border-line bg-surface px-6"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                Download voor Android
              </span>
              <span className="text-sm font-semibold text-ink-faint">
                Binnenkort in Google Play
              </span>
            </div>
          )}
        </div>

        <Link
          href="/"
          className="mt-10 inline-block text-sm font-semibold no-underline"
          style={{ color: "#0D9488" }}
        >
          Liever eerst rondkijken op bijbelstudie.io
        </Link>
      </div>
    </div>
  );
}
