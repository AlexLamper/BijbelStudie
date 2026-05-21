"use client";

import React, { useState, useEffect } from "react";
import { Save, X, Palette, Lock, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";
import { useTranslation } from "../../app/i18n/client";

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

  const handleSave = async () => {
    if (!noteText.trim()) { setError(t("error_note_text_required")); return; }
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
        noteText: noteText.trim(),
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Nieuwe notitie">
      <div className="space-y-5">

        {/* Scope selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Notitie voor
          </label>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
            {(["vers", "gedeelte", "hoofdstuk"] as Scope[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className="flex-1 py-1.5 text-sm font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: scope === s ? "#fff" : "transparent",
                  color: scope === s ? "#111827" : "#6B7280",
                  boxShadow: scope === s ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {scopeLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Verse range selectors for 'gedeelte' */}
        {scope === "gedeelte" && availableVerses.length > 0 && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Van vers</label>
              <select
                value={verseStart}
                onChange={e => setVerseStart(Number(e.target.value))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#0D9488' } as React.CSSProperties}
              >
                {availableVerses.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <span className="text-gray-400 pb-2">-</span>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Tot vers</label>
              <select
                value={verseEnd}
                onChange={e => setVerseEnd(Number(e.target.value))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
              >
                {availableVerses.filter(v => v >= verseStart).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Reference preview */}
        <div
          className="rounded-lg p-4 border-l-4"
          style={{ backgroundColor: "rgba(13,148,136,0.05)", borderColor: "#0D9488" }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: "#0D9488" }}>
            {computedReference()}
          </p>
          {scope === "vers" && verseText && (
            <p className="italic text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
              &ldquo;{verseText}&rdquo;
            </p>
          )}
          {scope !== "vers" && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">{displayVerseText()}</p>
          )}
        </div>

        {/* Note type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {t("note_type_label")}
          </label>
          <div className="flex gap-2">
            {(["note", "highlight", "both"] as const).map(type => (
              <Button
                key={type}
                type="button"
                variant={noteType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setNoteType(type)}
                className={noteType === type ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
              >
                {type === "note" ? t("type_note") : type === "highlight" ? t("type_highlight") : t("type_both")}
              </Button>
            ))}
          </div>
        </div>

        {/* Highlight color */}
        {(noteType === "highlight" || noteType === "both") && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              <Palette className="h-3 w-3 inline mr-1" />
              {t("highlight_color_label")}
            </label>
            <div className="flex gap-2">
              {highlightColors.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-7 h-7 rounded-full border-2 ${color.class} ${selectedColor === color.name ? "ring-2 ring-offset-1" : ""}`}
                  style={{ '--tw-ring-color': '#0D9488' } as React.CSSProperties}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Note text */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {t("note_thoughts_label")}
          </label>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Schrijf je gedachten, inzichten of vragen..."
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {t("tags_label")}
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              placeholder={t("tag_placeholder")}
              className="flex-1"
              onKeyPress={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
            />
            <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
              {t("add_tag")}
            </Button>
          </div>
        </div>

        {/* Zichtbaarheid */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Zichtbaarheid
          </label>
          {loadingGroups ? (
            <div className="h-9 bg-gray-100 dark:bg-secondary rounded-lg animate-pulse" />
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setGroupId("")}
                className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: !selectedGroupId ? "#0D9488" : "#E5E7EB",
                  backgroundColor: !selectedGroupId ? "rgba(13,148,136,0.05)" : "transparent",
                }}
              >
                <Lock className="h-4 w-4 flex-shrink-0" style={{ color: !selectedGroupId ? "#0D9488" : "#9CA3AF" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-foreground">Alleen voor mij</p>
                  <p className="text-xs text-gray-400 dark:text-muted-foreground">Alleen jij kunt deze notitie zien</p>
                </div>
              </button>

              {myGroups.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => !selectedGroupId && setGroupId(myGroups[0]._id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: selectedGroupId ? "#0D9488" : "#E5E7EB",
                      backgroundColor: selectedGroupId ? "rgba(13,148,136,0.05)" : "transparent",
                    }}
                  >
                    <Users className="h-4 w-4 flex-shrink-0" style={{ color: selectedGroupId ? "#0D9488" : "#9CA3AF" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-foreground">Bijbelgroep</p>
                      <p className="text-xs text-gray-400 dark:text-muted-foreground">Gedeeld met de leden van een groep</p>
                    </div>
                  </button>
                  {selectedGroupId !== undefined && (
                    <select
                      value={selectedGroupId}
                      onChange={e => setGroupId(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 border border-gray-200 dark:border-border rounded-lg text-sm bg-white dark:bg-card text-gray-900 dark:text-foreground focus:outline-none"
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
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-200">
          <Button onClick={handleClose} variant="outline" disabled={isSaving}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !noteText.trim()}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save className="h-4 w-4" />}
            {isSaving ? t("saving") : t("save_note")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
