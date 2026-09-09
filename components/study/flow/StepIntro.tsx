'use client';

import React from 'react';

import LessonLayout, { INK_MUTED, Marginal } from './lesson-layout';

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
 *
 * "Let hierop" used to be a tinted box UNDER the introduction, which meant the
 * reader met it after they had finished reading and were already reaching for
 * "Volgende". In ontwerp B's shape it is a marginal note beside the prose,
 * numbered, where a list of things to watch for actually belongs.
 */
export default function StepIntro({
  intro,
  lessonTitle,
  eyebrow,
}: {
  intro: IntroContentProps;
  lessonTitle: string;
  eyebrow?: string;
}) {
  return (
    <LessonLayout
      eyebrow={eyebrow ?? lessonTitle}
      heading={intro.headline}
      aside={
        intro.watchFor && intro.watchFor.length > 0 ? (
          <Marginal label="Let hierop">
            <ul className="space-y-2">
              {intro.watchFor.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden className="flex-none text-[10px] tabular-nums opacity-60">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Marginal>
        ) : null
      }
    >
      <div className="mt-5 space-y-4">
        {intro.body.map((paragraph, index) => (
          <p key={index} className={`text-[15.5px] leading-[1.72] ${INK_MUTED}`}>
            {paragraph}
          </p>
        ))}
      </div>
    </LessonLayout>
  );
}
