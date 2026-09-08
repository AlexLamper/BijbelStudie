/**
 * The six boomsoorten, as generator parameters.
 *
 * A species never adds a random draw of its own: every number here scales or
 * biases a draw the branching recursion already makes, so the same seed keeps
 * "the same tree" across species - a user who swaps Eik for Olijf recognises
 * the lean and the fork pattern, and the parity contract with the app
 * (`domain/species.dart`) holds per species exactly as it does per level.
 *
 * Contract: docs/levensboom-spec.md §4.4.
 */

export type SpeciesId = 'eik' | 'olijf' | 'vijg' | 'palm' | 'amandel' | 'ceder';

export const SPECIES_IDS: readonly SpeciesId[] = ['eik', 'olijf', 'vijg', 'palm', 'amandel', 'ceder'];

export const DEFAULT_SPECIES: SpeciesId = 'eik';

/** How the renderer draws a leaf. Geometry does not care. */
export type LeafShape = 'oval' | 'narrow' | 'large' | 'needle' | 'frond' | 'almond';

/** How the renderer draws the vrucht. Geometry does not care. */
export type FruitStyle = 'acorn' | 'olive' | 'fig' | 'dates' | 'almond' | 'cone';

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
  leafCountMul: 1,
  leafSizeMul: 1,
  blossom: 'seasonal' as 'never' | 'seasonal' | 'always',
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
    thirdChildBias: 0.1,
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
    thirdChildBias: 0.15,
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
    leaf: '#6DAE70',
    leafAlt: '#8CC58E',
    fruit: '#D9C7A0',
    fruitAlt: '#B89B6A',
  },
  ceder: {
    ...BRANCHING_DEFAULTS,
    form: 'conical',
    trunkLenMul: 1.15,
    trunkWidthMul: 1.1,
    spreadBase: 30,
    spreadJitter: 8,
    curveAmp: 5,
    childLenRatio: 0.68,
    childWidthRatio: 0.7,
    thirdChildBias: 0.2,
    leanMul: 0.5,
    leafCountMul: 1.6,
    leafSizeMul: 0.8,
    leafShape: 'needle',
    fruitStyle: 'cone',
    blossom: 'never',
    evergreen: true,
    leaf: '#2F6B4F',
    leafAlt: '#3F7F5F',
    fruit: '#6B4E2A',
    fruitAlt: '#4A361D',
  },
};

export function isSpeciesId(value: unknown): value is SpeciesId {
  return typeof value === 'string' && (SPECIES_IDS as readonly string[]).includes(value);
}

export function speciesParams(id: SpeciesId | string | null | undefined): SpeciesParams {
  return SPECIES[isSpeciesId(id) ? id : DEFAULT_SPECIES];
}
