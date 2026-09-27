import type { ElementType } from "react";
import {
  House,
  GraduationCap,
  BookMarked,
  NotebookPen,
  Library,
  User,
  Settings,
  MessageSquare,
  Shield,
  CalendarDays,
} from "lucide-react";

/** The reading plan's page. It sits under /studies but has its own row. */
const BIBLE_YEAR_URL = "/studies/bijbel-in-een-jaar";

/**
 * The app's navigation, once.
 *
 * Two things render it: the 196 px sidebar on the nine routes
 * (components/shell/Sidebar.tsx) and the 64 px collapsed rail in the lesson
 * flow (components/shell/LessonRail.tsx). The handoff is explicit that the
 * collapsed rail is "de gewone zijbalk, ingeklapt" with the same items in the
 * same order, so the order lives here and neither can drift from the other.
 */

export type NavItem = {
  title: string;
  url: string;
  icon: ElementType;
  /** Click-tracking id, registered in CLICK_TARGETS (lib/analyticsRoutes.ts). */
  trackId?: string;
  badge?: string;
  /** Sidebar only: the phone tab bar has room for five tabs and no more. */
  noTab?: boolean;
};

export const NAV_GROUPS: { label: string; items: NavItem[]; adminOnly?: boolean }[] = [
  {
    label: "Studeren",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: House, trackId: "sidebar_dashboard" },
      { title: "Studies", url: "/studies", icon: GraduationCap, trackId: "sidebar_studies" },
      // Its own row rather than a card on the dashboard or a hero on /studies:
      // the reading plan is one feature among several, not the front page.
      {
        title: "Bijbel in een jaar",
        url: BIBLE_YEAR_URL,
        icon: CalendarDays,
        trackId: "sidebar_bijbel_in_een_jaar",
        noTab: true,
      },
      { title: "Lezen", url: "/lezen", icon: BookMarked, trackId: "sidebar_lezen" },
      { title: "Notities", url: "/notities", icon: NotebookPen, trackId: "sidebar_notities" },
      { title: "Bronnen", url: "/bronnen", icon: Library, trackId: "sidebar_bronnen", noTab: true },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profiel", url: "/profiel", icon: User, trackId: "sidebar_profiel" },
      { title: "Instellingen", url: "/instellingen", icon: Settings, trackId: "sidebar_instellingen" },
      { title: "Feedback", url: "/feedback", icon: MessageSquare, trackId: "sidebar_feedback" },
    ],
  },
  {
    label: "Beheer",
    adminOnly: true,
    items: [{ title: "Beheer", url: "/beheer", icon: Shield, badge: "admin" }],
  },
];

/** Which row lights up. `forced` overrides the URL when a caller knows better. */
export function isNavActive(pathname: string | null, url: string, forced?: string) {
  if (forced) return url === forced;
  if (!pathname) return false;
  // /profiel must not light up while the reader is on /profiel/boom - that
  // subroute has its own row underneath.
  if (url === "/profiel") return pathname === "/profiel";
  // Likewise /studies stays dark on the reading plan, which has its own row.
  if (url === "/studies" && (pathname === BIBLE_YEAR_URL || pathname.startsWith(BIBLE_YEAR_URL + "/"))) {
    return false;
  }
  return pathname === url || pathname.startsWith(url + "/");
}

