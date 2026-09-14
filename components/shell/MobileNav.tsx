"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { NAV_GROUPS, type NavItem } from "./nav";

/**
 * The app's navigation below 768 px. Nothing in this file renders at md and up:
 * the button, the drawer and the tab bar all carry `md:hidden`, so the 196 px
 * sidebar and the 64 px top bar stay exactly what they are on a tablet or a
 * laptop.
 *
 * Two shapes, one list (components/shell/nav.ts):
 *
 *  - MobileMenuButton: the hamburger in the top bar. It opens the sidebar
 *    itself in a drawer (Sidebar variant="drawer"), so every item, the admin
 *    row and the account foot are the ones the desktop column draws.
 *  - MobileTabBar: the five primary destinations along the bottom of AppShell.
 *    It is an in-flow flex child under the scrolling body, not `fixed`, so no
 *    page has to reserve bottom padding for it.
 *
 * SHARED CONTRACT: the tab bar is 56 px plus env(safe-area-inset-bottom). A
 * page inside AppShell that draws its own `fixed` bottom element below md must
 * lift it by `--mobile-tabbar-h` (set on the AppShell root).
 */

const MD_QUERY = "(min-width: 768px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileMenuButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setShown(false);
    triggerRef.current?.focus();
  }, []);

  // A route change closes the drawer. Links to the page already open do not
  // change the pathname, so the panel also closes on any link click below.
  useEffect(() => {
    setOpen(false);
    setShown(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    // Slide in on the frame after mount, so the transform has a start state.
    const raf = requestAnimationFrame(() => setShown(true));

    // Body scroll lock.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first control inside the panel (the close button).
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || !panelRef.current.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || !panelRef.current.contains(activeEl))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);

    // Rotating or resizing past md removes the drawer rather than leaving a
    // locked body behind a panel that is no longer drawn.
    const mq = window.matchMedia(MD_QUERY);
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) {
        setOpen(false);
        setShown(false);
      }
    }
    mq.addEventListener("change", onChange);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Menu openen"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? drawerId : undefined}
        onClick={() => setOpen(true)}
        className={`flex h-10 w-10 flex-none items-center justify-center rounded-btn text-current transition-colors hover:bg-black/5 dark:hover:bg-white/10 md:hidden ${className}`}
      >
        <Menu size={22} strokeWidth={1.9} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[70] md:hidden">
            <div
              aria-hidden
              onClick={close}
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
            />
            <div
              id={drawerId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a[href]")) {
                  setOpen(false);
                  setShown(false);
                }
              }}
              className={`absolute inset-y-0 left-0 flex w-[288px] max-w-[85vw] flex-col bg-surface text-ink shadow-[0_0_40px_-10px_rgba(0,0,0,.35)] transition-transform duration-200 ease-out ${
                shown ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <Sidebar variant="drawer" onClose={close} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/** Dashboard, Studies, Lezen, Notities - then Profiel. */
const TAB_ITEMS: NavItem[] = [
  ...NAV_GROUPS[0].items,
  ...NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.url === "/profiel"),
];

function isTabActive(pathname: string | null, url: string) {
  if (!pathname) return false;
  return pathname === url || pathname.startsWith(url + "/");
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Snelmenu"
      className="flex-none border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="m-0 grid h-14 list-none grid-cols-5 p-0">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(pathname, item.url);
          return (
            <li key={item.url} className="min-w-0">
              <Link
                href={item.url}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-full flex-col items-center justify-center gap-[3px] no-underline transition-colors",
                  active ? "text-teal-dark dark:text-teal-400" : "text-ink-muted",
                ].join(" ")}
              >
                <Icon size={21} strokeWidth={active ? 2.1 : 1.8} />
                <span className={`max-w-full truncate px-1 text-[10.5px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                  {item.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
