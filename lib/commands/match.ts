import type { CommandContext, CommandItem } from "./types";

/**
 * Matching and grouping for the command palette. Pure functions, no React.
 */

/** NFD, accents stripped, lowercase, whitespace collapsed. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function isVisible(item: CommandItem, ctx: CommandContext): boolean {
  switch (item.visibility) {
    case "iedereen":
      return true;
    case "gast":
      return !ctx.loading && !ctx.signedIn;
    case "ingelogd":
      return ctx.signedIn;
    case "gratis":
      return !ctx.loading && !ctx.isPro;
    case "pro":
      return !ctx.loading && ctx.signedIn && ctx.isPro;
    case "admin":
      return !ctx.loading && ctx.signedIn && ctx.isAdmin;
    default:
      return false;
  }
}

/** True when a and b are at most one insertion, deletion or substitution apart. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

const S = {
  titleWordExact: 100,
  titleWordPrefix: 80,
  keywordExact: 70,
  keywordWordExact: 60,
  keywordPrefix: 45,
  titleSubstring: 35,
  keywordSubstring: 25,
  subtitlePrefix: 20,
  titleTypo: 15,
  keywordTypo: 12,
} as const;

interface Prepared {
  title: string;
  titleWords: string[];
  keywords: string[];
  keywordWords: string[];
  keywordPhrases: string[];
  subtitleWords: string[];
}

const prepCache = new WeakMap<CommandItem, Prepared>();

function prepare(item: CommandItem): Prepared {
  let p = prepCache.get(item);
  if (!p) {
    p = {
      title: fold(item.title),
      titleWords: words(item.title),
      keywords: item.keywords.map(fold),
      keywordWords: [...new Set(item.keywords.flatMap(words))],
      keywordPhrases: item.keywords.map((k) => words(k).join(" ")),
      subtitleWords: item.subtitle ? words(item.subtitle) : [],
    };
    prepCache.set(item, p);
  }
  return p;
}

function tokenScore(token: string, p: Prepared): number {
  if (p.titleWords.includes(token)) return S.titleWordExact;
  if (p.titleWords.some((w) => w.startsWith(token))) return S.titleWordPrefix;
  if (p.keywordPhrases.includes(token)) return S.keywordExact;
  if (p.keywordWords.includes(token)) return S.keywordWordExact;
  if (p.keywords.some((k) => k.startsWith(token)) || p.keywordWords.some((w) => w.startsWith(token))) {
    return S.keywordPrefix;
  }
  if (p.title.includes(token)) return S.titleSubstring;
  if (p.keywords.some((k) => k.includes(token))) return S.keywordSubstring;
  if (p.subtitleWords.some((w) => w.startsWith(token))) return S.subtitlePrefix;
  if (token.length >= 5) {
    if (p.titleWords.some((w) => w.length >= 4 && withinOneEdit(token, w))) return S.titleTypo;
    if (p.keywordWords.some((w) => w.length >= 4 && withinOneEdit(token, w))) return S.keywordTypo;
  }
  return 0;
}

/** Score an item against a folded query; 0 means it does not match. */
export function scoreItem(item: CommandItem, foldedQuery: string): number {
  const tokens = words(foldedQuery);
  if (tokens.length === 0) return 0;
  const whole = tokens.join(" ");
  const p = prepare(item);
  let total = 0;
  for (const token of tokens) {
    const s = tokenScore(token, p);
    if (s === 0) return 0;
    total += s;
  }
  // Whole-query bonuses: the query is the title, or one of the keywords.
  if (p.titleWords.join(" ") === whole) total += 120;
  else if (p.keywordPhrases.includes(whole)) total += 50;
  return total;
}

export type ResultGroupKey = "beste" | "recent" | "snel" | "actie" | "pagina" | "instelling" | "hulp";

export interface ResultGroup {
  key: ResultGroupKey;
  label: string;
  items: CommandItem[];
}

export const GROUP_LABELS: Record<ResultGroupKey, string> = {
  beste: "Beste resultaat",
  recent: "Recent",
  snel: "Snel naar",
  actie: "Acties",
  pagina: "Pagina's",
  instelling: "Instellingen",
  hulp: "Hulp",
};

const GROUP_ORDER: CommandItem["group"][] = ["actie", "pagina", "instelling", "hulp"];
const PER_GROUP = 5;
const HELP_QUESTION_CAP = 8;
const QUESTION_WORDS = new Set([
  "hoe", "wat", "waar", "wanneer", "waarom", "welke", "wie", "kan", "kun", "kunnen", "is", "zijn", "heb", "hebben", "mag", "moet",
]);

export function isQuestionLike(foldedQuery: string): boolean {
  if (foldedQuery.endsWith("?")) return true;
  const first = foldedQuery.split(" ")[0];
  return QUESTION_WORDS.has(first);
}

/**
 * A leading ">" limits the search to actions, a leading "?" to help. The
 * prefix is stripped from the text that is matched.
 */
export type QueryScope = "actie" | "hulp" | null;

export const SCOPE_PREFIXES: Record<Exclude<QueryScope, null>, string> = { actie: ">", hulp: "?" };

export function parseQuery(query: string): { scope: QueryScope; text: string } {
  const trimmed = query.trimStart();
  if (trimmed.startsWith(SCOPE_PREFIXES.actie)) return { scope: "actie", text: trimmed.slice(1) };
  if (trimmed.startsWith(SCOPE_PREFIXES.hulp)) return { scope: "hulp", text: trimmed.slice(1) };
  return { scope: null, text: query };
}

/** Ids never listed under Recent or "Snel naar": running them by accident costs the reader. */
const NEVER_WHEN_EMPTY = (i: CommandItem) => i.target.type === "run" && i.target.run === "signout";

/** Cap per group inside a ">" or "?" scope, where only one group is shown. */
const SCOPED_CAP = 12;

export interface SearchOptions {
  /** Most recent first. Unknown or invisible ids are ignored. */
  recents?: string[];
  /** Pull a clear winner out into "Beste resultaat". Default true. */
  bestResult?: boolean;
}

/**
 * The palette's result list, grouped and capped. An empty query yields Recent
 * plus "Snel naar"; otherwise Acties, Pagina's, Instellingen, Hulp, with an
 * optional "Beste resultaat" in front.
 */
export function searchCommands(
  items: CommandItem[],
  query: string,
  ctx: CommandContext,
  opts: SearchOptions = {}
): ResultGroup[] {
  const { scope, text } = parseQuery(query);
  const visible = items.filter((i) => isVisible(i, ctx) && (!scope || i.group === scope));
  const recents = opts.recents ?? [];
  const q = fold(text);

  if (scope) {
    let list: CommandItem[];
    if (!q) {
      // Nothing typed after the prefix: every action (Uitloggen excepted, as
      // in the empty state), or the help topics as a table of contents.
      list =
        scope === "hulp"
          ? visible.filter((i) => i.icon === "help")
          : visible.filter((i) => !NEVER_WHEN_EMPTY(i));
    } else {
      list = visible
        .map((item) => ({ item, score: scoreItem(item, q) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "nl"))
        .map((s) => s.item)
        .slice(0, SCOPED_CAP);
    }
    return list.length ? [{ key: scope, label: GROUP_LABELS[scope], items: list }] : [];
  }

  if (!q) {
    const byId = new Map(visible.map((i) => [i.id, i]));
    const recentItems = recents
      .map((id) => byId.get(id))
      .filter((i): i is CommandItem => !!i && !NEVER_WHEN_EMPTY(i));
    const recentIds = new Set(recentItems.map((i) => i.id));
    const quick = visible.filter((i) => i.showWhenEmpty && !recentIds.has(i.id) && !NEVER_WHEN_EMPTY(i));
    const groups: ResultGroup[] = [];
    if (recentItems.length) groups.push({ key: "recent", label: GROUP_LABELS.recent, items: recentItems });
    if (quick.length) groups.push({ key: "snel", label: GROUP_LABELS.snel, items: quick });
    return groups;
  }

  const scored = visible
    .map((item) => {
      let score = scoreItem(item, q);
      if (score > 0) {
        const r = recents.indexOf(item.id);
        if (r >= 0) score += 15 - r * 2;
      }
      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "nl"));

  const groups: ResultGroup[] = [];
  let best: CommandItem | undefined;
  if (opts.bestResult !== false && scored.length > 0) {
    const [first, second] = scored;
    if (first.score >= 100 && (!second || first.score - second.score >= 20)) {
      best = first.item;
      groups.push({ key: "beste", label: GROUP_LABELS.beste, items: [best] });
    }
  }

  const helpCap = isQuestionLike(q) ? HELP_QUESTION_CAP : PER_GROUP;
  for (const g of GROUP_ORDER) {
    const cap = g === "hulp" ? helpCap : PER_GROUP;
    const inGroup = scored
      .filter((s) => s.item.group === g && s.item !== best)
      .slice(0, cap)
      .map((s) => s.item);
    if (inGroup.length) groups.push({ key: g, label: GROUP_LABELS[g], items: inGroup });
  }
  return groups;
}

/** The groups flattened in display order - the keyboard walks this list. */
export function flattenGroups(groups: ResultGroup[]): CommandItem[] {
  return groups.flatMap((g) => g.items);
}
