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
    },
    // UUID generated on the mobile device. Present only on notes created by
    // the app; the website never sets it. It makes an offline create that is
    // retried after a dropped connection idempotent.
    clientId: {
      type: String,
      default: undefined
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
// Partial index: a plain `sparse` compound index only skips a document when
// ALL of its fields are missing, and `userId` is always present, so `sparse`
// alone still indexed every website note with clientId: null - the second
// note (or highlight) any web user created collided on that null and every
// create after the first failed with a duplicate key error. A partial filter
// that requires clientId to actually exist excludes those documents from the
// index entirely, so only mobile-created notes (which always set clientId)
// are subject to the uniqueness constraint.
NoteSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);
NoteSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
