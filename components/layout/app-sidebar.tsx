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

/* ── Palette (hardcoded to guarantee rendering) ──────────────── */
const BG = "#1F2937"   // gray-800 — used everywhere in sidebar
const ACTIVE_BG   = "rgba(13,148,136,0.18)"
const ACTIVE_TEXT = "#2DD4BF"   // teal-300 — high contrast on dark bg
const ACTIVE_BORDER = "#0D9488"
const INACTIVE_TEXT = "rgba(255,255,255,0.58)"
const HOVER_BG    = "rgba(255,255,255,0.07)"

const mainNav = [
  { title: "Dashboard",    url: "/dashboard", icon: LayoutDashboard },
  { title: "Bijbelstudie", url: "/study",     icon: BookOpen },
  { title: "Leesplannen",  url: "/plans",     icon: BookMarked },
  { title: "Groepen",      url: "/groepen",   icon: Users },
  { title: "Notities",     url: "/notes",     icon: StickyNote },
  { title: "Hulpbronnen",  url: "/resources", icon: Library },
]

const bottomNav = [
  { title: "Profiel",      url: "/profile",   icon: User },
  { title: "Instellingen", url: "/settings",  icon: Settings },
]

function NavLink({ url, title, icon: Icon }: { url: string; title: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const active = pathname === url || (url !== "/dashboard" && pathname?.startsWith(url))

  return (
    <li style={{ listStyle: "none" }}>
      <Link
        href={url}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "7px 12px",
          borderRadius: "8px",
          fontSize: "13.5px",
          fontWeight: active ? 600 : 400,
          color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
          backgroundColor: active ? ACTIVE_BG : "transparent",
          borderLeft: active ? `2px solid ${ACTIVE_BORDER}` : "2px solid transparent",
          transition: "all 0.15s ease",
          textDecoration: "none",
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = HOVER_BG
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
            ;(e.currentTarget as HTMLElement).style.color = INACTIVE_TEXT
          }
        }}
      >
        <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }} />
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
    <div style={{ padding: "12px 8px 0" }}>
      <button
        onClick={() => router.push("/subscribe")}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          borderRadius: "8px",
          backgroundColor: "rgba(13,148,136,0.12)",
          border: "1px solid rgba(13,148,136,0.25)",
          cursor: "pointer",
          color: "#2DD4BF",
          fontSize: "13px",
          fontWeight: 500,
        }}
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
      style={{ backgroundColor: BG } as React.CSSProperties}
      className="border-r-0"
    >
      {/* Header */}
      <SidebarHeader
        style={{ backgroundColor: BG, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 14px" }}
      >
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <Image src="/images/favicon.ico" alt="" width={26} height={26} style={{ borderRadius: "6px" }} priority />
          <span style={{ color: "white", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.01em" }}>
            BijbelStudie
          </span>
        </Link>
      </SidebarHeader>

      {/* Main nav */}
      <SidebarContent style={{ backgroundColor: BG, padding: "8px" }}>
        <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          {mainNav.map(item => <NavLink key={item.url} {...item} />)}
        </ul>
        <ProCTA />
      </SidebarContent>

      {/* Footer nav */}
      <SidebarFooter
        style={{ backgroundColor: BG, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px" }}
      >
        <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          {bottomNav.map(item => <NavLink key={item.url} {...item} />)}
        </ul>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
