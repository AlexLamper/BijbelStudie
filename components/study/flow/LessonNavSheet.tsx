'use client';

import React, { Fragment, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';

import { NAV_GROUPS, isNavActive } from '../../shell/nav';
import { useIsAdmin } from '../../shell/useIsAdmin';
import { FOCUS_RING, INK, INK_FAINT, PANEL_FLAT, RULE, scrim } from './lesson-layout';

/**
 * The lesson rail, for a phone.
 *
 * Below md the 64 px LessonRail is not rendered (app/studie/layout.tsx): it is
 * a hover strip of unlabelled glyphs, and on a 375 px screen it cost a sixth of
 * the reading width. The same items - read from components/shell/nav.ts, so the
 * order can never drift - open here as a sheet from the left, with their names
 * spelled out, behind the menu button in the lesson header.
 *
 * "Terug naar de studie" leads, because on a phone this sheet replaces the
 * header's close button. Every link is an ordinary in-app link, so
 * StudyExitGuard still asks before one pulls the reader out of the lesson.
 *
 * Only ever mounted below md; the shell gates the trigger with `md:hidden`.
 */
export default function LessonNavSheet({
  open,
  onClose,
  studyHref,
}: {
  open: boolean;
  onClose: () => void;
  studyHref: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return <SheetBody onClose={onClose} studyHref={studyHref} />;
}

/** Split out so the admin check only runs once the sheet is actually opened. */
function SheetBody({ onClose, studyHref }: { onClose: () => void; studyHref: string }) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  const row = `flex h-11 w-full items-center gap-3 rounded-lg px-3 text-[14px] font-medium no-underline transition-colors ${FOCUS_RING}`;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: scrim(0.45) }}
        onClick={onClose}
        aria-hidden
      />
      <nav
        aria-label="Hoofdnavigatie"
        className={`absolute inset-y-0 left-0 flex w-[min(82vw,300px)] flex-col border-r ${PANEL_FLAT} ${RULE}`}
      >
        <div className={`flex h-[52px] flex-none items-center justify-between border-b pl-4 pr-2 ${RULE}`}>
          <span className={`text-[14px] font-bold ${INK}`}>Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Menu sluiten"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${INK_FAINT} hover:bg-les-card hover:text-les-ink ${FOCUS_RING}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Link href={studyHref} onClick={onClose} className={`${row} ${INK} hover:bg-les-card`}>
            <ArrowLeft size={18} className="flex-none text-les-accent" />
            Terug naar de studie
          </Link>

          {NAV_GROUPS.map((group) => {
            if (group.adminOnly && !isAdmin) return null;
            return (
              <Fragment key={group.label}>
                <p
                  className={`mt-4 px-3 pb-1 text-[10px] font-semibold uppercase tracking-[1.2px] ${INK_FAINT}`}
                >
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.url);
                  return (
                    <Link
                      key={item.url}
                      href={item.url}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        row,
                        active
                          ? 'bg-les-nav-active text-les-accent'
                          : 'text-les-muted hover:bg-les-card',
                      ].join(' ')}
                    >
                      <Icon size={18} className="flex-none" />
                      {item.title}
                    </Link>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
