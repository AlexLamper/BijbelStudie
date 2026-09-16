import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { LIBRARY } from "./library"
import LibraryBrowser from "./LibraryBrowser"
import Breadcrumbs from "./Breadcrumbs"
import { BTN_PRIMARY, BTN_SECONDARY, EYEBROW } from "./tokens"
import AppShell from "../../components/shell/AppShell"
import { Card } from "../../components/kit/primitives"
import { JsonLd } from "../../components/seo/JsonLd"
import { absoluteUrl } from "../../lib/seo/constants"
import {
  graph,
  webPageNode,
  breadcrumbNode,
  itemListNode,
} from "../../lib/seo/structuredData"

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Hulpbronnen", path: "/hulpbronnen" },
]

/**
 * Built here rather than in layout.tsx: that layout also wraps
 * /hulpbronnen/:slug, and these nodes describe the list page specifically.
 * The value is constant, so it is computed once at module scope instead of on
 * every render.
 */
const RESOURCES_GRAPH = (() => {
  const url = absoluteUrl("/hulpbronnen")
  return graph(
    webPageNode({
      path: "/hulpbronnen",
      name: "Hulpbronnen: gratis bijbelstudieboeken",
      description:
        "Een groeiende bibliotheek met gratis, publiek-domein bijbels, bijbelcommentaren, prekenbundels en dogmatische werken.",
      type: "CollectionPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    itemListNode({
      pageUrl: url,
      name: "Bibliotheek",
      // Paywalled items are listed because they are visible in this list;
      // only their own detail pages carry noindex.
      items: LIBRARY.map(item => ({
        name: item.title,
        path: `/hulpbronnen/${item.slug}`,
        description: item.description,
      })),
    })
  )
})()

/**
 * The library, in the shared app shell.
 *
 * A server component: the structured data, the trail, the heading, the intro
 * and the onward links are in the HTML a crawler receives rather than something
 * hydration makes. The search field, the filters and the shelf they narrow live
 * in LibraryBrowser - the same split as app/studies/page.tsx.
 *
 * The page's own `h1` stays "Hulpbronnen voor bijbelstudie", the heading this
 * route has always ranked on. The top bar's title is the short section name.
 */
export default function ResourcesPage() {
  return (
    <AppShell title="Hulpbronnen" ownHeading>
      <JsonLd data={RESOURCES_GRAPH} />

      <Breadcrumbs crumbs={CRUMBS} />

      <header className="mt-5 max-w-[46rem]">
        <p className={EYEBROW}>Bibliotheek</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Hulpbronnen voor bijbelstudie
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Een groeiende collectie van {LIBRARY.length} gratis, publiek-domein Bijbels, prekenbundels,
          bijbelcommentaren en dogmatische werken. Direct in de app leesbaar of openbaar te
          raadplegen bij de bron.
        </p>
      </header>

      <LibraryBrowser
        notice={
          /* The rights notice. Its wording is the licence talking and is not
             ours to edit - the per-source notes live in library.ts. */
          <Card className="flex items-start gap-3 p-4">
            {/* Identifies what the notice is about, not decoration. */}
            <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" />
            <p className="m-0 text-[13.5px] leading-relaxed text-ink-body">
              <strong className="font-semibold text-ink">Vrij beschikbaar.</strong> Alle werken in deze bibliotheek
              zijn publiek domein of vrij raadpleegbaar bij hun bron (DBNL, Project Gutenberg, universitaire repositories).
              We hosten geen content zelf - we verwijzen door of tonen materiaal direct vanuit de oorspronkelijke uitgever.
            </p>
          </Card>
        }
      />

      {/* Where to go from the shelf. */}
      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Link href="/studie" className={BTN_PRIMARY}>
          Naar Bijbelstudie
          {/* Identifies the direction of travel, not decoration. */}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <Link href="/feedback" className={BTN_SECONDARY}>
          Werk voorstellen
        </Link>
      </div>
    </AppShell>
  )
}
