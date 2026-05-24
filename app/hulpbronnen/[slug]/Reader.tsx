"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import type { LibraryItem } from "../library";

const TEAL = "#0D9488";

export default function Reader({ item }: { item: LibraryItem }) {
  const [fullscreen, setFullscreen] = useState(false);
  const embedUrl = item.embedUrl ?? item.sourceUrl;

  if (!item.canEmbed) {
    return <NotEmbeddable item={item} />;
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background p-4 flex flex-col" : "space-y-3"}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
          In-app lezer
        </p>
        <button
          onClick={() => setFullscreen(f => !f)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-muted-foreground hover:text-[#0D9488] transition-colors"
        >
          {fullscreen ? (
            <><Minimize2 className="h-3.5 w-3.5" /> Verkleinen</>
          ) : (
            <><Maximize2 className="h-3.5 w-3.5" /> Volledig scherm</>
          )}
        </button>
      </div>

      <div className={[
        "relative bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden",
        fullscreen ? "flex-1" : "h-[75vh]",
      ].join(" ")}>
        <iframe
          src={embedUrl}
          title={item.title}
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>

      <p className="text-[11px] text-gray-400 dark:text-muted-foreground text-center">
        Wordt de tekst niet geladen? Sommige bronnen blokkeren inbedding —{" "}
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0D9488]">
          open op {item.source}
        </a>
        .
      </p>
    </div>
  );
}

function NotEmbeddable({ item }: { item: LibraryItem }) {
  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-8 text-center">
      <div className="h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
        <ExternalLink className="h-5 w-5" style={{ color: TEAL }} />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-foreground mb-2">
        Lees dit werk bij {item.source}
      </h2>
      <p className="text-sm text-gray-500 dark:text-muted-foreground max-w-md mx-auto mb-5">
        Deze bron staat inbedding in andere websites niet toe, maar het werk is daar volledig en gratis te lezen.
      </p>
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: TEAL }}
      >
        <ExternalLink className="h-4 w-4" />
        Openen op {item.source}
      </a>
    </div>
  );
}
