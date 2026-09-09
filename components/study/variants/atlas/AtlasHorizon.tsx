import React from 'react';

import { GROUND_TOP, ridgePath, skyGradient, VIEW_HEIGHT, VIEW_WIDTH, type StudyArt } from './art';

/**
 * De horizon van een studie, in twee maten.
 *
 * Geen canvas, geen rAF, geen animatie - een CSS-verloop met twee paden erop.
 * Het register toont er tot 77 tegelijk, dus alles wat per rij meer kost dan
 * een handvol bytes markup is er een te veel (STUDY_VISUAL_PLAN.md 3.4).
 *
 * `preserveAspectRatio="none"` is opzet: het merk is 34x22 en de band 16:3, en
 * dezelfde rug moet in allebei passen zonder bij te snijden. Bij een gerekte
 * horizon valt dat niet op; bij een uitsnede wel.
 */

function Sky({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      className="absolute inset-0 h-full w-full"
    >
      {children}
    </svg>
  );
}

function Ridges({ art, stars }: { art: StudyArt; stars: boolean }) {
  const p = art.palette;
  return (
    <>
      {stars &&
        art.stars.map((star, index) => (
          <circle key={index} cx={star.x} cy={star.y} r={star.r} fill={p.light} opacity="0.85" />
        ))}
      <path d={ridgePath(art.far)} fill={p.farAlt} />
      {art.scene === 'meer' && p.water ? (
        <rect x="0" y={GROUND_TOP - 3.5} width={VIEW_WIDTH} height="3.5" fill={p.water} />
      ) : null}
      <path d={ridgePath(art.near)} fill={p.far} />
      <rect x="0" y={GROUND_TOP} width={VIEW_WIDTH} height={VIEW_HEIGHT - GROUND_TOP} fill={p.ground} />
    </>
  );
}

/**
 * Het registermerk: een paar honderd bytes, groot genoeg om twee studies uit
 * elkaar te houden en klein genoeg om een indexregel niet te laten uitzetten.
 * Decoratief noch informatief voor een schermlezer, dus `aria-hidden`.
 */
export function HorizonMark({ art, className = '' }: { art: StudyArt; className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: skyGradient(art.palette) }}
    >
      <Sky>
        <Ridges art={art} stars={false} />
      </Sky>
    </span>
  );
}

/**
 * De band boven een plaat. Een strook, geen hero: de titel staat erboven en is
 * het element dat het eerst geverfd wordt, precies zoals LEARNING_UX_RESEARCH.md
 * over zware beelden en LCP zegt.
 */
export function HorizonBand({
  art,
  className = '',
  label,
}: {
  art: StudyArt;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: skyGradient(art.palette) }}
    >
      <Sky>
        <Ridges art={art} stars />
      </Sky>
    </div>
  );
}
