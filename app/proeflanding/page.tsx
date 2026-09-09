import type { Metadata } from "next"
import { Footer } from "../../components/landing/footer"
import { LANDING_SEED, SCENE_LEVEL, sceneSvg } from "../../components/landing/proef/content"
import HeroStage from "../../components/landing/proef/HeroStage"
import {
  ClosingSection,
  LessonSection,
  OverviewSection,
  PricingSection,
} from "../../components/landing/proef/PageSections"
import SceneShell from "../../components/landing/proef/SceneShell"

/**
 * A second landing page, for comparison only.
 *
 * The live landing page at app/page.tsx is untouched and keeps working exactly
 * as it does today; this route stages the same product in the visual language
 * of the dashboard design that was just accepted and promoted onto /dashboard
 * (components/scene/): one fixed,
 * full-bleed scene that never moves, content travelling over it in layers,
 * literal scrims doing the contrast work, dark glass panels, and #2DD4BF as the
 * accent on dark against #0D9488 as the brand fill.
 *
 * Reachable signed out, and never indexed. It is deliberately NOT in
 * app/sitemap.ts and NOT in lib/pageMetadata.ts - that file is the canonical-URL
 * source of truth and the sitemap derives from it, so a design experiment must
 * not appear in either. `robots` below is what keeps it out of the index;
 * middleware.ts is untouched, which is what keeps it reachable without a
 * session.
 */
export const metadata: Metadata = {
  title: "Proeflanding",
  robots: { index: false, follow: false },
}

/**
 * Prerendered, exactly like app/page.tsx and for the same reason: nothing here
 * varies by visitor. The copy is fixed, the prices come from lib/pricing at
 * build time, the studies from the catalogue, and the scene is one SVG string
 * generated from a fixed seed. There is no session read anywhere on this route,
 * so there is nothing for a serverless function to do per request.
 *
 * It also means the whole scene - the picture a visitor waits for - is computed
 * once at build and shipped as HTML.
 */
export const dynamic = "force-static"

export default function ProeflandingPage() {
  return (
    <SceneShell sceneSvg={sceneSvg()} seed={LANDING_SEED} level={SCENE_LEVEL}>
      {/* Four short sections under the hero, and then the footer. The scene is
          the design: everything here is either type on it behind a scrim or one
          panel of the same dark glass the dashboard uses. The library ledger,
          the study cards, the plan matrix, the FAQ accordion and both live
          demos were cut - a landing page owes a visitor what this is, a few
          things that are concretely true, the price and one way in. The rest is
          one click away on the pages that exist for it. */}
      <main>
        <HeroStage />
        <OverviewSection />
        <LessonSection />
        <PricingSection />
        <ClosingSection />
      </main>
      {/* The footer is the one solid ground on the page: the scene runs behind
          everything above it and stops here. Reused unchanged - it is already
          drawn for a dark surface. */}
      <div className="relative z-10">
        <Footer />
      </div>
    </SceneShell>
  )
}
