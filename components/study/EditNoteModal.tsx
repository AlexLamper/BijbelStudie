"use client";

import React, { useState, useEffect } from "react";
import { Save, X, Palette, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Modal } from "../ui/modal";
import { useTranslation } from "../../app/i18n/client";

interface Note {
  _id: string;
  verseReference: string;
  book: string;
  chapter: number;
  verse?: number;
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

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onSave?: (note: Note) => void;
}

const highlightColors = [
  { name: "yellow", class: "bg-yellow-200 border-yellow-300", hex: "#FEF3C7" },
  { name: "blue", class: "bg-blue-200 border-blue-300", hex: "#DBEAFE" },
  { name: "green", class: "bg-green-200 border-green-300", hex: "#D1FAE5" },
  { name: "pink", class: "bg-pink-200 border-pink-300", hex: "#FCE7F3" },
  { name: "purple", class: "bg-purple-200 border-purple-300", hex: "#E9D5FF" },
  { name: "orange", class: "bg-orange-200 border-orange-300", hex: "#FED7AA" },
];

export function EditNoteModal({
  isOpen,
  onClose,
  note,
  onSave,
}: EditNoteModalProps) {
  const { t } = useTranslation("notes");
  const [noteText, setNoteText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [noteType, setNoteType] = useState<"note" | "highlight" | "both">("note");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when note changes
  useEffect(() => {
    if (note) {
      setNoteText(note.noteText);
      setTags(note.tags);
      setSelectedColor(note.highlightColor);
      setNoteType(note.type);
      setIsPrivate(note.isPrivate);
      setError(null);
    }
  }, [note]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const resetForm = () => {
    setNoteText("");
    setTags([]);
    setNewTag("");
    setSelectedColor("yellow");
    setNoteType("note");
    setIsPrivate(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!noteText.trim()) {
      setError(t("error_note_text_required"));
      return;
    }

    if (!note) {
      setError("No note selected");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedNoteData = {
        noteText: noteText.trim(),
        highlightColor: selectedColor,
        tags,
        isPrivate,
        type: noteType,
      };

      const response = await fetch(`/api/notes/${note._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedNoteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("error_save_failed"));
      }

      const savedNote = await response.json();
      
      // Close modal
      onClose();

      // Call callback if provided
      if (onSave) {
        onSave(savedNote);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_save_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!note) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${t("edit_note_title")} - ${note.verseReference}`}
    >
      <div className="space-y-6">
        {/* Bible Verse Preview */}
        <div className="bg-gray-50 dark:bg-muted p-4 border-l-4 border-indigo-300">
          <p className="italic text-gray-700 dark:text-foreground text-sm leading-relaxed">
            &ldquo;{note.verseText}&rdquo;
          </p>
          <p className="text-xs text-gray-500 dark:text-muted-foreground mt-2">
            — {note.verseReference} ({note.translation})
          </p>
        </div>

        {/* Note Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">{t("note_type_label")}</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={noteType === "note" ? "default" : "outline"}
              size="sm"
              onClick={() => setNoteType("note")}
            >
              {t("type_note")}
            </Button>
            <Button
              type="button"
              variant={noteType === "highlight" ? "default" : "outline"}
              size="sm"
              onClick={() => setNoteType("highlight")}
            >
              {t("type_highlight")}
            </Button>
            <Button
              type="button"
              variant={noteType === "both" ? "default" : "outline"}
              size="sm"
              onClick={() => setNoteType("both")}
            >
              {t("type_both")}
            </Button>
          </div>
        </div>

        {/* Highlight Color Selection */}
        {(noteType === "highlight" || noteType === "both") && (
          <div>
            <label className="block text-sm font-medium mb-2">
              <Palette className="h-4 w-4 inline mr-1" />
              {t("highlight_color_label")}
            </label>
            <div className="flex gap-2">
              {highlightColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-8 h-8 rounded-full border-2 ${color.class} ${
                    selectedColor === color.name ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Note Text */}
        <div>
          <label className="block text-sm font-medium mb-2">{t("note_thoughts_label")}</label>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t("note_thoughts_placeholder")}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">{t("tags_label")}</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t("tag_placeholder")}
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              size="sm"
            >
              {t("add_tag")}
            </Button>
          </div>
        </div>

        {/* Privacy Setting */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("privacy_label")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPrivate(!isPrivate)}
            className="gap-2"
          >
            {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isPrivate ? t("privacy_private") : t("privacy_public")}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-border">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !noteText.trim()}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? t("saving") : t("save_note")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

