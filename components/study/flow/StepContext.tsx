'use client';

import React from 'react';
import Link from 'next/link';

import GeoImages from '../GeoImages';
import LessonLayout, { FOCUS_RING, INK, INK_FAINT, INK_MUTED, Marginal, SURFACE } from './lesson-layout';

export interface LessonContextProps {
  book: { slug: string; name: string; href: string } | null;
  body: string[];
  facts: { label: string; value: string }[];
  placement: { range: string; title: string; summary: string } | null;
  outline: { range: string; title: string; current: boolean }[];
  terms: { term: string; meaning: string }[];
  showMedia: boolean;
}

/**
 * Step 2. Where this passage sits before you read a word of it.
 *
 * It used to be a dialog hanging off the Verdieping step, which is the wrong
 * place twice over: background belongs BEFORE the text rather than beside the
 * commentary, and a dialog is something you decline. As a step it is simply
 * part of the lesson, and the walk through the lesson answers wie, wanneer and
 * waar op zijn plaats before it asks anything.
 *
 * Nothing here is fetched. The server builds this block from the same reference
 * set /bijbelboeken renders (lib/lessonContext.ts), so the step paints with the
 * lesson instead of after it - and it is never empty, for any chapter of the
 * canon, without a word being authored.
 */
export default function StepContext({
  context,
  book,
  chapter,
  eyebrow,
}: {
  context: LessonContextProps;
  /** The reader's own key for the book, for the photographs. */
  book: string;
  chapter: number;
  eyebrow?: string;
}) {
  const heading = context.book ? `De wereld van ${context.book.name}` : 'Bijbelse context';

  return (
    <LessonLayout
      eyebrow={eyebrow ?? 'Bijbelse context'}
      heading={heading}
      lead={
        context.placement ? (
          <p className="text-[14px] leading-[1.6]">
            Dit hoofdstuk hoort bij{' '}
            <span className={`font-semibold ${INK}`}>{context.placement.title}</span>{' '}
            <span className="tabular-nums">({context.placement.range})</span>.
          </p>
        ) : null
      }
      aside={
        <>
          {context.facts.length > 0 ? (
            <Marginal label="In het kort">
              <dl className="space-y-[10px]">
                {context.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className={`text-[11px] font-semibold ${INK}`}>{fact.label}</dt>
                    <dd className="mt-[2px]">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Marginal>
          ) : null}

          {context.terms.length > 0 ? (
            <Marginal label="Woorden om te kennen">
              <dl className="space-y-2">
                {context.terms.map((term) => (
                  <div key={term.term}>
                    <dt className={`text-[11px] font-semibold ${INK}`}>{term.term}</dt>
                    <dd className="mt-[2px]">{term.meaning}</dd>
                  </div>
                ))}
              </dl>
            </Marginal>
          ) : null}

          {context.book ? (
            <Link
              href={context.book.href}
              className={`${SURFACE} block px-4 py-[14px] text-[12.5px] leading-[1.55] ${INK_MUTED} transition-colors hover:bg-les-card ${FOCUS_RING}`}
            >
              <span className={`font-semibold ${INK}`}>Alles over {context.book.name}</span>
              <span className="mt-[2px] block">
                Indeling, kernverzen en studievragen van het hele boek.
              </span>
            </Link>
          ) : null}
        </>
      }
    >
      <div className="mt-5 space-y-4">
        {context.body.map((paragraph, index) => (
          <p key={index} className={`text-[15.5px] leading-[1.72] ${INK_MUTED}`}>
            {paragraph}
          </p>
        ))}
      </div>

      {/* The book in one glance, with the reader's own section marked. Ranges
          are the book's chapters, so this is also the only place in the lesson
          that says how much of the book is still ahead. */}
      {context.outline.length > 0 ? (
        <section className="mt-8 border-t border-les-line pt-6">
          <h2 className={`text-[10.5px] font-semibold uppercase tracking-[1.1px] ${INK_FAINT}`}>
            Waar je bent in het boek
          </h2>
          <ol className="mt-3">
            {context.outline.map((section) => (
              <li
                key={`${section.range}-${section.title}`}
                aria-current={section.current ? 'true' : undefined}
                className={[
                  'flex gap-3 border-l-2 py-[7px] pl-3 text-[13.5px] leading-[1.5]',
                  section.current
                    ? 'border-l-teal bg-les-step-active font-semibold text-les-accent'
                    : `border-l-transparent ${INK_MUTED}`,
                ].join(' ')}
              >
                <span className="w-[52px] flex-none tabular-nums text-[12px] opacity-70">
                  {section.range}
                </span>
                <span className="min-w-0">{section.title}</span>
              </li>
            ))}
          </ol>
          {context.placement?.summary ? (
            <p className={`mt-3 pl-3 text-[13.5px] leading-[1.65] ${INK_MUTED}`}>
              {context.placement.summary}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Photographs of the places in this chapter. They render nothing at all
          when the API has none, so there is no empty state to design. */}
      {context.showMedia ? (
        <section className="mt-8 border-t border-les-line pt-6">
          <h2 className={`text-[10.5px] font-semibold uppercase tracking-[1.1px] ${INK_FAINT}`}>
            Waar het gebeurde
          </h2>
          <div className="mt-3">
            <GeoImages book={book} chapter={chapter} variant="panel" fallbackToBook />
          </div>
        </section>
      ) : null}
    </LessonLayout>
  );
}
