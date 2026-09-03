"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from "../ui/sidebar"
import {
  LayoutDashboard, BookOpen, BookMarked,
  StickyNote, User, Settings, Sparkles, ShieldCheck,
  ArrowRight, Check, MessageSquareText,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import React, { useEffect, useState } from "react"
import { useStudyStyle } from "../providers/study-style-provider"

/**
 * The nav as someone who wants to be guided sees it - and the order the menu
 * has always had, so it is also what an account that never answered onboarding
 * gets.
 *
 * "Studies" is the guided step-by-step flow and sits above "Lezen" - this is a
 * study app before it is a reader, and the nav should say so. "Lezen" is free
 * browsing plus the reference panels. /studie is no longer a page of its own -
 * it resumes whichever study you were last working on.
 */
const mainNav = [
  { title: "Dashboard",    url: "/dashboard",    icon: LayoutDashboard, tourId: "nav-dashboard"    },
  { title: "Studies",      url: "/studies",      icon: BookMarked,      tourId: "nav-studies"      },
  { title: "Lezen",        url: "/lezen",        icon: BookOpen,        tourId: "nav-studie"       },
  // TEMPORARILY HIDDEN: Groepen.
  //   { title: "Groepen", url: "/groepen", icon: Users, tourId: "nav-groepen" },
  // (`Users` was dropped from the lucide import above with it; put it back too.)
  // The feature is unfinished and effectively unused, so it is taken out of the
  // navigation rather than out of the codebase: /groepen, its API and its models
  // all still work, and restoring the line above puts it back. The guided tour
  // step that pointed at this item was removed with it - a tour that highlights
  // an element that no longer renders stalls on that step.
  { title: "Notities",     url: "/notities",     icon: StickyNote,      tourId: "nav-notities"     },
  // /hulpbronnen, /bijbelboeken and /bijbelstudie are public reference pages,
  // not things a signed-in user works in. They stay online and in the sitemap;
  // they are simply not part of the app's own navigation.
]

/**
 * The same nav for someone who told onboarding they would rather read on their
 * own: "Lezen" and "Studies" trade places, nothing else moves.
 *
 * Derived from `mainNav` rather than written out again so the two lists can
 * never drift - a nav item added above still exists in both orders. Built once
 * at module scope: this is two constants, not a per-render computation.
 */
const mainNavSelfLed = [mainNav[0], mainNav[2], mainNav[1], ...mainNav.slice(3)]

/**
 * The nav in the order this user asked for.
 *
 * Both consumers below render this - `NavLink` in the full sidebar and
 * `RailLink` in the study-mode rail - which is the whole reason the choice is
 * resolved here instead of at either call site.
 *
 * `useStudyStyle` reads a value the server put in the HTML (see
 * components/providers/study-style-provider.tsx), so the first render already
 * has the final order. There is no fetch to wait on and therefore no frame in
 * which the menu is in the wrong order and then rearranges itself.
 */
function useMainNav() {
  const { studyStyle } = useStudyStyle()
  return studyStyle === "self" ? mainNavSelfLed : mainNav
}

const bottomNav = [
  { title: "Profiel",      url: "/profiel",      icon: User,              tourId: "nav-profiel"      },
  { title: "Instellingen", url: "/instellingen", icon: Settings,          tourId: "nav-instellingen" },
  { title: "Feedback",     url: "/feedback",     icon: MessageSquareText, tourId: "nav-feedback"     },
]

function NavLink({ url, title, icon: Icon, tourId }: { url: string; title: string; icon: React.ElementType; tourId?: string }) {
  const pathname = usePathname()
  const active = pathname === url || (url !== "/dashboard" && pathname?.startsWith(url + "/"))

  return (
    // `data-track` reuses the tour's own ids, prefixed: one naming scheme, two
    // consumers, and a nav item can never be instrumented under two names.
    <li
      className="list-none"
      data-tour={tourId}
      data-track={tourId ? tourId.replace(/^nav-/, "sidebar_") : undefined}
    >
      <Link
        href={url}
        className={[
          "flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13.5px] transition-colors no-underline",
          active
            ? "font-semibold bg-[rgba(13,148,136,0.08)] text-[#0D9488] dark:bg-[rgba(13,148,136,0.12)] dark:text-[#2DD4BF]"
            : "font-normal text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground",
        ].join(" ")}
      >
        <Icon size={16} className="flex-shrink-0" />
        <span>{title}</span>
      </Link>
    </li>
  )
}

/**
 * One row of the study-mode rail: icon always, label only while the rail is
 * hovered open.
 *
 * The label is faded and nudged rather than `hidden`, so the text slides in with
 * the widening rail instead of appearing mid-animation in a box that is still
 * 56px wide. `whitespace-nowrap` plus the rail's `overflow-hidden` is what keeps
 * it from wrapping onto a second line while the width is in flight.
 */
function RailLink({ url, title, icon: Icon, tourId }: { url: string; title: string; icon: React.ElementType; tourId?: string }) {
  const pathname = usePathname()
  const active = pathname === url || (url !== "/dashboard" && pathname?.startsWith(url + "/"))

  return (
    <li
      className="list-none"
      data-tour={tourId}
      data-track={tourId ? tourId.replace(/^nav-/, "sidebar_") : undefined}
    >
      <Link
        href={url}
        title={title}
        className={[
          "flex items-center gap-3 h-9 px-[11px] rounded-lg no-underline transition-colors",
          active
            ? "font-semibold bg-[rgba(13,148,136,0.08)] text-[#0D9488] dark:bg-[rgba(13,148,136,0.12)] dark:text-[#2DD4BF]"
            : "font-normal text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground",
        ].join(" ")}
      >
        <Icon size={18} className="flex-shrink-0" />
        <span className="text-[13.5px] whitespace-nowrap opacity-0 -translate-x-1 transition-[opacity,transform] duration-200 group-hover/rail:opacity-100 group-hover/rail:translate-x-0">
          {title}
        </span>
      </Link>
    </li>
  )
}

function RailAdminLink() {
  const { data: session, status } = useSession()
  const [isAdmin, setIsAdmin] = useState<boolean>(!!session?.user?.isAdmin)

  useEffect(() => {
    if (status !== "authenticated") return
    if (session?.user?.isAdmin) { setIsAdmin(true); return }
    fetch("/api/user")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.isAdmin) setIsAdmin(true) })
      .catch(() => {})
  }, [session, status])

  if (!isAdmin) return null
  return <RailLink url="/admin" title="Beheer" icon={ShieldCheck} />
}

/**
 * Navigation for the guided study flow: a 56px icon rail that widens to the
 * full sidebar on hover.
 *
 * A lesson is meant to be read, not navigated away from, so the permanent 12rem
 * column of links, the Pro card and the page chrome around it were all competing
 * with the passage. What is left is a strip of icons at the same width as the
 * navbar is tall; the whole sidebar is still one hover away and floats OVER the
 * lesson rather than pushing it sideways, so nothing reflows when it opens.
 *
 * The Pro card is deliberately not here. It is an advert, and this is the one
 * screen where the reader is doing the thing they came for.
 *
 * Desktop only. On a phone there is no hover and no room to spare; the flow's
 * own close button is the way out.
 */
export function StudyRail() {
  const nav = useMainNav()

  return (
    <div className="hidden md:block flex-none w-14">
      <nav
        aria-label="Hoofdnavigatie"
        // z-[60], above the study flow's header (z-50). At z-40 the rail slid
        // out UNDER the top beam - open on the lesson body, clipped by the bar
        // above it. Navigation that is half-covered by chrome reads as a bug.
        className="group/rail fixed inset-y-0 left-0 z-[60] w-14 hover:w-52 overflow-hidden flex flex-col
                   bg-white dark:bg-card border-r border-border
                   transition-[width,box-shadow] duration-300 ease-out
                   hover:shadow-[0_0_60px_-16px_rgba(15,23,42,0.45)]"
      >
        <Link
          href="/dashboard"
          title="Dashboard"
          className="flex-none flex items-center gap-2.5 h-14 pl-[15px] border-b border-border no-underline"
        >
          <Image
            src="/images/icon-192.png"
            alt=""
            width={26}
            height={26}
            className="rounded-md flex-shrink-0"
            priority
          />
          <span className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-foreground whitespace-nowrap opacity-0 -translate-x-1 transition-[opacity,transform] duration-200 group-hover/rail:opacity-100 group-hover/rail:translate-x-0">
            BijbelStudie
          </span>
        </Link>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
          <ul className="m-0 p-0 flex flex-col gap-0.5">
            {nav.map(item => <RailLink key={item.url} {...item} />)}
            <RailAdminLink />
          </ul>
        </div>

        <div className="flex-none border-t border-border p-2">
          <ul className="m-0 p-0 flex flex-col gap-0.5">
            {bottomNav.map(item => <RailLink key={item.url} {...item} />)}
          </ul>
        </div>
      </nav>
    </div>
  )
}

function ProCTA() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!session) { setChecked(true); return }
    fetch("/api/user")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.subscribed) setIsSubscribed(true) })
      .finally(() => setChecked(true))
  }, [session])

  if (!checked || isSubscribed) return null

  // Every line here has to be something the paywall actually enforces:
  // commentaries and grondtekst via lib/proContent.ts, the AI cap via
  // app/api/ai/chat. "Historische context" used to sit in this list and was
  // never gated at all - it is free for everyone.
  const perks = [
    "Matthew Henry, Dachsel en Meyer",
    "200 AI-vragen per dag",
    "Grondtekst: Hebreeuws en Grieks",
    "Prioriteit ondersteuning",
  ]

  return (
    <div className="pt-4 px-1" data-tour="pro-cta">
      <div
        className="relative rounded-xl overflow-hidden border shadow-sm"
        style={{
          background: "linear-gradient(140deg, rgba(13,148,136,0.07) 0%, rgba(13,148,136,0.02) 60%)",
          borderColor: "rgba(13,148,136,0.22)",
        }}
      >
        {/* Decorative accent */}
        <div
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, #0D9488 0%, transparent 70%)" }}
        />

        <div className="relative p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "#0D9488" }}
            >
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "#0F766E" }}>
              Pro
            </span>
          </div>

          <p className="text-[12.5px] font-bold leading-snug text-gray-900 dark:text-foreground mb-2">
            Ontgrendel alle commentaren
          </p>

          <ul className="space-y-1 mb-3">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-1.5 text-[10px] text-gray-600 dark:text-muted-foreground leading-snug">
                <Check size={11} className="mt-0.5 flex-shrink-0" style={{ color: "#0D9488" }} />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => router.push("/abonnement?source=sidebar_cta")}
            className="w-full flex items-center justify-center gap-1 h-8 rounded-lg text-[12px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0D9488" }}
          >
            Upgrade nu
            <ArrowRight size={11} />
          </button>
          <p className="text-[10px] text-center mt-1.5 text-gray-400 dark:text-muted-foreground">
            Gratis basisplan blijft beschikbaar
          </p>
        </div>
      </div>
    </div>
  )
}

function AdminLink() {
  const { data: session, status } = useSession()
  const [isAdmin, setIsAdmin] = useState<boolean>(!!session?.user?.isAdmin)

  useEffect(() => {
    if (status !== "authenticated") return
    if (session?.user?.isAdmin) { setIsAdmin(true); return }
    fetch("/api/user")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.isAdmin) setIsAdmin(true) })
      .catch(() => {})
  }, [session, status])

  if (!isAdmin) return null
  return <NavLink url="/admin" title="Beheer" icon={ShieldCheck} />
}

export function AppSidebar({ ...props }) {
  const nav = useMainNav()

  return (
    <Sidebar
      {...props}
      className="border-r-0 bg-white dark:bg-card border-r border-border"
    >
      {/* Header - same height as navbar (h-14), logo centered both axes */}
      <SidebarHeader className="
        h-14 border-b border-border
        bg-white dark:bg-card
        !p-0 !gap-0 flex-none
      ">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 no-underline pl-3 h-full"
        >
          <Image
            src="/images/icon-192.png"
            alt=""
            width={26}
            height={26}
            className="rounded-md"
            priority
          />
          <span className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-foreground">
            BijbelStudie
          </span>
        </Link>
      </SidebarHeader>

      {/* Main nav */}
      <SidebarContent className="bg-white dark:bg-card !p-2">
        <ul className="m-0 p-0 flex flex-col gap-0.5">
          {nav.map(item => <NavLink key={item.url} {...item} />)}
          <AdminLink />
        </ul>
        <ProCTA />
      </SidebarContent>

      {/* Footer nav */}
      <SidebarFooter className="bg-white dark:bg-card border-t border-border !p-2">
        <ul className="m-0 p-0 flex flex-col gap-0.5">
          {bottomNav.map(item => <NavLink key={item.url} {...item} />)}
        </ul>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
