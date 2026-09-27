"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, Minus, NotebookPen, Plus, Share2, Type } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Switch } from "../ui/switch";
import { isBookmarked } from "../../lib/content/bronnen/progress";
import { TEXT_SIZES } from "./BronBlocks";
import { LABEL } from "./parts";
import { toggleBookmark, useBronPref, useBronProgress } from "./useBronProgress";

/**
 * The reader's heading: label, title and subtitle on the left, four small
 * tools on the right (text size, bookmark, note, share). Text size and
 * "Schriftteksten voluit" share the first tool's menu. The note is a plain
 * text kept in this browser only - the account's notes are tied to Bible
 * verses, a Bronnen section is not one.
 */

const ICON_BTN =
  "flex h-9 w-9 flex-none items-center justify-center rounded-[9px] border border-line bg-surface text-ink-body transition-colors hover:bg-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] data-[state=open]:bg-line-soft disabled:cursor-not-allowed disabled:opacity-40 max-md:h-10 max-md:w-10";

const SIZES = Object.keys(TEXT_SIZES);

export function ReaderHeader({
  slug,
  sectionId,
  kicker,
  title,
  subtitle,
  shareTitle,
  hasRefs,
}: {
  slug: string;
  sectionId: string;
  kicker: string;
  title: string;
  subtitle: string | null;
  shareTitle: string;
  hasRefs: boolean;
}) {
  const progress = useBronProgress();
  const bookmarked = isBookmarked(progress, slug, sectionId);
  const [size, setSize] = useBronPref("text-size", "md");
  const [refsOpen, setRefsOpen] = useBronPref("refs-open", "0");
  const [note, setNote] = useBronPref(`note-${slug}/${sectionId}`, "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (noteOpen) noteRef.current?.focus();
  }, [noteOpen]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const sizeIndex = Math.max(0, SIZES.indexOf(size));
  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard either: nothing more to offer.
    }
  };

  return (
    <header className="mb-8 border-b border-line-soft pb-6">
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={`${LABEL} mb-1.5 !text-teal-dark dark:!text-teal-400`}>{kicker}</p>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.4px] text-ink sm:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-1.5 font-serif text-[17px] italic leading-snug text-ink-muted">{subtitle}</p>}
        </div>

        <div className="flex flex-none gap-1.5" role="toolbar" aria-label="Leesopties">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={ICON_BTN} aria-label="Tekstgrootte" title="Tekstgrootte">
                <Type className="h-4 w-4" strokeWidth={1.9} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-[12px] font-semibold text-ink-muted">Tekstgrootte</DropdownMenuLabel>
              <div className="flex items-center gap-1 px-2 pb-2">
                <button
                  type="button"
                  className={ICON_BTN}
                  aria-label="Kleiner"
                  disabled={sizeIndex === 0}
                  onClick={() => setSize(SIZES[sizeIndex - 1])}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="flex-1 text-center font-serif tabular-nums text-ink" aria-live="polite">
                  <span style={{ fontSize: `${TEXT_SIZES[SIZES[sizeIndex]]}px` }}>Aa</span>
                </span>
                <button
                  type="button"
                  className={ICON_BTN}
                  aria-label="Groter"
                  disabled={sizeIndex === SIZES.length - 1}
                  onClick={() => setSize(SIZES[sizeIndex + 1])}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              {hasRefs && (
                <>
                  <DropdownMenuSeparator />
                  <label className="flex cursor-pointer items-center justify-between gap-3 px-2 py-2 text-[13px] text-ink-body">
                    Schriftteksten voluit
                    <Switch checked={refsOpen === "1"} onCheckedChange={on => setRefsOpen(on ? "1" : "0")} />
                  </label>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            className={ICON_BTN}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Bladwijzer verwijderen" : "Bladwijzer toevoegen"}
            title={bookmarked ? "Bladwijzer verwijderen" : "Bladwijzer"}
            onClick={() => toggleBookmark(slug, sectionId)}
          >
            <Bookmark
              className={`h-4 w-4 ${bookmarked ? "fill-current text-teal-dark dark:text-teal-400" : ""}`}
              strokeWidth={1.9}
              aria-hidden
            />
          </button>

          <button
            type="button"
            className={`${ICON_BTN} relative`}
            aria-expanded={noteOpen}
            aria-controls="bron-notitie"
            aria-label="Notitie"
            title="Notitie"
            onClick={() => setNoteOpen(v => !v)}
          >
            <NotebookPen className="h-4 w-4" strokeWidth={1.9} aria-hidden />
            {note.trim() && (
              <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#0D9488" }} />
            )}
          </button>

          <button type="button" className={ICON_BTN} aria-label="Delen" title="Delen" onClick={share}>
            {copied ? (
              <Check className="h-4 w-4 text-teal-dark dark:text-teal-400" aria-hidden />
            ) : (
              <Share2 className="h-4 w-4" strokeWidth={1.9} aria-hidden />
            )}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Link gekopieerd" : ""}
          </span>
        </div>
      </div>

      {noteOpen && (
        <div id="bron-notitie" className="mt-5">
          <label htmlFor="bron-notitie-tekst" className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className={LABEL}>Notitie</span>
            <span className="text-[11.5px] text-ink-faint">Alleen bewaard in deze browser</span>
          </label>
          <textarea
            id="bron-notitie-tekst"
            ref={noteRef}
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
            placeholder="Wat valt je op in dit onderdeel?"
            className="w-full resize-y rounded-btn border border-line bg-surface px-3 py-2.5 text-[14px] leading-[1.6] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint hover:border-line-strong focus:border-teal focus:ring-[3px] focus:ring-teal/15"
          />
        </div>
      )}
    </header>
  );
}
