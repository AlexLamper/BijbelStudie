import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ExternalLink, Sparkles, ShieldCheck, Lock } from "lucide-react";
import { authOptions } from "../../../lib/authOptions";
import { isAdminEmail } from "../../../lib/adminEmails";
import connectMongoDB from "../../../lib/mongodb";
import User from "../../../models/User";
import { LIBRARY, getLibraryItem, getCategoryMeta } from "../library";
import Reader from "./Reader";

const TEAL = "#0D9488";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return LIBRARY.map(item => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getLibraryItem(slug);
  if (!item) return { title: "Hulpbronnen" };
  return {
    title: `${item.title}${item.author ? ` — ${item.author}` : ""} | Bibliotheek`,
    description: item.description,
  };
}

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-6 space-y-5 max-w-6xl mx-auto">

        {/* Breadcrumb / back */}
        <Link
          href="/hulpbronnen"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-muted-foreground hover:text-[#0D9488] transition-colors no-underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Terug naar bibliotheek
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: cat.tint, color: cat.color }}>
              {cat.label}
            </span>
            {item.isPro && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#D97706" }}>
                <Sparkles className="h-2.5 w-2.5" /> Pro
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground leading-tight mb-1">
            {item.title}
          </h1>
          {(item.author || item.year) && (
            <p className="text-sm text-gray-500 dark:text-muted-foreground mb-3">
              {[item.author, item.year].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-sm text-gray-700 dark:text-foreground/90 leading-relaxed max-w-3xl">
            {item.description}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Openen op {item.source}
            </a>
            <span className="text-xs text-gray-500 dark:text-muted-foreground">
              Bron: <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0D9488]">{item.sourceUrl.replace(/^https?:\/\//, "")}</a>
            </span>
          </div>
        </div>

        {/* Rights notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl"
          style={{ backgroundColor: "rgba(13,148,136,0.04)", border: "1px solid rgba(13,148,136,0.15)" }}>
          <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
          <p className="text-xs text-gray-700 dark:text-foreground/90 leading-relaxed">
            <strong className="font-semibold">Auteursrecht:</strong> {item.rightsNote}
          </p>
        </div>

        {/* Reader / paywall */}
        {hasAccess ? (
          <Reader item={item} />
        ) : (
          <Paywall />
        )}
      </div>
    </div>
  );
}

function Paywall() {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-8 text-center">
      <div className="h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(217,119,6,0.1)" }}>
        <Lock className="h-5 w-5" style={{ color: "#D97706" }} />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-foreground mb-2">
        Dit werk is onderdeel van Pro
      </h2>
      <p className="text-sm text-gray-500 dark:text-muted-foreground max-w-md mx-auto mb-5">
        Upgrade naar Pro om alle uitgebreide werken in de bibliotheek direct in de app te lezen,
        inclusief dogmatische standaardwerken en theologische prekenbundels.
      </p>
      <Link
        href="/abonnement"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: TEAL }}
      >
        <Sparkles className="h-4 w-4" />
        Upgrade naar Pro
      </Link>
    </div>
  );
}
