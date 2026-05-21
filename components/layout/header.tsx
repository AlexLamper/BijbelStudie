"use client"

import { useEffect, useState, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { LogOut, User, Settings, Menu } from "lucide-react"
import { Button } from "../ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { SidebarTrigger } from "../ui/sidebar"
import { ModeToggle } from "../dark-mode-toggle"
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar"
import { SubscriptionBadge } from "../subscription-badge"

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  studie: "Bijbelstudie",
  study: "Bijbelstudie",
  studies: "Studies",
  plans: "Leesplannen",
  notities: "Notities",
  notes: "Notities",
  profiel: "Profiel",
  profile: "Profiel",
  instellingen: "Instellingen",
  settings: "Instellingen",
  hulpbronnen: "Hulpbronnen",
  resources: "Hulpbronnen",
  groepen: "Groepen",
  community: "Gemeenschap",
  abonnement: "Abonnement",
  subscribe: "Abonneren",
  admin: "Beheer",
  read: "Bijbel lezen",
}

interface HeaderProps {
  params?: { lng: string }
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !session?.user?.email || userImage) return
    fetch("/api/user")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user?.image) setUserImage(data.user.image) })
      .catch(() => {})
  }, [session?.user?.email, mounted, userImage])

  useEffect(() => {
    if (mounted && status === "unauthenticated") router.push("/api/auth/signin")
  }, [status, router, mounted])

  useEffect(() => {
    if (!mounted) return
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false)
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [mounted])

  if (!mounted || status === "loading") {
    return <div className="h-14 border-b border-border bg-background" />
  }

  if (!session) return null

  const getPageTitle = () => {
    if (title) return title
    const mainRoute = pathname?.split('/').filter(Boolean)[0] || 'dashboard'
    return PAGE_TITLES[mainRoute] || mainRoute.charAt(0).toUpperCase() + mainRoute.slice(1)
  }

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border bg-white dark:bg-background sticky top-0 z-50">
      {/* Left: Sidebar trigger + page title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <h1 className="text-base font-semibold text-foreground">{getPageTitle()}</h1>
      </div>

      {/* Right: Desktop controls */}
      <div className="hidden md:flex items-center gap-2">
        <ModeToggle />

        <div className="w-px h-5 bg-border mx-1" />

        <div className="relative" ref={profileRef}>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-9 px-2 hover:bg-secondary rounded-md"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <Avatar className="h-7 w-7 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border">
              <AvatarImage
                src={userImage || session.user?.image || ""}
                alt={session.user?.name || "Gebruiker"}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {session.user?.name?.[0]?.toUpperCase() || "G"}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm text-left hidden lg:block">
              <div className="flex items-center gap-1">
                <p className="font-medium text-foreground leading-none">{session.user?.name}</p>
                <SubscriptionBadge isSubscribed={!!session.user?.isSubscribed} />
              </div>
              <p className="text-muted-foreground text-xs mt-0.5 leading-none">{session.user?.email}</p>
            </div>
          </Button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 text-sm hover:bg-secondary rounded-none"
                  onClick={() => { router.push("/profiel"); setIsProfileOpen(false) }}
                >
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  Profiel
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 text-sm hover:bg-secondary rounded-none"
                  onClick={() => { router.push("/instellingen"); setIsProfileOpen(false) }}
                >
                  <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
                  Instellingen
                </Button>
                <div className="border-t border-border my-1" />
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-none"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Uitloggen
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden relative" ref={menuRef}>
        <Button variant="ghost" size="sm" className="p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <Menu className="w-5 h-5" />
        </Button>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50"
            >
              <div className="px-3 py-2 border-b border-border">
                <ModeToggle />
              </div>
              <Button variant="ghost" className="w-full justify-start px-3 py-2 text-sm hover:bg-secondary rounded-none"
                onClick={() => { router.push("/profiel"); setIsMenuOpen(false) }}>
                <User className="h-4 w-4 mr-2 text-muted-foreground" /> Profiel
              </Button>
              <Button variant="ghost" className="w-full justify-start px-3 py-2 text-sm hover:bg-secondary rounded-none"
                onClick={() => { router.push("/instellingen"); setIsMenuOpen(false) }}>
                <Settings className="h-4 w-4 mr-2 text-muted-foreground" /> Instellingen
              </Button>
              <div className="border-t border-border my-1" />
              <Button variant="ghost" className="w-full justify-start px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-none"
                onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="h-4 w-4 mr-2" /> Uitloggen
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
