import mongoose from "mongoose";

/**
 * One day's "tekst van de dag", as it was served.
 *
 * The upstream feed (bijbelapi.com) has no archive - it answers with today's
 * verse whatever `date` you ask for - so the only way "Voorgaande dagen" can
 * show anything is if we keep a copy of each day as it goes past. Every verse
 * of the day is the same for everyone, so this is one shared collection rather
 * than per-user state.
 */
const DayTextEntrySchema = new mongoose.Schema(
  {
    /** Europe/Amsterdam calendar day, `yyyy-mm-dd`. One document per day. */
    date: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    reference: { type: String, required: true },
    book: { type: String, required: true },
    chapter: { type: Number, required: true },
    verse: { type: Number, required: true },
    version: { type: String, default: "" },
  },
  { timestamps: true }
);

DayTextEntrySchema.index({ date: -1 });

export default mongoose.models.DayTextEntry ||
  mongoose.model("DayTextEntry", DayTextEntrySchema);
