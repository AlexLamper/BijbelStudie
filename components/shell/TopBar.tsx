"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, Bell, User, Settings, LogOut } from "lucide-react";
import AccountAvatar from "../kit/AccountAvatar";
import { MobileMenuButton } from "./MobileNav";

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
export default function TopBar({ title, ownHeading = false }: { title: string; ownHeading?: boolean }) {
  const Title = ownHeading ? "p" : "h1";
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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
    // Below md: 56 px, the menu button (the sidebar as a drawer) before the
    // title, and no search field or bell - see components/shell/MobileNav.tsx.
    <header className="flex h-topbar flex-none items-center gap-4 border-b border-line bg-surface px-[28px] max-md:h-14 max-md:gap-2 max-md:pl-2 max-md:pr-4">
      <MobileMenuButton className="text-ink-body" />

      {/* 1. Title */}
      <Title className="flex-none text-[18px] font-bold tracking-[-0.2px] text-ink max-md:min-w-0 max-md:flex-initial max-md:truncate max-md:text-[17px]">{title}</Title>

      {/* 2. Spacer */}
      <div className="flex-1" />

      {/* 3. Search. Een echt invoerveld dat nergens heen gaat: de tekst blijft
             in lokale state staan. Het kruisje van Safari en Chrome is
             weggehaald, anders schuift het tussen de tekst en de ⌘K-hint. */}
      <div className="search-field flex h-[38px] w-[260px] max-md:hidden items-center gap-[9px] rounded-btn bg-line-soft px-3 transition-colors focus-within:bg-line">
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
        <span className="flex-none rounded-[5px] border border-line bg-surface px-[5px] py-[2px] font-mono text-[10.5px] font-semibold text-ink-faint">
          ⌘K
        </span>
      </div>

      {/* 4 + 5, for a visitor without an account: /studies and /lezen are open,
             and a bell and a tree are both meaningless there. */}
      {status !== "loading" && !session?.user && (
        <Link
          href={`/inloggen?next=${encodeURIComponent(pathname ?? "/")}`}
          className="flex h-[38px] flex-none items-center rounded-btn bg-teal px-4 max-md:h-9 max-md:px-3 text-[13.5px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
        >
          Inloggen
        </Link>
      )}

      {session?.user && (
        <>
          {/* 4. Notifications */}
          <div className="relative flex-none max-md:hidden" ref={bellRef}>
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
              <div className="absolute right-0 top-[44px] z-50 w-[232px] rounded-[10px] border border-line bg-surface p-3 text-[12.5px] leading-[1.55] text-ink-muted shadow-[0_8px_24px_-10px_rgba(17,24,39,.25)] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,.6)]">
                Geen nieuwe meldingen.
              </div>
            )}
          </div>

          {/* 5. Account. The same AccountAvatar as the profile header - one component, one Pro source (useIsPro), one
                 streak source (useLevensboom) - so they can never disagree.
                 38 px is the old 34 px circle plus the 2 px ring it drew
                 outside itself. Streak top-right, PRO bottom-right; both are
                 drawn as siblings of the clipped disc, so neither is cut off. */}
          <AccountMenu />
        </>
      )}
    </header>
  );
}

const MENU_ITEM_BASE =
  "flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13.5px] font-medium no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0D9488]";
const MENU_ITEM = `${MENU_ITEM_BASE} text-ink-body hover:bg-line-soft focus-visible:bg-line-soft`;
const MENU_ITEM_DANGER = `${MENU_ITEM_BASE} text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 dark:focus-visible:bg-red-500/10`;

/**
 * The account circle opens a small menu instead of going straight to /profiel:
 * Profiel, Instellingen, Uitloggen. Uitloggen uses signOut({ callbackUrl: "/" }),
 * the same call as the sidebar and the legacy header.
 *
 * Menu-button pattern: aria-haspopup/aria-expanded on the trigger, role="menu"
 * with role="menuitem" children, arrow keys / Home / End move focus, Escape
 * closes and hands focus back to the trigger, Tab or an outside click closes.
 */
function AccountMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusFirst = useRef(false);

  // A route change (e.g. after picking Profiel) closes the menu.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    if (focusFirst.current) {
      items()[0]?.focus();
      focusFirst.current = false;
    }
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function items() {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  function onButtonKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focusFirst.current = true;
      if (open) items()[0]?.focus();
      setOpen(true);
    }
  }

  function onMenuKey(e: React.KeyboardEvent) {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex-none" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        id="account-menu-button"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "account-menu" : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKey}
        className="flex flex-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
      >
        <AccountAvatar size={38} />
      </button>
      {open && (
        <div
          ref={menuRef}
          id="account-menu"
          role="menu"
          aria-labelledby="account-menu-button"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-[46px] z-50 w-[200px] max-w-[calc(100vw-32px)] rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_8px_24px_-10px_rgba(17,24,39,.25)] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,.6)]"
        >
          <Link href="/profiel" role="menuitem" className={MENU_ITEM} onClick={() => setOpen(false)}>
            <User size={16} strokeWidth={1.9} className="flex-none text-ink-muted" aria-hidden />
            Profiel
          </Link>
          <Link href="/instellingen" role="menuitem" className={MENU_ITEM} onClick={() => setOpen(false)}>
            <Settings size={16} strokeWidth={1.9} className="flex-none text-ink-muted" aria-hidden />
            Instellingen
          </Link>
          <div role="separator" className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_DANGER}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut size={16} strokeWidth={1.9} className="flex-none" aria-hidden />
            Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}
