"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard, BookOpen, BookMarked, StickyNote,
  User, Settings, MessageSquareText, ShieldCheck,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { useStudyStyle } from "../../../providers/study-style-provider"

const TEAL = "#0D9488"

/**
 * Navigation for versie-2, "Uitzicht".
 *
 * The permanent 12rem column is what breaks the full-bleed scene, so it is
 * gone: what is left is a 56px glass rail that FLOATS in the left margin of
 * the landscape, outside the content sheet, and widens to 13rem on hover
 * without pushing anything - the same trick `StudyRail` uses on /studie, for
 * the same reason. The landscape runs behind and around it.
 *
 * The items and the links are the real sidebar's, in the real order (the
 * study-style preference swaps Studies and Lezen exactly as
 * components/layout/app-sidebar.tsx does), so nothing here is invented.
 *
 * Below lg there is no hover and no margin to float in, so the same items are
 * a scrollable row of labelled pills that the shell places in the band above
 * the sheet.
 *
 * Everything is drawn in literal black/white glass rather than theme tokens:
 * it sits on the scene, which can be a noon sky or a midnight one.
 */

type NavItem = { title: string; url: string; icon: React.ElementType }

const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Studies",   url: "/studies",   icon: BookMarked },
  { title: "Lezen",     url: "/lezen",     icon: BookOpen },
  { title: "Notities",  url: "/notities",  icon: StickyNote },
]

/** "Zelf lezen": Lezen and Studies trade places, nothing else moves. */
const MAIN_NAV_SELF: NavItem[] = [MAIN_NAV[0], MAIN_NAV[2], MAIN_NAV[1], MAIN_NAV[3]]

const BOTTOM_NAV: NavItem[] = [
  { title: "Profiel",      url: "/profiel",      icon: User },
  { title: "Instellingen", url: "/instellingen", icon: Settings },
  { title: "Feedback",     url: "/feedback",     icon: MessageSquareText },
]

function useNavItems() {
  const { studyStyle } = useStudyStyle()
  const { data: session } = useSession()
  const main = studyStyle === "self" ? MAIN_NAV_SELF : MAIN_NAV
  // Read off the session rather than fetching /api/user again: the root layout
  // already awaits `getServerSession(authOptions)`, so `isAdmin` is on it.
  const admin: NavItem[] = session?.user?.isAdmin
    ? [{ title: "Beheer", url: "/admin", icon: ShieldCheck }]
    : []
  return { main: [...main, ...admin], bottom: BOTTOM_NAV }
}

/**
 * `/proefdashboard/*` IS the dashboard, so Dashboard is the current item here.
 * Without this nothing in the rail would ever be marked, and a nav with no
 * current item tells the reader nothing about where they are.
 */
function useIsCurrent() {
  const pathname = usePathname()
  return (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard" || Boolean(pathname?.startsWith("/proefdashboard"))
    return pathname === url || Boolean(pathname?.startsWith(url + "/"))
  }
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"

/* ── The floating rail (lg and up) ─────────────────────────────── */

export function UitzichtRail({
  pinned,
  onTogglePin,
}: {
  pinned: boolean
  onTogglePin: () => void
}) {
  const { main, bottom } = useNavItems()
  const isCurrent = useIsCurrent()

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className={[
        "group/rail fixed bottom-4 left-3 top-[4.5rem] z-30 hidden flex-col overflow-hidden rounded-2xl",
        "border border-white/20 bg-black/45 shadow-[0_28px_70px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl",
        "transition-[width] duration-300 ease-out lg:flex",
        pinned ? "w-52" : "w-14 hover:w-52",
      ].join(" ")}
    >
      <Link
        href="/dashboard"
        className={`flex h-12 flex-none items-center gap-3 px-[15px] no-underline ${FOCUS}`}
      >
        <Image src="/images/icon-192.png" alt="" width={24} height={24} className="flex-shrink-0 rounded-md" />
        <RailLabel pinned={pinned} className="text-[15px] font-bold tracking-tight text-white">
          BijbelStudie
        </RailLabel>
      </Link>

      <div aria-hidden className="mx-2 h-px flex-none bg-white/15" />

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {main.map(item => (
            <RailLink key={item.url} item={item} pinned={pinned} current={isCurrent(item.url)} />
          ))}
        </ul>
      </div>

      <div className="flex-none border-t border-white/15 p-2">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {bottom.map(item => (
            <RailLink key={item.url} item={item} pinned={pinned} current={isCurrent(item.url)} />
          ))}
        </ul>

        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={pinned}
          aria-label={pinned ? "Menu losmaken" : "Menu vastzetten"}
          className={`mt-1 flex h-9 w-full items-center gap-3 rounded-lg px-[11px] text-white/70 transition-colors hover:bg-white/15 hover:text-white ${FOCUS}`}
        >
          {pinned
            ? <ChevronLeft size={18} aria-hidden className="flex-shrink-0" />
            : <ChevronRight size={18} aria-hidden className="flex-shrink-0" />}
          <RailLabel pinned={pinned} className="text-[13px]">
            {pinned ? "Losmaken" : "Vastzetten"}
          </RailLabel>
        </button>
      </div>
    </nav>
  )
}

/**
 * The label slides in with the widening rail rather than appearing halfway
 * through the animation. It stays in the accessibility tree while collapsed,
 * so every rail item keeps its name at 56px.
 */
function RailLabel({
  pinned,
  className = "",
  children,
}: {
  pinned: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={[
        "whitespace-nowrap transition-[opacity,transform] duration-200",
        pinned ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover/rail:translate-x-0 group-hover/rail:opacity-100",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  )
}

function RailLink({
  item,
  pinned,
  current,
}: {
  item: NavItem
  pinned: boolean
  current: boolean
}) {
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
          current ? "font-semibold text-white" : "font-normal text-white/75 hover:bg-white/15 hover:text-white",
        ].join(" ")}
        style={current ? { backgroundColor: TEAL } : undefined}
      >
        <Icon size={18} aria-hidden className="flex-shrink-0" />
        <RailLabel pinned={pinned} className="text-[13.5px]">{item.title}</RailLabel>
      </Link>
    </li>
  )
}

/* ── The same nav, narrow screens ──────────────────────────────── */

/**
 * Below lg: one scrollable row of labelled pills on the scene, above the
 * sheet. No hover to depend on and nothing hidden behind a toggle - on a phone
 * the whole menu is seven short words, so showing them costs less than a
 * drawer would.
 */
export function UitzichtNavStrip({ className = "" }: { className?: string }) {
  const { main, bottom } = useNavItems()
  const isCurrent = useIsCurrent()

  return (
    <nav aria-label="Hoofdnavigatie" className={`lg:hidden ${className}`}>
      {/* Bleeds to the band's own edges so the scroll runs to the screen edge,
          then puts the inset back inside as padding. */}
      <ul className="-mx-3 my-0 flex list-none gap-2 overflow-x-auto px-3 pb-1 pt-0.5 sm:-mx-5 sm:px-5">
        {[...main, ...bottom].map(item => {
          const Icon = item.icon
          const current = isCurrent(item.url)
          return (
            <li key={item.url} className="list-none">
              <Link
                href={item.url}
                aria-current={current ? "page" : undefined}
                className={[
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] no-underline backdrop-blur-md transition-colors",
                  FOCUS,
                  current
                    ? "border-transparent font-semibold text-white"
                    : "border-white/25 bg-black/35 font-normal text-white/85 hover:bg-black/55 hover:text-white",
                ].join(" ")}
                style={current ? { backgroundColor: TEAL } : undefined}
              >
                <Icon size={14} aria-hidden className="flex-shrink-0" />
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
