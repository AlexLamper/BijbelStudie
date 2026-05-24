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
  StickyNote, Library, User, Settings, Sparkles, Users, ShieldCheck,
  ArrowRight, Check, MessageSquareText,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import React, { useEffect, useState } from "react"

const mainNav = [
  { title: "Dashboard",    url: "/dashboard",    icon: LayoutDashboard, tourId: "nav-dashboard"    },
  { title: "Bijbelstudie", url: "/studie",       icon: BookOpen,        tourId: "nav-studie"       },
  { title: "Studies",      url: "/studies",      icon: BookMarked,      tourId: "nav-studies"      },
  { title: "Groepen",      url: "/groepen",      icon: Users,           tourId: "nav-groepen"      },
  { title: "Notities",     url: "/notities",     icon: StickyNote,      tourId: "nav-notities"     },
  { title: "Hulpbronnen",  url: "/hulpbronnen",  icon: Library,         tourId: "nav-hulpbronnen"  },
]

const bottomNav = [
  { title: "Profiel",      url: "/profiel",      icon: User,              tourId: "nav-profiel"      },
  { title: "Instellingen", url: "/instellingen", icon: Settings,          tourId: "nav-instellingen" },
  { title: "Feedback",     url: "/feedback",     icon: MessageSquareText, tourId: "nav-feedback"     },
]

function NavLink({ url, title, icon: Icon, tourId }: { url: string; title: string; icon: React.ElementType; tourId?: string }) {
  const pathname = usePathname()
  const active = pathname === url || (url !== "/dashboard" && pathname?.startsWith(url + "/"))

  return (
    <li className="list-none" data-tour={tourId}>
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

  const perks = [
    "Alle bijbelcommentaren",
    "Historische context",
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
            onClick={() => router.push("/abonnement")}
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
            src="/images/favicon.ico"
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
          {mainNav.map(item => <NavLink key={item.url} {...item} />)}
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
