import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * The visible trail for /hulpbronnen and /hulpbronnen/:slug.
 *
 * It has to exist for the BreadcrumbList markup each page emits to be eligible -
 * Google drops structured data describing navigation a visitor cannot see - so
 * it takes the same `crumbs` array the page hands to `breadcrumbNode`, and the
 * two can never disagree. A server component: nothing here answers to a click
 * beyond an ordinary link.
 */
export default function Breadcrumbs({ crumbs }: { crumbs: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Kruimelpad">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[12px] text-ink-faint">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex min-w-0 list-none items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
              {isLast ? (
                <span aria-current="page" className="min-w-0 truncate font-medium text-ink-body">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="rounded-sm text-ink-muted no-underline underline-offset-4 outline-none transition-colors hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                >
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
