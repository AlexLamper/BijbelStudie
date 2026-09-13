"use client";

import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Lock, Users } from "lucide-react";
import { useTranslation } from "../../app/i18n/client";

/* ── Styling ────────────────────────────────────────────────────────────────
   The kit's language (components/kit/primitives.tsx, /feedback, /notities):
   a 16 px card on a slate hairline, 10.5 px uppercase field labels, 10 px
   controls with a teal border and a soft teal ring on focus. The dark variants
   follow the shadcn tokens the study flow already uses, because this dialog is
   opened from inside that flow too. */

const LABEL =
  "block text-[10.5px] font-semibold uppercase tracking-[1.1px] text-ink-faint dark:text-muted-foreground";

const FIELD =
  "w-full rounded-btn border border-line bg-white text-ink outline-none transition-[border-color,box-shadow] " +
  "placeholder:text-ink-faint hover:border-line-strong focus:border-teal focus:ring-[3px] focus:ring-teal/15 " +
  "dark:border-border dark:bg-background dark:text-foreground dark:placeholder:text-muted-foreground";

const BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center rounded-btn border border-line bg-white px-4 text-[13.5px] font-semibold " +
  "text-ink-body transition-colors hover:bg-line-soft disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 " +
  "dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted";

const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-btn bg-teal px-5 text-[13.5px] font-semibold text-white " +
  "transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50 outline-none " +
  "focus-visible:ring-[3px] focus-visible:ring-teal/30";

/** A two-to-three way switch: the sunken track with a raised white thumb. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-[3px] rounded-btn bg-line-soft p-[3px] dark:bg-muted">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={[
              "h-8 min-w-0 flex-1 truncate rounded-[8px] px-2 text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
              active
                ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)] dark:bg-card dark:text-foreground"
                : "font-medium text-ink-muted hover:text-ink-body dark:text-muted-foreground dark:hover:text-foreground",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type Scope = "vers" | "gedeelte" | "hoofdstuk";

interface Note {
  _id: string;
  verseReference: string;
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  verseText: string;
  translation: string;
  noteText: string;
  highlightColor: string;
  tags: string[];
  isPrivate: boolean;
  type: "note" | "highlight" | "both";
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseReference: string;
  book: string;
  chapter: number;
  verse?: number;
  verseText: string;
  translation?: string;
  onSave?: (note: Note) => void;
  availableVerses?: number[];
  defaultScope?: Scope;
}

const highlightColors = [
  { name: "yellow", class: "bg-yellow-200 border-yellow-300", hex: "#FEF3C7" },
  { name: "blue",   class: "bg-blue-200 border-blue-300",   hex: "#DBEAFE" },
  { name: "green",  class: "bg-green-200 border-green-300",  hex: "#D1FAE5" },
  { name: "pink",   class: "bg-pink-200 border-pink-300",   hex: "#FCE7F3" },
  { name: "purple", class: "bg-purple-200 border-purple-300",hex: "#E9D5FF" },
  { name: "orange", class: "bg-orange-200 border-orange-300",hex: "#FED7AA" },
];

export function CreateNoteModal({
  isOpen,
  onClose,
  book,
  chapter,
  verse,
  verseText,
  translation = "statenvertaling",
  onSave,
  availableVerses = [],
  defaultScope,
}: CreateNoteModalProps) {
  const { t } = useTranslation("notes");

  // Determine initial scope
  const initScope: Scope = defaultScope ?? "vers";
  const [scope, setScope]             = useState<Scope>(initScope);
  const [verseStart, setVerseStart]   = useState<number>(verse ?? availableVerses[0] ?? 1);
  const [verseEnd, setVerseEnd]       = useState<number>(verse ?? availableVerses[0] ?? 1);

  const [noteText, setNoteText]       = useState("");
  const [tags, setTags]               = useState<string[]>([]);
  const [newTag, setNewTag]           = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [noteType, setNoteType]       = useState<"note" | "highlight" | "both">("note");
  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [myGroups, setMyGroups]       = useState<{ _id: string; name: string }[]>([]);
  const [selectedGroupId, setGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch user's groups once when modal first opens
  useEffect(() => {
    if (!isOpen || myGroups.length > 0 || loadingGroups) return;
    setLoadingGroups(true);
    fetch("/api/groepen?mine=true")
      .then(r => r.ok ? r.json() : { groups: [] })
      .then(d => setMyGroups(d.groups || []))
      .catch(() => {})
      .finally(() => setLoadingGroups(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Sync verse selectors when verse prop or scope changes
  useEffect(() => {
    if (verse != null) {
      setVerseStart(verse);
      setVerseEnd(verse);
    }
  }, [verse]);

  // Keep verseEnd >= verseStart
  useEffect(() => {
    if (verseEnd < verseStart) setVerseEnd(verseStart);
  }, [verseStart, verseEnd]);

  const computedReference = () => {
    if (scope === "hoofdstuk") return `${book} ${chapter}`;
    if (scope === "gedeelte")  return `${book} ${chapter}:${verseStart}-${verseEnd}`;
    return `${book} ${chapter}:${verse ?? verseStart}`;
  };

  const displayVerseText = () => {
    if (scope === "hoofdstuk") return `(Heel ${book} ${chapter})`;
    if (scope === "gedeelte")  return `(Verzen ${verseStart}–${verseEnd})`;
    return verseText;
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag("");
    }
  };

  const reset = () => {
    setScope(initScope);
    setNoteText("");
    setTags([]);
    setNewTag("");
    setSelectedColor("yellow");
    setNoteType("note");
    setGroupId("");
    setError(null);
    if (verse != null) { setVerseStart(verse); setVerseEnd(verse); }
  };

  /**
   * A pure highlight has no note text.
   *
   * The thoughts field is hidden for it, so it must not be required - and
   * whatever was typed before the type was switched must not be saved either:
   * the reader was told that text belongs to a note, and a highlight is not
   * one. The state itself is kept, so switching back restores what they wrote.
   */
  const wantsText = noteType !== "highlight";

  const handleSave = async () => {
    if (wantsText && !noteText.trim()) { setError(t("error_note_text_required")); return; }
    setIsSaving(true);
    setError(null);

    try {
      const noteData = {
        verseReference: computedReference(),
        book,
        chapter,
        verse:    scope === "vers"     ? (verse ?? verseStart) : scope === "gedeelte" ? verseStart : undefined,
        verseEnd: scope === "gedeelte" ? verseEnd : undefined,
        verseText: displayVerseText(),
        translation,
        noteText: wantsText ? noteText.trim() : "",
        highlightColor: selectedColor,
        tags,
        isPrivate: !selectedGroupId,
        type: noteType,
        groupId: selectedGroupId || null,
      };

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("error_save_failed"));
      }

      const saved = await res.json();
      reset();
      onClose();
      if (onSave) onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_save_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  const scopeLabels: Record<Scope, string> = {
    vers:      "Vers",
    gedeelte:  "Gedeelte",
    hoofdstuk: "Hoofdstuk",
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px]
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px]
            -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card border border-line bg-white
            shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] outline-none
            dark:border-border dark:bg-card
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
            motion-reduce:animate-none"
        >
          {/* Header */}
          <div className="flex flex-none items-center gap-3 border-b border-line px-5 py-4 sm:px-[22px] dark:border-border">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-[-0.2px] text-ink dark:text-foreground">
              Nieuwe notitie
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Sluiten"
              className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-btn text-ink-muted transition-colors hover:bg-line-soft hover:text-ink-body outline-none focus-visible:ring-2 focus-visible:ring-teal/40 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
            >
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 space-y-[18px] overflow-y-auto px-5 py-5 sm:px-[22px]">

            {/* Scope selector */}
            <div>
              <p className={`${LABEL} mb-2`}>Notitie voor</p>
              <Segmented<Scope>
                label="Notitie voor"
                value={scope}
                onChange={setScope}
                options={(["vers", "gedeelte", "hoofdstuk"] as Scope[]).map(s => ({ value: s, label: scopeLabels[s] }))}
              />
            </div>

            {/* Verse range selectors for 'gedeelte' */}
            {scope === "gedeelte" && availableVerses.length > 0 && (
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="nieuwe-notitie-van" className="mb-1.5 block text-[12px] font-medium text-ink-muted dark:text-muted-foreground">Van vers</label>
                  <select
                    id="nieuwe-notitie-van"
                    value={verseStart}
                    onChange={e => setVerseStart(Number(e.target.value))}
                    className={`${FIELD} h-9 cursor-pointer px-3 text-[13px] tabular-nums`}
                  >
                    {availableVerses.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <span aria-hidden className="pb-2 text-ink-faint">–</span>
                <div className="min-w-0 flex-1">
                  <label htmlFor="nieuwe-notitie-tot" className="mb-1.5 block text-[12px] font-medium text-ink-muted dark:text-muted-foreground">Tot vers</label>
                  <select
                    id="nieuwe-notitie-tot"
                    value={verseEnd}
                    onChange={e => setVerseEnd(Number(e.target.value))}
                    className={`${FIELD} h-9 cursor-pointer px-3 text-[13px] tabular-nums`}
                  >
                    {availableVerses.filter(v => v >= verseStart).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Reference preview: the passage behind a 2 px teal rule, in the
                serif face, the way /notities shows it on a saved note. */}
            <div className="rounded-btn bg-sunken px-[14px] py-3 dark:bg-muted">
              <p className="text-[12.5px] font-semibold text-teal">
                {computedReference()}
              </p>
              {scope === "vers" && verseText && (
                <div className="mt-[7px] flex items-stretch gap-[10px]">
                  <span aria-hidden className="w-[2px] flex-none rounded-full bg-teal-soft dark:bg-teal/40" />
                  <p className="font-serif text-[13.5px] leading-[1.6] text-ink-body dark:text-foreground">
                    &ldquo;{verseText}&rdquo;
                  </p>
                </div>
              )}
              {scope !== "vers" && (
                <p className="mt-1 text-[13px] text-ink-muted dark:text-muted-foreground">{displayVerseText()}</p>
              )}
            </div>

            {/* Note type */}
            <div>
              <p className={`${LABEL} mb-2`}>{t("note_type_label")}</p>
              <Segmented<"note" | "highlight" | "both">
                label={t("note_type_label")}
                value={noteType}
                onChange={setNoteType}
                options={(["note", "highlight", "both"] as const).map(type => ({
                  value: type,
                  label: type === "note" ? t("type_note") : type === "highlight" ? t("type_highlight") : t("type_both"),
                }))}
              />
            </div>

            {/* Highlight color */}
            {(noteType === "highlight" || noteType === "both") && (
              <div>
                <p className={`${LABEL} mb-2`}>{t("highlight_color_label")}</p>
                <div className="flex flex-wrap gap-2.5">
                  {highlightColors.map(color => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      aria-pressed={selectedColor === color.name}
                      aria-label={color.name}
                      className={`h-8 w-8 rounded-full border ${color.class} transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-teal/40 ${
                        selectedColor === color.name
                          ? "ring-2 ring-teal ring-offset-2 ring-offset-white dark:ring-offset-card"
                          : ""
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Note text. Absent for a pure highlight: marking a verse is not
                writing about it, and an empty box under "Markering" invited people
                to type something the save would then have thrown away. */}
            {wantsText && (
            <div>
              <label htmlFor="nieuwe-notitie-tekst" className={`${LABEL} mb-2`}>
                {t("note_thoughts_label")}
              </label>
              <textarea
                id="nieuwe-notitie-tekst"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Schrijf je gedachten, inzichten of vragen..."
                rows={4}
                className={`${FIELD} block min-h-[116px] resize-y px-[14px] py-3 text-[14px] leading-[1.6]`}
              />
            </div>
            )}

            {/* Tags */}
            <div>
              <label htmlFor="nieuwe-notitie-tag" className={`${LABEL} mb-2`}>
                {t("tags_label")}
              </label>
              {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-line bg-sunken pl-[10px] pr-1 text-[12.5px] font-medium text-ink-body dark:border-border dark:bg-muted dark:text-foreground"
                    >
                      <span className="truncate">#{tag}</span>
                      <button
                        type="button"
                        aria-label={`Tag ${tag} verwijderen`}
                        onClick={() => setTags(tags.filter(t => t !== tag))}
                        className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-line hover:text-ink-body dark:hover:bg-border dark:hover:text-foreground"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  id="nieuwe-notitie-tag"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder={t("tag_placeholder")}
                  className={`${FIELD} h-10 min-w-0 flex-1 px-3 text-[13.5px]`}
                  onKeyPress={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                />
                <button type="button" onClick={handleAddTag} className={`${BTN_SECONDARY} flex-none`}>
                  {t("add_tag")}
                </button>
              </div>
            </div>

            {/* Zichtbaarheid */}
            <div>
              <p className={`${LABEL} mb-2`}>Zichtbaarheid</p>
              {loadingGroups ? (
                <div className="h-[58px] animate-pulse rounded-btn bg-line-soft dark:bg-muted" />
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupId("")}
                    aria-pressed={!selectedGroupId}
                    className={[
                      "flex w-full items-center gap-3 rounded-btn border px-[14px] py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-teal/20",
                      !selectedGroupId
                        ? "border-teal bg-[var(--teal-wash-2)] ring-1 ring-teal"
                        : "border-line hover:border-line-strong dark:border-border",
                    ].join(" ")}
                  >
                    <Lock className={`h-4 w-4 flex-shrink-0 ${!selectedGroupId ? "text-teal" : "text-ink-faint"}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink dark:text-foreground">Alleen voor mij</p>
                      <p className="mt-px text-[12px] text-ink-muted dark:text-muted-foreground">Alleen jij kunt deze notitie zien</p>
                    </div>
                  </button>

                  {myGroups.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => !selectedGroupId && setGroupId(myGroups[0]._id)}
                        aria-pressed={!!selectedGroupId}
                        className={[
                          "flex w-full items-center gap-3 rounded-btn border px-[14px] py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-teal/20",
                          selectedGroupId
                            ? "border-teal bg-[var(--teal-wash-2)] ring-1 ring-teal"
                            : "border-line hover:border-line-strong dark:border-border",
                        ].join(" ")}
                      >
                        <Users className={`h-4 w-4 flex-shrink-0 ${selectedGroupId ? "text-teal" : "text-ink-faint"}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold text-ink dark:text-foreground">Bijbelgroep</p>
                          <p className="mt-px text-[12px] text-ink-muted dark:text-muted-foreground">Gedeeld met de leden van een groep</p>
                        </div>
                      </button>
                      {selectedGroupId !== undefined && (
                        <select
                          value={selectedGroupId}
                          onChange={e => setGroupId(e.target.value)}
                          aria-label="Kies een groep"
                          className={`${FIELD} mt-2 h-10 cursor-pointer px-3 text-[13.5px]`}
                        >
                          <option value="">Kies een groep...</option>
                          {myGroups.map(g => (
                            <option key={g._id} value={g._id}>{g.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div role="alert" className="rounded-btn border border-line bg-sunken px-[14px] py-3 text-[13.5px] text-danger dark:border-border dark:bg-muted">
                {error}
              </div>
            )}
          </div>

          {/* Actions: pinned below the scrolling body so they never scroll away. */}
          <div className="flex flex-none items-center gap-2.5 border-t border-line px-5 py-4 sm:justify-end sm:px-[22px] dark:border-border">
            <button type="button" onClick={handleClose} disabled={isSaving} className={`${BTN_SECONDARY} flex-1 sm:flex-none`}>
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (wantsText && !noteText.trim())}
              className={`${BTN_PRIMARY} flex-1 sm:flex-none`}
            >
              {isSaving && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {isSaving ? t("saving") : t("save_note")}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
