"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  BookMarked,
  BookOpen,
  StickyNote,
  User,
  Settings,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react"
import { useStudyStyle } from "../../../providers/study-style-provider"
import { useSidebar } from "../../../ui/sidebar"
import { FOCUS, HAIRLINE, TEXT } from "./styles"

/**
 * The sidebar, as a rail that stands ON the scene instead of cutting a column
 * out of it.
 *
 * The navbar is the real one and is left alone; the sidebar was the piece that
 * broke the full-bleed background, because a permanent 12rem column ends the
 * landscape a fifth of the way across the screen. So it is 56px wide - the same
 * width the navbar is tall - and it widens to its labelled self on hover or
 * keyboard focus, floating OVER the work rather than pushing it, exactly like
 * the rail /studie already uses (`StudyRail` in components/layout/app-sidebar).
 * Nothing reflows when it opens, and the scene runs behind it end to end.
 *
 * The surface is deliberately the least glassy thing on the page: a quiet
 * near-opaque panel, not a blur. These are links the reader hits within a
 * second of arriving; they have to be legible before they are atmospheric.
 *
 * The items, their order and their links are the sidebar's own - including the
 * onboarding answer that swaps "Lezen" and "Studies" - so the chrome is honest
 * rather than invented. The navbar's menu button drives it: pressed, the rail
 * steps aside completely and the scene is uninterrupted; on a phone the same
 * button opens the panel version below.
 */

type NavItem = { title: string; url: string; icon: ElementType }

/** components/layout/app-sidebar.tsx, guided order (the default). */
const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Studies", url: "/studies", icon: BookMarked },
  { title: "Lezen", url: "/lezen", icon: BookOpen },
  { title: "Notities", url: "/notities", icon: StickyNote },
]

/** The same list for "ik lees liever zelf": Lezen and Studies trade places. */
const MAIN_NAV_SELF: NavItem[] = [MAIN_NAV[0], MAIN_NAV[2], MAIN_NAV[1], MAIN_NAV[3]]

const BOTTOM_NAV: NavItem[] = [
  { title: "Profiel", url: "/profiel", icon: User },
  { title: "Instellingen", url: "/instellingen", icon: Settings },
  { title: "Feedback", url: "/feedback", icon: MessageSquareText },
]

const ADMIN_NAV: NavItem = { title: "Beheer", url: "/admin", icon: ShieldCheck }

/**
 * This page stands in for /dashboard, so the dashboard item is the current one
 * here. Every other item matches the way the real sidebar matches.
 */
function isCurrent(pathname: string | null, url: string): boolean {
  if (!pathname) return false
  if (url === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/proefdashboard")
  return pathname === url || pathname.startsWith(`${url}/`)
}

function RailLink({ item, labelled = false }: { item: NavItem; labelled?: boolean }) {
  const pathname = usePathname()
  const current = isCurrent(pathname, item.url)
  const Icon = item.icon

  return (
    <li className="list-none">
      <Link
        href={item.url}
        title={item.title}
        aria-current={current ? "page" : undefined}
        className={[
          "flex h-9 items-center gap-3 rounded-lg px-[11px] no-underline transition-colors",
          FOCUS,
          current
            ? "bg-[rgba(13,148,136,0.12)] font-semibold text-[#0D9488] dark:bg-[rgba(13,148,136,0.18)] dark:text-teal-300"
            : "font-normal text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
        ].join(" ")}
      >
        <Icon size={18} className="flex-shrink-0" aria-hidden />
        <span
          className={
            labelled
              ? "whitespace-nowrap text-[13.5px]"
              : "-translate-x-1 whitespace-nowrap text-[13.5px] opacity-0 transition-[opacity,transform] duration-200 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100"
          }
        >
          {item.title}
        </span>
      </Link>
    </li>
  )
}

export default function WerkbankRail() {
  const { studyStyle } = useStudyStyle()
  const { data: session } = useSession()
  const { open, openMobile, setOpenMobile } = useSidebar()

  const main = studyStyle === "self" ? MAIN_NAV_SELF : MAIN_NAV
  // Read off the session rather than fetched: an extra /api/user call to decide
  // whether one nav row exists is not worth a request.
  const items = session?.user?.isAdmin ? [...main, ADMIN_NAV] : main

  return (
    <>
      {/* The gutter the rail stands in. It is the only space the sidebar takes
          from the page - and when the navbar's menu button closes the rail, it
          gives that back too. */}
      <div
        className={`hidden flex-none transition-[width] duration-300 ease-out md:block ${open ? "w-14" : "w-0"}`}
      />

      {open && (
        <nav
          aria-label="Hoofdnavigatie"
          className={`group/rail fixed bottom-0 left-0 top-14 z-40 hidden w-14 flex-col overflow-hidden border-r bg-white/90 backdrop-blur-[2px] transition-[width,box-shadow] duration-300 ease-out hover:w-52 hover:shadow-[0_0_60px_-16px_rgba(2,6,23,0.55)] focus-within:w-52 md:flex dark:bg-slate-950/85 ${HAIRLINE}`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {items.map(item => (
                <RailLink key={item.url} item={item} />
              ))}
            </ul>
          </div>

          <div className={`flex-none border-t p-2 ${HAIRLINE}`}>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {BOTTOM_NAV.map(item => (
                <RailLink key={item.url} item={item} />
              ))}
            </ul>
          </div>
        </nav>
      )}

      {/* Phones: no hover, no room for a rail. The navbar's own menu button
          opens this, so that control means the same thing on every width. */}
      {openMobile && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Menu sluiten"
            onClick={() => setOpenMobile(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/60"
          />
          <nav
            aria-label="Menu"
            className={`absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-white p-3 dark:bg-slate-950 ${HAIRLINE}`}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <span className={`text-[13px] font-semibold ${TEXT}`}>Menu</span>
              <button
                type="button"
                onClick={() => setOpenMobile(false)}
                aria-label="Menu sluiten"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS}`}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {items.map(item => (
                <RailLink key={item.url} item={item} labelled />
              ))}
            </ul>

            <div className={`mt-auto border-t pt-2 ${HAIRLINE}`}>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {BOTTOM_NAV.map(item => (
                  <RailLink key={item.url} item={item} labelled />
                ))}
              </ul>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
