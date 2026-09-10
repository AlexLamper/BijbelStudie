"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BookMarked, BookOpen, LayoutDashboard, MessageSquareText,
  Settings, ShieldCheck, StickyNote, User,
} from "lucide-react"
import { useStudyStyle } from "../providers/study-style-provider"
import { RAIL_LABEL, RAIL_REST, TEAL_ON_DARK } from "./tokens"

/**
 * The sidebar, solved for a full-bleed scene.
 *
 * The permanent 16rem white column is the one piece of chrome that cuts the
 * landscape in half, so it is gone. What replaces it is a narrow rail that
 * stands IN the landscape instead of taking a white column out of it - 64px of
 * glass, the same width at every breakpoint, in every state, forever.
 *
 * Two things are different from the rail /studie uses (`StudyRail` in
 * components/layout/app-sidebar.tsx), because here it sits on a picture rather
 * than on a white page:
 *
 *  - It is glass. The rail is a film of white over a blur, so the sky and the
 *    land keep running underneath it; the legibility comes from the page's own
 *    left scrim behind it, not from painting the rail solid.
 *  - It tightens as the reader scrolls. `--veil`, the same variable that darkens
 *    the scene behind the working panels, fades in the rail's dark base - at the
 *    top of the page the rail is barely there, over the panels it is a defined
 *    edge. Opacity only, so it costs nothing.
 *
 * HOW YOU FIND OUT WHAT AN ICON IS: ONE LABEL, NOT A WIDER RAIL.
 *
 * The rail used to widen on hover and show all eight labels at once. Three
 * versions of that were tried and every one of them cost the page width it
 * should not have had to pay - 176px of translucent panel ghosting over the
 * headings; then a 192px gutter reserved for a rail the reader saw for a
 * second; then a tighter 96/112px version of the same bargain (the whole story
 * is in SCENE_X, in tokens.ts). The question a reader actually asks is never
 * "what are all eight of these?" - it is "what is THIS one?".
 *
 * So the rail does not move. Hovering or keyboard-focusing a single item floats
 * that item's label out to the right of its icon, over the scene: absolutely
 * positioned and `pointer-events-none`, so it is not in the layout, pushes
 * nothing, and cannot be hovered itself. Everything the old open state carried
 * is still here - every item is a real link in tab order with its name on
 * `title` and in an `sr-only` span, `aria-current` marks the page, the teal
 * indicator marks it again in colour, and the focus ring is untouched. The
 * label answers `focus-within` as well as `hover`, so it arrives for the tab
 * key exactly as it does for the pointer, and `motion-reduce` drops the fade.
 *
 * The right-hand hairline is permanent rather than veil-driven. At the top of a
 * page the rail had no edge at all, which is half of why it read as a smear
 * over the page rather than as a rail beside it.
 *
 * Below `lg` there is no room for a rail and no hover to open one, so the same
 * items become a horizontally scrollable strip of pills that sticks under the
 * navbar. One list of links, two shapes. Unchanged by any of the above.
 *
 * The items and the links are the real ones, read off app-sidebar.tsx, in the
 * order that file's `useStudyStyle` puts them in.
 */

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
}

const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Studies",   url: "/studies",   icon: BookMarked },
  { title: "Lezen",     url: "/lezen",     icon: BookOpen },
  { title: "Notities",  url: "/notities",  icon: StickyNote },
]

/** "Zelf lezen" swaps Lezen and Studies, exactly as the real sidebar does. */
const MAIN_NAV_SELF: NavItem[] = [MAIN_NAV[0], MAIN_NAV[2], MAIN_NAV[1], MAIN_NAV[3]]

const BOTTOM_NAV: NavItem[] = [
  { title: "Profiel",      url: "/profiel",      icon: User },
  { title: "Instellingen", url: "/instellingen", icon: Settings },
  { title: "Feedback",     url: "/feedback",     icon: MessageSquareText },
]

/**
 * Which item the reader is standing on. */
function useIsActive() {
  const pathname = usePathname() ?? ""
  return (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard"
    return pathname === url || pathname.startsWith(url + "/")
  }
}

function useNav(): NavItem[] {
  const { studyStyle } = useStudyStyle()
  const { data: session } = useSession()
  const main = studyStyle === "self" ? MAIN_NAV_SELF : MAIN_NAV
  return session?.user?.isAdmin
    ? [...main, { title: "Beheer", url: "/admin", icon: ShieldCheck }]
    : main
}

/* ── The rail, lg and up ─────────────────────────────────────── */

/**
 * One row of the rail: the icon, and beside it a label that is not in the row.
 *
 * The row is centred rather than left-inset, so the icons ride the rail's own
 * centre line. The label is a sibling of the link rather than a child of it:
 * `absolute left-full` on the `<li>` puts it just past the rail's right edge,
 * `pointer-events-none` keeps it from stealing the hover that summoned it, and
 * being out of flow it can be `whitespace-nowrap` - no truncation, no ellipsis,
 * and no length of Dutch that can push the rail wider, because nothing about
 * the label touches the rail's box.
 *
 * The group is per ITEM (`group/item`), which is the entire difference from
 * what this file used to do: one label at a time, belonging to the icon the
 * reader is actually pointing at.
 *
 * The name is on the link three times over, and each one is doing a job:
 * `sr-only` gives the link a real accessible name (an icon alone has none),
 * `title` serves a pointer that hovers without reading the float, and the float
 * itself is `aria-hidden` so a screen reader is not told twice.
 */
function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <li className="group/item relative list-none">
      <Link
        href={item.url}
        title={item.title}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-10 w-full items-center justify-center rounded-lg px-1 py-2 no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
          active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        {active && (
          <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full" style={{ backgroundColor: TEAL_ON_DARK }} />
        )}
        <Icon size={18} className="flex-shrink-0" style={active ? { color: TEAL_ON_DARK } : undefined} />
        <span className="sr-only">{item.title}</span>
      </Link>

      {/* The float. `-translate-x-1` -> `translate-x-0` is a 4px lean out of the
          rail rather than a slide, so it reads as the icon naming itself and
          not as a drawer opening; `motion-reduce` drops the movement and the
          fade and leaves a label that is simply there or not. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 -translate-x-1 whitespace-nowrap opacity-0 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none group-hover/item:translate-x-0 group-hover/item:opacity-100 group-focus-within/item:translate-x-0 group-focus-within/item:opacity-100 ${RAIL_LABEL}`}
      >
        {item.title}
      </span>
    </li>
  )
}

/* ── The strip, below lg ─────────────────────────────────────── */

function PillItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <li className="list-none">
      <Link
        href={item.url}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
          active ? "bg-white/20 font-semibold text-white" : "font-normal text-white/75 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon size={15} className="flex-shrink-0" style={active ? { color: TEAL_ON_DARK } : undefined} />
        {item.title}
      </Link>
    </li>
  )
}

export default function SceneRail() {
  const nav = useNav()
  const isActive = useIsActive()

  return (
    <>
      {/* No `overflow-hidden` and no width transition: the box is 64px and stays
          64px, and the labels have to be able to leave it. The three painted
          layers below are all `inset-0`, so nothing but a label ever crosses
          the edge. */}
      <nav
        aria-label="Hoofdnavigatie"
        className={`fixed bottom-0 left-0 top-14 z-40 hidden flex-col lg:flex ${RAIL_REST}`}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/[0.07] backdrop-blur-md" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/40"
          style={{ opacity: "var(--veil, 0)" }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/20" />

        {/* Icon-only rows are 40px, so all eight fit in about 356px and the list
            does not need to scroll on any screen wide enough to show a rail at
            all. It is left able to, at heights where it genuinely does not fit,
            because losing the bottom three items to a clipped column would put
            them out of reach of the pointer AND the tab key.
            The cost of that scroller is the labels: a box that scrolls on one
            axis clips both, so below the breakpoint the float is cut off at the
            rail's edge and `title` is what names the icon. That trade is the
            right way round - 440px-tall windows are rare, unreachable
            navigation never is. */}
        <div className="relative flex h-full min-h-0 flex-col px-1.5 py-2 [@media(max-height:440px)]:overflow-y-auto [@media(max-height:440px)]:overscroll-contain">
          <ul className="m-0 flex flex-col gap-0.5 p-0">
            {nav.map(item => (
              <RailItem key={item.url} item={item} active={isActive(item.url)} />
            ))}
          </ul>

          <div className="flex-1" />

          <ul className="m-0 flex flex-col gap-0.5 border-t border-white/15 p-0 pt-2">
            {BOTTOM_NAV.map(item => (
              <RailItem key={item.url} item={item} active={isActive(item.url)} />
            ))}
          </ul>
        </div>
      </nav>

      <nav
        aria-label="Hoofdnavigatie"
        className="sticky top-14 z-40 lg:hidden"
      >
        <div className="relative overflow-x-auto bg-black/80 backdrop-blur-md">
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/20" />
          <ul className="m-0 flex items-center gap-1 px-3 py-2">
            {[...nav, ...BOTTOM_NAV].map(item => (
              <PillItem key={item.url} item={item} active={isActive(item.url)} />
            ))}
          </ul>
        </div>
      </nav>
    </>
  )
}
