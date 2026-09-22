'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A draggable divider between two side-by-side panels.
 *
 * ONE COMPONENT, TWO SURFACES: the reader (/lezen, passage | studiemateriaal)
 * and the lesson flow (/studie, step | AI-assistent). Neither of them owns the
 * drag logic; they only say where the split lives and what it is worth by
 * default.
 *
 * HOW THE SIZE TRAVELS. The component never sets a width on a panel. It writes
 * two custom properties on the row it renders -
 *
 *   --bs-split-a   the first panel's share, as a percentage
 *   --bs-split-b   the second panel's share, as a percentage
 *
 * - and the panels pick whichever one they need from their own class list, at
 * `lg` and up only (`lg:w-[var(--bs-split-a,51.22%)]`). That is deliberate:
 * below `lg` the two panels are stacked, not side by side, so there is nothing
 * to divide. The handle is `hidden lg:block` and no panel reads the variables
 * outside a `lg:` class, which leaves the phone layout byte for byte what it
 * was.
 *
 * ALWAYS A PERCENTAGE, never pixels, so the split a reader chose survives the
 * window being resized, a sidebar opening, or the same account on a second
 * screen.
 *
 * `defaultRatio = null` means "whatever the stylesheet already says". The
 * variables are then simply not written until the reader drags, and the panels
 * fall back to the value inside their own `var(…, fallback)`. The AI dock uses
 * it: its resting width is `min(400px,36vw)`, which is not a fixed percentage
 * of anything, and turning it into one would have changed how the flow looks
 * for everybody who never touches the divider.
 *
 * WHY THE DRAG DOES NOT GO THROUGH REACT. A pointermove fires per frame or
 * more; putting the ratio in state would re-render both panels - a chapter of
 * scripture and a live conversation - sixty times a second. So a move only
 * writes the custom property on the row inside a `requestAnimationFrame`, and
 * state is caught up once, on pointerup. The panels never re-render while the
 * divider is moving: CSS resolves the new width, React is not involved.
 */

/** The brand fill. Hardcoded, never `bg-brand` - see CLAUDE.md. */
const TEAL = '#0D9488';

export type ResizableSplitProps = {
  /** localStorage key, distinct per surface: `bs:split:lezen`, `bs:split:studie`. */
  storageKey: string;
  /**
   * The first panel's share in percent, or `null` to leave the panels at
   * whatever width their own CSS gives them until the reader drags.
   */
  defaultRatio: number | null;
  /** Floor and ceiling for the first panel, in percent. */
  minRatio?: number;
  maxRatio?: number;
  /** A panel may never be narrower than this, whatever the percentages say. */
  minPaneWidth?: number;
  /** False hides the handle and freezes the split (the dock is closed). */
  enabled?: boolean;
  /** Classes for the row itself; it must be the flex container of both panels. */
  className?: string;
  /** The hairline colour, e.g. `bg-line` on the reader, `bg-les-line` in a lesson. */
  lineClassName?: string;
  /** Dutch, and it must say what moves. */
  ariaLabel?: string;
  /** Percentage points per arrow key. */
  keyboardStep?: number;
  /** Exactly two panels. The handle is slotted between them. */
  children: React.ReactNode;
};

function readStored(key: string, min: number, max: number): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value) || value < min || value > max) return null;
    return value;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: number | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch {
    /* private mode, blocked storage - the split simply does not persist */
  }
}

export default function ResizableSplit({
  storageKey,
  defaultRatio,
  minRatio = 25,
  maxRatio = 75,
  minPaneWidth = 260,
  enabled = true,
  className,
  lineClassName = 'bg-line',
  ariaLabel = 'Verdeling van de panelen aanpassen',
  keyboardStep = 2,
  children,
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  /**
   * The committed value. `null` is "the stylesheet decides", which is both the
   * resting state of a surface with `defaultRatio: null` and what Home and a
   * double click go back to on one.
   *
   * Server-rendered as the default, exactly as it is on the client's first
   * paint, so there is no hydration mismatch. localStorage is read in the
   * effect below, never during render.
   */
  const [ratio, setRatio] = useState<number | null>(defaultRatio);

  /**
   * What the panels are worth while nothing has been chosen and the stylesheet
   * is still deciding - measured, so the handle can report a real number
   * instead of the middle of its own range.
   */
  const [measured, setMeasured] = useState<number | null>(null);

  /** The live value during a drag, which deliberately runs ahead of state. */
  const ratioRef = useRef<number | null>(defaultRatio);
  const draggingRef = useRef(false);
  const frameRef = useRef(0);
  const pointerXRef = useRef(0);

  /** Clamp against both the percentage bounds and the pixel floor. */
  const clamp = useCallback(
    (value: number, width: number) => {
      const pxFloor = width > 0 ? (minPaneWidth / width) * 100 : 0;
      const low = Math.max(minRatio, pxFloor);
      const high = Math.min(maxRatio, 100 - pxFloor);
      // A container too narrow to honour both floors: sit in the middle of
      // what is left rather than snapping to a bound.
      if (low > high) return (low + high) / 2;
      return Math.min(Math.max(value, low), high);
    },
    [maxRatio, minPaneWidth, minRatio],
  );

  /** The one place a ratio reaches the DOM. No state, no re-render. */
  const paint = useCallback((value: number | null) => {
    ratioRef.current = value;
    const container = containerRef.current;
    if (container) {
      if (value === null) {
        container.style.removeProperty('--bs-split-a');
        container.style.removeProperty('--bs-split-b');
      } else {
        container.style.setProperty('--bs-split-a', `${value}%`);
        container.style.setProperty('--bs-split-b', `${100 - value}%`);
      }
    }
    const handle = handleRef.current;
    if (handle && value !== null) handle.setAttribute('aria-valuenow', String(Math.round(value)));
  }, []);

  /** Paint, tell React, and remember. Used by everything except pointermove. */
  const commit = useCallback(
    (value: number | null) => {
      paint(value);
      setRatio(value);
      writeStored(storageKey, value);
    },
    [paint, storageKey],
  );

  /** What the divider is worth right now, measured if nothing was ever chosen. */
  const currentRatio = useCallback(() => {
    if (ratioRef.current !== null) return ratioRef.current;
    const container = containerRef.current;
    const first = container?.firstElementChild;
    if (container && first instanceof HTMLElement) {
      const width = container.getBoundingClientRect().width;
      if (width > 0) return (first.getBoundingClientRect().width / width) * 100;
    }
    return defaultRatio ?? (minRatio + maxRatio) / 2;
  }, [defaultRatio, maxRatio, minRatio]);

  // The reader's own choice, restored after hydration.
  useEffect(() => {
    const stored = readStored(storageKey, minRatio, maxRatio);
    if (stored === null) return;
    paint(stored);
    setRatio(stored);
  }, [maxRatio, minRatio, paint, storageKey]);

  // With nothing chosen yet the handle still has to report a real number, so
  // it measures the panel beside it instead of naming the middle of its range.
  // Deferred: a panel that animates its width open (the AI dock takes 300 ms)
  // would otherwise be measured at nothing.
  useEffect(() => {
    if (!enabled || ratio !== null) return;
    const timer = window.setTimeout(() => setMeasured(Math.round(currentRatio())), 360);
    return () => window.clearTimeout(timer);
  }, [currentRatio, enabled, ratio]);

  // A window narrow enough to break the pixel floor pulls the split back in.
  useEffect(() => {
    if (!enabled) return;
    const onResize = () => {
      const container = containerRef.current;
      if (!container || ratioRef.current === null) return;
      const width = container.getBoundingClientRect().width;
      if (width <= 0) return;
      const next = clamp(ratioRef.current, width);
      if (Math.abs(next - ratioRef.current) > 0.01) paint(Math.round(next * 100) / 100);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp, enabled, paint]);

  /* ── Dragging ────────────────────────────────────────────────── */

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    handleRef.current?.removeAttribute('data-dragging');
    document.body.style.removeProperty('user-select');
    document.body.style.removeProperty('cursor');
    // One state update for the whole gesture.
    const value = ratioRef.current;
    if (value !== null) {
      setRatio(value);
      writeStored(storageKey, value);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return;

    const applyPointer = () => {
      frameRef.current = 0;
      const container = containerRef.current;
      if (!container || !draggingRef.current) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const raw = ((pointerXRef.current - rect.left) / rect.width) * 100;
      paint(Math.round(clamp(raw, rect.width) * 100) / 100);
    };

    const onMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      pointerXRef.current = event.clientX;
      // Coalesce: at most one width write per frame, however many moves land.
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(applyPointer);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [clamp, enabled, endDrag, paint]);

  // A component torn down mid-drag must not leave the page unselectable.
  useEffect(() => endDrag, [endDrag]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // /studie turns the page on a horizontal drag. A grab on the divider is
      // never that, so it stops here - both for React's tree and for any
      // native listener an ancestor added.
      event.stopPropagation();
      event.nativeEvent.stopPropagation();
      event.preventDefault();

      const handle = handleRef.current;
      if (!handle) return;
      try {
        handle.setPointerCapture(event.pointerId);
      } catch {
        /* capture is a convenience; the window listeners do the work */
      }
      // Start from wherever the panels actually are, so the first move of a
      // never-resized split does not jump.
      if (ratioRef.current === null) ratioRef.current = Math.round(currentRatio() * 100) / 100;
      draggingRef.current = true;
      pointerXRef.current = event.clientX;
      handle.setAttribute('data-dragging', 'true');
      handle.focus({ preventScroll: true });
      document.body.style.setProperty('user-select', 'none');
      document.body.style.setProperty('cursor', 'col-resize');
    },
    [currentRatio],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Home') {
        event.preventDefault();
        commit(defaultRatio);
        return;
      }
      const delta =
        event.key === 'ArrowLeft' ? -keyboardStep : event.key === 'ArrowRight' ? keyboardStep : 0;
      if (!delta) return;
      event.preventDefault();
      const width = containerRef.current?.getBoundingClientRect().width ?? 0;
      commit(Math.round(clamp(currentRatio() + delta, width) * 100) / 100);
    },
    [clamp, commit, currentRatio, defaultRatio, keyboardStep],
  );

  const onDoubleClick = useCallback(() => commit(defaultRatio), [commit, defaultRatio]);

  /* ── Render ──────────────────────────────────────────────────── */

  const panels = React.Children.toArray(children);

  const handle = enabled ? (
    <div
      key="bs-split-handle"
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(ratio ?? measured ?? defaultRatio ?? (minRatio + maxRatio) / 2)}
      aria-valuemin={minRatio}
      aria-valuemax={maxRatio}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      title="Sleep om de panelen breder of smaller te maken"
      className={[
        // A hairline, and nothing else, until it is touched - it stands where
        // the panel border used to and should read as the same rule.
        'group relative z-10 hidden w-px flex-none cursor-col-resize touch-none select-none outline-none lg:block',
        lineClassName,
      ].join(' ')}
    >
      {/* The hit area, wider than the line so it can actually be grabbed. */}
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-[13px] -translate-x-1/2" />
      {/* The tint: three pixels of brand fill on hover, on focus and while
          dragging. No grip, no icon - the cursor already says what this is. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[dragging]:opacity-100"
        style={{ backgroundColor: TEAL }}
      />
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={
        ratio === null
          ? undefined
          : ({ '--bs-split-a': `${ratio}%`, '--bs-split-b': `${100 - ratio}%` } as React.CSSProperties)
      }
    >
      {panels[0] ?? null}
      {handle}
      {panels.slice(1)}
    </div>
  );
}
