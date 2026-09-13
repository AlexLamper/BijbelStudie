/**
 * Ontwerp B: teal blijft het merk, Pro krijgt één ingetogen warm metaal.
 *
 * Alleen voor Pro-elementen, en alleen als haarlijn of kleine tekst - nooit als
 * groot vlak. `ink` is de enige champagne die als tekst op wit staat (6,5:1);
 * `deep` (4,8:1) is voor randen en de schaduwkant van de ring.
 */
export const CHAMPAGNE = {
  highlight: "#EADBB8",
  light: "#D6BE8A",
  base: "#B8975A",
  deep: "#8C6E3C",
  ink: "#76592E",
  /** Haarlijn rond de PRO-pil en de chip: zichtbaar als rand, niet als vlak. */
  hairline: "rgba(184,151,90,.55)",
  /** Scheidingslijn binnen de Pro-kaart. */
  rule: "rgba(184,151,90,.28)",
  /** Warm gebroken wit voor de Pro-kaart. */
  paper: "#FBFAF7",
} as const;

export const TEAL = "#0D9488";
export const TEAL_DEEP = "#0F766E";
export const TEAL_FAINT = "#F0FDFA";

/**
 * De ring: licht - basis - glans - diep. Vier stops op 150deg, zodat de glans
 * rechtsboven valt en de voet donker wordt, zoals geborsteld messing onder
 * licht van boven. Geen regenboog, geen gloed.
 */
export const RING_GRADIENT = `linear-gradient(150deg, ${CHAMPAGNE.light} 0%, ${CHAMPAGNE.base} 38%, ${CHAMPAGNE.highlight} 58%, ${CHAMPAGNE.deep} 100%)`;

/** De haarlijn bovenaan de Pro-kaart: loopt uit naar de randen. */
export const TOP_RULE_GRADIENT = `linear-gradient(90deg, rgba(184,151,90,0) 0%, ${CHAMPAGNE.base} 22%, ${CHAMPAGNE.light} 50%, ${CHAMPAGNE.base} 78%, rgba(184,151,90,0) 100%)`;
