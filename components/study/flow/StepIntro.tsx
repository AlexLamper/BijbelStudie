'use client';

import React from 'react';
/**
 * Teal as type, in the two shades the window needs: #0F766E is legible on the
 * light plate (4.8:1), #2DD4BF on the dark one. Same pair as the flow shell.
 */
const INK_TEAL = 'text-[#0F766E] dark:text-[#2DD4BF]';
const TEAL = '#0D9488';

export interface IntroContentProps {
  headline: string;
  body: string[];
  watchFor?: string[];
}

/**
 * Step 1. Context before the text.
 *
 * Only rendered when a lesson actually has an authored intro - lib/studyFlow
 * drops this step otherwise, because an empty introduction is worse than none.
 */
export default function StepIntro({
  intro,
  lessonTitle,
}: {
  intro: IntroContentProps;
  lessonTitle: string;
}) {
  return (
    <div className="h-full overflow-y-auto">
    <article className="max-w-2xl mx-auto px-6 sm:px-10 py-8 sm:py-10">
      {/* No icon beside it. A compass next to a lesson title identifies
          nothing the words do not already say, and the project's rule is that
          an icon marks a control or a data type or it is not there. */}
      <p className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-2 ${INK_TEAL}`}>
        {lessonTitle}
      </p>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-snug mb-5">
        {intro.headline}
      </h1>

      <div className="space-y-4">
        {intro.body.map((paragraph, index) => (
          <p key={index} className="text-[15px] leading-relaxed text-foreground/90">
            {paragraph}
          </p>
        ))}
      </div>

      {intro.watchFor && intro.watchFor.length > 0 && (
        <aside
          className="mt-7 rounded-xl border p-4 sm:p-5"
          style={{ borderColor: 'rgba(13,148,136,0.25)', backgroundColor: 'rgba(13,148,136,0.05)' }}
        >
          <p className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-3 ${INK_TEAL}`}>
            Let hier op
          </p>
          <ul className="space-y-2">
            {intro.watchFor.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-sm text-foreground/90 leading-relaxed">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full flex-none" style={{ backgroundColor: TEAL }} />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
    </div>
  );
}
