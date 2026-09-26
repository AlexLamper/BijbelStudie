import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "../../components/shell/AppShell";
import { JsonLd } from "../../components/seo/JsonLd";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { absoluteUrl } from "../../lib/seo/constants";
import { graph, webPageNode, itemListNode } from "../../lib/seo/structuredData";
import { BRON_GROUPS, BRONNEN_PATH, workPath } from "../../lib/content/bronnen/catalog";
import { loadWorks } from "../../lib/content/bronnen/load";
import { workCountLabel } from "../../lib/content/bronnen/labels";

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

  return (
    <AppShell title="Bronnen" ownHeading>
      <JsonLd data={pageGraph} />
      <div className="mx-auto w-full max-w-[72rem]">
        <header className="mb-8 max-w-[46rem]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.4px] text-teal-dark dark:text-teal-400">
            Bronnen
          </p>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.5px] text-ink sm:text-[30px]">
            Belijdenis, catechismus en formulieren
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
            De teksten waarin de kerk door de eeuwen heen onder woorden bracht wat zij uit de Schrift gelooft. Bij
            elke verwijzing lees je de tekst uit de Statenvertaling er direct bij.
          </p>
        </header>

        {works.length === 0 ? (
          <p className="rounded-card border border-line bg-surface p-6 text-[14px] text-ink-muted">
            De bronnen worden op dit moment toegevoegd.
          </p>
        ) : (
          <div className="space-y-10">
            {BRON_GROUPS.map(group => {
              const inGroup = works.filter(work => work.group === group.id);
              if (inGroup.length === 0) return null;
              return (
                <section key={group.id} aria-labelledby={`groep-${group.id}`}>
                  <div className="mb-4">
                    <h2
                      id={`groep-${group.id}`}
                      className="text-[18px] font-bold tracking-[-0.2px] text-ink sm:text-[19px]"
                    >
                      {group.label}
                    </h2>
                    <p className="mt-1 text-[13.5px] text-ink-muted">{group.description}</p>
                  </div>
                  <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))]">
                    {inGroup.map(work => (
                      <Link
                        key={work.slug}
                        href={workPath(work.slug)}
                        className="group flex flex-col rounded-card border border-line bg-surface p-5 no-underline transition-colors hover:border-line-strong"
                      >
                        <span className="text-[16px] font-semibold leading-snug text-ink group-hover:text-teal-dark dark:group-hover:text-teal-400">
                          {work.title}
                        </span>
                        <span className="mt-1 text-[12.5px] text-ink-faint">
                          {[work.author, work.year].filter(Boolean).join(" · ")}
                        </span>
                        <span className="mt-3 line-clamp-3 flex-1 text-[13.5px] leading-[1.6] text-ink-muted">
                          {work.description}
                        </span>
                        <span className="mt-4 text-[12.5px] font-medium text-teal-dark dark:text-teal-400">
                          {workCountLabel(work)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
