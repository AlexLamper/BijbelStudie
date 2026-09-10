import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { HELP_TOPICS, ALL_HELP_FAQS } from "../../lib/content/helpFaq";
import { JsonLd } from "../../components/seo/JsonLd";
import { absoluteUrl } from "../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode, faqNode } from "../../lib/seo/structuredData";
import SceneShell from "../../components/scene/SceneShell";
import { SCENE_TREE, sceneSvg } from "../../components/scene/scene-svg";
import { EYEBROW, TEAL_ON_DARK, TILE } from "../../components/scene/tokens";

/**
 * /help had no metadata, so it inherited the root layout's canonical of "/"
 * and competed with the homepage for the same URL. It now owns its own
 * canonical and is a server component, so the full FAQ text is in the served
 * HTML rather than behind an accordion that only mounts on click.
 *
 * It is also a scene page now, and deliberately the quietest one: the reader
 * came here for an answer, so the landscape is the still server-rendered SVG
 * (`backdrop` defaults to "static", and with no `gateId` no canvas ever mounts)
 * and the answers are set straight on it as type with hairlines between them.
 * No panel around the prose - six stacked panels would have buried the picture
 * without making a single sentence easier to read.
 */
export const metadata: Metadata = generatePageMetadata("help");
export const dynamic = "force-static";

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Help", path: "/help" },
];

export default function HelpPage() {
  const url = absoluteUrl("/help");

  const pageGraph = graph(
    webPageNode({
      path: "/help",
      name: "Help en veelgestelde vragen",
      description:
        "Antwoorden op de meestgestelde vragen over BijbelStudie: accounts, vertalingen, begeleide studies, de AI-assistent, Pro en privacy.",
      type: "FAQPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    faqNode(ALL_HELP_FAQS, url)
  );

  return (
    <SceneShell svg={sceneSvg()} {...SCENE_TREE}>
      <JsonLd data={pageGraph} />

      {/* The visible trail has to exist for the BreadcrumbList markup to be
          eligible - Google drops structured data that describes navigation a
          visitor cannot see. */}
      <nav aria-label="Kruimelpad" className="pt-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/60">
          {CRUMBS.map((crumb, i) => {
            const isLast = i === CRUMBS.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-white/90">{crumb.name}</span>
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

      {/* -- The sky ---------------------------------------------------- */}
      <header className="pb-10 pt-8">
        <div className="scene-sky max-w-[46rem]">
          <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>Helpcentrum</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Help en veelgestelde vragen
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Antwoord op {ALL_HELP_FAQS.length} vragen over accounts, vertalingen, begeleide
            studies, de AI-assistent, Pro en privacy. Staat je vraag er niet bij? Neem gerust{" "}
            <Link
              href="/contact"
              className="rounded font-semibold text-white underline underline-offset-4 outline-none transition-colors hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white"
            >
              contact
            </Link>{" "}
            op.
          </p>
        </div>
      </header>

      {/* -- The horizon: the way into the answers ---------------------- */}
      <div className="scene-horizon">
        <nav aria-label="Onderwerpen" className={`p-4 shadow-lg shadow-black/20 sm:p-5 ${TILE}`}>
          <p className={EYEBROW}>Onderwerpen</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {HELP_TOPICS.map(topic => (
              <li key={topic.id}>
                <a
                  href={`#${topic.id}`}
                  className="inline-flex rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-sm font-semibold text-white no-underline outline-none transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white"
                >
                  {topic.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* -- The desk: the answers themselves --------------------------- */}
      <div className="max-w-[46rem] pb-24 pt-14">
        {HELP_TOPICS.map(topic => (
          <section key={topic.id} id={topic.id} className="scroll-mt-24 pt-10 first:pt-0">
            <h2 className="border-b border-white/15 pb-2.5 text-lg font-semibold tracking-tight text-white">
              {topic.title}
            </h2>
            <dl>
              {topic.faqs.map(faq => (
                <div key={faq.q} className="border-b border-white/10 py-5">
                  <dt className="text-base font-semibold text-white">{faq.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-white/75">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {/* Verder lezen - records, so rows rather than a grid of cards. */}
        <section className="pt-14">
          <h2 className="border-b border-white/15 pb-2.5 text-lg font-semibold tracking-tight text-white">
            Meer lezen
          </h2>
          <ul>
            {[
              { href: "/studies", label: "Begeleide studies", description: "Kant-en-klare studies om mee te beginnen." },
              { href: "/abonnement", label: "Prijzen", description: "Wat gratis blijft en wat Pro toevoegt." },
              { href: "/contact", label: "Contact", description: "Staat je vraag er niet bij? Laat het weten." },
            ].map(link => (
              <li key={link.href} className="border-b border-white/10">
                <Link
                  href={link.href}
                  className="group flex items-center justify-between gap-4 py-4 no-underline outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white group-hover:underline">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-white/65">{link.description}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SceneShell>
  );
}
