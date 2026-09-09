import React from 'react';

import type { Palette } from '../../../../lib/levensboom/palette';
import { sceneSpec } from '../../../../lib/levensboom/scenes';
import {
  contrast,
  readableInk,
  studyHorizon,
  type StudyArt,
  type StudyHorizon,
} from '../../../../lib/studyArt';

/**
 * Ontwerp B - de renderlaag boven `lib/studyArt.ts`.
 *
 * Dit bestand tekent alleen. Alle beslissingen over welke scene, welk seizoen
 * en welk uur bij een studie horen staan in `lib/studyArt.ts`, en dat is met
 * opzet de enige plek: een tweede kunstsysteem in een variantmap is precies wat
 * STUDY_VISUAL_PLAN.md wilde opruimen. Hier staat geen enkele eigen kleur - wat
 * niet uit de palette komt, komt uit de merkkleur of uit slate.
 *
 * Server-veilig: geen hooks, geen 'use client', geen `Date`. Dezelfde horizon
 * rendert in een server component (de band op het studiescherm) en in de
 * client-catalogus, en hij verft mee met de HTML in plaats van na hydratie.
 */

export const TEAL = '#0D9488';

/** Wit op een scrim. Letterlijk, net als de scrim zelf. */
export const ON_ART = '#ffffff';
export const ON_ART_MUTED = 'rgba(255,255,255,0.87)';
export const ON_ART_FAINT = 'rgba(255,255,255,0.70)';

/**
 * De scrims, in slate-950 met een letterlijke alpha.
 *
 * Nooit een themakleur: een venster houdt zijn eigen palet in licht en donker,
 * dus wat wit leesbaar houdt mag niet met het thema meebewegen. De zware
 * variant is er voor de handvol paletten met een lichte grondband (zomerduin op
 * de middag); welke een kaart krijgt bepaalt `scrimFor` met `contrast()`.
 */
const SCRIM = {
  card: 'linear-gradient(to top, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.78) 42%, rgba(2,6,23,0.36) 70%, rgba(2,6,23,0) 100%)',
  cardHeavy:
    'linear-gradient(to top, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.88) 46%, rgba(2,6,23,0.48) 74%, rgba(2,6,23,0.06) 100%)',
  band: 'linear-gradient(to top, rgba(2,6,23,0.80) 0%, rgba(2,6,23,0.44) 52%, rgba(2,6,23,0.10) 100%)',
  bandHeavy:
    'linear-gradient(to top, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.60) 52%, rgba(2,6,23,0.20) 100%)',
} as const;

/**
 * De scrim die dit palet nodig heeft.
 *
 * Wit tekst op een lichte grondband haalt de 4.5:1 niet, en dat is precies wat
 * `contrast()` kan uitrekenen in plaats van dat wij het per palet gokken. Een
 * zomerduin krijgt dus een zwaardere sluier dan een winternacht - het beeld
 * blijft van de studie, de leesbaarheid blijft gegarandeerd.
 */
export function scrimFor(art: StudyArt, kind: 'card' | 'band' = 'card'): string {
  const p = art.palette;
  const heavy = contrast(ON_ART, p.groundDeep) < 4.5 || contrast(ON_ART, p.ground) < 4.5;
  if (kind === 'band') return heavy ? SCRIM.bandHeavy : SCRIM.band;
  return heavy ? SCRIM.cardHeavy : SCRIM.card;
}

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** "Heuvels van Galilea", "Sterrennacht" - het uitzicht bij naam. */
export function sceneName(art: StudyArt): string {
  return sceneSpec(art.scene).name;
}

/**
 * De horizon per maat, onthouden.
 *
 * Het overzicht vraagt zevenenzeventig keer dezelfde geometrie op bij elke
 * toetsaanslag in het zoekveld; `studyHorizon` is zuiver, dus dat hoeft maar
 * één keer per maat gerekend te worden.
 */
const HORIZONS = new Map<string, StudyHorizon>();

function horizonFor(art: StudyArt, width: number, height: number): StudyHorizon {
  const key = `${art.id}|${width}x${height}`;
  const hit = HORIZONS.get(key);
  if (hit) return hit;
  const value = studyHorizon(art, width, height);
  HORIZONS.set(key, value);
  return value;
}

/**
 * Eén uitzicht, op de verhouding waarin het ook echt getekend wordt.
 *
 * `ratio` is geen decoratie maar de compositie: `studyHorizon` legt de grondlijn
 * op 74% van de hoogte die je meegeeft, dus een band van 320x80 krijgt een
 * andere rug dan een kaart van 200x134. Daarom `preserveAspectRatio="none"` én
 * een ratio die klopt met de doos - niet bijsnijden zoals de oude 16:6-tekening
 * in een thumbnail van 96x64.
 *
 * Geen canvas: dit is op het studiescherm het eerste dat geverfd wordt, en een
 * canvas verft niets tot na hydratie.
 */
export function Horizon({
  art,
  ratio,
  className = '',
  quiet = false,
  children,
  style,
}: {
  art: StudyArt;
  /** De verhouding waarop gecomponeerd wordt, in dezelfde eenheid als de doos. */
  ratio: [number, number];
  className?: string;
  /** Laat zon en sterren weg: op merkformaat zijn dat spikkels, geen detail. */
  quiet?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [width, height] = ratio;
  const horizon = horizonFor(art, width, height);
  const p = art.palette;

  // De stand van de zon komt uit de vorm-knoppen die de studie toch al heeft -
  // geen tweede trekking uit de RNG, geen klok, dus server en browser tekenen
  // dezelfde lucht.
  const sunX = 14 + (art.shape.phase / (Math.PI * 2)) * 70;
  const sunY = 20 + art.shape.lift * 220;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(180deg, ${p.skyTop} 0%, ${p.skyBottom} 78%, ${p.skyBottom} 100%)`,
        ...style,
      }}
    >
      {!quiet && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${sunX}%`,
            top: `${sunY}%`,
            height: p.night ? '14%' : '30%',
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            backgroundImage: `radial-gradient(circle, ${p.light} 0%, ${p.glow} 36%, ${rgba(p.glow, 0)} 74%)`,
          }}
        />
      )}

      <svg
        aria-hidden
        focusable="false"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {!quiet &&
          horizon.stars.map((star, index) => (
            <circle
              key={index}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill={p.light}
              opacity={0.5 + (index % 3) * 0.18}
            />
          ))}
        {horizon.layers.map((layer, index) => (
          <path key={index} d={layer.d} fill={layer.fill} opacity={layer.opacity} />
        ))}
      </svg>

      {/* De grondband dekt de onderkant van de ruggen af, precies zoals de
          rechthoek in de tekenroutine van de boom. Als CSS-verloop in plaats van
          een <rect> met een gradient-id: zo kan hetzelfde uitzicht twee keer op
          één pagina staan zonder dubbele id's in de HTML. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          top: `${(horizon.groundTop / height) * 100}%`,
          backgroundImage: `linear-gradient(180deg, ${horizon.ground} 0%, ${horizon.groundDeep} 100%)`,
        }}
      />

      {/* Een haarlijn binnen het kader, zodat een bleke lucht toch een rand
          houdt tegen een bleke pagina. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)' }}
      />

      {children}
    </div>
  );
}

/**
 * De pagina-tint: custom properties uit het palet van één studie.
 *
 * Een `<style>` met een scope-id in plaats van inline stijlen, omdat juist de
 * dingen die het waard zijn om te tinten - hover, focus, haarlijnen - niet in
 * een `style`-attribuut passen. De merkkleur blijft de actiekleur; de studie
 * krijgt de bovenschriften, de lijnen en de hover.
 */
export function tintCss(scope: string, palette: Palette): string {
  const light = readableInk(palette.accent, false);
  const dark = readableInk(palette.accent, true);

  // `--b-solid` is in beide thema's de licht-modus-inkt: dat is de enige die
  // ooit onder witte tekst staat (de hover van de primaire knop). De donkere
  // inkt is expres helder, en daarmee juist het verkeerde vlak voor wit.
  const vars = (ink: string) =>
    `--b-ink:${ink};--b-rule:${rgba(ink, 0.26)};--b-wash:${rgba(ink, 0.06)};--b-edge:${rgba(ink, 0.2)};--b-solid:${light}`;

  return [
    `#${scope}{${vars(light)}}`,
    `.dark #${scope}{${vars(dark)}}`,
    `#${scope} .b-ink{color:var(--b-ink)}`,
    `#${scope} .b-rule{background-color:var(--b-rule)}`,
    `#${scope} .b-wash{background-color:var(--b-wash)}`,
    `#${scope} .b-edge{border-color:var(--b-edge)}`,
    `#${scope} .b-mark{border-color:var(--b-ink)}`,
    `#${scope} .b-row:hover{background-color:var(--b-wash)}`,
    `#${scope} .b-row:hover .b-row-title{color:var(--b-ink)}`,
    `#${scope} .b-primary{background-color:${TEAL}}`,
    `#${scope} .b-primary:hover{background-color:var(--b-solid)}`,
    `#${scope} .b-focus:focus-visible{outline:2px solid var(--b-ink);outline-offset:2px;border-radius:6px}`,
    // Een knop óp het beeld kan de inkt van de studie niet gebruiken: de helft
    // van de paletten zet dan een donkere ring op een donkere lucht. Wit is de
    // enige kleur die tegen elke scrim gegarandeerd is - dezelfde reden als
    // waarom de tekst wit is.
    `#${scope} .b-focus-art:focus-visible{outline:2px solid #ffffff;outline-offset:2px;border-radius:6px}`,
  ].join('');
}

/** De tint als element. Server-veilig, want hij moet in de eerste HTML staan. */
export function StudyTint({ scope, palette }: { scope: string; palette: Palette }) {
  return <style>{tintCss(scope, palette)}</style>;
}
