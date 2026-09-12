import React from 'react';

import { studyHorizon, type StudyArt } from '../../../../lib/studyArt';
import { rgba } from './tint';

/**
 * Het uitzicht van één studie: een lucht, een gezaaide horizon, een aardband,
 * en wat de aanroeper op het glas zet.
 *
 * De geometrie komt volledig uit `lib/studyArt.ts` - dit bestand tekent alleen.
 * Geen hooks en geen 'use client', zodat dezelfde component in een server
 * component staat (de band op het studiescherm, dat daar de LCP is) én in de
 * client-catalogus. Er beweegt niets: een banner die beweegt is decoratie, en
 * zevenenzeventig bewegende banners zijn een pagina die nooit tot rust komt.
 *
 * `preserveAspectRatio="none"` is het punt. De horizon wordt gecomponeerd op de
 * verhouding waarop hij ook getekend wordt (`ratio`), in plaats van uit een
 * 16:6-tekening gesneden te worden - dat laatste gooit in een lijstweergave een
 * derde van de plaat weg.
 *
 * Het beeld is overal `aria-hidden`. Een uitzicht zegt niets wat een lezer
 * nodig heeft; de titel ernaast doet dat, en elke aanroeper labelt zijn eigen
 * link.
 */
export default function HorizonArt({
  art,
  ratio,
  className = '',
  style,
  quiet = false,
  children,
}: {
  art: StudyArt;
  /** Breedte gedeeld door hoogte van het vak waarin dit terechtkomt. */
  ratio: number;
  className?: string;
  style?: React.CSSProperties;
  /** Laat zon en sterren weg: op duimnagelformaat zijn dat ruis, geen detail. */
  quiet?: boolean;
  children?: React.ReactNode;
}) {
  const height = 100;
  const width = Math.max(1, Math.round(height * ratio));
  const horizon = studyHorizon(art, width, height);
  const palette = art.palette;
  const groundPct = (horizon.groundTop / height) * 100;

  /**
   * De stand van zon of maan. Afgeleid van de gezaaide `phase` van de studie -
   * dus stabiel per studie en klokvrij, net als de rest van het beeld. Geen
   * nieuwe random: `lib/studyArt.ts` verbiedt dat, en terecht.
   */
  const lightX = 8 + (art.shape.phase / (Math.PI * 2)) * 84;
  const lightY = palette.night ? 18 : 26;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(180deg, ${horizon.skyTop} 0%, ${horizon.skyBottom} 78%, ${horizon.skyBottom} 100%)`,
        ...style,
      }}
    >
      {!quiet && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${lightX}%`,
            top: `${lightY}%`,
            height: palette.night ? '10%' : '22%',
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            backgroundImage: `radial-gradient(circle, ${palette.light} 0%, ${palette.glow} 36%, ${rgba(palette.glow, 0)} 72%)`,
          }}
        />
      )}

      {/* De sterren staan als vakjes met `aspect-ratio: 1` in plaats van als
          <circle>: met preserveAspectRatio="none" zou een cirkel in een strook
          van 12:1 een uitgerekte ellips worden. De straal uit studyHorizon is
          relatief aan de hoogte, dus hij wordt hier alleen naar een zichtbaar
          formaat geschaald - de plaatsing blijft exact wat de module zei. */}
      {!quiet &&
        horizon.stars.map((star, index) => (
          <span
            key={index}
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${(star.cx / width) * 100}%`,
              top: `${(star.cy / height) * 100}%`,
              height: `${0.55 + star.r * 2.2}%`,
              aspectRatio: '1',
              backgroundColor: palette.light,
              opacity: 0.55 + (index % 3) * 0.15,
            }}
          />
        ))}

      <svg
        aria-hidden
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {horizon.layers.map((layer, index) => (
          <path key={index} d={layer.d} fill={layer.fill} opacity={layer.opacity} />
        ))}
      </svg>

      {/* De aardband als div met een CSS-verloop, niet als <rect> met een
          <linearGradient>: een gradient-id moet uniek zijn, en dezelfde studie
          kan twee keer op één pagina staan (uitgelicht én in het raster). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          top: `${groundPct}%`,
          backgroundImage: `linear-gradient(180deg, ${horizon.ground} 0%, ${horizon.groundDeep} 100%)`,
        }}
      />

      {/* Een haarlijn binnen het kader, zodat een bleke lucht ook op een bleke
          pagina een rand houdt. Wit op 12% houdt stand bij elk palet. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}
      />

      {children}
    </div>
  );
}
