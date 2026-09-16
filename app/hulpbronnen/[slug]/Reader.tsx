"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import type { LibraryItem } from "../library";
import { BTN_PRIMARY, EYEBROW, TEXT_LINK } from "../tokens";

/**
 * The in-app reader, as a framed pane in the shell's content column.
 *
 * The pane is opaque white in both themes on purpose: it holds a whole external
 * page, and nothing about that is ours to tint. Full screen lifts the pane over
 * the shell onto the shell's own ground (`bg-line-soft`, `bg-background` in
 * dark), the same ground AppShell paints behind every card.
 *
 * `canEmbed: false` is a licensing fact, not a rendering hint: those sources -
 * DBNL among them - are read at the source, in a normal outbound link, and are
 * never framed here. That branch is `NotEmbeddable` below and must stay.
 */
export default function Reader({ item }: { item: LibraryItem }) {
  const [fullscreen, setFullscreen] = useState(false);
  const embedUrl = item.embedUrl ?? item.sourceUrl;

  if (!item.canEmbed) {
    return <NotEmbeddable item={item} />;
  }

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col gap-3 bg-line-soft p-4 dark:bg-background"
          : "space-y-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`m-0 ${EYEBROW}`}>In-app lezer</p>
        <button
          type="button"
          onClick={() => setFullscreen(f => !f)}
          className="inline-flex h-9 items-center gap-1.5 rounded-btn px-2.5 text-[13px] font-semibold text-ink-body outline-none transition-colors hover:bg-line-soft focus-visible:ring-2 focus-visible:ring-[#0D9488] dark:hover:bg-surface"
        >
          {fullscreen ? (
            <>
              {/* Identifies the control, not decoration. */}
              <Minimize2 className="h-3.5 w-3.5" aria-hidden /> Verkleinen
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" aria-hidden /> Volledig scherm
            </>
          )}
        </button>
      </div>

      {/* The pane is opaque white on purpose - it holds a whole external page. */}
      <div
        className={[
          "relative overflow-hidden rounded-card border border-line bg-white",
          fullscreen ? "min-h-0 flex-1" : "h-[75vh]",
        ].join(" ")}
      >
        <iframe
          src={embedUrl}
          title={item.title}
          className="h-full w-full"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>

      <p className="m-0 text-center text-[12px] leading-relaxed text-ink-muted">
        Wordt de tekst niet geladen? Sommige bronnen blokkeren inbedding -{" "}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={TEXT_LINK}
        >
          open op {item.source}
        </a>
        .
      </p>
    </div>
  );
}

function NotEmbeddable({ item }: { item: LibraryItem }) {
  return (
    <section
      aria-labelledby="hulpbron-bron"
      className="max-w-[36rem] rounded-card border border-line bg-surface p-8 text-center"
    >
      <h2 id="hulpbron-bron" className="text-lg font-semibold text-ink">
        Lees dit werk bij {item.source}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        Deze bron staat inbedding in andere websites niet toe, maar het werk is daar volledig en gratis te lezen.
      </p>
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-6 ${BTN_PRIMARY}`}
      >
        {/* Identifies where the link goes, not decoration. */}
        <ExternalLink className="h-4 w-4" aria-hidden />
        Openen op {item.source}
      </a>
    </section>
  );
}
