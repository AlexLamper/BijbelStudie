import Link from "next/link";
import Image from "next/image";
import { Footer } from "../landing/footer";

/**
 * Frame for the small public pages a visitor reaches without an account:
 * /privacybeleid, /algemene-voorwaarden and /contact.
 *
 * Same slate & teal system as /gebruiker/[id] (and through it /profiel): the
 * `line-soft` ground, one 64 px bar in `surface`, and a single centred column of
 * cards. Not the app shell - a signed-out visitor would get a sidebar full of
 * routes they cannot open. The marketing footer stays underneath for the legal
 * and product links.
 *
 * No "use client": a server page stays a server page, and a client page may
 * import it just the same.
 */
export function PublicFrame({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-line-soft dark:bg-background">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[760px] items-center gap-3 px-4 sm:px-5">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-[-0.2px] text-ink no-underline"
          >
            <Image src="/images/icon-192.png" alt="" width={26} height={26} className="flex-none rounded-[7px]" priority />
            <span className="truncate">BijbelStudie</span>
          </Link>
          <div className="flex-1" />
          <Link
            href="/"
            className="flex-none text-[13px] font-semibold text-teal no-underline hover:text-teal-dark dark:text-teal-400 dark:hover:text-teal-300"
          >
            Terug naar home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-[13px] px-4 pb-16 pt-6 sm:px-5 sm:pt-8">
        <div className="px-1 pb-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint">{eyebrow}</p>
          <h1 className="mt-[6px] text-[24px] font-bold tracking-[-0.5px] text-ink sm:text-[28px]">{title}</h1>
          {lead && <p className="mt-[6px] text-[13.5px] leading-[1.6] text-ink-muted">{lead}</p>}
        </div>
        {children}
      </main>

      <Footer />
    </div>
  );
}

/**
 * A numbered document: one card, one row per clause, a hairline between rows.
 * The number square is the one /feedback uses for its reasons.
 */
export function NumberedSections({ sections }: { sections: { title: string; body: string }[] }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-2 sm:px-[22px]">
      <ol className="m-0 list-none p-0">
        {sections.map((s, i) => (
          <li
            key={i}
            className={`flex gap-3 py-[18px] sm:gap-4 ${i === 0 ? "" : "border-t border-line-soft"}`}
          >
            <span
              aria-hidden
              className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-teal-faint text-[12px] font-bold tabular-nums text-teal dark:text-teal-400"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold leading-7 text-ink">{s.title}</h2>
              <p className="mt-1 break-words text-[13.5px] leading-[1.7] text-ink-body">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
