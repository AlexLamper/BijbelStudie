'use client';

import React from 'react';
import type { CalvinNotice } from '../../lib/calvinCoverage';

type Alternative = { id: string; name: string };

/**
 * Shown in place of commentary when the selected Calvijn commentary has
 * nothing for this book or chapter - see lib/calvinCoverage.ts for the three
 * cases. Calm by design: this is information, not an error.
 *
 * `alternatives` are other commentary sources the reader can switch to in one
 * click; the panel's own source picker stays the full list.
 */
export default function CalvinCoverageNotice({
  notice,
  alternatives = [],
  onSwitch,
}: {
  notice: CalvinNotice;
  alternatives?: Alternative[];
  onSwitch?: (sourceId: string) => void;
}) {
  const options = onSwitch ? alternatives.slice(0, 3) : [];

  return (
    <div
      role="status"
      data-calvin-notice={notice.kind}
      className="rounded-xl border border-line bg-sunken px-5 py-4"
    >
      <p className="text-[12px] font-semibold uppercase tracking-[1.2px] text-ink-muted">
        {notice.title}
      </p>
      <p className="mt-2 text-[14.5px] leading-[1.7] text-ink-body">{notice.message}</p>

      {options.length > 0 && (
        <div className="mt-4">
          <p className="text-[12.5px] text-ink-muted">Kies een ander commentaar:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((alt) => (
              <button
                key={alt.id}
                type="button"
                onClick={() => onSwitch?.(alt.id)}
                className="h-8 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-ink-body transition-colors hover:border-[#0D9488] hover:text-[#0D9488] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40"
              >
                {alt.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
