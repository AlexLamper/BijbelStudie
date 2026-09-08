'use client';

import { useEffect, useMemo, useState } from 'react';
import TreeCanvas from '../levensboom/TreeCanvas';
import { buildPalette } from '../../lib/levensboom/palette';

const GROW_MS = 2600;

/**
 * The hero's tree: a full-grown levensboom at dusk that grows in from a kiem
 * the moment the page is on screen, then sways with butterflies around it.
 *
 * The server's SVG is what the first paint and crawlers get (the page is
 * force-static); the canvas takes over after hydration. Reduced motion keeps
 * the SVG - a grown tree, no grow-in.
 */
export default function HeroLevensboom({ svg, seed, level }: { svg: string; seed: string; level: number }) {
  const [live, setLive] = useState(false);
  const [reveal, setReveal] = useState(0);
  // Dusk, always: the marketing tree does not follow the visitor's clock, so
  // the page looks the same at nine in the morning and at midnight.
  const palette = useMemo(() => buildPalette('summer', 'dusk', 1, { scene: 'waterbeken', species: 'eik' }), []);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => setLive(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!live) return;
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / GROW_MS);
      setReveal(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [live]);

  if (!live) {
    return (
      <div
        className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return (
    <TreeCanvas
      seed={seed}
      level={level}
      frac={0.7}
      species="eik"
      scene="waterbeken"
      animal="vlinders"
      framing="scene"
      palette={palette}
      reveal={reveal}
      className="block h-full w-full"
      ariaLabel="Een levensboom bij zonsondergang, met vlinders"
    />
  );
}
