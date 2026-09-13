"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { MoreHorizontal, LogOut } from "lucide-react";
import AccountAvatar from "../kit/AccountAvatar";
import { useLevensboom } from "../../hooks/useLevensboom";
import { useIsPro } from "../../hooks/useIsPro";
import { NAV_GROUPS, isNavActive, type NavItem } from "./nav";
import { useIsAdmin } from "./useIsAdmin";

/**
 * The sidebar, identical on all nine routes.
 *
 * Spec: design_handoff_web/SHELL.md. 196 px wide plus a 1 px right border, a
 * 64 px brand row that lines up exactly with the top bar next to it, three
 * labelled groups, and a footer that is the account.
 *
 * Every measurement here is the design's, written as an arbitrary value rather
 * than rounded to the nearest Tailwind step - the checklist measures these at
 * 1440 x 900 and "about 38 px" is a fail. Colours come from the token names in
 * tailwind.config.ts; there is no hex literal in this file.
 */

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.url}
      data-tour={item.tourId}
      data-track={item.tourId ? item.tourId.replace(/^nav-/, "sidebar_") : undefined}
      className={[
        "flex items-center gap-[11px] h-[38px] rounded-[9px] px-[11px] no-underline transition-colors",
        active ? "bg-[var(--teal-wash)]" : "hover:bg-line-soft",
      ].join(" ")}
    >
      <Icon
        size={18}
        strokeWidth={1.8}
        className={active ? "text-teal-dark flex-shrink-0" : "text-ink-muted flex-shrink-0"}
      />
      <span
        className={[
          "flex-1 text-[13.5px]",
          active ? "font-semibold text-teal-dark" : "font-medium text-ink-body",
        ].join(" ")}
      >
        {item.title}
      </span>
      {item.badge && (
        <span className="rounded-[4px] border border-line px-[5px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.6px] text-ink-muted">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

/** The account row's overflow menu. The top bar has no profile menu in this
 *  design, so signing out lives here - it is the only way out of the app. */
function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative flex-none" ref={ref}>
      <button
        type="button"
        aria-label="Accountmenu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] hover:bg-line-soft"
      >
        <MoreHorizontal size={17} className="text-ink-faint" />
      </button>
      {open && (
        <div className="absolute bottom-[26px] right-0 z-50 w-[172px] overflow-hidden rounded-[10px] border border-line bg-white py-1 shadow-[0_8px_24px_-10px_rgba(17,24,39,.25)]">
          <Link
            href="/profiel"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-[13px] font-medium text-ink-body no-underline hover:bg-line-soft"
          >
            Profiel
          </Link>
          <Link
            href="/instellingen"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-[13px] font-medium text-ink-body no-underline hover:bg-line-soft"
          >
            Instellingen
          </Link>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-danger hover:bg-line-soft"
          >
            <LogOut size={14} />
            Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ active }: { active?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: tree } = useLevensboom();
  const isAdmin = useIsAdmin();
  const isPro = useIsPro();

  const showTreeSub = pathname === "/profiel" || pathname === "/profiel/boom";

  return (
    <aside className="flex w-sidebar flex-none flex-col overflow-hidden border-r border-line bg-white">
      {/* Brand - 64 px, exactly the top bar's height, so the two rules meet */}
      <Link
        href="/dashboard"
        className="flex h-topbar flex-none items-center gap-[10px] border-b border-line px-[18px] no-underline"
      >
        <Image
          src="/app-icon.png"
          alt=""
          width={30}
          height={30}
          className="block rounded-[8px]"
          priority
        />
        <span className="text-[15.5px] font-bold tracking-[-0.2px] text-ink">BijbelStudie</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-[2px] overflow-y-auto px-[10px] py-[12px]">
        {NAV_GROUPS.map((group) => {
          if (group.adminOnly && !isAdmin) return null;
          return (
            <Fragment key={group.label}>
              <div className="px-[11px] pb-[7px] pt-[6px] text-[10px] font-semibold uppercase tracking-[1.1px] text-ink-faint">
                {group.label}
              </div>
              {group.items.map((item) => (
                <Fragment key={item.url}>
                  <NavRow item={item} active={isNavActive(pathname, item.url, active)} />
                  {/* The tree only appears where it belongs: under Profiel, and
                      only while the reader is on one of those two screens. */}
                  {item.url === "/profiel" && showTreeSub && (
                    <Link
                      href="/profiel/boom"
                      className={[
                        "flex h-[32px] items-center rounded-[8px] pl-[40px] pr-[11px] text-[12.5px] no-underline transition-colors",
                        pathname === "/profiel/boom"
                          ? "bg-[var(--teal-wash-2)] font-semibold text-teal-dark"
                          : "font-medium text-ink-body hover:bg-line-soft",
                      ].join(" ")}
                    >
                      Levensboom
                    </Link>
                  )}
                </Fragment>
              ))}
            </Fragment>
          );
        })}
      </nav>

      {/* Account. /studies and /lezen are open to visitors without an account,
          so the foot has two shapes: the account, or the way in. */}
      {session?.user ? (
        <div className="flex flex-none items-center gap-[12px] border-t border-line p-[11px]">
          {/* The same AccountAvatar as the top bar - streak top-right, PRO
              bottom-right, from the same sources (useLevensboom, useIsPro) - so
              the two circles always match. The level lives in the line under
              the name. */}
          <AccountAvatar size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">
              {session.user.name ?? "Gebruiker"}
            </div>
            <div className="truncate text-[11px] text-ink-faint">
              {isPro ? "Pro" : "Gratis account"}
              {tree?.level != null ? ` · niveau ${tree.level}` : ""}
            </div>
          </div>
          <AccountMenu />
        </div>
      ) : (
        <div className="flex-none border-t border-line p-[11px]">
          <p className="px-1 text-[11.5px] leading-snug text-ink-faint">
            Bewaar je voortgang met een gratis account.
          </p>
          <Link
            href={`/inloggen?next=${encodeURIComponent(pathname ?? "/")}`}
            className="mt-[9px] flex h-9 items-center justify-center rounded-btn bg-teal text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
          >
            Inloggen
          </Link>
        </div>
      )}
    </aside>
  );
}
