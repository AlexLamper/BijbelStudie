import type { Metadata } from "next";
import { BrandIcon } from "../../components/ui/BrandIcon";
import Image from "next/image";
import Link from "next/link";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../lib/appStore";

/**
 * /app - the bio link for TikTok/Instagram. Phones and desktops never see this
 * page: middleware.ts redirects them (lib/mobilePlatform.ts appLinkTarget) -
 * an iPhone to the App Store, an Android phone to Google Play since 17 October
 * 2026, everything else to "/". It is what link-preview bots, `?toon=1` and an
 * empty user agent get, so shared links keep a proper "Download de app" card.
 * Deliberately not wrapped in PublicFrame (nav + marketing footer) or the
 * immersive scene shell - either would bury the two buttons a phone visitor
 * came here for.
 *
 * noindex (see lib/pageMetadata.ts "appDownload"): two buttons and a tagline
 * is thin content, and nothing here would win a search query that "/" or
 * /studies doesn't already rank on.
 */
export const metadata: Metadata = generatePageMetadata("appDownload");
export const dynamic = "force-static";

export default function AppDownloadPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-line-soft px-5 py-16 dark:bg-background">
      <div className="w-full max-w-sm text-center">
        <BrandIcon
          src="/images/logo.svg"
          size={44}
          className="mx-auto block"
          priority
        />

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
          Bijbel<span style={{ color: "#0D9488" }}>Studie</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[26rem] text-sm leading-relaxed text-ink-muted">
          Bijbelstudie, commentaren en de grondtekst - altijd bij de hand. Download de app en lees verder waar je gebleven was.
        </p>

        {/* The two stores' own badges, the same artwork and the same widths as
            the hero on "/" (components/landing/LandingPage.tsx), so the two
            surfaces a visitor might see on this domain never disagree. Apple's
            is 800x238 and the Play badge is trimmed of its transparent margin
            to 646x192, the same 3.36 ratio, so one width renders both at one
            height. Stacked, not side by side: a phone arriving from a bio link
            hits one full-size target more easily than two half-size ones. */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download BijbelStudie in de App Store"
            data-track="app_page_appstore"
            className="press block no-underline"
          >
            <Image
              src="/images/hero/app-store-badge.png"
              alt="Download in de App Store"
              width={800}
              height={238}
              priority
              className="block h-auto w-[220px]"
            />
          </a>

          {/* Live since 17 October 2026. The constant stays nullable for
              lib/mobilePlatform.ts, so this is still a conditional rather than
              an unconditional link to a `string | null`. */}
          {PLAY_STORE_URL && (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download BijbelStudie in Google Play"
              data-track="app_page_playstore"
              className="press block no-underline"
            >
              <Image
                src="/images/hero/play-store-badge.png"
                alt="Ontdek het op Google Play"
                width={646}
                height={192}
                priority
                className="block h-auto w-[220px]"
              />
            </a>
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
