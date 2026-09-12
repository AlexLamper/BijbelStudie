"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Bell } from "lucide-react";
import NavTreeAvatar from "../levensboom/NavTreeAvatar";
import { useLevensboom } from "../../hooks/useLevensboom";

/**
 * The top bar, identical on all nine routes.
 *
 * Spec: design_handoff_web/SHELL.md. 64 px, white, one hairline underneath, and
 * exactly five things in it: the page title, a spacer, the 260 px search field,
 * the bell, and the account circle. No subtitle, no breadcrumb, no date - the
 * page's own first block says what the reader is looking at.
 *
 * TWO CONTROLS HAVE NO BACKEND YET (see design_handoff_web/RULES.md §5):
 *
 * - The search field. There is no global search on the web, so this is an
 *   ordinary text field and nothing more: you can type in it, the text stays in
 *   local state, and no route, fetch or palette follows. Cmd-K focuses the
 *   field instead of navigating, which is what keeps the ⌘K hint honest. The
 *   bible search endpoint that does exist (app/api/v1/search) is the mobile
 *   API's and is deliberately not wired up here - that would be a new feature,
 *   not a redesign.
 * - The bell. Nothing on the web produces a notification feed, so it says so
 *   instead of showing an invented count. The design's orange dot is therefore
 *   not drawn: a dot that is always on is a worse lie than no dot.
 */
export default function TopBar({ title }: { title: string }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { data } = useLevensboom();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // Iedereen draagt dezelfde boom, dus de ring is het enige wat een abonnement
  // laat zien. `isSubscribed` dekt zowel Stripe als de App Store (resolveIsPro).
  const isPro = session?.user?.isSubscribed === true;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        // preventDefault blijft nodig: anders opent de zoekbalk van de browser
        // zelf over de pagina heen.
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    function onDown(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [bellOpen]);

  return (
    <header className="flex h-topbar flex-none items-center gap-4 border-b border-line bg-white px-[28px]">
      {/* 1. Title */}
      <h1 className="flex-none text-[18px] font-bold tracking-[-0.2px] text-ink">{title}</h1>

      {/* 2. Spacer */}
      <div className="flex-1" />

      {/* 3. Search. Een echt invoerveld dat nergens heen gaat: de tekst blijft
             in lokale state staan. Het kruisje van Safari en Chrome is
             weggehaald, anders schuift het tussen de tekst en de ⌘K-hint. */}
      <div className="flex h-[38px] w-[260px] items-center gap-[9px] rounded-btn bg-line-soft px-3 transition-colors focus-within:bg-line">
        <Search size={17} strokeWidth={1.9} className="flex-none text-ink-muted" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Zoeken"
          placeholder="Zoek vers, studie of notitie"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="flex-none rounded-[5px] border border-line bg-white px-[5px] py-[2px] font-mono text-[10.5px] font-semibold text-ink-faint">
          ⌘K
        </span>
      </div>

      {/* 4 + 5, for a visitor without an account: /studies and /lezen are open,
             and a bell and a tree are both meaningless there. */}
      {status !== "loading" && !session?.user && (
        <Link
          href={`/inloggen?next=${encodeURIComponent(pathname ?? "/")}`}
          className="flex h-[38px] flex-none items-center rounded-btn bg-teal px-4 text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        >
          Inloggen
        </Link>
      )}

      {session?.user && (
        <>
          {/* 4. Notifications */}
          <div className="relative flex-none" ref={bellRef}>
            <button
              type="button"
              aria-label="Meldingen"
              aria-expanded={bellOpen}
              onClick={() => setBellOpen((v) => !v)}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-btn transition-colors hover:bg-line-soft"
            >
              <Bell size={19} strokeWidth={1.8} className="text-ink-body" />
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-[44px] z-50 w-[232px] rounded-[10px] border border-line bg-white p-3 text-[12.5px] leading-[1.55] text-ink-muted shadow-[0_8px_24px_-10px_rgba(17,24,39,.25)]">
                Geen nieuwe meldingen.
              </div>
            )}
          </div>

          {/* 5. Account. The streak badge is a SIBLING of the circle, never a
                 child: the circle clips at 50% and would cut the badge in half.
                 De ring om de cirkel zegt welk abonnement er onder ligt: groen
                 voor gratis, goud voor Pro. `ring` is een box-shadow en wordt
                 buiten de rand getekend, dus de `overflow-hidden` die de boom
                 bijsnijdt raakt hem niet, en hij kost geen layoutruimte - de
                 andere vier onderdelen blijven staan waar ze stonden. */}
          <Link href="/profiel" aria-label="Profiel" className="relative flex-none no-underline">
            <div
              className={`h-[34px] w-[34px] overflow-hidden rounded-full bg-sky ring-2 ${
                isPro ? "ring-gold" : "ring-teal"
              }`}
            >
              <NavTreeAvatar size={34} showLevel={false} fallback={null} />
            </div>
            {data?.streak != null && data.streak > 0 && (
              <span className="absolute -bottom-[3px] -right-[9px] rounded-full bg-white px-2 py-[2px] text-[12px] font-bold leading-[1.25] text-teal-dark shadow-badge">
                {data.streak}
              </span>
            )}
          </Link>
        </>
      )}
    </header>
  );
}
