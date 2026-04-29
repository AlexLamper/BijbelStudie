"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "../../app/i18n/client"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../ui/sidebar"
import { User, Settings, BookText, StickyNote, Calendar
  } from "lucide-react"
import SidebarProCTA from "../pricing/sidebar-pro-cta"
import React, { useEffect, useState } from 'react';
import Image from "next/image"
import { useTheme } from "next-themes"

// Main navigation items/links with translation keys
const mainNavItems = [
  {
    titleKey: "study",
    url: "/study",
    icon: BookText,
  },
  {
    titleKey: "plans",
    url: "/plans",
    icon: Calendar,
  },
  {
    titleKey: "notes",
    url: "/notes",
    icon: StickyNote,
  },
  {
    titleKey: "profile",
    url: "/profile",
    icon: User,
  },
  {
    titleKey: "settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }) {
  const pathname = usePathname()
  const { t } = useTranslation("sidebar")
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const isActive = (url: string) => {
    return pathname === url
  }
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const isDarkMode = mounted && resolvedTheme === 'dark'

  return (
    <Sidebar
      {...props}
      className="dark:border-r-[#91969e52] font-['Inter'] text-sm text-gray-800 dark:text-gray-200"
      style={{
        backgroundColor: isDarkMode ? '#16191D' : '#ffffff',
        '--sidebar-background': isDarkMode ? '#16191D' : '#ffffff',
      } as React.CSSProperties}
    >
      <SidebarHeader>
        <SidebarMenu>
          <Link href={'/study'} className="flex items-center m-1">
            <Image 
              src={isDarkMode ? "/images/Logo-text-dark-mode.svg" : "/images/logo-text.svg"} 
              alt="BijbelStudie Logo" 
              width={100} 
              height={32} 
              className="object-contain ml-2 mt-2 mb-2 mr-4" 
            />
          </Link>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <Link 
                      href={item.url}
                      className={`flex items-center space-x-2 rounded-md px-2 py-1.5 transition-colors ${
                        isActive(item.url)
                          ? 'bg-[#798777]/15 text-[#798777] dark:bg-[#e0e0e0]/10 dark:text-[#e0e0e0]'
                          : 'text-gray-800/95 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${
                        isActive(item.url)
                          ? 'text-[#798777] dark:text-[#e0e0e0]'
                          : 'text-gray-700 dark:text-gray-500'
                      }`} />
                      <span className="font-normal text-sm">{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      <SidebarProCTA />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}