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
  StickyNote, Library, User, Settings, Sparkles, Users,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import React, { useEffect, useState } from "react"

const mainNav = [
  { title: "Dashboard",    url: "/dashboard", icon: LayoutDashboard },
  { title: "Bijbelstudie", url: "/studie",     icon: BookOpen },
  { title: "Studies",      url: "/studies",     icon: BookMarked },
  { title: "Groepen",      url: "/groepen",   icon: Users },
  { title: "Notities",     url: "/notities",     icon: StickyNote },
  { title: "Hulpbronnen",  url: "/hulpbronnen", icon: Library },
]

const bottomNav = [
  { title: "Profiel",      url: "/profiel",   icon: User },
  { title: "Instellingen", url: "/instellingen",  icon: Settings },
]

function NavLink({ url, title, icon: Icon }: { url: string; title: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const active = pathname === url || (url !== "/dashboard" && pathname?.startsWith(url))

  return (
    <li className="list-none">
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

  return (
    <div className="pt-3 px-1">
      <button
        onClick={() => router.push("/abonnement")}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors
          bg-[rgba(13,148,136,0.06)] border border-[rgba(13,148,136,0.2)] text-[#0D9488]
          hover:bg-[rgba(13,148,136,0.1)] dark:bg-[rgba(13,148,136,0.08)] dark:border-[rgba(13,148,136,0.25)]"
      >
        <Sparkles size={14} />
        Probeer Pro nu
      </button>
    </div>
  )
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
