import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
import { PublicFrame } from "../../components/content/PublicFrame";
import { CONTACT_EMAIL } from "../../lib/seo/constants";

/**
 * A server component with its Dutch copy inline, like the footer: the site
 * ships one language, and `useTranslation` made this a client page that
 * pulled i18next onto the critical path to look up five strings.
 *
 * Prerendered: nothing here depends on who is reading. Without `force-static`
 * the root layout's session read would render it in a function on every
 * request (it did - the live page answers `private, no-store`).
 */
export const dynamic = "force-static";

/**
 * Where most questions that reach the mailbox are already answered. Also the
 * only in-body links to the legal pages, which otherwise hang off the footer
 * alone. No prefetch: a render per link for a page most visitors skip.
 */
const SELF_SERVICE = [
  {
    href: "/help",
    label: "Help en veelgestelde vragen",
    description: "Antwoorden over je account, de vertalingen, de studies, de AI-assistent en Pro.",
  },
  {
    href: "/abonnement",
    label: "Abonnement en prijzen",
    description: "Wat gratis blijft en wat Pro toevoegt.",
  },
  {
    href: "/account-verwijderen",
    label: "Account verwijderen",
    description: "Hoe je je account verwijdert en wat er met je gegevens gebeurt.",
  },
  {
    href: "/privacybeleid",
    label: "Privacybeleid",
    description: "Welke gegevens we bewaren, waarom en hoe lang.",
  },
  {
    href: "/algemene-voorwaarden",
    label: "Algemene voorwaarden",
    description: "De afspraken voor het gebruik van BijbelStudie.",
  },
];

export default function ContactPage() {
  return (
    <PublicFrame
      eyebrow="Contact"
      title="Neem contact op"
      lead="Vragen over de app, je account of je abonnement beantwoorden we per e-mail."
    >
      <div className="rounded-card border border-line bg-surface px-4 py-5 sm:px-[22px]">
        <h2 className="text-[16.5px] font-bold text-ink">Contactgegevens</h2>

        <div className="mt-4 flex items-center gap-3 border-t border-line-soft pt-4">
          {/* Identifies the row as an e-mail address. */}
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-teal-faint text-teal dark:text-teal-400">
            <Mail size={17} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-muted">E-mail</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="block break-all text-[14.5px] font-semibold text-ink no-underline hover:text-teal dark:hover:text-teal-400"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-4 flex h-[38px] w-full items-center justify-center rounded-[9px] border border-line text-[13px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft sm:inline-flex sm:w-auto sm:px-5"
        >
          Mail het team
        </a>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <h2 className="px-4 pb-1 pt-5 text-[16.5px] font-bold text-ink sm:px-[22px]">
          Misschien staat het antwoord al klaar
        </h2>
        <ul>
          {SELF_SERVICE.map((link, i) => (
            <li key={link.href} className={i === 0 ? "" : "border-t border-line-soft"}>
              <Link
                href={link.href}
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
      </div>
    </PublicFrame>
  );
}
