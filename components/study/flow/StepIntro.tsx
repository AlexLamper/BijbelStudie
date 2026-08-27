'use client';

import React from 'react';
import { Compass, Eye } from 'lucide-react';

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
    <article className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center gap-2 mb-2">
        <Compass size={14} style={{ color: TEAL }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
          {lessonTitle}
        </span>
      </div>

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
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEAL }}>
            <Eye size={13} /> Let hier op
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
  );
}
