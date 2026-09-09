"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ElementType } from "react"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  BookMarked,
  BookOpen,
  StickyNote,
  ShieldCheck,
  User,
  Settings,
  MessageSquareText,
} from "lucide-react"
import { useStudyStyle } from "../../../providers/study-style-provider"
import { SHELL } from "./shell"

/**
 * The sidebar's destinations, laid flat under the navbar.
 *
 * This is the whole argument of ontwerp 5. The rail was never navigation the
 * reader looked at; it was navigation the reader occasionally used, parked in a
 * permanent 12rem column that stood in the middle of the landscape all day. A
 * row costs one line of chrome instead of one column, it attaches to the navbar
 * that is already there - same white, same border, same sticky stack - and
 * below it the scene is uninterrupted from edge to edge.
 *
 * Every item the sidebar has is here, and every one of them is a single click:
 * the four main destinations on the left, the three account destinations on the
 * right, Beheer for an admin, in the sidebar's own order and with the sidebar's
 * own active treatment. Nothing is folded into a menu, because a menu would
 * turn "one click" into two and would hand back the argument.
 *
 * The row scrolls sideways rather than wrapping when the viewport is narrow, so
 * the belt is always exactly one line tall and the scene below it never moves.
 */

type NavItem = { title: string; url: string; icon: ElementType }

const MAIN: readonly NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Studies", url: "/studies", icon: BookMarked },
  { title: "Lezen", url: "/lezen", icon: BookOpen },
  { title: "Notities", url: "/notities", icon: StickyNote },
]

/** The self-led order, derived exactly as the sidebar derives it. */
const MAIN_SELF_LED: readonly NavItem[] = [MAIN[0], MAIN[2], MAIN[1], MAIN[3]]

const ACCOUNT: readonly NavItem[] = [
  { title: "Profiel", url: "/profiel", icon: User },
  { title: "Instellingen", url: "/instellingen", icon: Settings },
  { title: "Feedback", url: "/feedback", icon: MessageSquareText },
]

export default function NavigatieBalk() {
  const { studyStyle } = useStudyStyle()
  const main = studyStyle === "self" ? MAIN_SELF_LED : MAIN

  return (
    <div className="sticky top-14 z-40 border-b border-border bg-white dark:bg-background">
      <nav aria-label="Hoofdnavigatie" className={`${SHELL} flex items-center gap-1 overflow-x-auto py-1.5`}>
        <ul className="m-0 flex list-none flex-shrink-0 items-center gap-1 p-0">
          {main.map(item => (
            <li key={item.url} className="list-none">
              <BeltLink {...item} />
            </li>
          ))}
          <BeheerItem />
        </ul>

        <span aria-hidden className="ml-auto mr-2 h-5 w-px flex-shrink-0 bg-border" />

        <ul className="m-0 flex list-none flex-shrink-0 items-center gap-1 p-0">
          {ACCOUNT.map(item => (
            <li key={item.url} className="list-none">
              <BeltLink {...item} subdued />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

/* -- Pieces --------------------------------------------------- */

function BeltLink({
  url,
  title,
  icon: Icon,
  subdued = false,
}: NavItem & { subdued?: boolean }) {
  const pathname = usePathname()
  // A candidate under /proefdashboard *is* the dashboard, so it lights the
  // dashboard item up: the active state is the thing being judged here, and a
  // belt with nothing current in it would prove nothing.
  const active =
    pathname === url ||
    (url !== "/dashboard" && pathname?.startsWith(`${url}/`)) ||
    (url === "/dashboard" && Boolean(pathname?.startsWith("/proefdashboard")))

  return (
    <Link
      href={url}
      aria-current={active ? "page" : undefined}
      className={[
        "flex flex-shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13.5px] no-underline transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-background",
        active
          ? "font-semibold bg-[rgba(13,148,136,0.08)] text-[#0D9488] dark:bg-[rgba(13,148,136,0.12)] dark:text-[#2DD4BF]"
          : subdued
            ? "font-normal text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-secondary dark:hover:text-foreground"
            : "font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-secondary dark:hover:text-foreground",
      ].join(" ")}
    >
      <Icon size={15} className="flex-shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{title}</span>
    </Link>
  )
}

/** Beheer, on the same terms the rail shows it: only to an admin. */
function BeheerItem() {
  const { data: session, status } = useSession()
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(session?.user?.isAdmin))

  useEffect(() => {
    if (status !== "authenticated") return
    if (session?.user?.isAdmin) {
      setIsAdmin(true)
      return
    }
    fetch("/api/user")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.user?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
  }, [session, status])

  if (!isAdmin) return null
  return (
    <li className="list-none">
      <BeltLink url="/admin" title="Beheer" icon={ShieldCheck} />
    </li>
  )
}
