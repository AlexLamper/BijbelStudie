import type { ElementType } from "react";
import {
  House,
  GraduationCap,
  BookMarked,
  NotebookPen,
  User,
  Settings,
  MessageSquare,
  Shield,
} from "lucide-react";

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
  /** Reuses the guided tour's ids so nav instrumentation keeps one naming scheme. */
  tourId?: string;
  badge?: string;
};

export const NAV_GROUPS: { label: string; items: NavItem[]; adminOnly?: boolean }[] = [
  {
    label: "Studeren",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: House, tourId: "nav-dashboard" },
      { title: "Studies", url: "/studies", icon: GraduationCap, tourId: "nav-studies" },
      { title: "Lezen", url: "/lezen", icon: BookMarked, tourId: "nav-studie" },
      { title: "Notities", url: "/notities", icon: NotebookPen, tourId: "nav-notities" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profiel", url: "/profiel", icon: User, tourId: "nav-profiel" },
      { title: "Instellingen", url: "/instellingen", icon: Settings, tourId: "nav-instellingen" },
      { title: "Feedback", url: "/feedback", icon: MessageSquare, tourId: "nav-feedback" },
    ],
  },
  {
    label: "Beheer",
    adminOnly: true,
    items: [{ title: "Beheer", url: "/admin", icon: Shield, badge: "admin" }],
  },
];

/** Which row lights up. `forced` overrides the URL when a caller knows better. */
export function isNavActive(pathname: string | null, url: string, forced?: string) {
  if (forced) return url === forced;
  if (!pathname) return false;
  // /profiel must not light up while the reader is on /profiel/boom - that
  // subroute has its own row underneath.
  if (url === "/profiel") return pathname === "/profiel";
  return pathname === url || pathname.startsWith(url + "/");
}

