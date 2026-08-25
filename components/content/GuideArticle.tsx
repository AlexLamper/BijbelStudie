import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import type { Guide } from "../../lib/content/guides";
import { RelatedLinks } from "./ContentShell";

const TEAL = "#0D9488";
/** #0D9488 is 3.7:1 on white - fine as a fill, short of AA as type. */
const TEAL_TEXT = "#0F766E";

/**
 * Renders one guide from lib/content/guides.
 *
 * Everything here is static markup - no accordions, no "lees meer" toggles.
 * Content hidden behind an interaction is still indexed, but it does not
 * anchor the page for the query the way visible body copy does, and these
 * pages exist to rank.
 */
export function GuideArticle({ guide }: { guide: Guide }) {
  return (
    <article className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
      <header className="mb-10">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: TEAL_TEXT }}
        >
          Gids
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-gray-900 dark:text-foreground">
          {guide.h1}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-muted-foreground">
          {guide.intro}
        </p>
        <div className="mt-5 flex items-center gap-4 text-xs text-gray-500 dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {guide.readingMinutes} minuten lezen
          </span>
          <span>
            Bijgewerkt op{" "}
            <time dateTime={guide.dateModified}>
              {formatDutchDate(guide.dateModified)}
            </time>
          </span>
        </div>
      </header>

      {guide.sections.length > 2 && (
        <nav
          aria-label="Inhoudsopgave"
          className="mb-12 rounded-xl border bg-white dark:bg-card p-5"
          style={{ borderColor: "#E5E7EB" }}
        >
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500 dark:text-muted-foreground">
            In dit artikel
          </h2>
          <ol className="space-y-1.5">
            {guide.sections.map((section, i) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm hover:underline text-gray-700 dark:text-foreground"
                >
                  <span className="tabular-nums mr-2" style={{ color: TEAL_TEXT }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="space-y-12">
        {guide.sections.map(section => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-foreground">
              {section.heading}
            </h2>

            <div className="space-y-4">
              {section.body.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-base leading-relaxed text-gray-700 dark:text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {section.list && (
              <ul className="mt-6 space-y-3">
                {section.list.map(item => (
                  <li
                    key={item.title}
                    className="rounded-lg border bg-white dark:bg-card p-4"
                    style={{ borderColor: "#E5E7EB" }}
                  >
                    <strong className="block text-sm font-bold text-gray-900 dark:text-foreground">
                      {item.title}
                    </strong>
                    <span className="text-sm leading-relaxed mt-1 block text-gray-600 dark:text-muted-foreground">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {section.steps && (
              <ol className="mt-6 space-y-4">
                {section.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white tabular-nums"
                      style={{ backgroundColor: TEAL }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div>
                      <strong className="block text-sm font-bold text-gray-900 dark:text-foreground">
                        {step.title}
                      </strong>
                      <span className="text-sm leading-relaxed mt-0.5 block text-gray-600 dark:text-muted-foreground">
                        {step.text}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {section.callout && (
              <aside
                className="mt-6 rounded-xl p-4 border-l-4"
                style={{
                  backgroundColor: "rgba(13,148,136,0.06)",
                  borderColor: TEAL,
                }}
              >
                <p className="text-sm leading-relaxed text-gray-800 dark:text-foreground">
                  {section.callout}
                </p>
              </aside>
            )}
          </section>
        ))}
      </div>

      {guide.faqs && guide.faqs.length > 0 && (
        <section id="veelgestelde-vragen" className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-foreground">
            Veelgestelde vragen
          </h2>
          <div className="space-y-5">
            {guide.faqs.map(faq => (
              <div key={faq.q}>
                {/* h3, not a <details>: the answer must be in the HTML and
                    visible for the FAQPage markup to describe the page. */}
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
      )}

      <section
        className="mt-16 rounded-2xl p-8 text-center border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">
          Begin vandaag met bijbelstudie
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-muted-foreground max-w-lg mx-auto">
          Lees de Bijbel in meerdere vertalingen, met commentaren, grondtekst,
          leesplannen en notities. Gratis te beginnen, geen creditcard nodig.
        </p>
        <Link
          href="/registreren"
          className="mt-5 inline-flex items-center justify-center gap-2 font-semibold text-white px-6 py-3 rounded-xl no-underline"
          style={{ backgroundColor: TEAL }}
        >
          Gratis account aanmaken
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      <RelatedLinks links={guide.related} />
    </article>
  );
}

/** "21 augustus 2026" from an ISO date, without pulling in a date library. */
function formatDutchDate(iso: string): string {
  const months = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}
