'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, HelpCircle, RotateCcw, X } from 'lucide-react';

const TEAL = '#0D9488';
const RED = '#DC2626';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface Question {
  id: string;
  text: string;
  answers: { id: string; text: string }[];
  bibleReference: string | null;
}

interface GradedAnswer {
  id: string;
  correct: boolean;
  correctAnswerId: string | null;
  explanation: string | null;
}

/** One card in, one card out - the same swipe vocabulary as the step flow. */
const cardVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 48, y: 8, scale: 0.985 }),
  center: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -48, y: -8, scale: 0.985 }),
};

const calmVariants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

/**
 * Step 5. A short quiz from bijbelquiz.com, one question at a time.
 *
 * It used to be every question stacked in one scrolling form with a "Nakijken"
 * button at the bottom. That is a web form, and it broke the spell the rest of
 * the lesson builds: five bordered fieldsets at once say "fill this in", where
 * one question filling the frame says "answer me".
 *
 * So: one card, a dot per question, an answer picked by clicking the whole
 * option, and the card moves on by itself a beat later. The beat matters - it is
 * long enough to see the choice register and short enough that it never feels
 * like waiting. `Vorige` walks back if the click was a mistake.
 *
 * Grading is still one request at the end, because that is the API's contract
 * and because per-question feedback mid-quiz would turn a short recall check
 * into a test. Afterwards the same cards are re-walked in review, now showing
 * what was right and why.
 *
 * The empty state is the important one, not the afterthought: whether the
 * question bank has anything for a given passage is unknown until it is asked,
 * and a lesson on Genesis 15 may simply have no questions. That must read as a
 * normal ending to the lesson, never as an error.
 *
 * Answering is required to finish; answering CORRECTLY is not. A wrong answer
 * blocking someone from completing a devotional would be a product failure.
 */
export default function StepQuiz({
  studyId,
  lessonDay,
  previousScore,
  previousTotal,
  onAnswered,
}: {
  studyId: string;
  lessonDay: number;
  previousScore: number | null;
  previousTotal: number | null;
  onAnswered: (score: number, total: number) => void;
}) {
  const reduceMotion = useReducedMotion();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<GradedAnswer[] | null>(null);
  const [score, setScore] = useState<number | null>(previousScore);
  const [total, setTotal] = useState<number | null>(previousTotal);
  const [submitting, setSubmitting] = useState(false);
  /**
   * True when the server already has a score for this lesson.
   *
   * The stored answers come back, but the per-question grading - which option
   * was right, and why - only exists in the POST response, and re-posting to get
   * it would count as another attempt. So a returning reader sees their result
   * and their own answers, and gets the explanations by choosing to redo it.
   */
  const [finishedEarlier, setFinishedEarlier] = useState(false);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  /** Set between picking an answer and the card moving on, to freeze the card. */
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/v1/study-quiz?studyId=${encodeURIComponent(studyId)}&day=${lessonDay}`,
        );
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data?.available) {
          setUnavailable(data?.reason ?? 'UNAVAILABLE');
          setQuestions([]);
          return;
        }
        setQuestions(data.questions ?? []);

        // Whatever was already picked in this lesson. Without it, stepping back
        // to the passage and returning emptied the quiz, and a refresh after
        // grading restarted at question one - where answering again would
        // increment `attempts` for a quiz that was already finished.
        const saved = Array.isArray(data.savedAnswers) ? data.savedAnswers : [];
        if (saved.length > 0) {
          setChosen(
            Object.fromEntries(
              saved.map((entry: { questionId: string; answerId: string }) => [
                entry.questionId,
                entry.answerId,
              ]),
            ),
          );
        }
        if (typeof data.savedScore === 'number') {
          setScore(data.savedScore);
          setTotal(typeof data.savedTotal === 'number' ? data.savedTotal : null);
          setFinishedEarlier(true);
        }
      } catch {
        if (!cancelled) {
          setUnavailable('UNAVAILABLE');
          setQuestions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studyId, lessonDay]);

  const submit = useCallback(
    async (answers: Record<string, string>) => {
      if (!questions || questions.length === 0) return;
      setSubmitting(true);
      try {
        const res = await fetch('/api/v1/study-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyId,
            lessonDay,
            answers: questions.map((question) => ({
              id: question.id,
              answerId: answers[question.id] ?? null,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) return;

        setGraded(data.results ?? []);
        setScore(data.score ?? 0);
        setTotal(data.total ?? questions.length);
        setIndex(0);
        setDirection(1);
        onAnswered(data.score ?? 0, data.total ?? questions.length);
      } finally {
        setSubmitting(false);
        setAdvancing(false);
      }
    },
    [questions, studyId, lessonDay, onAnswered],
  );

  /**
   * Pick an answer, then move on by itself.
   *
   * The next answers map is passed straight to `submit` rather than read back
   * from state: on the last question the request goes out in the same tick as
   * the state update, and the setter's value would not be visible yet.
   */
  const choose = useCallback(
    (questionId: string, answerId: string) => {
      if (!questions || graded || finishedEarlier || advancing) return;
      const next = { ...chosen, [questionId]: answerId };
      setChosen(next);
      setAdvancing(true);
      setDirection(1);

      // Every pick, not just the finished set. PUT rather than POST: this must
      // never touch the grader, the score or the attempt counter.
      void fetch('/api/v1/study-quiz', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId,
          lessonDay,
          answers: Object.entries(next).map(([id, chosenId]) => ({ id, answerId: chosenId })),
        }),
      }).catch(() => {});

      const isLastQuestion = index === questions.length - 1;
      window.setTimeout(
        () => {
          if (isLastQuestion) {
            void submit(next);
            return;
          }
          setIndex((current) => current + 1);
          setAdvancing(false);
        },
        reduceMotion ? 120 : 340,
      );
    },
    [
      questions,
      graded,
      finishedEarlier,
      advancing,
      chosen,
      index,
      submit,
      reduceMotion,
      studyId,
      lessonDay,
    ],
  );

  const back = useCallback(() => {
    if (index === 0) return;
    setDirection(-1);
    setIndex((current) => current - 1);
  }, [index]);

  const retry = useCallback(() => {
    setGraded(null);
    setChosen({});
    setIndex(0);
    setDirection(1);
    setFinishedEarlier(false);
  }, []);

  if (questions === null) {
    return (
      <div className="h-full overflow-y-auto">
        <div
          className="max-w-2xl mx-auto px-6 sm:px-10 py-10 space-y-3"
          role="status"
          aria-label="Quiz laden"
        >
          <div className="h-6 w-32 rounded-lg skeleton-pulse bg-gray-100 dark:bg-secondary" />
          <div className="h-40 rounded-2xl skeleton-pulse bg-gray-100 dark:bg-secondary" />
        </div>
      </div>
    );
  }

  // No questions for this passage. A complete, calm ending - not an error.
  if (questions.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12 text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(13,148,136,0.1)' }}
          >
            <HelpCircle size={20} style={{ color: TEAL }} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1.5">Geen quiz voor dit gedeelte</h2>
          <p className="text-sm text-gray-500 dark:text-muted-foreground max-w-sm mx-auto">
            {unavailable === 'UNAVAILABLE'
              ? 'De quizvragen zijn nu even niet op te halen. Je kunt de les gewoon afronden.'
              : 'Voor dit bijbelgedeelte zijn nog geen vragen beschikbaar. Rond de les af om verder te gaan.'}
          </p>
        </div>
      </div>
    );
  }

  const gradedById = new Map((graded ?? []).map((entry) => [entry.id, entry]));
  const question = questions[index];
  const result = gradedById.get(question.id);
  const picked = chosen[question.id];
  const reviewing = !!graded || finishedEarlier;
  const variants = reduceMotion ? calmVariants : cardVariants;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-5 sm:px-10 py-8 sm:py-12">
        {/* Where you are, in one line and one row of dots. During review the
            dots turn into the result, so the score is readable at a glance
            before any explanation is. */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-400 dark:text-muted-foreground">
            {reviewing
              ? finishedEarlier && !graded
                ? 'Eerder gemaakt'
                : 'Nagekeken'
              : `Vraag ${index + 1} van ${questions.length}`}
          </p>
          {reviewing && score !== null && total !== null && (
            <p className="text-[13px] font-bold" style={{ color: TEAL }}>
              {score} van {total} goed
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-7" aria-hidden>
          {questions.map((entry, entryIndex) => {
            const entryResult = gradedById.get(entry.id);
            const isHere = entryIndex === index;
            const answered = !!chosen[entry.id];

            let background = 'rgba(148,163,184,0.35)';
            if (entryResult) background = entryResult.correct ? TEAL : RED;
            else if (answered || entryIndex < index) background = TEAL;

            return (
              <button
                key={entry.id}
                type="button"
                aria-label={`Vraag ${entryIndex + 1}`}
                onClick={() => {
                  if (!reviewing && entryIndex > index) return;
                  setDirection(entryIndex >= index ? 1 : -1);
                  setIndex(entryIndex);
                }}
                className="flex-1 h-1.5 rounded-full transition-all"
                style={{ background, opacity: isHere ? 1 : 0.55 }}
              />
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.14 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug mb-6">
              {question.text}
            </h2>

            <div className="space-y-2.5" role="group" aria-label="Antwoorden">
              {question.answers.map((answer, answerIndex) => {
                const isPicked = picked === answer.id;
                const isCorrectOne = result?.correctAnswerId === answer.id;
                const isWrongPick = !!result && isPicked && !result.correct;

                let frame: React.CSSProperties | undefined;
                if (isCorrectOne) {
                  frame = { borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.07)' };
                } else if (isWrongPick) {
                  frame = { borderColor: RED, backgroundColor: 'rgba(220,38,38,0.06)' };
                } else if (isPicked) {
                  frame = { borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.06)' };
                }

                return (
                  <button
                    key={answer.id}
                    type="button"
                    disabled={reviewing || advancing}
                    onClick={() => choose(question.id, answer.id)}
                    aria-pressed={isPicked}
                    className={[
                      'w-full flex items-center gap-3.5 rounded-xl border p-3.5 sm:p-4 text-left transition-all duration-200',
                      !frame ? 'border-gray-200 dark:border-border' : '',
                      reviewing || advancing
                        ? 'cursor-default'
                        : 'press hover:border-gray-300 dark:hover:border-muted-foreground/40 hover:bg-gray-50 dark:hover:bg-secondary',
                    ].join(' ')}
                    style={frame}
                  >
                    <span
                      aria-hidden
                      className={[
                        'h-8 w-8 flex-none rounded-lg border flex items-center justify-center text-[12px] font-bold transition-colors',
                        isPicked || isCorrectOne
                          ? 'border-transparent text-white'
                          : 'border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground',
                      ].join(' ')}
                      style={
                        isWrongPick
                          ? { backgroundColor: RED }
                          : isCorrectOne || isPicked
                            ? { backgroundColor: TEAL }
                            : undefined
                      }
                    >
                      {isCorrectOne ? (
                        <Check size={14} />
                      ) : isWrongPick ? (
                        <X size={14} />
                      ) : (
                        (LETTERS[answerIndex] ?? answerIndex + 1)
                      )}
                    </span>
                    <span className="text-[14.5px] text-foreground leading-snug">{answer.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Released only after grading - an explanation gives the answer away. */}
            {result?.explanation && (
              <div className="mt-5 rounded-xl border border-gray-200 dark:border-border bg-gray-50/70 dark:bg-card/60 p-4">
                <p className="text-[13.5px] text-gray-600 dark:text-muted-foreground leading-relaxed">
                  {result.explanation}
                </p>
                {question.bibleReference && (
                  <p className="mt-1.5 text-[12px] font-semibold" style={{ color: TEAL }}>
                    {question.bibleReference}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* One row of controls, and never more than the moment needs. */}
        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={index === 0}
            className={[
              'press inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors',
              index === 0
                ? 'text-transparent pointer-events-none'
                : 'text-gray-500 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-foreground',
            ].join(' ')}
          >
            <ArrowLeft size={14} /> Vorige
          </button>

          {submitting && (
            <span className="text-[13px] text-gray-500 dark:text-muted-foreground">
              Nakijken...
            </span>
          )}

          {reviewing && index < questions.length - 1 && (
            <button
              type="button"
              onClick={() => {
                setDirection(1);
                setIndex((current) => current + 1);
              }}
              className="press inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              Volgende vraag
            </button>
          )}

          {reviewing && (index === questions.length - 1 || (finishedEarlier && !graded)) && (
            <button
              type="button"
              onClick={retry}
              data-track="study_quiz_retry"
              className="press inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-border text-[13px] font-semibold text-foreground hover:bg-gray-50 dark:hover:bg-secondary"
            >
              <RotateCcw size={14} /> Opnieuw proberen
            </button>
          )}
        </div>

        {reviewing && (
          <p className="mt-4 text-[13px] text-gray-500 dark:text-muted-foreground">
            {finishedEarlier && !graded
              ? 'Je hebt deze quiz eerder gemaakt. Doe hem opnieuw voor de uitleg bij elk antwoord, of rond de les af.'
              : 'Je mag de les afronden, ook als niet alles goed was.'}
          </p>
        )}
      </div>
    </div>
  );
}
