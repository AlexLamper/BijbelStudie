"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { ProBadge } from "../ui/ProBadge";
import { toast } from "../../hooks/use-toast";
import { useCommandContext } from "../../hooks/useCommandContext";
import { ALL_COMMANDS, getCommand } from "../../lib/commands/registry";
import { SCOPE_PREFIXES, flattenGroups, isVisible, parseQuery, searchCommands } from "../../lib/commands/match";
import type { ResultGroup } from "../../lib/commands/match";
import { loadRecents, pushRecent } from "../../lib/commands/recents";
import { dispatchIntentWhenAt } from "../../lib/commands/deepLink";
import type { CommandItem } from "../../lib/commands/types";
import { COMMAND_ICONS } from "./icons";

export type PaletteKeyHandler = (e: ReactKeyboardEvent<HTMLInputElement>) => void;

/** The toast after a theme command: what the reader now sees, in the words of the settings page. */
export const THEME_TOAST: Record<string, string> = {
  light: "Lichte modus staat aan",
  dark: "Donkere modus staat aan",
  system: "Het thema volgt nu je systeem",
};

/**
 * The command palette's dropdown. The input lives in CommandTrigger (it is the
 * top bar's field); this component owns the results, the active row and what
 * running a command does, and hands the trigger its key handler.
 *
 * ARIA: the input is the combobox, this is its listbox with one group per
 * section, the active row is announced through aria-activedescendant, and the
 * result count through a polite live region.
 */
export default function CommandPalette({
  query,
  onClose,
  handlerRef,
  onActiveChange,
  listboxId,
}: {
  query: string;
  onClose: () => void;
  handlerRef: MutableRefObject<PaletteKeyHandler | null>;
  onActiveChange: (id: string | undefined) => void;
  listboxId: string;
}) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const ctx = useCommandContext();
  const [recents, setRecents] = useState<string[]>([]);
  // The active row belongs to one query: typing resets it to the first row in
  // the same render, so Enter straight after a keystroke never runs a row
  // from the previous result list.
  const [activeState, setActiveState] = useState({ query, index: 0 });
  const active = activeState.query === query ? activeState.index : 0;
  const setActive = useCallback(
    (next: number | ((i: number) => number)) =>
      setActiveState((prev) => {
        const current = prev.query === query ? prev.index : 0;
        return { query, index: typeof next === "function" ? next(current) : next };
      }),
    [query]
  );
  const listRef = useRef<HTMLDivElement>(null);

  // Read on every open; prune ids that are gone or not visible to this reader.
  useEffect(() => {
    setRecents(
      loadRecents((id) => {
        const item = getCommand(id);
        return !!item && isVisible(item, ctx);
      })
    );
    // ctx is a fresh object each render; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.signedIn, ctx.isPro, ctx.isAdmin, ctx.loading]);

  const trimmed = query.trim();
  const { scope, text: scopedText } = parseQuery(query);
  const groups: ResultGroup[] = useMemo(
    () => searchCommands(ALL_COMMANDS, query, ctx, { recents }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, recents, ctx.signedIn, ctx.isPro, ctx.isAdmin, ctx.loading]
  );

  // No results: offer Help and Contact instead of a dead end.
  const fallback = useMemo(
    () => ["pagina-help", "pagina-contact"].map((id) => getCommand(id)).filter((i): i is CommandItem => !!i),
    []
  );
  const noResults = trimmed.length > 0 && groups.length === 0;
  const shownQuery = scope ? scopedText.trim() : trimmed;
  const flat = useMemo(() => (noResults ? fallback : flattenGroups(groups)), [noResults, fallback, groups]);

  const activeItem = flat[Math.min(active, flat.length - 1)];
  const optionId = (item: CommandItem) => `command-option-${item.id}`;

  useEffect(() => {
    onActiveChange(activeItem ? optionId(activeItem) : undefined);
    // Scroll only the list, never the page behind it (scrollIntoView would
    // also move the shell's scroll container). The first row brings its
    // group heading along.
    const list = listRef.current;
    const row = activeItem ? document.getElementById(optionId(activeItem)) : null;
    if (!list || !row) return;
    if (flat[0] === activeItem) {
      list.scrollTop = 0;
      return;
    }
    // The list is `relative`, so it is the row's offsetParent.
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - 6;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6;
  }, [activeItem, flat, onActiveChange]);

  useEffect(() => () => onActiveChange(undefined), [onActiveChange]);

  const run = useCallback(
    (item: CommandItem, newTab = false) => {
      const target = item.target;
      // Uitloggen is never remembered: it must not come back under Recent.
      if (!(target.type === "run" && target.run === "signout")) setRecents(pushRecent(item.id));
      if (target.type === "link") {
        if (newTab) {
          window.open(target.href, "_blank", "noopener,noreferrer");
          return;
        }
        onClose();
        router.push(target.href);
        // A page that is already on screen does not remount; tell it, once,
        // to re-read its ?sectie= / ?actie= / #hash when the URL has changed.
        // Not cancelled on unmount: closing the palette unmounts this
        // component, and the wait is capped at two seconds anyway.
        dispatchIntentWhenAt(target.href);
        return;
      }
      onClose();
      switch (target.run) {
        case "signout":
          void signOut({ callbackUrl: "/" });
          return;
        case "theme:toggle": {
          const next = resolvedTheme === "dark" ? "light" : "dark";
          setTheme(next);
          toast({ title: THEME_TOAST[next] });
          return;
        }
        default: {
          const next = target.run.slice("theme:".length);
          setTheme(next);
          toast({ title: THEME_TOAST[next] });
        }
      }
    },
    [onClose, router, resolvedTheme, setTheme]
  );

  useEffect(() => {
    handlerRef.current = (e) => {
      const n = flat.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (n) setActive((i) => (i + 1) % n);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (n) setActive((i) => (i - 1 + n) % n);
          break;
        case "Home":
          if (n && !query) {
            e.preventDefault();
            setActive(0);
          }
          break;
        case "End":
          if (n && !query) {
            e.preventDefault();
            setActive(n - 1);
          }
          break;
        case "Enter":
          if (activeItem) {
            e.preventDefault();
            run(activeItem, e.metaKey || e.ctrlKey);
          }
          break;
      }
    };
    return () => {
      handlerRef.current = null;
    };
  }, [flat, activeItem, run, handlerRef, query, setActive]);

  const countText = noResults
    ? `Niets gevonden voor "${shownQuery || trimmed}"`
    : `${flat.length} ${flat.length === 1 ? "resultaat" : "resultaten"}`;

  const renderRow = (item: CommandItem) => {
    const Icon = COMMAND_ICONS[item.icon];
    const isActive = item === activeItem;
    return (
      <div
        key={item.id}
        id={optionId(item)}
        role="option"
        aria-selected={isActive}
        // Keep focus in the input: the row is picked on click, not focused.
        onMouseDown={(e) => e.preventDefault()}
        onMouseMove={() => {
          const i = flat.indexOf(item);
          if (i !== active) setActive(i);
        }}
        onClick={(e) => run(item, e.metaKey || e.ctrlKey)}
        className={`relative flex cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 py-2 ${isActive ? "bg-line-soft" : ""}`}
      >
        {isActive && (
          <span aria-hidden className="absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-full" style={{ background: "#0D9488" }} />
        )}
        <Icon size={16} strokeWidth={1.9} className="flex-none text-ink-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink" title={item.title}>
            {item.title}
          </span>
          {item.subtitle && <span className="block truncate text-[12px] text-ink-faint">{item.subtitle}</span>}
        </span>
        {item.pro && <ProBadge size="xs" tone="soft" className="flex-none" />}
      </div>
    );
  };

  return (
    <div
      className="absolute right-0 top-[46px] z-50 flex w-[480px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_8px_24px_-10px_rgba(17,24,39,.25)] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,.6)]"
      style={{ maxHeight: "min(70vh, 520px)" }}
    >
      <p aria-live="polite" className="sr-only">
        {countText}
      </p>

      <div ref={listRef} id={listboxId} role="listbox" aria-label="Resultaten" className="relative min-h-0 flex-1 overflow-y-auto p-1.5">
        {noResults ? (
          <>
            <p className="break-words px-2.5 pb-2 pt-2 text-[13px] text-ink-muted">
              {shownQuery ? <>Niets gevonden voor &ldquo;{shownQuery}&rdquo;</> : <>Niets gevonden</>}
            </p>
            <div role="group" aria-label="Hulp">
              {fallback.map(renderRow)}
            </div>
          </>
        ) : (
          groups.map((group) => {
            const headingId = `command-group-${group.key}`;
            return (
              <div key={group.key} role="group" aria-labelledby={headingId} className="pb-1">
                <div
                  id={headingId}
                  role="presentation"
                  className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint"
                >
                  {group.label}
                </div>
                {group.items.map(renderRow)}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-none items-center justify-between gap-3 border-t border-line px-3 py-2 text-[11.5px] text-ink-faint">
        <span className="min-w-0 truncate">
          {scope === "actie" ? (
            "Alleen acties"
          ) : scope === "hulp" ? (
            "Alleen hulp"
          ) : (
            <>
              Typ <kbd className="font-mono font-semibold">{SCOPE_PREFIXES.actie}</kbd> voor acties,{" "}
              <kbd className="font-mono font-semibold">{SCOPE_PREFIXES.hulp}</kbd> voor hulp
            </>
          )}
        </span>
        <span className="flex-none">↑↓ navigeren · ↵ openen · esc sluiten</span>
      </div>
    </div>
  );
}
