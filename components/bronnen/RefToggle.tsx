"use client";

import { useEffect, useState } from "react";

/**
 * Opens or closes every Scripture reference on the page at once. With all of
 * them open a catechism booklet reads "uitgebreid": each proof text printed
 * under its answer. The choice is remembered per browser.
 */
const KEY = "bronnen-refs-open";

function setAll(open: boolean) {
  document.querySelectorAll<HTMLDetailsElement>("details[data-bron-ref]").forEach(el => {
    el.open = open;
  });
}

export function RefToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stored = false;
    try {
      stored = window.localStorage.getItem(KEY) === "1";
    } catch {
      // Storage blocked: start closed.
    }
    if (stored) {
      setOpen(true);
      setAll(true);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setAll(next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // Not remembered; the toggle still works on this page.
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={open}
      onClick={toggle}
      className="inline-flex h-8 flex-none items-center gap-2 rounded-full border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <span
        aria-hidden
        className={`relative h-4 w-7 rounded-full transition-colors ${open ? "" : "bg-line-strong"}`}
        style={open ? { backgroundColor: "#0D9488" } : undefined}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${open ? "left-[14px]" : "left-0.5"}`}
        />
      </span>
      Schriftteksten voluit
    </button>
  );
}
