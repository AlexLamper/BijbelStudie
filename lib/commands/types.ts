/**
 * The command palette's data model. Pure types, no React: the registry, the
 * matcher and the tests all run in plain node.
 *
 * The palette is platform navigation only - pages, settings, actions and help.
 * It never searches bible text, commentaries or the reader's own notes.
 */

export type CommandGroup = "pagina" | "instelling" | "actie" | "hulp";

/**
 * Who sees an item.
 * - iedereen: everyone
 * - gast: only signed-out visitors
 * - ingelogd: any signed-in account
 * - gratis: everyone who is not Pro (guests included)
 * - pro: signed-in Pro accounts
 * - admin: signed-in admins
 */
export type CommandVisibility = "iedereen" | "gast" | "ingelogd" | "gratis" | "pro" | "admin";

export type CommandRun = "theme:light" | "theme:dark" | "theme:system" | "theme:toggle" | "signout";

export type CommandTarget = { type: "link"; href: string } | { type: "run"; run: CommandRun };

/** A data-type icon name, resolved to a lucide component in components/search/icons.ts. */
export type IconKey =
  | "page"
  | "home"
  | "book"
  | "study"
  | "note"
  | "bookmark"
  | "group"
  | "library"
  | "user"
  | "tree"
  | "settings"
  | "subscription"
  | "feedback"
  | "help"
  | "mail"
  | "guide"
  | "phone"
  | "document"
  | "admin"
  | "login"
  | "logout"
  | "sun"
  | "moon"
  | "monitor"
  | "theme"
  | "text"
  | "voice"
  | "bell"
  | "key"
  | "trash"
  | "plus"
  | "edit"
  | "badge"
  | "play"
  | "eye"
  | "question";

export interface CommandItem {
  id: string;
  group: CommandGroup;
  title: string;
  subtitle?: string;
  /** Dutch synonyms and related words. Never shown, only matched. */
  keywords: string[];
  icon: IconKey;
  visibility: CommandVisibility;
  target: CommandTarget;
  /** Key into lib/pageMetadata.ts when the item is a page with metadata. */
  pageKey?: string;
  /** Listed under "Snel naar" while the query is empty. */
  showWhenEmpty?: boolean;
  /** Draw the Pro badge on the row. */
  pro?: boolean;
}

export interface CommandContext {
  signedIn: boolean;
  isPro: boolean;
  isAdmin: boolean;
  /** The session is still being resolved: Pro and admin items stay hidden. */
  loading: boolean;
}
