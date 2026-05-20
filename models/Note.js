import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    verseReference: { 
      type: String, 
      required: true // e.g., "Genesis 1:1" or "John 3:16"
    },
    book: { 
      type: String, 
      required: true // e.g., "Genesis", "John"
    },
    chapter: { 
      type: Number, 
      required: true 
    },
    verse: {
      type: Number
    }, // Optional, for specific verse highlights
    verseEnd: {
      type: Number
    }, // Optional, end verse for passage notes (e.g. verse 1-5)
    verseText: { 
      type: String, 
      required: true // The actual Bible text
    },
    translation: { 
      type: String, 
      default: "ASV" // Bible translation version
    },
    noteText: { 
      type: String, 
      required: true // User's personal note/reflection
    },
    highlightColor: { 
      type: String, 
      enum: ["yellow", "blue", "green", "pink", "purple", "orange"],
      default: "yellow" 
    },
    tags: [{ 
      type: String 
    }], // e.g., ["faith", "prayer", "love"]
    isPrivate: { 
      type: Boolean, 
      default: true 
    },
    type: { 
      type: String, 
      enum: ["note", "highlight", "both"],
      default: "note" 
    },
    language: {
      type: String,
      default: "nl"
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      default: null
    }
  },
  { 
    timestamps: true 
  }
);

// Index for efficient querying
NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ book: 1, chapter: 1, verse: 1 });
NoteSchema.index({ tags: 1 });

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
