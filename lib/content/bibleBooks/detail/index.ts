import type { BookDetail } from "../types";
import { DETAIL_WET_SAMUEL } from "./wet-samuel";
import { DETAIL_KONINGEN_ESTHER } from "./koningen-esther";
import { DETAIL_JOB_KLAAGLIEDEREN } from "./job-klaagliederen";
import { DETAIL_EZECHIEL_MICHA } from "./ezechiel-micha";
import { DETAIL_NAHUM_MARKUS } from "./nahum-markus";
import { DETAIL_LUKAS_GALATEN } from "./lukas-galaten";
import { DETAIL_EFEZIERS_FILEMON } from "./efeziers-filemon";
import { DETAIL_HEBREEEN_OPENBARING } from "./hebreeen-openbaring";

export type { BookDetail } from "../types";

/**
 * Long-form content for /bijbelboeken/[slug], in canonical order.
 *
 * Import this module from the book page only. It is roughly 40k words of
 * Dutch; lib/content/bibleBooks (index.ts) is imported by the lesson flow and
 * by client components, and must stay free of it.
 */
export const BOOK_DETAILS: BookDetail[] = [
  ...DETAIL_WET_SAMUEL,
  ...DETAIL_KONINGEN_ESTHER,
  ...DETAIL_JOB_KLAAGLIEDEREN,
  ...DETAIL_EZECHIEL_MICHA,
  ...DETAIL_NAHUM_MARKUS,
  ...DETAIL_LUKAS_GALATEN,
  ...DETAIL_EFEZIERS_FILEMON,
  ...DETAIL_HEBREEEN_OPENBARING,
];

const BY_SLUG = new Map(BOOK_DETAILS.map(detail => [detail.slug, detail]));

export function getBookDetail(slug: string): BookDetail | undefined {
  return BY_SLUG.get(slug);
}

/** When the book-page content last changed meaningfully (WebPage.dateModified). */
export const BOOK_DETAIL_UPDATED = "2026-09-23";
