import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { HELP_TOPICS, ALL_HELP_FAQS, faqAnchor } from "../../lib/content/helpFaq";
import HashScroll from "../../components/search/HashScroll";
import { JsonLd } from "../../components/seo/JsonLd";
import { absoluteUrl } from "../../lib/seo/constants";
import { graph, webPageNode, breadcrumbNode, faqNode } from "../../lib/seo/structuredData";
import SessionProvider from "../../components/providers/SessionProvider";
import AppShell from "../../components/shell/AppShell";
import { Card, SectionHeading } from "../../components/kit/primitives";

/**
 * /help had no metadata, so it inherited the root layout's canonical of "/"
 * and competed with the homepage for the same URL. It now owns its own
 * canonical and is a server component, so the full FAQ text is in the served
 * HTML rather than behind an accordion that only mounts on click.
 *
 * It sits in the shared app shell (components/shell/AppShell.tsx), the same
 * frame as /abonnement, /studies and /lezen, which are open to a visitor
 * without an account in the same way. The top bar's title is the page's only
 * <h1>, so it carries the full "Help en veelgestelde vragen" - the same text as
 * the <title> and the FAQPage name - and every heading in the body is an <h2>.
 *
 * Still `force-static`: the answers never depend on who is reading. That is
 * also why the SessionProvider below is handed no session - a static render
 * cannot read the cookie, so the shell's sidebar and top bar fetch the session
 * on the client and show the account (or "Inloggen") once it is known. The
 * FAQ text itself never waits on that.
 */
export const metadata: Metadata = generatePageMetadata("help");
export const dynamic = "force-static";

const PAGE_TITLE = "Help en veelgestelde vragen";

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Help", path: "/help" },
];

/**
 * Onward from the answers: the product, the reading material around it, and
 * the pages behind the account questions above ("Hoe verwijder ik mijn
 * account?" is answered here, the full procedure lives on its own page).
 */
const MORE_LINKS = [
  { href: "/studies", label: "Begeleide studies", description: "Kant-en-klare studies om mee te beginnen." },
  { href: "/bijbelboeken", label: "De 66 bijbelboeken", description: "Schrijver, tijd, thema en hoofdlijn per boek." },
  { href: "/bijbelstudie", label: "Bijbelstudie: de complete gids", description: "Methoden, hulpmiddelen en hoe je vandaag begint." },
  { href: "/bijbelstudie/gratis", label: "Gratis bijbelstudie", description: "Alles wat gratis is, op BijbelStudie en daarbuiten." },
  { href: "/abonnement", label: "Prijzen", description: "Wat gratis blijft en wat Pro toevoegt." },
  { href: "/account-verwijderen", label: "Account verwijderen", description: "Wat er wordt verwijderd, en wat we hoe lang bewaren." },
  { href: "/contact", label: "Contact", description: "Staat je vraag er niet bij? Laat het weten." },
];

export default function HelpPage() {
  const url = absoluteUrl("/help");

  const pageGraph = graph(
    webPageNode({
      path: "/help",
      name: PAGE_TITLE,
      description:
        "Antwoorden op de meestgestelde vragen over BijbelStudie: accounts, vertalingen, begeleide studies, de AI-assistent, Pro en privacy.",
      // WebPage, not FAQPage: faqNode below is the page's FAQPage. Two nodes of
      // that type on one URL is a duplicate-structured-data error.
      type: "WebPage",
      breadcrumbId: `${url}#breadcrumb`,
    }),
    breadcrumbNode(CRUMBS, url),
    faqNode(ALL_HELP_FAQS, url)
  );

  return (
    <SessionProvider>
      <JsonLd data={pageGraph} />
      <AppShell title={PAGE_TITLE}>
        <HashScroll />
        <div className="max-w-[46rem] pb-10">
          {/* The visible trail has to exist for the BreadcrumbList markup to be
              eligible - Google drops structured data that describes navigation
              a visitor cannot see. */}
          <nav aria-label="Kruimelpad">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
              {CRUMBS.map((crumb, i) => {
                const isLast = i === CRUMBS.length - 1;
                return (
                  <li key={crumb.path} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
                    {isLast ? (
                      <span aria-current="page" className="font-medium text-ink-body">{crumb.name}</span>
                    ) : (
                      <Link
                        href={crumb.path}
                        className="rounded text-ink-muted no-underline underline-offset-4 outline-none transition-colors hover:text-teal hover:underline focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:hover:text-teal-400"
                      >
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* -- Intro ----------------------------------------------------- */}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-dark dark:text-teal-400">
              Helpcentrum
            </p>
            <p className="mt-2 text-base leading-relaxed text-ink-body">
              Antwoord op {ALL_HELP_FAQS.length} vragen over accounts, vertalingen, begeleide
              studies, de AI-assistent, Pro en privacy. Staat je vraag er niet bij? Neem gerust{" "}
              <Link
                href="/contact"
                className="rounded-sm font-semibold text-teal-dark underline underline-offset-4 outline-none hover:text-teal dark:text-teal-400 focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                contact
              </Link>{" "}
              op.
            </p>
          </div>

          {/* -- Topics: the way into the answers -------------------------- */}
          <Card className="mt-6 p-4 sm:p-5">
            <nav aria-label="Onderwerpen">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Onderwerpen</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {HELP_TOPICS.map(topic => (
                  <li key={topic.id}>
                    {/* A plain fragment link, not next/link: the browser scrolls
                        the shell's own scroll container to the section. */}
                    <a
                      href={`#${topic.id}`}
                      className="inline-flex items-center rounded-full border border-line bg-surface px-[15px] py-2 text-[13px] font-medium text-ink-body no-underline outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                    >
                      {topic.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Card>

          {/* -- The answers ----------------------------------------------- */}
          {HELP_TOPICS.map(topic => (
            <section key={topic.id} id={topic.id} className="mt-10 scroll-mt-6">
              <SectionHeading title={topic.title} />
              <Card className="mt-3 px-4 sm:px-[22px]">
                <dl>
                  {topic.faqs.map((faq, i) => (
                    <div
                      key={faq.q}
                      id={faqAnchor(topic.id, faq.q)}
                      className={`scroll-mt-6 py-4 ${i === 0 ? "" : "border-t border-line-soft"}`}
                    >
                      <dt className="text-[14.5px] font-semibold text-ink">{faq.q}</dt>
                      <dd className="mt-1.5 text-[13.5px] leading-[1.7] text-ink-body">{faq.a}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </section>
          ))}

          {/* Verder lezen - records, so rows rather than a grid of cards. */}
          <section className="mt-10">
            <SectionHeading title="Meer lezen" />
            <Card className="mt-3 overflow-hidden">
              <ul>
                {MORE_LINKS.map((link, i) => (
                  <li key={link.href} className={i === 0 ? "" : "border-t border-line-soft"}>
                    <Link
                      href={link.href}
                      // A prefetch is a render of a page most readers of the
                      // FAQ never open.
                      prefetch={false}
                      className="group flex items-center justify-between gap-4 px-4 py-3.5 no-underline outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D9488] sm:px-[22px]"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{link.label}</span>
                        <span className="mt-0.5 block text-[13px] text-ink-muted">{link.description}</span>
                      </span>
                      {/* Identifies the row as a link onward. */}
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      </AppShell>
    </SessionProvider>
  );
}
