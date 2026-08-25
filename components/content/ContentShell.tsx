import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Header } from "../landing/navbar";
import { Footer } from "../landing/footer";

/** #0D9488 is 3.7:1 on white - fine as a fill, short of AA as type. */
const TEAL_TEXT = "#0F766E";

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Page frame for the public content pages (/bijbelstudie, /bijbelboeken).
 *
 * These are server components on purpose: the whole point of these routes is
 * that a crawler gets the full text in the initial HTML without executing any
 * JavaScript. Header and Footer are client components, which is fine - they
 * still render server-side and only hydrate for the mobile menu.
 */
export function ContentShell({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F9FAFB" }}>
      <Header />
      {crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}

/**
 * Visible breadcrumb trail. It has to exist on the page for the
 * BreadcrumbList structured data to be eligible - Google drops markup that
 * describes navigation a visitor cannot see.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Kruimelpad"
      className="border-b bg-white dark:bg-card"
      style={{ borderColor: "#E5E7EB" }}
    >
      <ol className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-1.5 text-xs flex-wrap text-gray-500 dark:text-muted-foreground">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
              {isLast ? (
                <span aria-current="page" className="font-medium text-gray-900 dark:text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="hover:underline">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Card grid of internal links, rendered at the foot of a content page. */
export function RelatedLinks({
  title = "Verder lezen",
  links,
}: {
  title?: string;
  links: { href: string; label: string; description: string }[];
}) {
  return (
    <section className="mt-16 pt-10 border-t" style={{ borderColor: "#E5E7EB" }}>
      <h2 className="text-xl font-bold mb-5 text-gray-900 dark:text-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="group block rounded-xl border bg-white dark:bg-card p-4 transition-colors hover:border-teal-500 no-underline"
            style={{ borderColor: "#E5E7EB" }}
          >
            <span
              className="font-semibold text-sm block group-hover:underline"
              style={{ color: TEAL_TEXT }}
            >
              {link.label}
            </span>
            <span className="text-sm mt-1 block text-gray-500 dark:text-muted-foreground">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
