import { CATALOGUE_ENTRIES, type CatalogueEntry } from './bookStudies';
import type { StudyType } from './data/curated-studies';

/**
 * A saved study id, resolved to what a card needs.
 *
 * Studies are static data (lib/bookStudies.ts), not documents, so resolving a
 * whole `User.savedStudies` array is a handful of Map lookups in memory - no
 * extra query and no per-id work beyond that.
 */
export interface SavedStudyCard {
  id: string;
  title: string;
  type: StudyType;
  /** "Wet", "Evangelie", "Persoon" - the catalogue's one-word label. */
  kind: string;
  /** The book for a book study, otherwise where the study starts ("Johannes 3"). */
  passage: string;
  lessonCount: number;
  avgMinutes: number;
}

const ENTRY_BY_ID = new Map<string, CatalogueEntry>(
  CATALOGUE_ENTRIES.map((entry) => [entry.study.id, entry]),
);

/**
 * Newest save first (`$addToSet` appends), duplicates dropped, and ids whose
 * study no longer exists skipped rather than failing the list.
 */
export function resolveSavedStudies(ids: unknown): SavedStudyCard[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const cards: SavedStudyCard[] = [];
  for (let i = ids.length - 1; i >= 0; i -= 1) {
    const id = ids[i];
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    const entry = ENTRY_BY_ID.get(id);
    if (!entry) continue;
    const { study, book, kind, lessonCount, avgMinutes } = entry;
    cards.push({
      id: study.id,
      title: study.title,
      type: study.type,
      kind,
      passage: book
        ? book.name
        : [study.startBook, study.startChapter || ''].filter(Boolean).join(' '),
      lessonCount,
      avgMinutes,
    });
  }
  return cards;
}
