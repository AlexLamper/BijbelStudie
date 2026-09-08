'use client';

import { useEffect, useRef, useState } from 'react';

/** Dutch thousands separator, without Intl so server and client agree byte for byte. */
function format(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * A figure that counts up to its value the first time it scrolls into view.
 *
 * The server renders the final number, so crawlers, reduced motion and a
 * bundle that never arrives all read the real figure; the climb is a client
 * flourish on top. It runs once, over 1.1 s of ease-out, and the finished
 * value is laid out invisibly underneath so the neighbours never shift while
 * the digits grow.
 */
export default function CountUp({
  value,
  suffix = '',
  className,
  style,
}: {
  value: number;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const started = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - started) / 1100);
          setShown(Math.round(value * (1 - (1 - t) ** 3)));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        setShown(0);
        frame = requestAnimationFrame(step);
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={`relative inline-block tabular-nums ${className ?? ''}`} style={style}>
      <span aria-hidden className="invisible">
        {format(value)}
        {suffix}
      </span>
      <span className="absolute inset-0">
        {format(shown)}
        {suffix}
      </span>
    </span>
  );
}
