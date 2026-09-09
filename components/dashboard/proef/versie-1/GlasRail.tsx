"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard, BookMarked, BookOpen, StickyNote,
  User, Settings, MessageSquareText, ShieldCheck,
} from "lucide-react"
import { useSidebar } from "../../../ui/sidebar"
import { useStudyStyle } from "../../../providers/study-style-provider"
import { GLASS_CHROME, CHROME_SHADOW, FOCUS, TEAL } from "./glas"

/**
 * The navigation, dissolved into glass.
 *
 * The real sidebar is an opaque white column, and that column is the one thing
 * that breaks a full-bleed scene: the landscape stops dead at 12rem. This is
 * the same navigation as a floating smoked-glass slab instead - inset from
 * every edge, rounded, with the landscape running behind it and visible in the
 * gutter all around it. Collapsed it is a 4rem strip of icons; hovering it or
 * tabbing into it widens it to the labels OVER the content, so nothing on the
 * page reflows. The navbar's own sidebar trigger still works: it pins the rail
 * open, which is the one state where the content does move aside.
 *
 * Below md there is no hover and no room, so the rail is gone and the same
 * trigger opens it as a drawer over the scene.
 *
 * The items, their order and their links are taken from
 * components/layout/app-sidebar.tsx rather than invented, including the
 * guided/self-led swap of "Studies" and "Lezen" - if the real nav gains an
 * item, this one is honestly one item short rather than quietly wrong.
 */

type NavItem = { title: string; url: string; icon: ElementType }

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Studies", url: "/studies", icon: BookMarked },
  { title: "Lezen", url: "/lezen", icon: BookOpen },
  { title: "Notities", url: "/notities", icon: StickyNote },
]
/** Someone who reads on their own gets "Lezen" above "Studies"; nothing else moves. */
const mainNavSelfLed: NavItem[] = [mainNav[0], mainNav[2], mainNav[1], ...mainNav.slice(3)]

const bottomNav: NavItem[] = [
  { title: "Profiel", url: "/profiel", icon: User },
  { title: "Instellingen", url: "/instellingen", icon: Settings },
  { title: "Feedback", url: "/feedback", icon: MessageSquareText },
]

const LABEL_BASE = "whitespace-nowrap text-[13.5px] transition-[opacity,transform] duration-200"
/** Hidden until the rail widens - faded and nudged, so it slides in with the width. */
const LABEL_TUCKED =
  "opacity-0 -translate-x-1 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 " +
  "group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100"

export default function GlasRail() {
  const { open, openMobile, setOpenMobile } = useSidebar()
  const { studyStyle } = useStudyStyle()
  const { data: session } = useSession()
  const pathname = usePathname()

  const nav = studyStyle === "self" ? mainNavSelfLed : mainNav
  const isAdmin = Boolean(session?.user?.isAdmin)

  /**
   * Which item is lit. `/proefdashboard/*` counts as the dashboard: this page
   * IS the dashboard being tried on, and a rail with nothing current reads as
   * broken rather than as a preview.
   */
  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard" || Boolean(pathname?.startsWith("/proefdashboard"))
    return pathname === url || Boolean(pathname?.startsWith(url + "/"))
  }

  const items = (list: NavItem[], showLabel: boolean, onNavigate?: () => void) =>
    list.map(item => (
      <RailItem
        key={item.url}
        {...item}
        active={isActive(item.url)}
        showLabel={showLabel}
        onNavigate={onNavigate}
      />
    ))

  return (
    <>
      {/* ── Desktop: a floating rail that overlays rather than pushes ── */}
      <nav
        aria-label="Hoofdnavigatie"
        style={CHROME_SHADOW}
        className={[
          "group/rail absolute inset-y-3 left-3 z-30 hidden flex-col overflow-hidden",
          "transition-[width] duration-300 ease-out md:flex",
          GLASS_CHROME,
          open ? "w-52" : "w-16 hover:w-52 focus-within:w-52",
        ].join(" ")}
      >
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto overflow-x-hidden p-2">
          {items(nav, open)}
          {isAdmin && (
            <RailItem title="Beheer" url="/admin" icon={ShieldCheck} active={isActive("/admin")} showLabel={open} />
          )}
        </ul>
        <div className="flex-none border-t border-white/15 p-2">
          <ul className="m-0 flex list-none flex-col gap-1">{items(bottomNav, open)}</ul>
        </div>
      </nav>

      {/* ── Below md: the same trigger opens it as a drawer ── */}
      {openMobile && (
        <div className="absolute inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Menu sluiten"
            onClick={() => setOpenMobile(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-sm"
          />
          <nav
            aria-label="Hoofdnavigatie"
            style={CHROME_SHADOW}
            className={`absolute inset-y-3 left-3 flex w-60 flex-col ${GLASS_CHROME}`}
          >
            <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto p-2">
              {items(nav, true, () => setOpenMobile(false))}
              {isAdmin && (
                <RailItem
                  title="Beheer"
                  url="/admin"
                  icon={ShieldCheck}
                  active={isActive("/admin")}
                  showLabel
                  onNavigate={() => setOpenMobile(false)}
                />
              )}
            </ul>
            <div className="flex-none border-t border-white/15 p-2">
              <ul className="m-0 flex list-none flex-col gap-1">
                {items(bottomNav, true, () => setOpenMobile(false))}
              </ul>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}

/* ── Pieces ───────────────────────────────────────────────────── */

function RailItem({
  title,
  url,
  icon: Icon,
  active,
  showLabel,
  onNavigate,
}: NavItem & { active: boolean; showLabel: boolean; onNavigate?: () => void }) {
  return (
    <li className="list-none">
      <Link
        href={url}
        title={title}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={[
          "relative flex h-10 items-center gap-3 rounded-xl pl-[13px] pr-3 no-underline transition-colors",
          FOCUS,
          active ? "bg-white/20 font-semibold text-white" : "font-normal text-white/70 hover:bg-white/10 hover:text-white",
        ].join(" ")}
      >
        {/* The current page gets a teal marker, not a coloured icon: the icon's
            job is to name the destination, and colour is the wrong signal for
            that. */}
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
            style={{ backgroundColor: TEAL }}
          />
        )}
        <Icon size={18} className="flex-shrink-0" aria-hidden />
        <span className={`${LABEL_BASE} ${showLabel ? "" : LABEL_TUCKED}`}>{title}</span>
      </Link>
    </li>
  )
}
