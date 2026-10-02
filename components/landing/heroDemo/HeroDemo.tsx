'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import AiPanel from './AiPanel';
import GrondtekstPanel from './GrondtekstPanel';
import UitlegPanel from './UitlegPanel';
import VersePane from './VersePane';
import VoortgangPanel from './VoortgangPanel';
import { HD, HERO_DEMO_CSS, HERO_SCENES, SCENE_DWELL, SCENE_LABEL } from './shared';

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

/* The reader layout: the verse, and the panel that opens next to it. On a
   phone the two are stacked - the verse sits centred in the screen until the
   panel comes up from below; from `sm` the panel slides in from the right
   while the verse column narrows to make room. Both boxes are positioned, so
   the screen never changes size. */
const SHELL_CSS = `
.hd-shell-pane { position: absolute; left: 0; top: 0; width: 100%; height: 150px; transform: translateY(125px); }
.hd-shell-side { position: absolute; left: 0; bottom: 0; width: 100%; height: 250px; overflow: hidden; background-color: ${HD.sunken}; border-top: 1px solid ${HD.border}; transform: translateY(100%); }
.hd-shell-open .hd-shell-pane, .hd-shell-open .hd-shell-side { transform: none; }
@media (min-width: 640px) {
  .hd-shell-pane { height: 100%; transform: none; }
  .hd-shell-open .hd-shell-pane { width: 52%; }
  .hd-shell-side { left: auto; right: 0; top: 0; bottom: auto; width: 48%; height: 100%; border-top: 0; border-left: 1px solid ${HD.border}; transform: translateX(100%); }
}
@media (prefers-reduced-motion: no-preference) {
  .hd-shell-pane { transition: transform 450ms ${EASE}, width 450ms ${EASE}; }
  .hd-shell-side { transition: transform 450ms ${EASE}; }
  .hd-shell-progress { animation: hd-bar linear both; transform-origin: left; }
}
`;

/**
 * One layer of the screen. It rises in when it mounts, unless it is the very
 * first frame; the choice is fixed at mount, so `moved` turning true later
 * does not replay it on a layer that was already there.
 */
function Stage({ rise, children }: { rise: boolean; children: ReactNode }) {
  const [animate] = useState(rise);
  return <div className={`absolute inset-0 ${animate ? 'hd-rise' : ''}`}>{children}</div>;
}

/**
 * The product, playing by itself in the hero.
 *
 * A browser window walks one hard verse (Lukas 14:26) through five scenes:
 * the passage, the explanation beside it, the Greek word for word, the
 * reader's question answered, and the progress it earns. The verse stays put
 * through the first four while the panel next to it changes; the last scene
 * takes the whole screen. Nothing here is a screenshot, it is DOM.
 *
 * It advances by itself, pauses under the pointer or after a tap on the
 * screen, and the tabs under the frame jump straight to a scene. Autoplay only
 * runs while the frame is on screen and the tab is visible, and not at all
 * under reduced motion - then the visitor steps through with the tabs. The
 * first frame is the verse, exactly as the server rendered it, with no
 * entrance animation.
 */
export default function HeroDemo({ treeSvg }: { treeSvg: string }) {
  const root = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [plays, setPlays] = useState(0);
  const [moved, setMoved] = useState(false);
  const [live, setLive] = useState(false);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [resumes, setResumes] = useState(0);

  const scene = HERO_SCENES[index];
  const paused = !live || hover || held || hidden;
  const open = scene !== 'verse';

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

  // The progress line in the active tab restarts with the timer, so the two
  // never disagree about how long is left on this scene.
  useEffect(() => {
    if (!paused) setResumes((count) => count + 1);
  }, [paused]);

  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setTimeout(() => {
      setMoved(true);
      setPlays((count) => count + 1);
      setIndex((current) => (current + 1) % HERO_SCENES.length);
    }, SCENE_DWELL[scene]);
    return () => window.clearTimeout(id);
  }, [scene, paused, reduce, resumes, plays]);

  // `plays` goes up on every jump, also one to the scene already showing, so
  // the panel re-mounts and plays again from its start.
  const go = (next: number) => {
    setMoved(true);
    setPlays((count) => count + 1);
    setIndex(next);
  };

  const panel = (() => {
    switch (scene) {
      case 'uitleg':
        return <UitlegPanel reduce={reduce} />;
      case 'grondtekst':
        return <GrondtekstPanel reduce={reduce} />;
      case 'ai':
        return <AiPanel reduce={reduce} />;
      default:
        return null;
    }
  })();

  return (
    <div
      ref={root}
      role="group"
      aria-label="Voorbeeld: zo werkt BijbelStudie bij een moeilijk vers"
      className="w-full text-left"
    >
      <style>{HERO_DEMO_CSS + SHELL_CSS}</style>

      {/* The browser window: a slim chrome bar, and the screen under it. */}
      <div
        className="overflow-hidden rounded-[14px] border"
        style={{
          borderColor: HD.border,
          backgroundColor: HD.surface,
          color: HD.text,
          boxShadow: '0 30px 60px -26px rgba(15,23,42,0.35)',
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHover(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setHover(false);
        }}
        // On release, not on touch-down: a swipe that starts on the frame ends
        // in `pointercancel`, so scrolling past does not pause the demo.
        onPointerUp={(event) => {
          if (event.pointerType === 'touch') setHeld((value) => !value);
        }}
      >
        <div
          aria-hidden
          className="flex h-[30px] items-center gap-3 border-b px-3"
          style={{ backgroundColor: HD.sunken, borderColor: HD.border }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-[9px] w-[9px] rounded-full opacity-40" style={{ backgroundColor: HD.faint }} />
            ))}
          </div>
          <div
            className="truncate rounded-md px-2.5 py-[3px] text-[11px] leading-[14px]"
            style={{ backgroundColor: HD.surface, color: HD.muted }}
          >
            bijbelstudie.io/studie
          </div>
        </div>

        <div className={`relative h-[400px] overflow-hidden sm:h-[380px] ${open ? 'hd-shell-open' : ''}`}>
          {scene === 'voortgang' ? (
            <Stage key={`voortgang:${plays}`} rise={moved}>
              <VoortgangPanel reduce={reduce} treeSvg={treeSvg} />
            </Stage>
          ) : (
            <Stage key="reader" rise={moved}>
              <div className="hd-shell-pane">
                <VersePane scene={scene} reduce={reduce} />
              </div>
              <div className="hd-shell-side">
                {panel && (
                  <div key={`${scene}:${plays}`} className={`absolute inset-0 ${moved ? 'hd-slide' : ''}`}>
                    {panel}
                  </div>
                )}
              </div>
            </Stage>
          )}
        </div>
      </div>

      {/* The scenes. A row of labelled tabs from `sm`; on a phone five
          segments, with the one on screen named under them. */}
      <div className="mt-3 grid h-[60px] grid-cols-[minmax(0,1fr)_2rem] grid-rows-[28px_32px] items-center gap-x-2 sm:h-11 sm:grid-rows-[44px]">
        <ol className="col-span-2 flex h-full gap-1.5 sm:col-span-1 sm:gap-2">
          {HERO_SCENES.map((key, i) => {
            const active = i === index;
            return (
              <li key={key} className="flex min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`${i + 1}. ${SCENE_LABEL[key]}`}
                  aria-current={active ? 'step' : undefined}
                  className="flex min-w-0 flex-1 flex-col justify-center rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:justify-start sm:pt-1"
                  style={{ outlineColor: HD.teal }}
                >
                  <span className="block h-[3px] w-full flex-none overflow-hidden rounded-full" style={{ backgroundColor: HD.border }}>
                    {active &&
                      (reduce ? (
                        <span className="block h-full" style={{ backgroundColor: HD.teal }} />
                      ) : (
                        <span
                          key={`${key}:${resumes}:${plays}`}
                          className="hd-shell-progress block h-full"
                          style={{
                            backgroundColor: HD.teal,
                            animationDuration: `${SCENE_DWELL[key]}ms`,
                            animationPlayState: paused ? 'paused' : 'running',
                          }}
                        />
                      ))}
                  </span>
                  <span
                    className="mt-2 hidden gap-1.5 overflow-hidden text-[11.5px] font-semibold leading-[14px] transition-colors sm:flex"
                    style={{ color: active ? HD.tealText : HD.muted }}
                  >
                    <span className="flex-none tabular-nums">{i + 1}</span>
                    <span className="line-clamp-2 min-w-0">{SCENE_LABEL[key]}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <p aria-hidden className="flex min-w-0 items-baseline gap-2 text-[12.5px] leading-5 sm:hidden">
          <span className="flex-none text-[11.5px] font-semibold tabular-nums" style={{ color: HD.muted }}>
            {index + 1} / {HERO_SCENES.length}
          </span>
          <span className="truncate font-semibold" style={{ color: HD.tealText }}>
            {SCENE_LABEL[scene]}
          </span>
        </p>

        <div className="col-start-2 flex h-8 w-8 items-center justify-center">
          {!reduce && (
            <button
              type="button"
              onClick={() => setHeld((value) => !value)}
              aria-label={held ? 'Afspelen' : 'Pauze'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: HD.border, color: HD.muted, outlineColor: HD.teal }}
            >
              {held ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
