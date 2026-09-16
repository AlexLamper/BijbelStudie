import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ExternalLink, ShieldCheck, Lock } from "lucide-react";
import { authOptions } from "../../../lib/authOptions";
import { isAdminEmail } from "../../../lib/adminEmails";
import connectMongoDB from "../../../lib/mongodb";
import User from "../../../models/User";
import { LIBRARY, getLibraryItem, getCategoryMeta } from "../library";
import Reader from "./Reader";
import Breadcrumbs from "../Breadcrumbs";
import { BTN_PRIMARY, BTN_SECONDARY, EYEBROW, TEXT_LINK } from "../tokens";
import { buildMetadata } from "../../../lib/pageMetadata";
import { JsonLd } from "../../../components/seo/JsonLd";
import { ProBadge } from "../../../components/ui/ProBadge";
import AppShell from "../../../components/shell/AppShell";
import { Card } from "../../../components/kit/primitives";
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
 * A work's own page, in the same shell as the list.
 *
 * Still a server component: the metadata, the Book graph, the trail and the
 * work's description are in the HTML a crawler receives, and the Pro check runs
 * here before anything is sent. Only the reader itself (./Reader.tsx) needs the
 * client, for its full-screen toggle.
 *
 * The top bar carries the section name, "Hulpbronnen", the same title the list
 * uses, so moving between the two does not change the frame; the page's own
 * `h1` is the work's title. There is no `max-w-*` on the page as a whole - the
 * shell's gutter is its width - and a reading measure applies only to the
 * prose: the description and the rights notice.
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
    <AppShell title="Hulpbronnen" ownHeading>
      <JsonLd data={pageGraph} />

      <Breadcrumbs crumbs={crumbs} />

      {/* -- What this work is ------------------------------------------ */}
      <header className="mt-5 max-w-[46rem]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            {/* The category's own colour identifies it; it is never the fill
                under the label, where half the five would fail contrast. */}
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className={EYEBROW}>{cat.label}</span>
          </span>
          {item.isPro && <ProBadge />}
        </div>

        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {item.title}
        </h1>
        {(item.author || item.year) && (
          <p className="mt-2 text-sm text-ink-faint">
            {[item.author, item.year].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-4 text-base leading-relaxed text-ink-body">
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
            className={BTN_PRIMARY}
          >
            {/* Identifies where the link goes, not decoration. */}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Openen op {item.source}
          </a>
          <span className="min-w-0 break-words text-xs text-ink-muted">
            Bron:{" "}
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={TEXT_LINK}
            >
              {item.sourceUrl.replace(/^https?:\/\//, "")}
            </a>
          </span>
        </div>
      </header>

      {/* -- The rights notice ------------------------------------------ */}
      {/* `rightsNote` is the licence talking. Never edited, never summarised
          - the per-source strings live in library.ts. */}
      <Card className="mt-8 flex max-w-[52rem] items-start gap-3 p-4">
        {/* Identifies what the notice is about, not decoration. */}
        <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-teal-dark dark:text-teal-400" />
        <p className="m-0 text-[13px] leading-relaxed text-ink-body">
          <strong className="font-semibold text-ink">Auteursrecht:</strong> {item.rightsNote}
        </p>
      </Card>

      {/* -- The work itself, or the gate in front of it ----------------- */}
      <div className="mt-8">
        {hasAccess ? <Reader item={item} /> : <Paywall />}

        <Link href="/hulpbronnen" className={`mt-10 ${BTN_SECONDARY}`}>
          {/* Identifies the direction of travel, not decoration. */}
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Terug naar bibliotheek
        </Link>
      </div>
    </AppShell>
  );
}

function Paywall() {
  return (
    <section
      aria-labelledby="hulpbron-pro"
      className="max-w-[36rem] rounded-card border border-line bg-surface p-8 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
        {/* Identifies the state - this work is gated - not decoration. */}
        <Lock className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden />
      </div>
      <h2 id="hulpbron-pro" className="text-lg font-semibold text-ink">
        Dit werk is onderdeel van Pro
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        Upgrade naar Pro om alle uitgebreide werken in de bibliotheek direct in de app te lezen,
        inclusief dogmatische standaardwerken en theologische prekenbundels.
      </p>
      <Link href="/abonnement" className={`mt-6 ${BTN_PRIMARY}`}>
        Upgrade naar Pro
      </Link>
    </section>
  );
}
