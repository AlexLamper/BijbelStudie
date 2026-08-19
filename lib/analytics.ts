"use client";

import type { EventName } from "./analyticsSchema";

/**
 * Client-side funnel tracking. Fire-and-forget by design: a failed or blocked
 * telemetry call must never interrupt what the user was doing, so every path
 * here swallows its errors.
 *
 * Events are batched on a short timer and flushed with `sendBeacon` where the
 * browser supports it, which survives the page navigation that immediately
 * follows the interesting events (checkout_started, plan_selected).
 */

const FLUSH_DELAY_MS = 800;
const MAX_BATCH = 20;
const ANON_KEY = "bs_anon_id";

interface QueuedEvent {
  name: EventName;
  props?: Record<string, string>;
  anonId?: string;
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Random per-browser id, stored in localStorage. Not derived from anything about
 * the device or network - it exists purely so a logged-out visit can be joined
 * into one funnel, and it is discarded the moment the user clears site data.
 */
function anonId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    // Private mode or storage disabled - proceed without stitching.
    return undefined;
  }
}

function flush(useBeacon = false): void {
  if (queue.length === 0) return;

  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);

  const body = JSON.stringify(batch);

  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never rethrow from telemetry.
  }
}

export function track(name: EventName, props?: Record<string, string>): void {
  if (typeof window === "undefined") return;

  queue.push({ name, props, anonId: anonId() });

  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => flush(), FLUSH_DELAY_MS);
}

/** Sends immediately. Use before a navigation that would otherwise drop the batch. */
export function trackNow(name: EventName, props?: Record<string, string>): void {
  track(name, props);
  if (timer) clearTimeout(timer);
  flush(true);
}

if (typeof window !== "undefined") {
  // `visibilitychange` is the reliable one; `pagehide` covers Safari.
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}
