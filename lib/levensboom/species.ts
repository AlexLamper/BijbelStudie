/**
 * The thirteen boomsoorten, as generator parameters.
 *
 * A species never adds a random draw of its own: every number here scales or
 * biases a draw the branching recursion already makes, so the same seed keeps
 * "the same tree" across species - a user who swaps Eik for Olijf recognises
 * the lean and the fork pattern, and the parity contract with the app
 * (`domain/species.dart`) holds per species exactly as it does per level.
 *
 * Contract: docs/levensboom-spec.md §4.4.
 */

export type SpeciesId =
  | 'eik'
  | 'olijf'
  | 'vijg'
  | 'palm'
  | 'amandel'
  | 'ceder'
  | 'mosterd'
  | 'appel'
  | 'granaatappel'
  | 'sycomoor'
  | 'wilg'
  | 'acacia'
  | 'cipres';

export const SPECIES_IDS: readonly SpeciesId[] = [
  'eik',
  'olijf',
  'vijg',
  'palm',
  'amandel',
  'ceder',
  'mosterd',
  'appel',
  'granaatappel',
  'sycomoor',
  'wilg',
  'acacia',
  'cipres',
];

export const DEFAULT_SPECIES: SpeciesId = 'eik';

/**
 * How the renderer draws a leaf. Geometry does not care.
 *
 * `lance` is a long willow leaf, `scale` the short overlapping foliage of a
 * cypress, `feather` a pinnate acacia leaf (a rib with tiny leaflets).
 */
export type LeafShape = 'oval' | 'narrow' | 'large' | 'needle' | 'frond' | 'almond' | 'lance' | 'scale' | 'feather';

/** How the renderer draws the vrucht. Geometry does not care. */
export type FruitStyle =
  | 'acorn'
  | 'olive'
  | 'fig'
  | 'dates'
  | 'almond'
  | 'cone'
  | 'apple'
  | 'pomegranate'
  | 'catkin'
  | 'pod'
  | 'berry';

/**
 * `branching` is the recursive fan every deciduous tree uses. `palm` is one
 * curved trunk of segments with a crown of fronds. `conical` keeps a leader
 * going straight up and sends short, near-horizontal side branches out of
 * every node, longer at the bottom - the cedar silhouette.
 */
export type TreeForm = 'branching' | 'palm' | 'conical';

export type SpeciesParams = {
  form: TreeForm;
  trunkLenMul: number;
  trunkWidthMul: number;
  /** Degrees. The fan each node opens; jitter is the seeded spread on top. */
  spreadBase: number;
  spreadJitter: number;
  /** Degrees. How far one branch is allowed to bend along its own length. */
  curveAmp: number;
  childLenRatio: number;
  childWidthRatio: number;
  /** Added to the chance of a third child at a node. */
  thirdChildBias: number;
  /** Multiplies the trunk's seeded lean. */
  leanMul: number;
  /**
   * 0..1. How far branch tips hang toward straight down when the tree is
   * perfectly healthy - the weeping willow. Added to the wilt droop, which is
   * why it is a generator parameter and not paint. Zero for every species
   * that existed before it, so their fixtures did not move.
   */
  droopBase: number;
  leafCountMul: number;
  leafSizeMul: number;
  leafShape: LeafShape;
  fruitStyle: FruitStyle;
  /**
   * `seasonal` blossoms in spring from the `blossom` trait level on; `always`
   * blossoms every spring regardless of level (the amandel, Jeremia 1:11);
   * `never` is for the trees that simply do not.
   */
  blossom: 'never' | 'seasonal' | 'always';
  /** The blossom's own colour. `null` keeps the seasonal pink. Palette only. */
  blossomColor: string | null;
  /** Keeps its leaves through autumn and winter. Palette only. */
  evergreen: boolean;
  /** Foliage and fruit colour. `null` keeps the seasonal default. */
  leaf: string | null;
  leafAlt: string | null;
  fruit: string;
  fruitAlt: string;
};

const BRANCHING_DEFAULTS = {
  form: 'branching' as TreeForm,
  trunkLenMul: 1,
  trunkWidthMul: 1,
  spreadBase: 26,
  spreadJitter: 14,
  curveAmp: 10,
  childLenRatio: 0.74,
  childWidthRatio: 0.68,
  thirdChildBias: 0,
  leanMul: 1,
  droopBase: 0,
  leafCountMul: 1,
  leafSizeMul: 1,
  blossom: 'seasonal' as 'never' | 'seasonal' | 'always',
  blossomColor: null,
  evergreen: false,
  leaf: null,
  leafAlt: null,
};

export const SPECIES: Record<SpeciesId, SpeciesParams> = {
  // The tree everyone had before species existed. Every default above is the
  // old generator's constant, so an untouched account keeps its silhouette.
  eik: {
    ...BRANCHING_DEFAULTS,
    leafShape: 'oval',
    fruitStyle: 'acorn',
    fruit: '#8B5A2B',
    fruitAlt: '#5C3A1B',
  },
  olijf: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 0.8,
    trunkWidthMul: 1.3,
    spreadBase: 36,
    spreadJitter: 16,
    curveAmp: 18,
    childLenRatio: 0.7,
    childWidthRatio: 0.7,
    // Growth v2: was 0.1 (leaf budget).
    thirdChildBias: 0.06,
    leanMul: 1.4,
    leafCountMul: 1.15,
    leafSizeMul: 0.85,
    leafShape: 'narrow',
    fruitStyle: 'olive',
    evergreen: true,
    leaf: '#7FA37A',
    leafAlt: '#A6BFA3',
    fruit: '#3B4A2A',
    fruitAlt: '#6B7F3A',
  },
  vijg: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 0.75,
    trunkWidthMul: 1.3,
    spreadBase: 40,
    spreadJitter: 12,
    curveAmp: 12,
    childLenRatio: 0.72,
    childWidthRatio: 0.75,
    // Growth v2: was 0.15 (leaf budget).
    thirdChildBias: 0.12,
    leafCountMul: 0.55,
    leafSizeMul: 1.35,
    leafShape: 'large',
    fruitStyle: 'fig',
    blossom: 'never',
    leaf: '#3F8F4F',
    leafAlt: '#4FA25E',
    fruit: '#5B2C6F',
    fruitAlt: '#7A3E8F',
  },
  palm: {
    ...BRANCHING_DEFAULTS,
    form: 'palm',
    trunkLenMul: 1.45,
    trunkWidthMul: 0.9,
    curveAmp: 6,
    leanMul: 1.2,
    leafSizeMul: 1,
    leafShape: 'frond',
    fruitStyle: 'dates',
    blossom: 'never',
    evergreen: true,
    leaf: '#4F9A57',
    leafAlt: '#6BB36F',
    fruit: '#B5651D',
    fruitAlt: '#8A4A12',
  },
  amandel: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 1.05,
    trunkWidthMul: 0.85,
    spreadBase: 22,
    spreadJitter: 10,
    curveAmp: 8,
    childLenRatio: 0.76,
    childWidthRatio: 0.66,
    thirdChildBias: 0.05,
    leanMul: 0.8,
    leafCountMul: 0.9,
    leafSizeMul: 0.9,
    leafShape: 'almond',
    fruitStyle: 'almond',
    blossom: 'always',
    blossomColor: '#FBD3E0',
    leaf: '#6DAE70',
    leafAlt: '#8CC58E',
    fruit: '#D9C7A0',
    fruitAlt: '#B89B6A',
  },
  ceder: {
    ...BRANCHING_DEFAULTS,
    form: 'conical',
    // Growth v2: the trunk is the spine's first segment; the leader chain
    // (`FORM_TABLES.conical.leaderLen`) supplies the height.
    trunkLenMul: 0.5,
    trunkWidthMul: 1.1,
    spreadBase: 30,
    spreadJitter: 8,
    curveAmp: 5,
    childLenRatio: 0.68,
    childWidthRatio: 0.7,
    thirdChildBias: 0.2,
    leanMul: 0.5,
    leafCountMul: 1.6,
    // Growth v2: 0.8 drew hairline needles at the new camera's scale.
    leafSizeMul: 1.15,
    leafShape: 'needle',
    fruitStyle: 'cone',
    blossom: 'never',
    evergreen: true,
    leaf: '#2F6B4F',
    leafAlt: '#3F7F5F',
    fruit: '#6B4E2A',
    fruitAlt: '#4A361D',
  },
  // The smallest seed. Many thin twigs, tiny leaves, and yellow flowers every
  // spring whatever the level - the point of the parable is that it blooms.
  mosterd: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 0.85,
    trunkWidthMul: 0.8,
    spreadBase: 34,
    spreadJitter: 16,
    curveAmp: 14,
    childLenRatio: 0.72,
    childWidthRatio: 0.62,
    // Growth v2: 0.3 / 1.3 put a maturing mosterd past the leaf budget; the
    // twigs still outnumber every other species'.
    thirdChildBias: 0.06,
    leanMul: 1.1,
    leafCountMul: 1.05,
    leafSizeMul: 0.6,
    leafShape: 'oval',
    fruitStyle: 'pod',
    blossom: 'always',
    blossomColor: '#F3D45A',
    leaf: '#8DBB5E',
    leafAlt: '#A9CF74',
    fruit: '#9BA85A',
    fruitAlt: '#6F7C3A',
  },
  appel: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 0.9,
    trunkWidthMul: 1.05,
    spreadBase: 32,
    spreadJitter: 12,
    curveAmp: 10,
    childLenRatio: 0.72,
    childWidthRatio: 0.68,
    // Growth v2: was 0.12 (leaf budget).
    thirdChildBias: 0.06,
    leanMul: 0.9,
    leafCountMul: 1.05,
    leafSizeMul: 0.95,
    leafShape: 'oval',
    fruitStyle: 'apple',
    blossomColor: '#FBE4EC',
    leaf: '#5FA85A',
    leafAlt: '#7CC077',
    fruit: '#C8382E',
    fruitAlt: '#8E2320',
  },
  granaatappel: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 0.7,
    trunkWidthMul: 1,
    spreadBase: 38,
    spreadJitter: 14,
    curveAmp: 14,
    childLenRatio: 0.7,
    childWidthRatio: 0.66,
    // Growth v2: was 0.2 (leaf budget).
    thirdChildBias: 0.06,
    leafCountMul: 1.2,
    leafSizeMul: 0.75,
    leafShape: 'narrow',
    fruitStyle: 'pomegranate',
    blossomColor: '#E8532F',
    leaf: '#4E9A4A',
    leafAlt: '#6CB35F',
    fruit: '#B8322F',
    fruitAlt: '#7E1F1D',
  },
  // Zacheüs' tree: low, wide, thick enough to climb.
  sycomoor: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 0.7,
    trunkWidthMul: 1.6,
    spreadBase: 46,
    spreadJitter: 12,
    curveAmp: 12,
    childLenRatio: 0.7,
    childWidthRatio: 0.74,
    // Growth v2: was 0.2 (leaf budget).
    thirdChildBias: 0.12,
    leafCountMul: 0.75,
    leafSizeMul: 1.2,
    leafShape: 'large',
    fruitStyle: 'fig',
    blossom: 'never',
    leaf: '#5E9E4E',
    leafAlt: '#7DB566',
    fruit: '#D9A24A',
    fruitAlt: '#A87428',
  },
  // The one species with a droop of its own: long thin branches that hang.
  wilg: {
    ...BRANCHING_DEFAULTS,
    trunkWidthMul: 1.15,
    spreadBase: 30,
    spreadJitter: 14,
    curveAmp: 12,
    childLenRatio: 0.8,
    childWidthRatio: 0.6,
    // Growth v2: was 0.15 (leaf budget).
    thirdChildBias: 0.06,
    leanMul: 1.2,
    droopBase: 0.5,
    leafCountMul: 1.2,
    leafSizeMul: 0.9,
    leafShape: 'lance',
    fruitStyle: 'catkin',
    blossom: 'never',
    leaf: '#8FB86A',
    leafAlt: '#B0CC8A',
    fruit: '#D9D27A',
    fruitAlt: '#A9A24A',
  },
  // A long stem and a flat, wide crown of feathery leaves.
  acacia: {
    ...BRANCHING_DEFAULTS,
    trunkLenMul: 1.25,
    trunkWidthMul: 0.9,
    spreadBase: 50,
    spreadJitter: 10,
    curveAmp: 6,
    childLenRatio: 0.6,
    childWidthRatio: 0.62,
    // Growth v2: 0.25 put the worst seeds past the leaf budget at step 40.
    thirdChildBias: 0.06,
    leanMul: 1.3,
    leafCountMul: 1.2,
    leafSizeMul: 0.7,
    leafShape: 'feather',
    fruitStyle: 'pod',
    blossomColor: '#F6E27A',
    leaf: '#6E9E5A',
    leafAlt: '#8FB574',
    fruit: '#8B6B3A',
    fruitAlt: '#5E4626',
  },
  // The ceder's narrow cousin: same spine, a much tighter fan.
  cipres: {
    ...BRANCHING_DEFAULTS,
    form: 'conical',
    // Growth v2: see ceder. Taller and narrower than the ceder.
    trunkLenMul: 0.42,
    trunkWidthMul: 0.8,
    spreadBase: 12,
    spreadJitter: 6,
    curveAmp: 3,
    childLenRatio: 0.6,
    childWidthRatio: 0.7,
    thirdChildBias: 0.2,
    leanMul: 0.3,
    leafCountMul: 1.5,
    // Growth v2: see ceder.
    leafSizeMul: 1.0,
    leafShape: 'scale',
    fruitStyle: 'berry',
    blossom: 'never',
    evergreen: true,
    leaf: '#2E5E3E',
    leafAlt: '#3D7450',
    fruit: '#7A6A4A',
    fruitAlt: '#55492F',
  },
};

export function isSpeciesId(value: unknown): value is SpeciesId {
  return typeof value === 'string' && (SPECIES_IDS as readonly string[]).includes(value);
}

export function speciesParams(id: SpeciesId | string | null | undefined): SpeciesParams {
  return SPECIES[isSpeciesId(id) ? id : DEFAULT_SPECIES];
}
