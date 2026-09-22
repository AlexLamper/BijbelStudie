/**
 * Shared types for the cross-reference ("Kruisverwijzingen") feature.
 *
 * Nothing here has a runtime dependency on the rest of the app: the build
 * script (Node), the v1 API route (server) and the reader components (browser)
 * all import from this file, so it must stay free of `fs`, React and Mongoose.
 *
 * See CROSS_LINKS_PLAN.md §2.1 for the shard layout these types describe.
 */

/**
 * OSIS-style canonical book codes, identical to `CODES_IN_ORDER` in
 * `lib/readChaptersCanon.ts` and to the upper-cased OpenBible OSIS book ids.
 *
 * `lib/bookCanon.ts` types its own `BookCode` as a bare `string` (it is
 * duplicated in bijbelquiz and must not change); this union is the narrow
 * version the cross-ref pipeline works with, and `readChaptersCanon` imports
 * it so there is exactly one list of codes in the project.
 */
export type BookCode =
  | 'GEN' | 'EXOD' | 'LEV' | 'NUM' | 'DEUT' | 'JOSH' | 'JUDG' | 'RUTH'
  | '1SAM' | '2SAM' | '1KGS' | '2KGS' | '1CHR' | '2CHR' | 'EZRA' | 'NEH'
  | 'ESTH' | 'JOB' | 'PS' | 'PROV' | 'ECCL' | 'SONG' | 'ISA' | 'JER'
  | 'LAM' | 'EZEK' | 'DAN' | 'HOS' | 'JOEL' | 'AMOS' | 'OBAD' | 'JONAH'
  | 'MIC' | 'NAH' | 'HAB' | 'ZEPH' | 'HAG' | 'ZECH' | 'MAL'
  | 'MATT' | 'MARK' | 'LUKE' | 'JOHN' | 'ACTS' | 'ROM' | '1COR' | '2COR'
  | 'GAL' | 'EPH' | 'PHIL' | 'COL' | '1THESS' | '2THESS' | '1TIM' | '2TIM'
  | 'TITUS' | 'PHLM' | 'HEB' | 'JAS' | '1PET' | '2PET' | '1JOHN' | '2JOHN'
  | '3JOHN' | 'JUDE' | 'REV';

/**
 * Versification profiles the build script emits one shard set per.
 *
 * `eng` is the source numbering (OpenBible is KJV-style), `heb` the Hebrew
 * tradition, `sv` the Statenvertaling mix. A version with no profile falls back
 * to `eng` and the UI shows `Versnummering kan in deze vertaling afwijken.`
 * (CROSS_LINKS_PLAN.md §1.4).
 */
export const VERSIFICATION_PROFILES = ['eng', 'heb', 'sv'] as const;
export type VersificationProfile = (typeof VERSIFICATION_PROFILES)[number];

/**
 * One normalised reference to a target passage.
 *
 * Field names are one letter because these are also the JSON keys everywhere
 * the record travels uncompacted; the shard files use the tuple form below.
 * A cross-ref never spans two books - the build script drops the 18 rows in the
 * source data that do (`Lev.27.34-Num.1.1`) rather than inventing an end-book
 * field that every consumer would then have to handle.
 */
export type CrossRef = {
  /** Target book index, 1..66 in canonical order. */
  b: number;
  /** Start chapter. */
  c: number;
  /** Start verse. */
  v: number;
  /** End chapter, only present when it differs from `c` (rare). */
  ec?: number;
  /** End verse, only present for ranges. */
  ev?: number;
  /** Votes after pruning, always >= 1. */
  w: number;
};

/**
 * The compact form stored in a shard: `[bookIdx, chapter, verse, endVerse|0,
 * votes, endChapter?]`.
 *
 * The sixth slot is omitted for the overwhelming majority of refs (same-chapter
 * targets). A literal `0` in that slot is accepted on read and means the same
 * as omitting it, so an older or hand-written shard still decodes.
 */
export type CrossRefTuple =
  | readonly [number, number, number, number, number]
  | readonly [number, number, number, number, number, number];

/**
 * One shard file: every cross-reference whose SOURCE verse sits in one chapter
 * of one versification profile.
 *
 * Path: `public/data/crossrefs/v1/<profile>/<BOOK>/<chapter>.json`.
 *
 * ```json
 * { "v":1, "p":"sv", "b":"PS", "c":51,
 *   "r": { "3": [[19,51,10,0,88],[26,36,26,0,71],[23,1,18,0,64]] } }
 * ```
 */
export type CrossRefShard = {
  /** Shard format version (not the dataset version). */
  v: number;
  /** Versification profile this shard was mapped into. */
  p: VersificationProfile;
  /** Source book code. */
  b: BookCode;
  /** Source chapter. */
  c: number;
  /** Source verse number (as a string key) to its refs, sorted by votes desc. */
  r: Record<string, CrossRefTuple[]>;
};

/** The shard format version this code writes and expects. */
export const CROSSREF_SHARD_VERSION = 1;

/**
 * `public/data/crossrefs/v1/index.json` - provenance and build stats.
 *
 * `source`, `sourceSha256` and `builtAt` are the CC BY licence evidence
 * (CROSS_LINKS_PLAN.md §1.2); `minVotes` and `topN` record the pruning the
 * build applied, because "indicate changes" is part of that licence.
 */
export type CrossRefIndex = {
  /** Bumped whenever the data changes; also surfaced in the v1 API body. */
  datasetVersion: number;
  /** Human-readable source name, e.g. `OpenBible.info Cross References`. */
  source: string;
  /** URL the source file was downloaded from. */
  sourceUrl?: string;
  /** SHA-256 of the downloaded source file. */
  sourceSha256: string;
  /** ISO timestamp of the build. */
  builtAt: string;
  /** The Dutch CC BY attribution string rendered under every list. */
  attribution: string;
  /** Profiles present under this version directory. */
  profiles: VersificationProfile[];
  /** Minimum votes kept (default 1). */
  minVotes?: number;
  /** Maximum refs stored per source verse (default 25). */
  topN?: number;
  /**
   * Build counters, keyed freely by the build script
   * (`rawPairs`, `kept`, `droppedLowVotes`, `sv.shards`, ...).
   */
  counts: Record<string, number>;
};

/**
 * A shard after decoding: verses in ascending order, refs in stored order
 * (votes descending). This is the shape the v1 route and the reader hooks work
 * with; nothing outside `loadShard.ts` should touch raw tuples.
 */
export type DecodedCrossRefShard = {
  /** Shard format version as read from the file. */
  version: number;
  profile: VersificationProfile;
  /** Source book code. */
  book: BookCode;
  /** Source chapter. */
  chapter: number;
  verses: Array<{ n: number; refs: CrossRef[] }>;
};
