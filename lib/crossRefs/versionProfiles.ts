/**
 * Which versification profile each bible version is numbered in.
 *
 * This file is the committed RESULT of `scripts/audit-versification.mjs`
 * (CROSS_LINKS_PLAN.md §1.4 step 3). The audit reads every version's JSON off
 * disk, counts the verses in every chapter and diffs them against the KJV - the
 * numbering the OpenBible cross-reference dataset uses. Versions whose diff is
 * byte-identical form one profile. Every binding below names the evidence.
 *
 * Reproduce it with:
 *   node scripts/audit-versification.mjs            # summary + profile groups
 *   node scripts/audit-versification.mjs --full     # every differing chapter
 *
 * Nothing here maps a verse: the build script bakes the mapping into the shards
 * so neither the web reader nor the Flutter app ever renumbers anything
 * (§1.4 step 4). This module only answers "which shard set does this reader
 * need, and should we warn them about the numbering".
 */

import type { VersificationProfile } from './types';

/** Used for any version this file does not list (CROSS_LINKS_PLAN.md §1.4 step 3). */
export const FALLBACK_PROFILE: VersificationProfile = 'eng';

/**
 * Version id (exactly as in `public/data/manifest.json`, `.json` stripped)
 * -> versification profile.
 *
 * ---------------------------------------------------------------------------
 * AUDIT EVIDENCE - `node scripts/audit-versification.mjs`, 2026-09-22
 * ---------------------------------------------------------------------------
 * Baseline KJV: 66 books, 1,189 chapters, 31,102 verses.
 *
 *   version                books  chapters  verses   differing chapters
 *   kjv                       66      1189   31102     0   (baseline)
 *   heilige_schrift_1917      66      1189   31102     0
 *   elberfelder_1905          66      1189   31102     0
 *   luther_1912               66      1189   31102     0
 *   geneva                    66      1189   31102     0
 *   coverdale                 66      1189   31102     0
 *   asv                       66      1189   31101     1   (Matt 17:21 absent)
 *   web                       66      1189   31098     6   (variant verses only)
 *   canisiusbijbel            66      1191   31206     4   (Ps 84, Mark 9:44,
 *                                                           + Dan 13/14 deutero)
 *   statenvertaling           66      1189   31173    93
 *   nbg51                     66      1189   31158   110
 *
 * The six zero-diff versions plus asv, web and canisiusbijbel form ONE group:
 * their differences are all missing or merged single verses (textual variants
 * such as Matt 17:21, Acts 8:37, Mark 9:44, Rom 16:24), never a renumbering -
 * the verse that exists still carries the same number. That is the `eng`
 * profile, and a target the version happens to lack is a UI case the panel
 * already handles (`Dit vers ontbreekt in deze vertaling.`), not a mapping case.
 *
 * `statenvertaling` and `nbg51` are a different tradition. Their 93 shared
 * differing chapters are identical - SV's 93 are a strict subset of NBG51's
 * 110, and the 17 extra NBG51 lines are data gaps (a missing last verse in
 * Ezra 7, Neh 7, Prov 22/23/27, Song 4/5, Luke 23; holes in 1Sam 4, Mark 6/12,
 * Luke 9, John 19, Acts 9, 1Tim 6) plus Haggai, see below. That shared
 * tradition is the `sv` profile.
 *
 * Caution when re-running the audit: the Statenvertaling export truncates every
 * chapter to the KJV verse count and hides the overflow INSIDE the last verse,
 * tagged `[ (Psalms 51:20) ... ]`. Counting only the JSON keys reports Psalm 51
 * as 19 verses and hides the fact that the file is numbered 1..21 with the
 * title as verses 1-2. The audit script parses those 94 markers; anything else
 * reading this data must too.
 *
 * `sv` is NOT a TVTMS column. Measured against the real data it differs from
 * TVTMS Hebrew in 73 chapters and from English in 93 (Hebrew numbers Malachi in
 * 3 chapters, Joel in 4 and Jonah 2:1; the Dutch tradition keeps the English
 * chapter divisions there while numbering psalm titles). The rules are derived
 * from the versions themselves and live in `scripts/build-crossrefs.mjs`
 * (`SV_PSALM_TITLE_OFFSET`, `SV_SEGMENTS`); each one was verified by comparing
 * the Dutch verse with the KJV verse it should equal.
 */
export const VERSION_PROFILES: Readonly<Record<string, VersificationProfile>> = {
  // --- eng: identical numbering to the KJV the dataset is keyed on ----------
  kjv: 'eng',                   // baseline
  asv: 'eng',                   // 1 differing chapter: Matt 17 lacks v21
  web: 'eng',                   // 6 differing chapters, all variant verses
  geneva: 'eng',                // 0 differing chapters
  coverdale: 'eng',             // 0 differing chapters
  heilige_schrift_1917: 'eng',  // 0 differing chapters (Leidse Vertaling 1917)
  elberfelder_1905: 'eng',      // 0 differing chapters
  luther_1912: 'eng',           // 0 differing chapters
  canisiusbijbel: 'eng',        // 4 differing chapters; Dan 13/14 are
                                // deuterocanonical and carry no cross-refs
  // Licensed, lives in the private `bijbelapi-data` repo and is not on disk
  // locally, so the audit could not measure these two. Both are modern
  // editions of English/German lines that follow the KJV chapter divisions;
  // they are marked `numberingMayDiffer` below so the reader is told.
  schlachter: 'eng',
  net: 'eng',

  // --- sv: the Dutch tradition (numbered psalm titles + 18 boundary moves) ---
  statenvertaling: 'sv',
  // 65 of 66 books match `statenvertaling` verse for verse. The exception is
  // Haggai: nbg51 puts eng Hag 1:15 at 2:1 (so its ch1 has 14 verses and ch2
  // has 24) where the Statenvertaling keeps the English division. A fourth
  // shard set for two chapters costs ~4.7 MB and 1,189 files, so nbg51 shares
  // the `sv` shards and `numberingMayDiffer('nbg51', 'HAG')` returns true.
  // (`scripts/build-crossrefs.mjs` can emit the profile with
  // `--profiles=nbg` if that trade is ever revisited.)
  nbg51: 'sv',
};

/**
 * Versions the audit could not measure because their data is licensed and only
 * present after `npm run sync-data`. They use the fallback profile and the UI
 * shows `Versnummering kan in deze vertaling afwijken.`
 */
export const UNVERIFIED_VERSIONS: ReadonlySet<string> = new Set(['schlachter', 'net']);

/**
 * Books where a version's numbering is known to differ from the profile it is
 * bound to. Keyed by version id, values are canonical book codes.
 */
export const VERSION_BOOK_DEVIATIONS: Readonly<Record<string, readonly string[]>> = {
  // eng Hag 1:15 is nbg51 Hag 2:1; every nbg51 verse in Haggai 2 is one higher
  // than the `sv` shards say.
  nbg51: ['HAG'],
};

/** The profile a version's cross-ref shards should be read from. */
export function profileForVersion(versionId: string | null | undefined): VersificationProfile {
  if (!versionId) return FALLBACK_PROFILE;
  return VERSION_PROFILES[versionId] ?? FALLBACK_PROFILE;
}

/** True when this version's numbering was proved to match its profile. */
export function isProfiledVersion(versionId: string | null | undefined): boolean {
  return !!versionId
    && Object.prototype.hasOwnProperty.call(VERSION_PROFILES, versionId)
    && !UNVERIFIED_VERSIONS.has(versionId);
}

/**
 * Whether to show `Versnummering kan in deze vertaling afwijken.`
 *
 * Pass the book the reader is in to get the precise answer: an unknown or
 * unverified version always warns, a profiled version warns only in the books
 * listed in `VERSION_BOOK_DEVIATIONS`. Called without a book it answers for the
 * version as a whole, which is `false` for every version we measured.
 */
export function numberingMayDiffer(
  versionId: string | null | undefined,
  bookCode?: string | null,
): boolean {
  if (!isProfiledVersion(versionId)) return true;
  if (!bookCode) return false;
  const deviations = VERSION_BOOK_DEVIATIONS[versionId as string];
  return !!deviations && deviations.includes(bookCode);
}
