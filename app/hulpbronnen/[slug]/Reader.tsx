"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import type { LibraryItem } from "../library";
import { CTA_BRAND, EYEBROW, SCENE_BG, TEAL_DEEP, TILE } from "../../../components/scene/tokens";

/**
 * The in-app reader, as a lit window on the scene.
 *
 * The frame is the page's own dark surface; the pane inside it is opaque
 * because it holds a whole external page and nothing about that is ours to
 * tint. That is the only opaque thing on this route, and it is a framed object
 * rather than the page's floor - which is why /hulpbronnen keeps a landscape
 * instead of taking `backdrop="none"` (see app/hulpbronnen/layout.tsx).
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
      className={fullscreen ? "fixed inset-0 z-50 flex flex-col p-4" : "space-y-3"}
      style={fullscreen ? { backgroundColor: SCENE_BG } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`m-0 ${EYEBROW}`}>In-app lezer</p>
        <button
          type="button"
          onClick={() => setFullscreen(f => !f)}
          className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-white/75 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
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

      {/* The frame is written out rather than built from TILE: TILE's ground is
          `bg-black/40`, and two background utilities on one element are settled
          by Tailwind's own output order, not by the order they are written in.
          The pane is opaque white on purpose - it holds a whole external page. */}
      <div
        className={[
          "relative overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-black/40",
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

      <p className="m-0 text-center text-[11px] leading-relaxed text-white/60">
        Wordt de tekst niet geladen? Sommige bronnen blokkeren inbedding -{" "}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded text-white/80 underline underline-offset-4 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white"
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
    <section aria-labelledby="hulpbron-bron" className={`max-w-[36rem] p-8 text-center ${TILE}`}>
      <h2 id="hulpbron-bron" className="text-lg font-semibold text-white">
        Lees dit werk bij {item.source}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/75">
        Deze bron staat inbedding in andere websites niet toe, maar het werk is daar volledig en gratis te lezen.
      </p>
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-6 ${CTA_BRAND}`}
        style={{ backgroundColor: TEAL_DEEP }}
      >
        {/* Identifies where the link goes, not decoration. */}
        <ExternalLink className="h-4 w-4" aria-hidden />
        Openen op {item.source}
      </a>
    </section>
  );
}
