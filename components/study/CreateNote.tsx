"use client";

import React, { useState } from "react";
import { Plus, Save, X, Tag, Palette, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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

interface CreateNoteProps {
  verseReference: string;
  book: string;
  chapter: number;
  verse?: number;
  verseText: string;
  translation?: string;
  language?: string;
  onSave?: (note: Note) => void;
  onCancel?: () => void;
  className?: string;
}

const highlightColors = [
  { name: "yellow", class: "bg-yellow-200 border-yellow-300", hex: "#FEF3C7" },
  { name: "blue", class: "bg-blue-200 border-blue-300", hex: "#DBEAFE" },
  { name: "green", class: "bg-green-200 border-green-300", hex: "#D1FAE5" },
  { name: "pink", class: "bg-pink-200 border-pink-300", hex: "#FCE7F3" },
  { name: "purple", class: "bg-purple-200 border-purple-300", hex: "#E9D5FF" },
  { name: "orange", class: "bg-orange-200 border-orange-300", hex: "#FED7AA" },
];

export function CreateNote({
  verseReference,
  book,
  chapter,
  verse,
  verseText,
  translation = "ASV",
  language = "en",
  onSave,
  onCancel,
  className = ""
}: CreateNoteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [noteType, setNoteType] = useState<"note" | "highlight" | "both">("note");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!noteText.trim()) {
      setError("Please add some text to your note");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const noteData = {
        verseReference,
        book,
        chapter,
        verse,
        verseText,
        translation,
        noteText: noteText.trim(),
        highlightColor: selectedColor,
        tags,
        isPrivate,
        type: noteType,
        language
      };

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save note");
      }

      const savedNote = await response.json();
      
      // Reset form
      setNoteText("");
      setTags([]);
      setNewTag("");
      setSelectedColor("yellow");
      setNoteType("note");
      setIsPrivate(true);
      setIsOpen(false);

      // Call callback if provided
      if (onSave) {
        onSave(savedNote);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNoteText("");
    setTags([]);
    setNewTag("");
    setSelectedColor("yellow");
    setNoteType("note");
    setIsPrivate(true);
    setError(null);
    setIsOpen(false);
    if (onCancel) {
      onCancel();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={`gap-2 ${className}`}
      >
        <Plus className="h-4 w-4" />
        Add Note
      </Button>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Add Note for {verseReference}</CardTitle>
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bible Verse Preview */}
        <div className="bg-gray-50 dark:bg-muted p-3 border-l-4 border-indigo-300">
          <p className="italic text-gray-700 dark:text-foreground text-sm">
            &ldquo;{verseText}&rdquo;
          </p>
          <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">
            - {verseReference} ({translation})
          </p>
        </div>

        {/* Note Type Selection */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={noteType === "note" ? "default" : "outline"}
            size="sm"
            onClick={() => setNoteType("note")}
          >
            Note
          </Button>
          <Button
            type="button"
            variant={noteType === "highlight" ? "default" : "outline"}
            size="sm"
            onClick={() => setNoteType("highlight")}
          >
            Highlight
          </Button>
          <Button
            type="button"
            variant={noteType === "both" ? "default" : "outline"}
            size="sm"
            onClick={() => setNoteType("both")}
          >
            Both
          </Button>
        </div>

        {/* Highlight Color Selection (for highlights) */}
        {(noteType === "highlight" || noteType === "both") && (
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Color:</span>
            <div className="flex gap-1">
              {highlightColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-6 h-6 rounded-full border-2 ${color.class} ${
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
          <label className="block text-sm font-medium mb-2">Your note:</label>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your thoughts, insights, or reflections about this verse..."
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Tag className="h-4 w-4 inline mr-1" />
            Tags:
          </label>
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
              placeholder="Add a tag (e.g., faith, prayer, love)"
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
              Add
            </Button>
          </div>
        </div>

        {/* Privacy Setting */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Privacy:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPrivate(!isPrivate)}
            className="gap-2"
          >
            {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isPrivate ? "Private" : "Public"}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-2 rounded">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-2">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={isSaving}
          >
            Cancel
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
            {isSaving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

