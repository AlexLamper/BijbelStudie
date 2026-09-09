import React from 'react';

import { TEAL } from './routeArt';

/**
 * The same road, seen from above.
 *
 * The horizon art shows the route in perspective; every place the flow needs it
 * as a plain measure - the itinerary's spine, the rail across today's leg, the
 * strip on the close screen - uses this instead. Teal is the part behind you,
 * slate the part ahead, and the broken centre line is what makes it read as a
 * road rather than as a progress bar.
 *
 * Pure CSS. No SVG ids, so it can appear any number of times on a page, and no
 * canvas anywhere near a list.
 */

const DASH_H =
  'repeating-linear-gradient(90deg, rgba(255,255,255,0.8) 0 5px, rgba(255,255,255,0) 5px 13px)';
const DASH_V =
  'repeating-linear-gradient(180deg, rgba(255,255,255,0.8) 0 5px, rgba(255,255,255,0) 5px 13px)';

export default function RoadRibbon({
  progress,
  orientation = 'horizontal',
  thickness = 10,
  className = '',
}: {
  /** 0 to 1. */
  progress: number;
  orientation?: 'horizontal' | 'vertical';
  /** Road width in pixels. */
  thickness?: number;
  className?: string;
}) {
  const walked = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  const vertical = orientation === 'vertical';

  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-full bg-gray-200 dark:bg-border ${className}`}
      style={vertical ? { width: thickness } : { height: thickness }}
    >
      <div
        className="absolute rounded-full transition-[width,height] duration-700 ease-out motion-reduce:transition-none"
        style={
          vertical
            ? { left: 0, right: 0, top: 0, height: walked, backgroundColor: TEAL }
            : { top: 0, bottom: 0, left: 0, width: walked, backgroundColor: TEAL }
        }
      />
      <div
        className="absolute"
        style={
          vertical
            ? {
                top: 0,
                bottom: 0,
                left: '50%',
                width: 2,
                marginLeft: -1,
                backgroundImage: DASH_V,
              }
            : {
                left: 0,
                right: 0,
                top: '50%',
                height: 2,
                marginTop: -1,
                backgroundImage: DASH_H,
              }
        }
      />
    </div>
  );
}
