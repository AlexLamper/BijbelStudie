"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BookMarked, BookOpen, LayoutDashboard, MessageSquareText,
  Settings, ShieldCheck, StickyNote, User,
} from "lucide-react"
import { useStudyStyle } from "../providers/study-style-provider"
import { RAIL_W, TEAL_ON_DARK } from "./tokens"

/**
 * The sidebar, solved for a full-bleed scene.
 *
 * The permanent 16rem white column is the one piece of chrome that cuts the
 * landscape in half, so it is gone. What replaces it is a rail that stands IN
 * the landscape instead of taking a white column out of it: a strip of glass
 * down the left edge with every icon and its label on show, the same width
 * (RAIL_W, 13rem) at every breakpoint, in every state, forever.
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
 * NO HOVER STATE. NO EXPANSION. JUST THE LABELS.
 *
 * Three versions of a rail that had to be hovered to be read were built and
 * every one was rejected: one that widened to 176px over the headings, one that
 * widened to exactly its gutter with the labels under the icons, and one that
 * stayed 64px and floated a single label out over the scene. The owner's
 * verdict was "not the expanding - just the labels", and that is what this is.
 * A reader never has to move the pointer to find out what an icon means, the
 * page never reflows, and there is no state in which the rail is wider than
 * the strip it stands in (`SCENE_X` reserves exactly RAIL_W plus the page's
 * side margin), so it cannot cover a glyph.
 *
 * GUESTS SEE THE WHOLE RAIL.
 *
 * Every item is rendered whether or not there is a session. The account-bound
 * routes (Dashboard, Notities, Profiel, Instellingen, Feedback) are no longer
 * bounced to "/" by the middleware; each of their layouts renders a
 * `GuestGate` (components/auth/GuestGate.tsx) for a visitor without an account,
 * so a guest who clicks Notities lands on a page that says what Notities is and
 * offers the way in. What a guest gets INSTEAD of the profile bits is the pair
 * of account actions at the foot of the rail.
 *
 * Below `lg` there is no room for a rail, so the same items become a
 * horizontally scrollable strip of pills that sticks under the navbar. One list
 * of links, two shapes.
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

/**
 * Where a guest goes to get an account, carrying the page they were on so they
 * land back on it. `next` is the parameter app/inloggen and app/registreren
 * actually read (through lib/safeRedirect).
 */
function useAccountHrefs() {
  const pathname = usePathname() ?? "/"
  const next = encodeURIComponent(pathname)
  return {
    signIn: `/inloggen?next=${next}`,
    register: `/registreren?next=${next}`,
  }
}

/* ── The rail, lg and up ─────────────────────────────────────── */

/**
 * One row of the rail: the icon, and beside it the label. Always both.
 *
 * `whitespace-nowrap` plus `truncate` is belt and braces: RAIL_W is sized so no
 * label in the list can reach the edge, and if a future label ever does, it is
 * clipped inside its own row rather than allowed to push the rail wider - which
 * is the one thing this rail may not do.
 */
function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <li className="group/item relative list-none">
      <Link
        href={item.url}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-3 no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
          active ? "bg-white/15 font-semibold text-white" : "font-medium text-white/75 hover:bg-white/10 hover:text-white"
        }`}
      >
        {active && (
          <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full" style={{ backgroundColor: TEAL_ON_DARK }} />
        )}
        <Icon size={18} className="flex-shrink-0" style={active ? { color: TEAL_ON_DARK } : undefined} />
        <span className="min-w-0 truncate whitespace-nowrap text-[13.5px]">{item.title}</span>
      </Link>
    </li>
  )
}

/**
 * The account block a guest gets at the foot of the rail, where a signed-in
 * reader has nothing extra (their profile is an item above). White is the one
 * fill guaranteed to separate from whatever the landscape is doing behind the
 * glass, so Inloggen is the white pill and Registreren the quiet line under it.
 */
function GuestAccountBlock() {
  const hrefs = useAccountHrefs()
  return (
    <div className="mt-2 border-t border-white/15 px-1 pt-3">
      <p className="px-2 text-[11.5px] leading-snug text-white/65">
        Bewaar je voortgang met een gratis account.
      </p>
      <Link
        href={hrefs.signIn}
        className="press mt-2.5 flex h-9 w-full items-center justify-center rounded-lg bg-white text-[13px] font-semibold text-gray-900 no-underline outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488]"
      >
        Inloggen
      </Link>
      <Link
        href={hrefs.register}
        className="mt-1 flex h-9 w-full items-center justify-center rounded-lg text-[13px] font-semibold text-white/85 no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
      >
        Registreren
      </Link>
    </div>
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

function GuestPill() {
  const hrefs = useAccountHrefs()
  return (
    <li className="list-none">
      <Link
        href={hrefs.signIn}
        className="flex items-center whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-gray-900 no-underline outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#0D9488]"
      >
        Inloggen
      </Link>
    </li>
  )
}

export default function SceneRail() {
  const nav = useNav()
  const isActive = useIsActive()
  const { data: session } = useSession()
  const guest = !session

  return (
    <>
      {/* No width transition and no `group` hover: the box is RAIL_W and stays
          RAIL_W. The painted layers below are all `inset-0`, so nothing ever
          crosses its right edge. */}
      <nav
        aria-label="Hoofdnavigatie"
        className={`fixed bottom-0 left-0 top-14 z-40 hidden flex-col lg:flex ${RAIL_W}`}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/[0.07] backdrop-blur-md" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/40"
          style={{ opacity: "var(--veil, 0)" }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/20" />

        {/* Rows are 40px, so all eight fit in about 360px and the list does not
            need to scroll on any screen wide enough to show a rail at all. It is
            left able to at heights where it genuinely does not fit (a guest's
            account block adds another 100px), because losing the bottom items
            to a clipped column would put them out of reach of the pointer AND
            the tab key. */}
        <div className="relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-2 py-3">
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

          {guest && <GuestAccountBlock />}
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
            {guest && <GuestPill />}
          </ul>
        </div>
      </nav>
    </>
  )
}
