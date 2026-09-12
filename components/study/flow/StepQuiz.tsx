'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react';

import LessonLayout, {
  FOCUS_RING,
  INK,
  INK_FAINT,
  INK_MUTED,
  Marginal,
  SURFACE,
} from './lesson-layout';
import PromptCard from '../../feedback/PromptCard';
import type { SerialisedPrompt } from '../../../lib/feedbackPrompts';

/**
 * Wrong, on the night ground.
 *
 * #DC2626 is the fill under the white cross; as TYPE or as a keyline on this
 * window it is too dark to read, so #F87171 (6.7:1 on the scene ground) carries the
 * outline of a wrong answer. Same swatch, the end the ground can hold.
 */
const RED = '#DC2626';
const RED_ON_DARK = '#F87171';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Reason chips for "Nee" on the per-question signal - the complete diagnostic
 * vocabulary for a multiple-choice question (FEEDBACK_PLAN.md section 3.2). */
const REASON_CHIPS: { key: string; label: string }[] = [
  { key: 'too_hard', label: 'Te moeilijk' },
  { key: 'unclear', label: 'Onduidelijk' },
  { key: 'multiple_correct', label: 'Meerdere goede antwoorden' },
  { key: 'not_related', label: 'Niet gerelateerd aan de tekst' },
  { key: 'wrong_answer', label: 'Fout antwoord' },
];

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
  eyebrow,
  passageReference,
  reflectionQuestion,
  guest = false,
}: {
  studyId: string;
  lessonDay: number;
  /**
   * No session. The quiz is generated, stored and graded per reader on the
   * server, so a guest gets an explanation instead of a 401, and the step is
   * still a complete step they can finish the lesson from.
   */
  guest?: boolean;
  previousScore: number | null;
  previousTotal: number | null;
  onAnswered: (score: number, total: number) => void;
  eyebrow?: string;
  passageReference?: string;
  reflectionQuestion?: string | null;
}) {
  /**
   * The per-question "was deze vraag duidelijk?" micro-signal
   * (FEEDBACK_PLAN.md section 3.2, T2a). One tap, no modal, no eligibility
   * engine - that is phase 2. Tracked per question id so a reader cannot
   * double-submit by paging back and forth in review.
   */
  const [signalSent, setSignalSent] = useState<Record<string, boolean>>({});
  const [signalOpenReasonFor, setSignalOpenReasonFor] = useState<string | null>(null);
  const [signalSending, setSignalSending] = useState<string | null>(null);

  const sendQuizSignal = useCallback(
    async (questionId: string, clear: boolean, reasonTag: string | null, answeredCorrectly: boolean | null) => {
      setSignalSending(questionId);
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touchpoint: 'quiz_question_review',
            quizQuestionId: questionId,
            studyId,
            lessonDay,
            answeredCorrectly,
            clear,
            reasonTag: reasonTag ?? undefined,
          }),
        }).catch(() => {});
      } finally {
        setSignalSent((prev) => ({ ...prev, [questionId]: true }));
        setSignalOpenReasonFor(null);
        setSignalSending(null);
      }
    },
    [studyId, lessonDay],
  );
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

  /**
   * T2b - one question after the quiz, asked at most once and only when the
   * fatigue budget allows it (FEEDBACK_PLAN.md 3.2). "Ging deze quiz over wat
   * je net gelezen had?" is the reader's-side check on the passage matching in
   * lib/data/study-lessons: a run of "Nee" on one lesson means that lesson's
   * quiz slugs are wrong, which is a five-minute fix nobody would otherwise
   * find. Requested only once the reader has walked the whole review, because
   * asking before they have seen the questions asks them to guess.
   */
  const [quizPrompt, setQuizPrompt] = useState<SerialisedPrompt | null>(null);
  const [quizPromptAsked, setQuizPromptAsked] = useState(false);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  /** Set between picking an answer and the card moving on, to freeze the card. */
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Nothing to fetch for a guest: the endpoint is account-bound and the
    // answer would be a 401. The empty list plus the reason renders the calm
    // "no quiz" ending below, worded for a guest.
    if (guest) {
      setQuestions([]);
      setUnavailable('GUEST');
      return;
    }

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
  }, [studyId, lessonDay, guest]);

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

  // Asked once the reader has reached the end of the review, and only for a
  // signed-in reader: there is nobody to attribute a guest's answer to, and
  // /api/feedback/next would answer 401.
  useEffect(() => {
    if (guest || quizPromptAsked) return;
    if (!graded || !questions || index < questions.length - 1) return;
    setQuizPromptAsked(true);
    fetch(
      `/api/feedback/next?touchpoint=quiz_complete&studyId=${encodeURIComponent(studyId)}&day=${lessonDay}&path=/studie`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.prompt) setQuizPrompt(data.prompt as SerialisedPrompt);
      })
      .catch(() => {});
  }, [guest, quizPromptAsked, graded, questions, index, studyId, lessonDay]);

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

  /** The margin, identical whatever state the quiz is in. */
  const aside =
    passageReference || reflectionQuestion ? (
      <Marginal label="Deze les">
        <dl className="space-y-2">
          {passageReference ? (
            <div>
              <dt className={`font-semibold ${INK}`}>Gedeelte</dt>
              <dd className="tabular-nums">{passageReference}</dd>
            </div>
          ) : null}
          {reflectionQuestion ? (
            <div>
              <dt className={`font-semibold ${INK}`}>Vraag</dt>
              <dd className="italic">{reflectionQuestion}</dd>
            </div>
          ) : null}
        </dl>
      </Marginal>
    ) : null;

  if (questions === null) {
    return (
      <LessonLayout eyebrow={eyebrow ?? 'Toetsing'} heading="Wat bleef er hangen?" aside={aside}>
        <div className="mt-6 space-y-3" role="status" aria-label="Quiz laden">
          <div className="skeleton-pulse h-6 w-32 rounded-lg bg-les-card" />
          <div className="skeleton-pulse h-40 rounded-2xl bg-les-card" />
        </div>
      </LessonLayout>
    );
  }

  // No questions for this passage. A complete, calm ending - not an error.
  if (questions.length === 0) {
    return (
      // Typographic, not iconographic: a question mark in a tinted disc is
      // decoration, and the heading already says what this is.
      <LessonLayout
        eyebrow={eyebrow ?? 'Toetsing'}
        heading={
          unavailable === 'GUEST' ? 'De toets hoort bij een account' : 'Geen quiz voor dit gedeelte'
        }
        aside={aside}
        lead={
          unavailable === 'GUEST'
            ? 'De vragen worden per lezer bewaard en nagekeken, en dat vraagt een account. Je kunt de les gewoon afronden; aan het einde kun je je voortgang bewaren.'
            : unavailable === 'UNAVAILABLE'
              ? 'De quizvragen zijn nu even niet op te halen. Je kunt de les gewoon afronden.'
              : 'Voor dit bijbelgedeelte zijn nog geen vragen beschikbaar. Rond de les af om verder te gaan.'
        }
      />
    );
  }

  const gradedById = new Map((graded ?? []).map((entry) => [entry.id, entry]));
  const question = questions[index];
  const result = gradedById.get(question.id);
  const picked = chosen[question.id];
  const reviewing = !!graded || finishedEarlier;

  const variants = reduceMotion ? calmVariants : cardVariants;

  return (
    <LessonLayout eyebrow={eyebrow ?? 'Toetsing'} heading="Wat bleef er hangen?" aside={aside} measure={660} padTop={30}>
      <div className="mt-6">
        {/* Where you are, in one line and one row of dots. During review the
            dots turn into the result, so the score is readable at a glance
            before any explanation is. */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className={`text-[11px] font-semibold uppercase tracking-[1.1px] ${INK_FAINT}`}>
            {reviewing
              ? finishedEarlier && !graded
                ? 'Eerder gemaakt'
                : 'Nagekeken'
              : `Vraag ${index + 1} van ${questions.length}`}
          </p>
          {reviewing && score !== null && total !== null && (
            <p className="text-[13px] font-bold text-les-accent">
              {score} van {total} goed
            </p>
          )}
        </div>

        <div className="mb-7 flex items-center gap-[6px]" aria-hidden>
          {questions.map((entry, entryIndex) => {
            const entryResult = gradedById.get(entry.id);
            const isHere = entryIndex === index;
            const answered = !!chosen[entry.id];

            let background = 'var(--les-line)';
            if (entryResult) background = entryResult.correct ? 'var(--teal)' : RED;
            else if (answered || entryIndex < index) background = 'var(--teal)';

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
                className={`h-1 flex-1 rounded-full transition-all ${FOCUS_RING}`}
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
            <h2 className={`text-xl sm:text-2xl font-bold leading-snug mb-6 ${INK}`}>
              {question.text}
            </h2>

            <div className="space-y-2.5" role="group" aria-label="Antwoorden">
              {question.answers.map((answer, answerIndex) => {
                const isPicked = picked === answer.id;
                const isCorrectOne = result?.correctAnswerId === answer.id;
                const isWrongPick = !!result && isPicked && !result.correct;

                // Deeper washes than the light card carried: 7% teal is a
                // visible tint on white and nothing at all on the scene ground.
                // The design's chosen state: a 1 px teal frame on a 6 % teal
                // wash. Both read on the white page and on the night one.
                let frame: React.CSSProperties | undefined;
                if (isCorrectOne) {
                  frame = { borderColor: 'var(--teal)', backgroundColor: 'rgba(13,148,136,0.10)' };
                } else if (isWrongPick) {
                  frame = { borderColor: RED_ON_DARK, backgroundColor: 'rgba(248,113,113,0.12)' };
                } else if (isPicked) {
                  frame = { borderColor: 'var(--teal)', backgroundColor: 'rgba(13,148,136,0.06)' };
                }

                return (
                  <button
                    key={answer.id}
                    type="button"
                    disabled={reviewing || advancing}
                    onClick={() => choose(question.id, answer.id)}
                    aria-pressed={isPicked}
                    className={[
                      'flex w-full items-center gap-[14px] rounded-[12px] border px-[17px] py-[15px] text-left transition-all duration-200',
                      FOCUS_RING,
                      !frame ? 'border-les-card-line bg-les-card' : '',
                      reviewing || advancing
                        ? 'cursor-default'
                        : 'press hover:border-les-line',
                    ].join(' ')}
                    style={frame}
                  >
                    <span
                      aria-hidden
                      className={[
                        'flex h-7 w-7 flex-none items-center justify-center rounded-[8px] text-[12px] font-bold transition-colors',
                        isPicked || isCorrectOne
                          ? 'text-white'
                          : `bg-les-input ${INK_FAINT}`,
                      ].join(' ')}
                      // The brand fill under the white letter. It is the same
                      // #0D9488 in both lesson palettes - fills never move.
                      style={
                        isWrongPick
                          ? { backgroundColor: RED }
                          : isCorrectOne || isPicked
                            ? { backgroundColor: 'var(--teal)' }
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
                    <span className={`text-[14.5px] leading-snug ${isPicked || isCorrectOne ? 'font-semibold' : ''} ${INK}`}>{answer.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Released only after grading - an explanation gives the answer away. */}
            {result?.explanation && (
              <div className={`mt-5 ${SURFACE} p-4`}>
                <p className={`text-[13.5px] leading-relaxed ${INK_MUTED}`}>{result.explanation}</p>
                {question.bibleReference && (
                  <p className="mt-1.5 text-[12px] font-semibold text-les-accent">
                    {question.bibleReference}
                  </p>
                )}
              </div>
            )}

            {/* The micro-signal - only once graded this session, so there is a
                fresh `result` to attach `answeredCorrectly` to. */}
            {result && (
              <div className="mt-4 flex items-center justify-end gap-2.5 flex-wrap">
                {signalSent[question.id] ? (
                  <p className="text-[12px] text-gray-400 dark:text-muted-foreground">Bedankt voor je reactie</p>
                ) : signalOpenReasonFor === question.id ? (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-[12px] text-gray-500 dark:text-muted-foreground mr-1">Wat klopte er niet?</span>
                    {REASON_CHIPS.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        disabled={signalSending === question.id}
                        onClick={() => void sendQuizSignal(question.id, false, chip.key, result.correct)}
                        className="press h-7 px-2.5 rounded-full border border-gray-200 dark:border-border text-[11.5px] text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <span className="text-[12px] text-gray-500 dark:text-muted-foreground">Was deze vraag duidelijk?</span>
                    <button
                      type="button"
                      disabled={signalSending === question.id}
                      onClick={() => void sendQuizSignal(question.id, true, null, result.correct)}
                      className="press h-7 px-3 rounded-full border border-gray-200 dark:border-border text-[11.5px] font-semibold text-gray-700 dark:text-foreground hover:bg-gray-50 dark:hover:bg-secondary"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      disabled={signalSending === question.id}
                      onClick={() => setSignalOpenReasonFor(question.id)}
                      className="press h-7 px-3 rounded-full border border-gray-200 dark:border-border text-[11.5px] font-semibold text-gray-700 dark:text-foreground hover:bg-gray-50 dark:hover:bg-secondary"
                    >
                      Nee
                    </button>
                  </>
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
              FOCUS_RING,
              index === 0
                ? 'text-transparent pointer-events-none'
                : `${INK_FAINT} hover:bg-les-card hover:text-les-ink`,
            ].join(' ')}
          >
            <ArrowLeft size={14} /> Vorige
          </button>

          {submitting && <span className={`text-[13px] ${INK_FAINT}`}>Nakijken...</span>}

          {reviewing && index < questions.length - 1 && (
            <button
              type="button"
              onClick={() => {
                setDirection(1);
                setIndex((current) => current + 1);
              }}
              className="press inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ backgroundColor: 'var(--teal)' }}
            >
              Volgende vraag
            </button>
          )}

          {reviewing && (index === questions.length - 1 || (finishedEarlier && !graded)) && (
            <button
              type="button"
              onClick={retry}
              data-track="study_quiz_retry"
              className={`press inline-flex h-9 items-center gap-1.5 rounded-lg border border-les-card-line px-3 text-[13px] font-semibold ${INK} hover:bg-les-card ${FOCUS_RING}`}
            >
              <RotateCcw size={14} /> Opnieuw proberen
            </button>
          )}
        </div>

        {quizPrompt && (
          <PromptCard
            prompt={quizPrompt}
            context={{ studyId, lessonDay, stepKey: 'quiz', path: `/studie/${studyId}/${lessonDay}` }}
          />
        )}

        {reviewing && (
          <p className={`mt-4 text-[13px] ${INK_MUTED}`}>
            {finishedEarlier && !graded
              ? 'Je hebt deze quiz eerder gemaakt. Doe hem opnieuw voor de uitleg bij elk antwoord, of rond de les af.'
              : 'Je mag de les afronden, ook als niet alles goed was.'}
          </p>
        )}
      </div>
    </LessonLayout>
  );
}
