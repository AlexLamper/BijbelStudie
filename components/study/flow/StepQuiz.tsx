'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, HelpCircle, Trophy, X } from 'lucide-react';

const TEAL = '#0D9488';
const RED = '#DC2626';

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

/**
 * Step 5. A short quiz from bijbelquiz.com.
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
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<GradedAnswer[] | null>(null);
  const [score, setScore] = useState<number | null>(previousScore);
  const [total, setTotal] = useState<number | null>(previousTotal);
  const [submitting, setSubmitting] = useState(false);

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

  const submit = useCallback(async () => {
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
            answerId: chosen[question.id] ?? null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      setGraded(data.results ?? []);
      setScore(data.score ?? 0);
      setTotal(data.total ?? questions.length);
      onAnswered(data.score ?? 0, data.total ?? questions.length);
    } finally {
      setSubmitting(false);
    }
  }, [questions, chosen, studyId, lessonDay, onAnswered]);

  if (questions === null) {
    return (
      <div className="h-full overflow-y-auto"><div className="max-w-2xl mx-auto px-6 sm:px-10 py-10 space-y-3" role="status" aria-label="Quiz laden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse bg-gray-100 dark:bg-secondary" />
        ))}
      </div></div>
    );
  }

  // No questions for this passage. A complete, calm ending - not an error.
  if (questions.length === 0) {
    return (
      <div className="h-full overflow-y-auto"><div className="max-w-2xl mx-auto px-6 sm:px-10 py-12 text-center">
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
      </div></div>
    );
  }

  const gradedById = new Map((graded ?? []).map((entry) => [entry.id, entry]));
  const allAnswered = questions.every((question) => chosen[question.id]);

  return (
    <div className="h-full overflow-y-auto"><div className="max-w-2xl mx-auto px-6 sm:px-10 py-8 sm:py-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy size={14} style={{ color: TEAL }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
            Toetsing
          </span>
        </div>
        {score !== null && total !== null && (
          <span className="text-sm font-bold" style={{ color: TEAL }}>
            {score} / {total}
          </span>
        )}
      </div>

      <div className="space-y-5">
        {questions.map((question, index) => {
          const result = gradedById.get(question.id);
          const picked = chosen[question.id];

          return (
            <fieldset
              key={question.id}
              className="rounded-xl border border-gray-200 dark:border-border p-4 sm:p-5"
            >
              <legend className="sr-only">Vraag {index + 1}</legend>
              <p className="text-[15px] font-semibold text-foreground mb-3 leading-snug">
                {index + 1}. {question.text}
              </p>

              <div className="space-y-2">
                {question.answers.map((answer) => {
                  const isPicked = picked === answer.id;
                  const isCorrectOne = result?.correctAnswerId === answer.id;
                  const isWrongPick = !!result && isPicked && !result.correct;

                  let style: React.CSSProperties | undefined;
                  if (isCorrectOne) {
                    style = { borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.07)' };
                  } else if (isWrongPick) {
                    style = { borderColor: RED, backgroundColor: 'rgba(220,38,38,0.06)' };
                  } else if (isPicked) {
                    style = { borderColor: TEAL };
                  }

                  return (
                    <label
                      key={answer.id}
                      className={[
                        'flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                        graded ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-secondary',
                        !style ? 'border-gray-200 dark:border-border' : '',
                      ].join(' ')}
                      style={style}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={answer.id}
                        checked={isPicked}
                        disabled={!!graded}
                        onChange={() =>
                          setChosen((current) => ({ ...current, [question.id]: answer.id }))
                        }
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className="h-4 w-4 rounded-full border flex-none flex items-center justify-center"
                        style={{ borderColor: isPicked || isCorrectOne ? TEAL : undefined }}
                      >
                        {isCorrectOne && <Check size={11} style={{ color: TEAL }} />}
                        {isWrongPick && <X size={11} style={{ color: RED }} />}
                        {!result && isPicked && (
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEAL }} />
                        )}
                      </span>
                      <span className="text-foreground">{answer.text}</span>
                    </label>
                  );
                })}
              </div>

              {/* Released only after grading - an explanation gives the answer away. */}
              {result?.explanation && (
                <p className="mt-3 text-sm text-gray-600 dark:text-muted-foreground leading-relaxed border-t border-gray-200 dark:border-border pt-3">
                  {result.explanation}
                  {question.bibleReference && (
                    <span className="block mt-1 text-xs font-medium" style={{ color: TEAL }}>
                      {question.bibleReference}
                    </span>
                  )}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>

      {!graded && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!allAnswered || submitting}
          data-track="study_quiz_submit"
          className="mt-6 w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: TEAL }}
        >
          {submitting ? 'Nakijken...' : 'Nakijken'}
        </button>
      )}

      {graded && (
        <p className="mt-5 text-sm text-gray-500 dark:text-muted-foreground">
          Je mag de les afronden, ook als niet alles goed was.
        </p>
      )}
    </div></div>
  );
}
