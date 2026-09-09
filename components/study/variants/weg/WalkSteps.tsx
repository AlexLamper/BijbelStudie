'use client';

import React, { useState } from 'react';
import { BookOpen, Clock, NotebookPen } from 'lucide-react';

import PassageReader from '../../flow/PassageReader';
import CommentaryComponent from '../../CommentaryComponent';
import { TEAL } from './routeArt';

/**
 * Ontwerp 3 - "Weg". The bodies of the five steps of one leg.
 *
 * The work is deliberately the quietest part of the flow: no XP, no streak, no
 * tree, nothing that moves next to scripture. Only the two things that make a
 * stop a stop are carried through from the rest of the variant - the reference
 * you are standing at, and how much of today's leg is behind you, both of which
 * live in the header rather than in here.
 *
 * `PassageReader` and `CommentaryComponent` are reused as-is: both fetch their
 * own text client-side (`/api/bible/chapter` and `/api/commentary`), so this
 * preview can show real scripture and real commentary without the page ever
 * touching the database. Everything else on the screen is authored content
 * resolved on the server from `lib/data/study-lessons`.
 */

/** The eyebrow every step body opens with, so the leg is always named. */
function StepHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <header className="mb-4">
      <p className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold leading-tight text-foreground text-balance">{title}</h2>
      {meta && (
        <p className="mt-1 text-[12.5px] text-gray-500 dark:text-muted-foreground">{meta}</p>
      )}
    </header>
  );
}

export function IntroBody({
  headline,
  body,
  watchFor,
  reference,
  minutes,
}: {
  headline: string;
  body: string[];
  watchFor: string[];
  reference: string;
  minutes: number;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 content-in">
      <StepHeading
        eyebrow="Voor je vertrekt"
        title={headline}
        meta={`${reference} · ongeveer ${minutes} minuten`}
      />

      <div className="space-y-3">
        {body.map((paragraph, index) => (
          <p key={index} className="text-[15.5px] leading-relaxed text-foreground/85">
            {paragraph}
          </p>
        ))}
      </div>

      {watchFor.length > 0 && (
        <section className="mt-6 rounded-2xl border border-gray-200 dark:border-border bg-gray-50/70 dark:bg-card/40 p-4">
          <h3 className="text-[12px] font-bold text-foreground">Let hier onderweg op</h3>
          <ul className="mt-2 space-y-1.5">
            {watchFor.map((item, index) => (
              <li
                key={index}
                className="flex gap-2.5 text-[13.5px] leading-relaxed text-foreground/80"
              >
                <span
                  aria-hidden
                  className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full"
                  style={{ backgroundColor: TEAL }}
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function WordBody({
  book,
  chapter,
  verseStart,
  verseEnd,
  reference,
  version,
  translationName,
  readingCue,
}: {
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  reference: string;
  version: string;
  translationName: string;
  readingCue: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8">
      <StepHeading
        eyebrow="Het Woord"
        title={reference}
        meta={translationName ? `Je leest in de ${translationName}` : undefined}
      />

      {readingCue && (
        <p
          className="mb-5 rounded-xl border-l-2 px-4 py-3 text-[13.5px] leading-relaxed text-foreground/80"
          style={{ borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.06)' }}
        >
          {readingCue}
        </p>
      )}

      {/* Loads its own text and renders its own skeleton and error state. */}
      <PassageReader
        book={book}
        chapter={chapter}
        version={version}
        verseStart={verseStart}
        verseEnd={verseEnd}
      />
    </div>
  );
}

export function DepthBody({
  book,
  chapter,
  commentaryId,
  body,
  terms,
  reference,
}: {
  book: string;
  chapter: number;
  commentaryId: string;
  body: string[];
  terms: { term: string; meaning: string }[];
  reference: string;
}) {
  return (
    <div className="h-full overflow-y-auto lg:flex lg:min-h-0 lg:flex-row lg:overflow-hidden">
      <div className="border-b border-gray-200 dark:border-border lg:min-h-0 lg:w-1/2 lg:flex-none lg:border-b-0 lg:border-r">
        <div className="lg:h-full lg:min-h-0">
          <CommentaryComponent book={book} chapter={chapter} source={commentaryId} height={1} />
        </div>
      </div>

      <div className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="px-5 py-6 sm:px-8 content-in">
          <StepHeading eyebrow="Verdieping" title="Wat er onder dit gedeelte ligt" meta={reference} />

          {body.length > 0 ? (
            <div className="space-y-3">
              {body.map((paragraph, index) => (
                <p key={index} className="text-[14.5px] leading-relaxed text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              Voor dit gedeelte is geen eigen toelichting geschreven. De uitleg hiernaast loopt het
              hoofdstuk vers voor vers door.
            </p>
          )}

          {terms.length > 0 && (
            <section className="mt-6">
              <h3 className="text-[12px] font-bold text-foreground">Woorden om te kennen</h3>
              <dl className="mt-2 space-y-2.5">
                {terms.map((entry) => (
                  <div
                    key={entry.term}
                    className="rounded-xl border border-gray-200 dark:border-border p-3"
                  >
                    <dt className="text-[13px] font-semibold text-foreground">{entry.term}</dt>
                    <dd className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                      {entry.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReflectionBody({
  question,
  prompts,
  placeholder,
  reference,
}: {
  question: string;
  prompts: string[];
  placeholder: string | null;
  reference: string;
}) {
  const [text, setText] = useState('');

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 content-in">
      <StepHeading eyebrow="Reflectie" title={question} meta={reference} />

      {prompts.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {prompts.map((prompt, index) => (
            <li
              key={index}
              className="flex gap-2.5 text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground"
            >
              <span
                aria-hidden
                className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full"
                style={{ backgroundColor: TEAL }}
              />
              {prompt}
            </li>
          ))}
        </ul>
      )}

      <label htmlFor="weg-reflection" className="block text-[12px] font-semibold text-foreground">
        Wat neem je mee van deze stop?
      </label>
      <textarea
        id="weg-reflection"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        placeholder={placeholder ?? 'Schrijf op wat je opviel, en wat het met vandaag te maken heeft.'}
        className="mt-2 w-full resize-y rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-3.5 text-[14.5px] leading-relaxed text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40"
      />

      <p className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-muted-foreground">
        <NotebookPen size={13} className="flex-none" aria-hidden style={{ color: TEAL }} />
        In de echte flow wordt dit als notitie bewaard. In dit ontwerpvoorbeeld blijft het lokaal.
      </p>
    </div>
  );
}

export function QuizBody({
  reference,
  questionCount,
}: {
  reference: string;
  questionCount: number;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 content-in">
      <StepHeading
        eyebrow="Toetsing"
        title="Even terugkijken op wat je gelezen hebt"
        meta={reference}
      />

      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-border p-6 text-center">
        <p className="text-[14px] leading-relaxed text-gray-600 dark:text-muted-foreground">
          Hier staan in de echte flow {questionCount} vragen over {reference}. Dit ontwerpvoorbeeld
          haalt ze niet op, omdat het geen les afrondt en geen antwoorden bewaart.
        </p>
        <p className="mt-3 flex items-center justify-center gap-3 text-[12px] text-gray-400 dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={13} aria-hidden /> {reference}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} aria-hidden /> ± 2 min
          </span>
        </p>
      </div>
    </div>
  );
}
