/**
 * Which translations a reader may carry out of the product, and how much.
 *
 * ── The distinction ─────────────────────────────────────────────────────────
 *
 * Reading a translation and *taking* it are two different permissions.
 *
 *   - Public-domain text (Statenvertaling, Canisius, De Heilige Schrift 1917,
 *     KJV, ASV, WEB, Geneva, Coverdale) may be taken by the bucket. There is no
 *     rights holder to ask. Selecting a whole chapter and copying it is fine
 *     and stays fine - these entries are deliberately absent below.
 *   - Licensed text may be read, because we hold a licence to show it, and may
 *     be quoted a verse at a time, because quotation is what a Bible reader
 *     does. It may NOT be dragged out of the page in chapter-sized lumps: that
 *     is redistribution, and no licence we hold or expect to hold covers it.
 *
 * So this module holds one list: the translations whose text the clients must
 * refuse to hand over wholesale. Everything not on it keeps today's behaviour.
 *
 * ── What "restricted" buys the reader, and what it costs them ───────────────
 *
 * On a restricted translation the clients:
 *
 *   1. turn off cursor selection over the scripture column (web: `user-select:
 *      none` plus blocked copy/cut/drag/contextmenu; app: the reader's verses
 *      are plain `Text`, never `SelectableText`/`SelectionArea`),
 *   2. keep a per-verse copy control that copies exactly MAX_COPY_VERSES verse
 *      with its reference and the translation's attribution line, so the thing
 *      a reader actually wants - one verse, cited - never gets harder, and
 *   3. refuse whole-chapter share/copy, offering the reference and a link
 *      instead of the text.
 *
 * This is the product saying what it is for. A determined reader can still read
 * the chapter response in dev tools, and that is fine: the obligation we carry
 * is not to build DRM, it is to not *offer* a licensed translation as a
 * copyable corpus. Same posture as HsvVersePanel, which has worked this way
 * since the 50-verse allowance shipped (lib/hsvQuota.ts).
 *
 * ── Keeping both clients in step ────────────────────────────────────────────
 *
 * Three copies of the id list must agree, and the server is the referee:
 *
 *   - this file (website, and the source of the API's `copyRestricted` flag),
 *   - the app's `lib/features/bible/domain/copy_policy.dart`,
 *   - the `copyRestricted` boolean on every chapter envelope the API returns.
 *
 * Clients prefer the server's flag and fall back to their own list, so a
 * translation added here is restricted in an app build that has never heard of
 * it - as long as that build is new enough to read the flag. Builds that are
 * not are shut out of restricted translations altogether: see
 * COPY_GUARD_CAPABILITY below.
 *
 * ── Adding a translation ────────────────────────────────────────────────────
 *
 * Add its manifest id (exactly as `public/data/manifest.json` spells it, or as
 * the private data repo spells it for licensed text) to RESTRICTED_BIBLE_IDS in
 * the SAME commit that adds the data. Exact match only - no normalisation, no
 * alias table, no case folding: every fuzzy match is a way for a restricted id
 * to slip through as unrestricted. Where a spelling is not yet settled, list
 * every spelling that could land; a stray id costs nothing, a missing one costs
 * a licence.
 */

/** How many verses a copy control may put on the clipboard at once. */
export const MAX_COPY_VERSES = 1;

/**
 * Bible version ids whose text may not be copied or shared in bulk.
 *
 * Why each one is here:
 *
 *   hsv                       Herziene Statenvertaling, (c) Stichting HSV.
 *                             Today it is not a readable version at all - 50
 *                             quoted verses, never the picker (lib/hsvQuota.ts).
 *                             The id is listed anyway so that the day a licence
 *                             turns it into a readable translation, the guard
 *                             is already standing.
 *   statenvertaling_jongbloed Statenvertaling, Jongbloed-editie. The 1637 text
 *                             is public domain; this *edition* (spelling,
 *                             punctuation, verse layout, GBS/Jongbloed
 *                             typesetting) is not, and is licensed per
 *                             agreement. Do not confuse it with the plain
 *                             `statenvertaling` entry, which is public domain
 *                             and stays freely copyable.
 *   ebv24                     Eerste Bijbel in Vereenvoudigd Nederlands /
 *                             EBV24, (c) its publisher. Licensed, modern text.
 *
 * The spelling variants beside each canonical id exist because the data is not
 * in the repo yet; the one the manifest ends up using wins and the others are
 * harmless.
 */
export const RESTRICTED_BIBLE_IDS: ReadonlySet<string> = new Set([
  'hsv',
  'statenvertaling_jongbloed',
  'statenvertaling-jongbloed',
  'sv_jongbloed',
  'jongbloed',
  'ebv24',
  'ebv_24',
  'ebv-24',
  'ebv',
]);

/** True when `id` is a translation that may not be copied wholesale. */
export function isCopyRestricted(id: string | null | undefined): boolean {
  if (!id) return false;
  return RESTRICTED_BIBLE_IDS.has(id);
}

/**
 * The line shown where a reader runs into the limit - once, quietly, under the
 * chapter. It says what is allowed rather than what is forbidden, because what
 * is allowed is the part they came for.
 */
export const COPY_RESTRICTED_NOTICE =
  'Deze vertaling is auteursrechtelijk beschermd. Je kunt losse verzen kopiëren '
  + 'met de kopieerknop bij een vers; de hele tekst overnemen mag niet.';

/** The same sentence, short enough for a snackbar or a tooltip. */
export const COPY_RESTRICTED_NOTICE_SHORT =
  'Van deze vertaling kun je losse verzen kopiëren, niet de hele tekst.';

/**
 * What a copy control puts on the clipboard: the words, then the reference and
 * the attribution on their own line. The attribution travels WITH the text -
 * for a licensed translation the citation is the condition the quotation rests
 * on, so it is not an optional second line the caller may drop.
 */
export function formatVerseForCopy({
  text,
  reference,
  attribution,
}: {
  text: string;
  reference: string;
  attribution?: string | null;
}): string {
  const cited = attribution ? `${reference} - ${attribution}` : reference;
  return `${text.trim()}\n\n${cited}`;
}

/**
 * Props for the element that holds restricted scripture. Spread onto the
 * container; pass the result of `isCopyRestricted` so an unrestricted
 * translation gets an empty object and behaves exactly as it does today.
 *
 * `onContextMenu` is blocked too: "Copy" in the browser's own menu is the same
 * door, and on a phone the long-press selection handles come from it.
 */
export function copyGuardProps(restricted: boolean): {
  className?: string;
  style?: { WebkitUserSelect: 'none'; userSelect: 'none' };
  onCopy?: (event: { preventDefault: () => void }) => void;
  onCut?: (event: { preventDefault: () => void }) => void;
  onDragStart?: (event: { preventDefault: () => void }) => void;
  onContextMenu?: (event: { preventDefault: () => void }) => void;
} {
  if (!restricted) return {};
  const block = (event: { preventDefault: () => void }) => event.preventDefault();
  return {
    className: 'select-none',
    style: { WebkitUserSelect: 'none', userSelect: 'none' },
    onCopy: block,
    onCut: block,
    onDragStart: block,
    onContextMenu: block,
  };
}

/**
 * ── The capability handshake ────────────────────────────────────────────────
 *
 * An app build from before this guard existed would happily draw a restricted
 * translation with a "deel hoofdstuk" button, because the translation list is
 * server-driven: the day `statenvertaling_jongbloed` enters
 * MOBILE_ALLOWED_BIBLES, every installed build sees it in the picker. Installed
 * builds cannot be fixed, so they must be shut out instead.
 *
 * So a client has to say that it can honour the limit. Both clients send
 *
 *   X-Bs-Capabilities: copy-guard
 *
 * and restricted translations are only listed to, and only served to, a request
 * that carries it. Unrestricted translations ignore this entirely - no existing
 * client changes behaviour, and no public-domain text becomes harder to reach.
 */
export const COPY_GUARD_CAPABILITY = 'copy-guard';

/** Header both clients send, naming what they can honour. */
export const CAPABILITIES_HEADER = 'x-bs-capabilities';

/** Parses the capability header. Comma- or space-separated, case-insensitive. */
export function clientDeclaresCopyGuard(header: string | null | undefined): boolean {
  if (!header) return false;
  return header
    .toLowerCase()
    .split(/[,\s]+/)
    .some((token) => token.trim() === COPY_GUARD_CAPABILITY);
}

/** Reads the capability header off a request, without caring which runtime. */
export function requestCapabilities(req: {
  headers: { get(name: string): string | null };
}): string | null {
  return req.headers.get(CAPABILITIES_HEADER);
}

/**
 * True when this request may be served `versionId`. Unrestricted translations
 * are always fine; a restricted one needs the handshake above.
 */
export function mayServeToClient(
  versionId: string | null | undefined,
  capabilitiesHeader: string | null | undefined,
): boolean {
  if (!isCopyRestricted(versionId)) return true;
  return clientDeclaresCopyGuard(capabilitiesHeader);
}

/** The refusal a route returns for a restricted translation an old client asked for. */
export const COPY_GUARD_REFUSAL = {
  code: 'CLIENT_UPDATE_REQUIRED',
  status: 426,
  message:
    'Deze vertaling vraagt een nieuwere versie van de app. '
    + 'This translation requires a client that honours its copy limit.',
} as const;
