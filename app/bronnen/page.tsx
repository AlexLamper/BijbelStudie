import type { Metadata } from "next";
import AppShell from "../../components/shell/AppShell";
import { JsonLd } from "../../components/seo/JsonLd";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { absoluteUrl } from "../../lib/seo/constants";
import { graph, webPageNode, itemListNode } from "../../lib/seo/structuredData";
import { BRON_GROUPS, BRONNEN_PATH, workPath } from "../../lib/content/bronnen/catalog";
import { loadWorks } from "../../lib/content/bronnen/load";
import type { BronGroup } from "../../lib/content/bronnen/types";
import { workCard } from "../../lib/content/bronnen/view";
import { BronnenOverview } from "../../components/bronnen/BronnenOverview";

/**
 * /bronnen - the confessions, forms and catechism booklets.
 *
 * Prerendered (force-static): the text never changes per visitor, and on the
 * Vercel CPU budget a static page costs nothing per view. AppShell is
 * guest-aware on the client, so a member sees their own sidebar and a visitor
 * the Inloggen button - the same chrome as /studies.
 */
export const dynamic = "force-static";

export const metadata: Metadata = generatePageMetadata("bronnen");

/** The filter chips' short names for the catalogue groups. */
const CHIP_LABEL: Record<BronGroup, string> = {
  belijdenis: "Belijdenissen",
  catechese: "Catechese",
  liturgie: "Formulieren en gebeden",
};

export default async function BronnenPage() {
  const works = await loadWorks();

  const pageGraph = graph(
    webPageNode({
      path: BRONNEN_PATH,
      name: "Bronnen",
      description:
        "Belijdenisgeschriften, formulieren en catechismusboekjes van de gereformeerde kerken, met de Schriftplaatsen uit de Statenvertaling.",
      type: "CollectionPage",
    }),
    itemListNode({
      pageUrl: absoluteUrl(BRONNEN_PATH),
      name: "Bronnen",
      items: works.map(work => ({ name: work.title, path: workPath(work.slug), description: work.description })),
    }),
  );

  const cards = works.map(work => workCard(work, false));
  const groups = BRON_GROUPS.map(group => ({ ...group, chip: CHIP_LABEL[group.id] }));

  return (
    <AppShell title="Bronnen" ownHeading>
      <JsonLd data={pageGraph} />
      <div className="w-full min-w-0">
        <header className="mb-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.4px] text-teal-dark dark:text-teal-400">
            Bronnen
          </p>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[30px]">
            Belijdenis, catechismus en formulieren
          </h1>
          <p className="mt-2 max-w-[46rem] text-[15px] leading-[1.65] text-ink-muted">
            Wat de kerk door de eeuwen heen uit de Schrift beleden heeft, met bij elke verwijzing de tekst uit de
            Statenvertaling.
          </p>
        </header>

        {works.length === 0 ? (
          <p className="rounded-card border border-line bg-surface p-6 text-[14px] text-ink-muted">
            De bronnen worden op dit moment toegevoegd.
          </p>
        ) : (
          <BronnenOverview groups={groups} works={cards} />
        )}
      </div>
    </AppShell>
  );
}
