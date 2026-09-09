'use client';

import React from 'react';
import Link from 'next/link';

import type { StepKey } from '../../../../lib/studyFlow';
import RustPassage from './RustPassage';
import { Eyebrow, MEASURE, TEAL } from './typography';

/**
 * The five step bodies, each set as a page of a book.
 *
 * Every step opens the same way - a step label in small caps, then a serif
 * heading that is the step's actual content rather than its name - so moving
 * through a lesson feels like turning pages in one publication instead of
 * visiting five differently furnished screens.
 *
 * Nothing here is a card. The only rules are structural: one under the heading
 * of a list, one above an attribution. No icons: every control says what it is
 * in words.
 */

export interface RustLessonPayload {
  studyId: string;
  studyTitle: string;
  day: number;
  title: string;
  lessonsTotal: number;
  minutes: number;
  /** "Johannes 20:1-18" */
  reference: string;
  passage: {
    book: string;
    chapter: number;
    verseStart: number | null;
    verseEnd: number | null;
  };
  version: string;
  versionLabel: string;
  commentaryLabel: string;
  steps: StepKey[];
  intro: { headline: string; body: string[]; watchFor: string[] } | null;
  readingCue: string | null;
  depth: { body: string[]; terms: { term: string; meaning: string }[] } | null;
  reflection: { question: string; prompts: string[]; placeholder: string | null };
  quiz: { questionCount: number };
  /** The lesson after this one, already named. Null on the last lesson. */
  next: { day: number; title: string } | null;
}

/** "Stap 2 · Het Woord" - the same line above every step. */
function StepLabel({ position, total, name }: { position: number; total: number; name: string }) {
  return (
    <Eyebrow>
      <span className="tabular-nums">
        Stap {position} van {total}
      </span>
      <span aria-hidden> &middot; </span>
      {name}
    </Eyebrow>
  );
}

/** The serif heading each step opens on. */
function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 font-serif text-[25px] font-normal leading-[1.3] text-foreground sm:text-[28px]">
      {children}
    </h2>
  );
}

/** A list whose markers are figures, hanging in their own column. */
function FiguredList({ items }: { items: string[] }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 items-baseline">
          <span className="text-[12px] tabular-nums text-muted-foreground" aria-hidden>
            {index + 1}
          </span>
          <span className="text-[15px] leading-[1.75] text-muted-foreground">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="mt-6 space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-[16px] leading-[1.8] text-foreground/85">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/** The grey line that marks something as preview-only rather than product copy. */
function PreviewNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-8 border-t border-border pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function IntroStep({
  lesson,
  position,
}: {
  lesson: RustLessonPayload;
  position: number;
}) {
  const intro = lesson.intro;
  return (
    <section className={MEASURE}>
      <StepLabel position={position} total={lesson.steps.length} name="Intro" />
      <StepTitle>{intro?.headline ?? lesson.title}</StepTitle>

      {intro?.body?.length ? (
        <Prose paragraphs={intro.body} />
      ) : (
        <p className="mt-6 text-[16px] leading-[1.8] text-foreground/85">
          Je leest vandaag {lesson.reference}. Neem er de tijd voor; de uitleg en de vraag komen
          daarna.
        </p>
      )}

      {intro?.watchFor?.length ? (
        <div className="mt-10">
          <Eyebrow as="h3" className="border-t border-border pt-4">
            Let hierop tijdens het lezen
          </Eyebrow>
          <FiguredList items={intro.watchFor} />
        </div>
      ) : null}
    </section>
  );
}

export function WordStep({ lesson, position }: { lesson: RustLessonPayload; position: number }) {
  return (
    <section className={MEASURE}>
      <StepLabel position={position} total={lesson.steps.length} name="Het Woord" />
      <StepTitle>{lesson.reference}</StepTitle>

      {lesson.readingCue && (
        <p className="mt-4 font-serif text-[16px] italic leading-relaxed text-muted-foreground">
          {lesson.readingCue}
        </p>
      )}

      <div className="mt-8">
        <RustPassage
          book={lesson.passage.book}
          chapter={lesson.passage.chapter}
          version={lesson.version}
          versionLabel={lesson.versionLabel}
          verseStart={lesson.passage.verseStart}
          verseEnd={lesson.passage.verseEnd}
        />
      </div>
    </section>
  );
}

export function DepthStep({ lesson, position }: { lesson: RustLessonPayload; position: number }) {
  const depth = lesson.depth;
  return (
    <section className={MEASURE}>
      <StepLabel position={position} total={lesson.steps.length} name="Verdieping" />
      <StepTitle>Uitleg bij {lesson.reference}</StepTitle>

      {depth?.body?.length ? (
        <Prose paragraphs={depth.body} />
      ) : (
        <p className="mt-6 text-[16px] leading-[1.8] text-foreground/85">
          De uitleg loopt vers voor vers mee met het gedeelte dat je net gelezen hebt: wat er
          staat, wat het betekende voor wie het als eerste las, en waar het naartoe wijst.
        </p>
      )}

      {depth?.terms?.length ? (
        <div className="mt-10">
          <Eyebrow as="h3" className="border-t border-border pt-4">
            Woorden uit de tekst
          </Eyebrow>
          <dl className="mt-4 space-y-4">
            {depth.terms.map((term) => (
              <div key={term.term}>
                <dt className="font-serif text-[16px] italic text-foreground">{term.term}</dt>
                <dd className="mt-1 text-[15px] leading-[1.75] text-muted-foreground">
                  {term.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <PreviewNote>
        Ontwerpvoorbeeld: de uitleg van {lesson.commentaryLabel} zelf staat hier niet onder. In de
        les loopt die door vanaf deze regel.
      </PreviewNote>
    </section>
  );
}

export function ReflectionStep({
  lesson,
  position,
  value,
  onChange,
}: {
  lesson: RustLessonPayload;
  position: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className={MEASURE}>
      <StepLabel position={position} total={lesson.steps.length} name="Reflectie" />
      <StepTitle>{lesson.reflection.question}</StepTitle>

      {lesson.reflection.prompts.length > 0 && (
        <div className="mt-8">
          <Eyebrow as="h3" className="border-t border-border pt-4">
            Als je niet weet waar te beginnen
          </Eyebrow>
          <FiguredList items={lesson.reflection.prompts} />
        </div>
      )}

      <div className="mt-10">
        <label
          htmlFor="rust-reflectie"
          className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Jouw antwoord
        </label>
        <textarea
          id="rust-reflectie"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={8}
          placeholder={lesson.reflection.placeholder ?? 'Schrijf op wat je opviel…'}
          className="mt-3 w-full resize-y border-0 border-b border-border bg-transparent pb-2 font-serif text-[17px] leading-[1.8] text-foreground placeholder:text-muted-foreground/70 focus:border-[#0D9488] focus:outline-none focus:ring-0"
        />
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {value.trim().length > 0
            ? 'In de les zelf wordt dit vanzelf bewaard en als notitie opgeslagen.'
            : 'In de les zelf wordt dit vanzelf bewaard; hier in het ontwerpvoorbeeld niet.'}
        </p>
      </div>
    </section>
  );
}

export function QuizStep({ lesson, position }: { lesson: RustLessonPayload; position: number }) {
  const count = lesson.quiz.questionCount;
  return (
    <section className={MEASURE}>
      <StepLabel position={position} total={lesson.steps.length} name="Toetsing" />
      <StepTitle>
        <span className="tabular-nums">{count}</span> korte vragen over {lesson.reference}
      </StepTitle>

      <p className="mt-6 text-[16px] leading-[1.8] text-foreground/85">
        De vragen gaan alleen over het gedeelte dat je net gelezen hebt. Er is geen tijdslimiet en
        een fout antwoord kost je niets.
      </p>

      <ol className="mt-10 border-t border-border">
        {Array.from({ length: count }, (unused, index) => (
          <li
            key={index}
            className="flex items-baseline gap-4 border-b border-border py-3.5 text-[14px] text-muted-foreground"
          >
            <span className="w-4 flex-none tabular-nums" aria-hidden>
              {index + 1}
            </span>
            <span>Vraag {index + 1}</span>
          </li>
        ))}
      </ol>

      <PreviewNote>
        In dit ontwerpvoorbeeld staan de vragen zelf niet klaar; de les haalt ze op uit de
        bijbelquiz.
      </PreviewNote>
    </section>
  );
}

/**
 * The close.
 *
 * One sentence about what you just did, and one named next action. No meters,
 * no confetti, no score: the research is clear that a fixed celebration every
 * session stops registering, and this variant declines to spend anything here
 * that the sentence does not already buy.
 */
export function CloseStep({
  lesson,
  wroteReflection,
  href,
  onBack,
}: {
  lesson: RustLessonPayload;
  wroteReflection: boolean;
  /** Where the named next action goes. */
  href: string;
  onBack: () => void;
}) {
  const sentence = wroteReflection
    ? `Je hebt ${lesson.reference} gelezen, de uitleg doorgenomen en je antwoord opgeschreven.`
    : `Je hebt ${lesson.reference} gelezen en de uitleg doorgenomen.`;

  return (
    <section className="max-w-[52ch]">
      <Eyebrow>
        <span className="tabular-nums">
          Les {lesson.day} van {lesson.lessonsTotal}
        </span>
        <span aria-hidden> &middot; </span>
        afgerond
      </Eyebrow>

      <h2 className="mt-4 font-serif text-[26px] font-normal leading-[1.35] text-foreground sm:text-[30px]">
        {sentence}
      </h2>

      <div className="mt-10 border-t border-border pt-6">
        <Link
          href={href}
          className="group inline-flex items-baseline gap-2 text-[17px] font-semibold no-underline"
          style={{ color: TEAL }}
        >
          {lesson.next ? (
            <>
              <span className="tabular-nums">Les {lesson.next.day}:</span>
              <span className="font-serif font-normal decoration-1 underline-offset-[5px] group-hover:underline">
                {lesson.next.title}
              </span>
            </>
          ) : (
            <span>Terug naar de inhoud van deze studie</span>
          )}
        </Link>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {lesson.next
            ? 'De volgende les staat klaar wanneer je wilt. Er zit geen klok op.'
            : 'Dit was de laatste les van deze studie.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-10 text-[13px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        Terug naar de laatste stap
      </button>
    </section>
  );
}
