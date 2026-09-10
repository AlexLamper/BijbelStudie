import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ChevronRight, ExternalLink, ShieldCheck, Lock } from "lucide-react";
import { authOptions } from "../../../lib/authOptions";
import { isAdminEmail } from "../../../lib/adminEmails";
import connectMongoDB from "../../../lib/mongodb";
import User from "../../../models/User";
import { LIBRARY, getLibraryItem, getCategoryMeta } from "../library";
import Reader from "./Reader";
import { buildMetadata } from "../../../lib/pageMetadata";
import { JsonLd } from "../../../components/seo/JsonLd";
import { ProBadge } from "../../../components/ui/ProBadge";
import { CTA_BRAND, EYEBROW, TEAL_DEEP, TEAL_ON_DARK, TILE } from "../../../components/scene/tokens";
import { absoluteUrl } from "../../../lib/seo/constants";
import {
  graph,
  webPageNode,
  breadcrumbNode,
  bookNode,
} from "../../../lib/seo/structuredData";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return LIBRARY.map(item => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getLibraryItem(slug);
  if (!item) {
    return buildMetadata({
      title: "Werk niet gevonden",
      description: "Dit werk staat niet in de bibliotheek.",
      path: "/hulpbronnen",
      indexable: false,
    });
  }

  const byline = item.author ? ` - ${item.author}` : "";
  return buildMetadata({
    title: `${item.title}${byline}${item.year ? ` (${item.year})` : ""}`,
    description: item.description.slice(0, 300),
    path: `/hulpbronnen/${item.slug}`,
    type: "book",
    ogEyebrow: "Bibliotheek",
    // Pro items show only a paywall to anonymous visitors, so there is nothing
    // for Google to index. Sending it noindex is honest and keeps it out of
    // "Gecrawld - momenteel niet geïndexeerd" in Search Console.
    indexable: !item.isPro,
    keywords: [
      item.title.toLowerCase(),
      ...(item.author ? [item.author.toLowerCase()] : []),
      "publiek domein",
      "gratis bijbelstudie",
      "christelijke literatuur",
    ],
  });
}

/**
 * A work's own page, in the same window as the list.
 *
 * The shell, the navbar, the rail and the gutter all come from
 * app/hulpbronnen/layout.tsx - this file draws only its own layers, on the
 * landscape, in the scene's literal whites. There is no `max-w-*` and no
 * `mx-auto` any more: the shell's gutter is the page's width, and a second
 * measure inside it left the content floating in a band of its own beside the
 * rail. The one place a reading measure still applies is the description and
 * the rights notice, which are prose.
 */
export default async function LibraryReaderPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getLibraryItem(slug);
  if (!item) notFound();

  let hasAccess = !item.isPro;
  if (item.isPro) {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      if (isAdminEmail(session.user.email)) {
        hasAccess = true;
      } else {
        await connectMongoDB();
        const dbUser = await User.findOne({ email: session.user.email })
          .select("subscribed isAdmin")
          .lean<{ subscribed?: boolean; isAdmin?: boolean }>();
        hasAccess = !!(dbUser?.subscribed || dbUser?.isAdmin);
      }
    }
  }

  const cat = getCategoryMeta(item.category);

  const path = `/hulpbronnen/${item.slug}`;
  const url = absoluteUrl(path);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Hulpbronnen", path: "/hulpbronnen" },
    { name: item.title, path },
  ];
  const pageGraph = graph(
    webPageNode({
      path,
      name: item.title,
      description: item.description,
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(crumbs, url),
    bookNode({
      title: item.title,
      author: item.author,
      year: item.year,
      description: item.description,
      path,
      sourceUrl: item.sourceUrl,
    })
  );

  return (
    <>
      <JsonLd data={pageGraph} />

      {/* The visible trail has to exist for the BreadcrumbList markup to be
          eligible - Google drops structured data describing navigation a
          visitor cannot see. */}
      <nav aria-label="Kruimelpad" className="pt-5">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-xs text-white/60">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={crumb.path} className="flex list-none items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
                {isLast ? (
                  <span aria-current="page" className="min-w-0 truncate font-medium text-white/90">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="rounded text-white/70 no-underline underline-offset-4 outline-none transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* -- The sky: what this work is --------------------------------- */}
      <header className="pb-8 pt-6">
        <div className="scene-sky max-w-[46rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              {/* The category's own colour identifies it; it is never the fill
                  under the label, where half the five would fail contrast. */}
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/30"
                style={{ backgroundColor: cat.color }}
              />
              <span className={EYEBROW}>{cat.label}</span>
            </span>
            {item.isPro && <ProBadge />}
          </div>

          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            {item.title}
          </h1>
          {(item.author || item.year) && (
            <p className="mt-2 text-sm text-white/60">
              {[item.author, item.year].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-4 text-base leading-relaxed text-white/80">
            {item.description}
          </p>

          {/* The outbound link is the point of this page: several sources -
              DBNL among them - are read at the source and never inside an
              embed. `target="_blank" rel="noopener noreferrer"` keeps it a
              normal outbound link. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_BRAND}
              style={{ backgroundColor: TEAL_DEEP }}
            >
              {/* Identifies where the link goes, not decoration. */}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Openen op {item.source}
            </a>
            <span className="min-w-0 text-xs text-white/60">
              Bron:{" "}
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded text-white/80 underline underline-offset-4 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
              >
                {item.sourceUrl.replace(/^https?:\/\//, "")}
              </a>
            </span>
          </div>
        </div>
      </header>

      {/* -- The horizon: the rights notice ----------------------------- */}
      <div className="scene-horizon">
        {/* `rightsNote` is the licence talking. Never edited, never summarised
            - the per-source strings live in library.ts. */}
        <div className={`flex max-w-[52rem] items-start gap-3 p-4 shadow-lg shadow-black/20 ${TILE}`}>
          {/* Identifies what the notice is about, not decoration. */}
          <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL_ON_DARK }} />
          <p className="m-0 text-xs leading-relaxed text-white/80">
            <strong className="font-semibold text-white">Auteursrecht:</strong> {item.rightsNote}
          </p>
        </div>
      </div>

      {/* -- The desk: the work itself, or the gate in front of it ------ */}
      <div className="pb-24 pt-12">
        {hasAccess ? <Reader item={item} /> : <Paywall />}

        <Link
          href="/hulpbronnen"
          className="mt-10 inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
        >
          {/* Identifies the direction of travel, not decoration. */}
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Terug naar bibliotheek
        </Link>
      </div>
    </>
  );
}

function Paywall() {
  return (
    <section aria-labelledby="hulpbron-pro" className={`max-w-[36rem] p-8 text-center ${TILE}`}>
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(217,119,6,0.18)" }}
      >
        {/* Identifies the state - this work is gated - not decoration. */}
        <Lock className="h-5 w-5" style={{ color: "#FBBF24" }} aria-hidden />
      </div>
      <h2 id="hulpbron-pro" className="text-lg font-semibold text-white">
        Dit werk is onderdeel van Pro
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/75">
        Upgrade naar Pro om alle uitgebreide werken in de bibliotheek direct in de app te lezen,
        inclusief dogmatische standaardwerken en theologische prekenbundels.
      </p>
      <Link href="/abonnement" className={`mt-6 ${CTA_BRAND}`} style={{ backgroundColor: TEAL_DEEP }}>
        Upgrade naar Pro
      </Link>
    </section>
  );
}
