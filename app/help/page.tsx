import type { Metadata } from "next";
import Link from "next/link";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { HELP_TOPICS, ALL_HELP_FAQS } from "../../lib/content/helpFaq";
import { ContentShell, RelatedLinks } from "../../components/content/ContentShell";
import { JsonLd } from "../../components/seo/JsonLd";
import { absoluteUrl } from "../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode, faqNode } from "../../lib/seo/structuredData";

/**
 * /help had no metadata, so it inherited the root layout's canonical of "/"
 * and competed with the homepage for the same URL. It now owns its own
 * canonical and is a server component, so the full FAQ text is in the served
 * HTML rather than behind an accordion that only mounts on click.
 */
export const metadata: Metadata = generatePageMetadata("help");
export const dynamic = "force-static";

const TEAL = "#0D9488";

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
        "Antwoorden op de meestgestelde vragen over BijbelStudie: accounts, vertalingen, leesplannen, de AI-assistent, Pro en privacy.",
      type: "FAQPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    faqNode(ALL_HELP_FAQS, url)
  );

  return (
    <ContentShell crumbs={CRUMBS}>
      <JsonLd data={pageGraph} />
      <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
        <header className="mb-10">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: TEAL }}
          >
            Helpcentrum
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-foreground">
            Help en veelgestelde vragen
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-muted-foreground">
            Antwoord op {ALL_HELP_FAQS.length} vragen over accounts, vertalingen,
            leesplannen, de AI-assistent, Pro en privacy. Staat je vraag er niet
            bij? Neem gerust{" "}
            <Link href="/contact" className="underline" style={{ color: TEAL }}>
              contact
            </Link>{" "}
            op.
          </p>
        </header>

        <nav aria-label="Onderwerpen" className="mb-12 flex flex-wrap gap-2">
          {HELP_TOPICS.map(topic => (
            <a
              key={topic.id}
              href={`#${topic.id}`}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border bg-white dark:bg-card no-underline hover:border-teal-500 transition-colors text-gray-700 dark:text-foreground"
              style={{ borderColor: "#E5E7EB" }}
            >
              {topic.title}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {HELP_TOPICS.map(topic => (
            <section key={topic.id} id={topic.id} className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-5 text-gray-900 dark:text-foreground">
                {topic.title}
              </h2>
              <div className="space-y-5">
                {topic.faqs.map(faq => (
                  <div key={faq.q}>
                    <h3 className="font-bold text-base text-gray-900 dark:text-foreground">
                      {faq.q}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <RelatedLinks
          title="Meer lezen"
          links={[
            {
              href: "/bijbelstudie",
              label: "Bijbelstudie: de complete gids",
              description: "Methoden, hulpmiddelen en een stappenplan.",
            },
            {
              href: "/bijbelstudie/beginnen",
              label: "Bijbelstudie voor beginners",
              description: "Van je eerste hoofdstuk naar een vaste gewoonte.",
            },
            {
              href: "/abonnement",
              label: "Prijzen",
              description: "Wat gratis blijft en wat Pro toevoegt.",
            },
            {
              href: "/contact",
              label: "Contact",
              description: "Staat je vraag er niet bij? Laat het weten.",
            },
          ]}
        />
      </div>
    </ContentShell>
  );
}
