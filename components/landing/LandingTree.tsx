'use client';

import { useEffect, useRef, useState } from 'react';
import TreeCanvas from '../levensboom/TreeCanvas';

/**
 * A tree on the landing page: the server's static SVG until the block scrolls
 * into view, then the live canvas.
 *
 * The page is `force-static`, so the SVG is computed at build time and is what
 * crawlers and the first paint get - nothing waits on JavaScript. Once the
 * block is on screen the canvas takes over for the sway and, when asked, the
 * grow-in that turns a row of stages into a story. Reduced motion keeps the
 * SVG.
 */
export default function LandingTree({
  svg,
  seed,
  level,
  frac = 0.6,
  species = 'eik',
  scene = 'waterbeken',
  animal = 'geen',
  framing = 'scene',
  growIn = false,
  delayMs = 0,
  className,
  ariaLabel,
}: {
  svg: string;
  seed: string;
  level: number;
  frac?: number;
  species?: string;
  scene?: string;
  animal?: string;
  framing?: 'scene' | 'portrait';
  /** Grow the tree in from the stem when it first comes on screen. */
  growIn?: boolean;
  delayMs?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(false);
  const [reveal, setReveal] = useState(growIn ? 0 : 1);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        window.setTimeout(() => setLive(true), delayMs);
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [delayMs]);

  useEffect(() => {
    if (!live || !growIn) return;
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 1400);
      setReveal(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [live, growIn]);

  return (
    <div ref={ref} className={className}>
      {live ? (
        <TreeCanvas
          seed={seed}
          level={level}
          frac={frac}
          species={species}
          scene={scene}
          animal={animal}
          framing={framing}
          reveal={reveal}
          className="block h-full w-full"
          ariaLabel={ariaLabel ?? ''}
        />
      ) : (
        <div
          className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
          aria-hidden={ariaLabel ? undefined : true}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
