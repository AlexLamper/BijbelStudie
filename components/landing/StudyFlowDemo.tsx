'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Eye,
  Images,
  Landmark,
  Languages,
  ListChecks,
  Pause,
  PenLine,
  Play,
  Send,
  StickyNote,
  X,
} from 'lucide-react';
import TreeCanvas from '../levensboom/TreeCanvas';

const TEAL = '#0D9488';
const TEAL_TEXT = '#0F766E';
const TEXT = '#111827';
const MUTED = '#4B5563';
const FAINT = '#9CA3AF';
const BORDER = '#E5E7EB';

/** Everything the demo shows. Built on the server from the real lesson data. */
export type DemoLesson = {
  studyTitle: string;
  lessonsTotal: number;
  lesson: { day: number; title: string; reference: string; minutes: number };
  intro: { headline: string; body: string[]; watchFor: string[] };
  readingCue: string;
  translation: string;
  verses: { n: number; text: string }[];
  depth: { body: string[]; terms: { term: string; meaning: string }[] };
  greek: { word: string; translit: string; meaning: string; strong: string }[];
  reflection: { question: string; prompts: string[]; placeholder: string; sample: string };
  quiz: { question: string; answers: string[]; correct: number };
  xp: number;
  nextLesson: { day: number; title: string; reference: string } | null;
  tree: { svg: string; seed: string; level: number; species: string };
};

type FrameKey = 'intro' | 'word' | 'depth' | 'reflection' | 'quiz' | 'done';

/** The five steps of a lesson, in the order the flow runs them, plus the reward. */
const FRAMES: FrameKey[] = ['intro', 'word', 'depth', 'reflection', 'quiz', 'done'];
const STEPS = FRAMES.slice(0, 5);

const STEP_LABEL: Record<FrameKey, string> = {
  intro: 'Intro',
  word: 'Het Woord',
  depth: 'Verdieping',
  reflection: 'Reflectie',
  quiz: 'Toetsing',
  done: 'Afgerond',
};

/** What each step is for, in the list beside the frame. */
const STEP_BLURB: Record<FrameKey, string> = {
  intro: 'Waar gaat dit gedeelte over, en waar let je op tijdens het lezen?',
  word: 'Het bijbelgedeelte zelf, in de vertaling die jij kiest.',
  depth: 'Commentaar, achtergrond bij het boek en de grondtekst, woord voor woord.',
  reflection: 'Eén vraag voor jou. Je antwoord wordt bewaard als notitie.',
  quiz: 'Een korte quiz, en de les is af.',
  done: 'XP voor je boom, en de volgende les staat klaar.',
};

/** How long each frame stays. The ones with something happening in them get longer. */
const DWELL: Record<FrameKey, number> = {
  intro: 2600,
  word: 2800,
  depth: 3200,
  reflection: 3800,
  quiz: 3000,
  done: 3400,
};

const LETTERS = ['A', 'B', 'C', 'D'];

/* Local keyframes: the landing page ships no animation library, and these
   four are only ever used inside this frame. All of them sit behind the
   reduced-motion query. */
const CSS = `
@keyframes lp-demo-enter { from { opacity: 0; transform: translateX(56px); } to { opacity: 1; transform: none; } }
@keyframes lp-demo-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes lp-demo-caret { 50% { opacity: 0; } }
@keyframes lp-demo-pop { from { transform: scale(0.96); } to { transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  .lp-demo-enter { animation: lp-demo-enter 420ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .lp-demo-bar { animation: lp-demo-bar linear both; transform-origin: left; }
  .lp-demo-caret { animation: lp-demo-caret 1s steps(1) infinite; }
  .lp-demo-pop { animation: lp-demo-pop 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
}
`;

function Eyebrow({ icon: Icon, children }: { icon: typeof Compass; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL }}>
      <Icon size={12} aria-hidden /> {children}
    </p>
  );
}

/* ─── The six frames ─────────────────────────────────────────── */

function IntroFrame({ lesson }: { lesson: DemoLesson }) {
  return (
    <div className="mx-auto max-w-[30rem] px-5 py-5 sm:px-7 sm:py-6">
      <Eyebrow icon={Compass}>{lesson.lesson.title}</Eyebrow>
      <h3 className="mt-2 text-[17px] font-bold leading-snug sm:text-[19px]" style={{ color: TEXT }}>
        {lesson.intro.headline}
      </h3>
      <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: MUTED }}>
        {lesson.intro.body[0]}
      </p>
      <aside
        className="mt-4 rounded-xl border p-3.5"
        style={{ borderColor: 'rgba(13,148,136,0.25)', backgroundColor: 'rgba(13,148,136,0.05)' }}
      >
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>
          <Eye size={12} aria-hidden /> Let hier op
        </p>
        <ul className="space-y-1.5">
          {lesson.intro.watchFor.map((item) => (
            <li key={item} className="flex gap-2 text-[12px] leading-relaxed" style={{ color: TEXT }}>
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: TEAL }} />
              {item}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function WordFrame({ lesson }: { lesson: DemoLesson }) {
  return (
    <div className="mx-auto max-w-[34rem] px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow icon={BookOpen}>Lees eerst het bijbelgedeelte</Eyebrow>
          <h3 className="mt-1.5 text-[17px] font-bold leading-tight sm:text-[19px]" style={{ color: TEXT }}>
            {lesson.lesson.reference}
          </h3>
        </div>
        <span
          className="flex-none rounded-md border bg-white px-2 py-1 text-[11px] font-medium"
          style={{ borderColor: BORDER, color: TEXT }}
        >
          {lesson.translation}
        </span>
      </div>
      <p className="mt-2 text-[12px] italic" style={{ color: MUTED }}>
        {lesson.readingCue}
      </p>
      <div className="mt-4 space-y-2.5 font-serif text-[14px] leading-[1.7]" style={{ color: TEXT }}>
        {lesson.verses.map((verse) => (
          <p key={verse.n}>
            <sup className="mr-1 text-[10px] font-sans font-bold" style={{ color: TEAL }}>
              {verse.n}
            </sup>
            {verse.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function DepthFrame({ lesson }: { lesson: DemoLesson }) {
  const tabs = [
    { key: 'media', label: 'Beeld', icon: Images },
    { key: 'original', label: 'Grondtekst', icon: Languages },
    { key: 'notes', label: 'Notities', icon: StickyNote },
  ];
  return (
    <div className="grid h-full sm:grid-cols-2">
      {/* Left: the explanation of this passage. */}
      <div className="min-w-0 border-b px-5 py-4 sm:border-b-0 sm:border-r sm:px-6 sm:py-5" style={{ borderColor: BORDER }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL }}>
          Toelichting bij dit gedeelte
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: TEXT }}>
          {lesson.depth.body[0]}
        </p>
        <dl className="mt-3 space-y-2">
          {lesson.depth.terms.map((term) => (
            <div key={term.term} className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER }}>
              <dt className="text-[12px] font-bold" style={{ color: TEXT }}>
                {term.term}
              </dt>
              <dd className="mt-0.5 text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
                {term.meaning}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Right: what supports the reading - background, grondtekst, notes, the assistant. */}
      <div className="flex min-w-0 flex-col" style={{ backgroundColor: 'rgba(249,250,251,0.8)' }}>
        <div className="flex items-center gap-2.5 border-b bg-white px-4 py-2.5" style={{ borderColor: BORDER }}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}>
            <Landmark size={13} style={{ color: TEAL }} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold" style={{ color: TEXT }}>
              Achtergrond bij Johannes
            </span>
            <span className="block truncate text-[10.5px]" style={{ color: MUTED }}>
              Wie het schreef, wanneer en waarom
            </span>
          </span>
          <ChevronRight size={13} style={{ color: FAINT }} aria-hidden />
        </div>

        <div className="flex border-b bg-white px-2" style={{ borderColor: BORDER }}>
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = key === 'original';
            return (
              <span
                key={key}
                className="relative inline-flex h-9 items-center gap-1.5 px-2.5 text-[11.5px] font-semibold"
                style={{ color: active ? TEAL : MUTED }}
              >
                <Icon size={12} aria-hidden />
                {label}
                {active && <span aria-hidden className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full" style={{ backgroundColor: TEAL }} />}
              </span>
            );
          })}
        </div>

        <p className="border-b px-4 py-1.5 text-[10.5px]" style={{ borderColor: BORDER, color: MUTED }}>
          Het Grieks van Johannes 20:1, woord voor woord
        </p>

        <div className="flex flex-1 flex-wrap content-start gap-1.5 px-4 py-3">
          {lesson.greek.map((entry) => (
            <div key={entry.strong} className="flex min-w-[64px] flex-col items-center rounded-md bg-white px-2 py-1.5 text-center ring-1 ring-black/5">
              <span lang="grc" className="font-serif text-[16px] leading-tight" style={{ color: TEXT }}>
                {entry.word}
              </span>
              <span className="mt-0.5 text-[9.5px] italic" style={{ color: MUTED }}>
                {entry.translit}
              </span>
              <span className="text-[10.5px] leading-tight" style={{ color: TEXT }}>
                {entry.meaning}
              </span>
              <span className="mt-1 rounded px-1 py-px text-[9px] font-semibold tabular-nums" style={{ backgroundColor: 'rgba(13,148,136,0.10)', color: TEAL_TEXT }}>
                {entry.strong}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t bg-white p-2.5" style={{ borderColor: BORDER }}>
          <span className="flex h-8 flex-1 items-center rounded-lg border px-2.5 text-[11.5px]" style={{ borderColor: BORDER, color: FAINT }}>
            Vraag iets over Johannes 20...
          </span>
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white" style={{ backgroundColor: TEAL }} aria-label="Vraag versturen">
            <Send size={13} aria-hidden />
          </span>
        </div>
      </div>
    </div>
  );
}

function ReflectionFrame({ lesson, reduce }: { lesson: DemoLesson; reduce: boolean }) {
  const sample = lesson.reflection.sample;
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (reduce) {
      setTyped(sample.length);
      return;
    }
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      setTyped(count);
      if (count >= sample.length) window.clearInterval(id);
    }, 26);
    return () => window.clearInterval(id);
  }, [sample, reduce]);

  const finished = typed >= sample.length;

  return (
    <div className="mx-auto max-w-[32rem] px-5 py-5 sm:px-7 sm:py-6">
      <Eyebrow icon={PenLine}>Reflectie</Eyebrow>
      <h3 className="mt-2 text-[15px] font-bold leading-snug sm:text-[16px]" style={{ color: TEXT }}>
        {lesson.reflection.question}
      </h3>
      <ul className="mt-2.5 space-y-1">
        {lesson.reflection.prompts.map((prompt) => (
          <li key={prompt} className="flex gap-2 text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
            <span aria-hidden className="mt-[7px] h-1 w-1 flex-none rounded-full bg-current opacity-50" />
            {prompt}
          </li>
        ))}
      </ul>
      <div className="mt-3 min-h-[4.5rem] rounded-xl border bg-white p-3 text-[12.5px] leading-relaxed" style={{ borderColor: finished ? BORDER : TEAL, color: TEXT }} aria-label="Je reflectie">
        {typed === 0 ? (
          <span style={{ color: FAINT }}>{lesson.reflection.placeholder}</span>
        ) : (
          <>
            {sample.slice(0, typed)}
            {!finished && <span aria-hidden className="lp-demo-caret ml-px inline-block h-[1em] w-[2px] translate-y-[2px]" style={{ backgroundColor: TEAL }} />}
          </>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px]" style={{ color: FAINT }}>
        <span>
          {finished ? (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: TEAL }}>
              <Check size={11} aria-hidden /> Opgeslagen
            </span>
          ) : (
            'Wordt automatisch opgeslagen'
          )}
        </span>
        <span className="tabular-nums">{typed}/8000</span>
      </div>
    </div>
  );
}

function QuizFrame({ lesson, reduce }: { lesson: DemoLesson; reduce: boolean }) {
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (reduce) {
      setPicked(true);
      return;
    }
    const id = window.setTimeout(() => setPicked(true), 1300);
    return () => window.clearTimeout(id);
  }, [reduce]);

  return (
    <div className="mx-auto max-w-[30rem] px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: FAINT }}>
          Vraag 1 van 5
        </p>
      </div>
      <div className="mt-2 flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((dot) => (
          <span key={dot} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: dot === 0 ? TEAL : 'rgba(148,163,184,0.35)' }} />
        ))}
      </div>
      <h3 className="mt-4 text-[15px] font-bold leading-snug sm:text-[16px]" style={{ color: TEXT }}>
        {lesson.quiz.question}
      </h3>
      <div className="mt-3 space-y-1.5" role="group" aria-label="Antwoorden">
        {lesson.quiz.answers.map((answer, index) => {
          const isPick = picked && index === lesson.quiz.correct;
          return (
            <div
              key={answer}
              className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${isPick ? 'lp-demo-pop' : ''}`}
              style={isPick ? { borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.06)' } : { borderColor: BORDER }}
            >
              <span
                className="flex h-6 w-6 flex-none items-center justify-center rounded-md border text-[10.5px] font-bold"
                style={isPick ? { backgroundColor: TEAL, borderColor: 'transparent', color: '#FFFFFF' } : { borderColor: BORDER, color: FAINT }}
              >
                {isPick ? <Check size={12} aria-hidden /> : LETTERS[index]}
              </span>
              <span className="text-[12.5px] leading-snug" style={{ color: TEXT }}>
                {answer}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DoneFrame({ lesson, live, reduce }: { lesson: DemoLesson; live: boolean; reduce: boolean }) {
  const animate = live && !reduce;
  const [xp, setXp] = useState(animate ? 0 : lesson.xp);
  const [reveal, setReveal] = useState(animate ? 0.8 : 1);

  useEffect(() => {
    if (!animate) {
      setXp(lesson.xp);
      setReveal(1);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 1100);
      const eased = 1 - (1 - t) ** 3;
      setXp(Math.round(lesson.xp * eased));
      setReveal(0.8 + 0.2 * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animate, lesson.xp]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-4 text-center sm:px-8">
      <div className="h-[88px] w-[88px] overflow-hidden rounded-full ring-2 ring-teal-600/30">
        {live ? (
          <TreeCanvas
            seed={lesson.tree.seed}
            level={lesson.tree.level}
            frac={0.7}
            species={lesson.tree.species}
            framing="portrait"
            reveal={reveal}
            reducedMotion={reduce}
            className="block h-full w-full"
            ariaLabel="Je boom, met nieuwe blaadjes"
          />
        ) : (
          <div className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full" aria-hidden dangerouslySetInnerHTML={{ __html: lesson.tree.svg }} />
        )}
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL }}>
        Les {lesson.lesson.day} van {lesson.lessonsTotal} afgerond
      </p>
      <h3 className="mt-1 text-[17px] font-bold leading-tight sm:text-[19px]" style={{ color: TEXT }}>
        {lesson.lesson.title}
      </h3>
      <p className="mt-1 text-[11.5px]" style={{ color: MUTED }}>
        {lesson.studyTitle} · {lesson.lesson.reference}
      </p>
      <div className="mt-3 grid w-full max-w-[20rem] grid-cols-3 gap-2">
        {[
          { value: `+${xp} XP`, label: 'voor je boom', accent: true },
          { value: `${lesson.lesson.minutes} min`, label: 'gelezen', accent: false },
          { value: `${lesson.lesson.day}/${lesson.lessonsTotal}`, label: 'lessen', accent: false },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white px-2 py-2" style={{ borderColor: BORDER }}>
            <p className="text-[15px] font-bold leading-none tabular-nums" style={{ color: stat.accent ? TEAL : TEXT }}>
              {stat.value}
            </p>
            <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      {lesson.nextLesson && (
        <p className="mt-3 text-[11.5px]" style={{ color: MUTED }}>
          Hierna: <span className="font-semibold" style={{ color: TEXT }}>les {lesson.nextLesson.day} · {lesson.nextLesson.title}</span> · {lesson.nextLesson.reference}
        </p>
      )}
    </div>
  );
}

/* ─── The frame and its controls ────────────────────────────── */

/**
 * A lesson, playing by itself.
 *
 * A laptop-shaped frame walks through the five steps of one real lesson (les 1
 * van "De opstanding van Jezus"), the way /studie does it: the same header,
 * the same step rail, the same footer, and then the reward screen with the XP
 * landing on the reader's levensboom. It advances every few seconds, pauses
 * under the pointer or a finger, and hands over the moment someone presses
 * Vorige, Volgende or a step in the list beside it. Nothing here is a
 * screenshot: it is the lesson's own text, laid out in DOM.
 *
 * Autoplay only runs while the frame is on screen and the tab is visible, and
 * not at all under reduced motion - then the visitor pages through by hand.
 */
export default function StudyFlowDemo({ lesson }: { lesson: DemoLesson }) {
  const root = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [moved, setMoved] = useState(false);
  const [live, setLive] = useState(false);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [resumes, setResumes] = useState(0);

  const frame = FRAMES[index];
  const paused = !live || hover || held || hidden;
  const stepIndex = Math.min(index, STEPS.length - 1);

  useEffect(() => {
    setReduce(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setLive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setLive(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The progress line under the footer restarts with the timer, so the two
  // never disagree about how long is left on this frame.
  useEffect(() => {
    if (!paused) setResumes((count) => count + 1);
  }, [paused]);

  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setTimeout(() => {
      setMoved(true);
      setIndex((current) => (current + 1) % FRAMES.length);
    }, DWELL[frame]);
    return () => window.clearTimeout(id);
  }, [frame, paused, reduce, resumes]);

  const go = (next: number) => {
    setMoved(true);
    setIndex(((next % FRAMES.length) + FRAMES.length) % FRAMES.length);
  };

  const body = (() => {
    switch (frame) {
      case 'intro':
        return <IntroFrame lesson={lesson} />;
      case 'word':
        return <WordFrame lesson={lesson} />;
      case 'depth':
        return <DepthFrame lesson={lesson} />;
      case 'reflection':
        return <ReflectionFrame lesson={lesson} reduce={reduce} />;
      case 'quiz':
        return <QuizFrame lesson={lesson} reduce={reduce} />;
      case 'done':
        return <DoneFrame lesson={lesson} live={live} reduce={reduce} />;
    }
  })();

  const nextLabel = frame === 'quiz' ? 'Les afronden' : frame === 'done' ? (lesson.nextLesson ? `Verder met les ${lesson.nextLesson.day}` : 'Terug naar de studie') : 'Volgende';

  return (
    <div ref={root} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <style>{CSS}</style>

      <div>
        {/* The laptop. A dark bezel, the screen, and a base - and nothing else drawn on it. */}
        <div
          className="rounded-[1.25rem] p-2 sm:p-2.5"
          style={{ backgroundColor: '#111827', boxShadow: '0 32px 64px -28px rgba(15,23,42,0.45), 0 12px 24px -16px rgba(15,23,42,0.2)' }}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setHover(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHover(false);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') setHeld((value) => !value);
          }}
        >
          <div
            role="group"
            aria-label="Voorbeeld van een les, stap voor stap"
            className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl bg-white text-left sm:aspect-[16/10]"
            style={{ color: TEXT }}
          >
            {/* Header: the same three tracks as the real lesson. */}
            <header className="flex-none border-b" style={{ borderColor: BORDER }}>
              <div className="flex h-11 items-center gap-2 px-3">
                <span className="flex flex-1 items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: MUTED }} aria-hidden>
                    <X size={15} />
                  </span>
                </span>
                <span className="flex min-w-0 flex-col items-center">
                  <span className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: TEXT }}>
                    <span className="truncate">{lesson.lesson.title}</span>
                    <ListChecks size={11} style={{ color: FAINT }} aria-hidden />
                  </span>
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    Les {lesson.lesson.day} van {lesson.lessonsTotal} · {frame === 'done' ? 'afgerond' : `stap ${stepIndex + 1} van ${STEPS.length}`}
                  </span>
                </span>
                <span className="flex flex-1 items-center justify-end">
                  <span className="inline-flex h-7 items-center rounded-lg border px-2.5 text-[11px] font-semibold" style={{ borderColor: BORDER, color: TEXT }}>
                    AI
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1 px-3 pb-2.5" aria-hidden>
                {STEPS.map((step, i) => {
                  const filled = frame === 'done' || i <= stepIndex;
                  const current = frame !== 'done' && i === stepIndex;
                  return (
                    <button
                      key={step}
                      type="button"
                      tabIndex={-1}
                      title={STEP_LABEL[step]}
                      onClick={(event) => {
                        event.stopPropagation();
                        go(i);
                      }}
                      className="relative block h-[3px] flex-1 overflow-hidden rounded-full bg-gray-200"
                    >
                      {filled && (
                        <span
                          key={`${step}-${current ? 'now' : 'done'}`}
                          className={`absolute inset-0 origin-left rounded-full ${current && moved ? 'motion-safe:animate-rail-fill' : ''}`}
                          style={{ backgroundColor: TEAL }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </header>

            {/* The step. Keyed on the frame so a change re-mounts it and it slides in. */}
            <div className="relative min-h-0 flex-1">
              <div key={frame} className={`absolute inset-0 overflow-hidden ${moved ? 'lp-demo-enter' : ''}`}>
                {body}
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Footer: the two buttons that move the lesson. */}
            <footer className="relative flex flex-none items-center justify-between gap-3 border-t px-3 py-2" style={{ borderColor: BORDER }}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(index - 1);
                }}
                disabled={index === 0}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium ${index === 0 ? 'pointer-events-none border-transparent text-transparent' : 'bg-white shadow-sm hover:bg-gray-50'}`}
                style={index === 0 ? undefined : { borderColor: '#D1D5DB', color: TEXT }}
              >
                <ArrowLeft size={13} aria-hidden /> Vorige
              </button>
              <span className="text-[10.5px]" style={{ color: MUTED }}>
                {STEP_LABEL[frame]}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(index + 1);
                }}
                className="press inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-white"
                style={{ backgroundColor: TEAL }}
              >
                {nextLabel} <ArrowRight size={13} aria-hidden />
              </button>
              {!reduce && (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
                  <span
                    key={`${index}:${resumes}`}
                    className="lp-demo-bar block h-full"
                    style={{ backgroundColor: 'rgba(13,148,136,0.45)', animationDuration: `${DWELL[frame]}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  />
                </span>
              )}
            </footer>
          </div>
          <div aria-hidden className="mx-auto mt-2 h-1 w-16 rounded-full bg-white/15" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          {!reduce && (
            <button
              type="button"
              onClick={() => setHeld((value) => !value)}
              aria-pressed={held}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-3 text-[12px] font-semibold transition-colors hover:bg-gray-50"
              style={{ borderColor: BORDER, color: TEXT }}
            >
              {held ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
              {held ? 'Afspelen' : 'Pauze'}
            </button>
          )}
          <p className="text-[12px]" style={{ color: MUTED }}>
            {reduce ? 'Blader met Vorige en Volgende door de les.' : 'Speelt vanzelf af. Wijs of tik op het scherm om te pauzeren.'}
          </p>
        </div>
      </div>

      {/* The five steps, with the one on screen lit. Chips on a phone, a list beside the frame on a laptop. */}
      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0">
        {FRAMES.map((key, i) => {
          const active = i === index;
          const isReward = key === 'done';
          return (
            <li key={key} className="flex-none lg:flex-auto">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={active ? 'step' : undefined}
                className="flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors lg:px-3.5 lg:py-3"
                style={{
                  borderColor: active ? 'rgba(13,148,136,0.45)' : BORDER,
                  backgroundColor: active ? 'rgba(13,148,136,0.06)' : '#FFFFFF',
                }}
              >
                <span
                  className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold"
                  style={active ? { backgroundColor: TEAL, color: '#FFFFFF' } : { backgroundColor: '#F3F4F6', color: MUTED }}
                >
                  {isReward ? <Check size={11} aria-hidden /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-[13px] font-bold leading-5" style={{ color: active ? TEAL_TEXT : TEXT }}>
                    {isReward ? 'Les afgerond' : STEP_LABEL[key]}
                  </span>
                  <span className="hidden text-[12px] leading-relaxed lg:block" style={{ color: MUTED }}>
                    {isReward ? `+${lesson.xp} XP voor je boom, en de volgende les staat klaar.` : STEP_BLURB[key]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
