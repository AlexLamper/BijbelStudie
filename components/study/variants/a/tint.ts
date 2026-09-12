/**
 * Ontwerp A - "trouw". De kleurmachinerie onder de drie schermen.
 *
 * REVIEW-ONLY, en met opzet géén tweede kunstsysteem: alles wat een landschap
 * oplevert komt uit `lib/studyArt.ts`. Hier staat alleen wat er bovenóp komt -
 * de scrims die witte tekst op elke lucht leesbaar houden, en de custom
 * properties waarmee één studiepalet de pagina eronder kleurt. Dat is precies
 * wat ontwerp 2 ("Vensters") deed; het oordeel vroeg die styling te behouden.
 *
 * Verdwijnt samen met de /studies/versie-* en /studie/versie-* routes zodra er
 * een richting gekozen is.
 */

import { readableInk } from '../../../../lib/studyArt';

/** Merkkleur. Hardgecodeerd, nooit een Tailwind-token. */
export const TEAL = '#0D9488';

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * De scrims.
 *
 * Slate-950 op een letterlijke alpha, nooit een themakleur: een venster houdt
 * zijn eigen palet in licht én donker, dus het ding dat witte tekst leesbaar
 * moet houden mag niet met het thema meebewegen. De stops staan zo dat tekst
 * onderin over minstens 0,78 alpha valt - ruim 10:1 tegen wit, ook boven de
 * lichtste lucht die het palet kan maken.
 */
export const SCRIM_CARD =
  'linear-gradient(to top, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.80) 40%, rgba(2,6,23,0.40) 68%, rgba(2,6,23,0) 100%)';

/**
 * Voor een strook waar de tekst over de hele breedte staat in plaats van laag:
 * dan moet de vloer overal houden. 0,74 is het dunste punt.
 */
export const SCRIM_STRIP =
  'linear-gradient(to right, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.74) 54%, rgba(2,6,23,0.82) 100%)';

/** Voor de smalle band op het studiescherm: donker aan de randen, lucht in het midden. */
export const SCRIM_BAND =
  'linear-gradient(to top, rgba(2,6,23,0.86) 0%, rgba(2,6,23,0.52) 48%, rgba(2,6,23,0.18) 100%)';

/** Wit op een scrim. Letterlijk, om dezelfde reden als de scrim zelf. */
export const ON_ART = '#ffffff';
export const ON_ART_MUTED = 'rgba(255,255,255,0.86)';
export const ON_ART_FAINT = 'rgba(255,255,255,0.68)';

/**
 * Het paginatint: custom properties uit één studiepalet, plus de hover- en
 * focusregels die ze gebruiken.
 *
 * Gebonden aan één element-id, zodat twee getinte gebieden op één pagina nooit
 * in elkaar kunnen lekken, en gesplitst licht/donker omdat `darkMode: ["class"]`
 * de klasse `.dark` op <html> zet. Het teal blijft de primaire actie: de studie
 * krijgt de opschriften, de lijnen en de hover, niet de knop.
 *
 * `--va-solid` is in beide thema's de lichte inkt, en is het enige dat ooit
 * ónder witte tekst komt te staan (de hover van de primaire knop). De donkere
 * inkt is expres helder zodat hij als tekst leesbaar is - en dus precies het
 * verkeerde achter een wit label.
 */
export function tintCss(scopeId: string, accent: string): string {
  const light = readableInk(accent, false);
  const dark = readableInk(accent, true);

  const vars = (ink: string) =>
    `--va-ink:${ink};--va-rule:${rgba(ink, 0.3)};--va-wash:${rgba(ink, 0.07)};--va-edge:${rgba(ink, 0.18)};--va-solid:${light}`;

  return [
    `#${scopeId}{${vars(light)}}`,
    `.dark #${scopeId}{${vars(dark)}}`,
    `#${scopeId} .va-ink{color:var(--va-ink)}`,
    `#${scopeId} .va-rule{background-color:var(--va-rule)}`,
    `#${scopeId} .va-wash{background-color:var(--va-wash)}`,
    `#${scopeId} .va-edge{border-color:var(--va-edge)}`,
    `#${scopeId} .va-primary{background-color:${TEAL}}`,
    `#${scopeId} .va-primary:hover{background-color:var(--va-solid)}`,
    `#${scopeId} .va-hover:hover{color:var(--va-ink)}`,
    `#${scopeId} .va-focus:focus-visible{outline:2px solid var(--va-ink);outline-offset:2px;border-radius:0.5rem}`,
    // Een knop die óp het beeld staat kan de inkt van de studie niet gebruiken:
    // bij de helft van de paletten zou dat een donkere ring op een donkere lucht
    // zijn. Wit is de enige kleur die tegen elke scrim gegarandeerd is - dezelfde
    // reden waarom de tekst daar wit is.
    `#${scopeId} .va-focus-art:focus-visible{outline:2px solid #ffffff;outline-offset:2px;border-radius:0.5rem}`,
  ].join('');
}
