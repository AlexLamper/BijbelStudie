"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import type { PaletteKeyHandler } from "./CommandPalette";

/**
 * The top bar's search field, which opens the command palette.
 *
 * The field is the combobox itself: typing filters, the palette drops down
 * under it. The palette is only fetched on the first open (next/dynamic), so
 * the top bar costs nothing extra on pages where nobody searches.
 *
 * Cmd/Ctrl-K toggles it from anywhere; "/" opens it when the reader is not
 * already typing somewhere. It finds pages, settings, actions and help - never
 * bible text, commentaries or notes.
 */
const loadPalette = () => import("./CommandPalette");
const CommandPalette = dynamic(loadPalette, { ssr: false });

/** Warm the palette's chunk on hover or focus, so the first open does not flash empty. */
let preloaded = false;
function preloadPalette() {
  if (preloaded) return;
  preloaded = true;
  void loadPalette().catch(() => {
    preloaded = false;
  });
}

export const COMMAND_LISTBOX_ID = "command-palette-listbox";

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('[contenteditable]:not([contenteditable="false"])')) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    // Checkboxes, radios and buttons do not take text: "/" there is a shortcut.
    const type = (target as HTMLInputElement).type;
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"].includes(type);
  }
  const role = target.getAttribute("role");
  return role === "textbox" || role === "searchbox" || role === "combobox";
}

/** A modal (Radix sets aria-modal) owns the keyboard: the palette must not open behind it. */
function modalIsOpen(): boolean {
  return !!document.querySelector('[aria-modal="true"]');
}

/** The field is display:none below md; there is nothing to open there. */
function fieldIsShown(input: HTMLInputElement | null): input is HTMLInputElement {
  return !!input && input.offsetParent !== null;
}

export default function CommandTrigger() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef<PaletteKeyHandler | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  // Rendered after mount: the server cannot know the platform, and guessing
  // would be a hydration mismatch.
  const [shortcut, setShortcut] = useState<string | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
    setShortcut(/mac|iphone|ipad|ipod/i.test(platform) ? "⌘K" : "Ctrl K");
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveId(undefined);
  }, []);

  // After a command ran: close, and give the focus back to the page.
  const closeAfterRun = useCallback(() => {
    close();
    inputRef.current?.blur();
  }, [close]);

  // A route change closes the palette.
  useEffect(() => close(), [pathname, close]);

  useEffect(() => {
    // One listener for the component's life; the open state is read from a ref.
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing || e.repeat) return;
      const input = inputRef.current;
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        if (!fieldIsShown(input)) return;
        if (openRef.current) {
          e.preventDefault();
          close();
          input.blur();
          return;
        }
        if (modalIsOpen()) return;
        // preventDefault blijft nodig: anders opent de zoekbalk van de browser.
        e.preventDefault();
        preloadPalette();
        setOpen(true);
        input.focus();
        input.select();
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        if (!fieldIsShown(input) || modalIsOpen()) return;
        e.preventDefault();
        preloadPalette();
        setOpen(true);
        input.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, close]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else {
        close();
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "Tab") {
      close();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    handlerRef.current?.(e);
  }

  return (
    <div ref={wrapRef} className="relative flex-none max-md:hidden" onPointerEnter={preloadPalette}>
      {/* Het kruisje van Safari en Chrome is weggehaald, anders schuift het
          tussen de tekst en de ⌘K-hint. */}
      <div className="search-field flex h-[38px] w-[260px] items-center gap-[9px] rounded-btn bg-line-soft px-3 transition-colors focus-within:bg-line">
        <Search size={17} strokeWidth={1.9} className="flex-none text-ink-muted" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Zoek pagina, instelling of hulp"
          aria-expanded={open}
          aria-controls={open ? COMMAND_LISTBOX_ID : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-keyshortcuts="Meta+K Control+K /"
          aria-activedescendant={open ? activeId : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            preloadPalette();
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onInputKey}
          placeholder="Zoek pagina, instelling of hulp"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {shortcut && (
          <kbd
            aria-hidden
            className="flex-none whitespace-nowrap rounded-[5px] border border-line bg-surface px-[5px] py-[2px] font-mono text-[10.5px] font-semibold text-ink-faint"
          >
            {shortcut}
          </kbd>
        )}
      </div>

      {open && (
        <CommandPalette
          query={query}
          onClose={closeAfterRun}
          handlerRef={handlerRef}
          onActiveChange={setActiveId}
          listboxId={COMMAND_LISTBOX_ID}
        />
      )}
    </div>
  );
}
