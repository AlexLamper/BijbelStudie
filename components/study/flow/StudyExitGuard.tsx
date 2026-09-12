'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import { FOCUS_RING, INK, INK_MUTED, PANEL_SOLID, scrim } from './lesson-layout';
import PromptCard from '../../feedback/PromptCard';
import type { SerialisedPrompt } from '../../../lib/feedbackPrompts';

/**
 * Confirmation before leaving a lesson mid-step.
 *
 * The guided flow persists every step transition, but the reflection draft and
 * an in-progress quiz are only saved on their own beat - and more to the point,
 * a reader who taps "Dashboard" in the sidebar by reflex loses their place in
 * the lesson with nothing asking whether they meant to. This intercepts:
 *
 *   - clicks on any in-app link that leaves the current lesson URL
 *   - a full page unload (refresh, tab close, typing a new address)
 *   - the browser Back button
 *
 * The flow's own controls - Volgende / Vorige and the lesson navigator - are
 * plain buttons, not links, so they are never caught here: moving around inside
 * the study is not "leaving".
 */
export default function StudyExitGuard({
  enabled,
  studyId,
  lessonDay,
  guest = false,
}: {
  enabled: boolean;
  studyId?: string;
  lessonDay?: number;
  /** A guest has no account to attribute an answer to, so P1 is not offered. */
  guest?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  /**
   * P1 - "waarom stop je hier?", optional, inside the dialog the reader has
   * already opened (FEEDBACK_PLAN.md section 3.4). Requested only when the
   * dialog actually opens, never on mount: a reader who finishes the lesson
   * normally must not cost a request for a question they will never see.
   */
  const [exitPrompt, setExitPrompt] = useState<SerialisedPrompt | null>(null);
  const askedRef = useRef(false);
  // Set just before we navigate on the reader's behalf, so our own push does
  // not trip the click handler again.
  const bypassRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const currentPath = () => window.location.pathname;

  // Asked once, when the reader has decided to leave.
  useEffect(() => {
    if (guest || !pending || askedRef.current) return;
    askedRef.current = true;
    const params = new URLSearchParams({ touchpoint: 'study_abandoned' });
    if (studyId) params.set('studyId', studyId);
    if (lessonDay != null) params.set('day', String(lessonDay));
    fetch(`/api/feedback/next?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.prompt) setExitPrompt(data.prompt as SerialisedPrompt);
      })
      .catch(() => {});
  }, [guest, pending, studyId, lessonDay]);

  // --- In-app link clicks ------------------------------------------------
  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      if (bypassRef.current) return;
      if (event.defaultPrevented) return;
      // Let the browser handle anything that is not a plain left click.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page (only a query/hash change, e.g. the ?stap= sync) is not a
      // departure.
      if (url.pathname === currentPath()) return;

      event.preventDefault();
      event.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };

    // Capture phase, so we run before Next's <Link> router handler.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled]);

  // --- Hard unload (refresh / close / new address) ---------------------
  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled]);

  // --- Browser Back button -------------------------------------------------
  useEffect(() => {
    if (!enabled) return;

    // A sentinel entry so the first Back lands here instead of leaving the
    // lesson; we re-arm it every time it is consumed.
    history.pushState({ studyGuard: true }, '');

    const onPopState = () => {
      if (bypassRef.current || !enabledRef.current) return;
      history.pushState({ studyGuard: true }, '');
      setPending('__back__');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [enabled]);

  const stay = useCallback(() => setPending(null), []);

  const leave = useCallback(() => {
    const target = pending;
    setPending(null);
    bypassRef.current = true;
    if (target === '__back__') {
      // Undo the sentinel and the entry the reader actually wanted to go back to.
      history.go(-2);
      return;
    }
    if (target) router.push(target);
  }, [pending, router]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, stay]);

  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
      // The scene's own ground rather than a neutral black, so the dim belongs
      // to the world the window is standing in.
      style={{ backgroundColor: scrim(0.55) }}
      onClick={stay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-exit-title"
        onClick={(event) => event.stopPropagation()}
        className={`w-full sm:max-w-md ${PANEL_SOLID} rounded-t-2xl sm:rounded-2xl shadow-[0_40px_80px_-32px_rgba(0,0,0,0.85)]`}
      >
        {/* No icon tile. The question is in the heading; a door beside it says
            the same thing in a picture. */}
        <div className="flex items-start gap-3 p-5 sm:p-6">
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="study-exit-title" className={`text-[15px] font-bold ${INK}`}>
              Studie verlaten?
            </h2>
            <p className={`mt-1 text-[13px] leading-relaxed ${INK_MUTED}`}>
              Je zit midden in een stap. Je afgeronde stappen zijn bewaard, maar een niet-opgeslagen
              reflectie of quiz gaat verloren. Wil je de studie verlaten?
            </p>
          </div>
          <button
            type="button"
            onClick={stay}
            aria-label="Sluiten"
            className={`h-8 w-8 flex-none inline-flex items-center justify-center rounded-md hover:bg-les-card text-les-faint hover:text-les-ink ${FOCUS_RING}`}
          >
            <X size={16} />
          </button>
        </div>

        {exitPrompt && (
          <div className="px-5 sm:px-6">
            <PromptCard
              prompt={exitPrompt}
              context={{ studyId: studyId ?? null, lessonDay: lessonDay ?? null, path: '/studie' }}
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            type="button"
            onClick={leave}
            className={`inline-flex h-10 items-center justify-center rounded-lg border border-les-card-line px-4 text-sm font-semibold ${INK} transition-colors hover:bg-les-card ${FOCUS_RING}`}
          >
            Studie verlaten
          </button>
          <button
            type="button"
            onClick={stay}
            autoFocus
            className={`inline-flex h-10 items-center justify-center rounded-lg bg-teal px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
          >
            In de studie blijven
          </button>
        </div>
      </div>
    </div>
  );
}
