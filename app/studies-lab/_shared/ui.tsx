'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, CheckCircle2 } from 'lucide-react'
import { TEAL, type Entry, type Status } from './lab'

/** Chip-knop voor de tijd- en doelvragen (versie F). */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors border ${
        active
          ? 'text-white border-transparent'
          : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
      }`}
      style={active ? { backgroundColor: TEAL } : undefined}
    >
      {children}
    </button>
  )
}

/** Compacte regel: titel, soort, lessen, minuten, voortgang. */
export function CompactRow({ entry, status }: { entry: Entry; status: Status }) {
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="group no-underline flex items-center gap-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card px-3.5 py-3 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-[13.5px] text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
            {entry.study.title}
          </span>
          {status.completed && (
            <Check size={14} className="flex-none" style={{ color: TEAL }} aria-label="Afgerond" />
          )}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
          <span className="font-semibold uppercase tracking-wider">{entry.kind}</span>
          <span aria-hidden>·</span>
          <span>
            {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'}
          </span>
          <span aria-hidden>·</span>
          <span>±{entry.avgMinutes} min per les</span>
          {status.started && !status.completed && (
            <>
              <span aria-hidden>·</span>
              <span style={{ color: TEAL }}>{status.pct}% klaar</span>
            </>
          )}
        </span>
      </span>
      <ArrowRight
        size={15}
        className="flex-none opacity-30 group-hover:opacity-100 transition-opacity"
        style={{ color: TEAL }}
      />
    </Link>
  )
}

/** Ruimere kaart met voortgangsbalk — de rustige lijstregel uit versie E. */
export function StudyCard({ entry, status }: { entry: Entry; status: Status }) {
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="group no-underline flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-3.5 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-[15px] text-gray-900 dark:text-foreground leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {entry.study.title}
        </h3>
        {status.completed ? (
          <span
            className="mt-0.5 flex-none inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: TEAL }}
          >
            <CheckCircle2 size={14} /> Afgerond
          </span>
        ) : status.started ? (
          <span
            className="mt-0.5 flex-none text-xs font-semibold tabular-nums"
            style={{ color: TEAL }}
          >
            {status.pct}%
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums">
        <span className="font-semibold uppercase tracking-wider">{entry.kind}</span>
        <span aria-hidden>·</span>
        <span>
          {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'}
        </span>
        <span aria-hidden>·</span>
        <span>±{entry.avgMinutes} min per les</span>
      </div>

      {status.started && !status.completed && (
        <div className="mt-0.5">
          <div className="h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${status.pct}%`, backgroundColor: TEAL }}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
            Les {status.resumeDay ?? status.done + 1} van {status.total}
          </p>
        </div>
      )}
    </Link>
  )
}

/** "Verder waar je was" als horizontale pillenstrip (versie F). */
export function ResumeStrip({ rows }: { rows: { entry: Entry; status: Status }[] }) {
  if (rows.length === 0) return null
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {rows.map(({ entry, status }) => (
        <Link
          key={entry.study.id}
          href={`/studies/${entry.study.id}`}
          data-track="study_resume_card"
          className="no-underline flex flex-none items-center gap-2 rounded-full border px-3 py-1.5 bg-white dark:bg-card transition-colors hover:border-teal-400"
          style={{ borderColor: 'rgba(13,148,136,0.30)' }}
        >
          <span className="text-[12px] font-semibold text-gray-900 dark:text-foreground">
            {entry.study.title}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
            les {status.resumeDay ?? status.done + 1}/{status.total} · {status.pct}%
          </span>
          <ArrowRight size={13} className="flex-none" style={{ color: TEAL }} />
        </Link>
      ))}
    </div>
  )
}

/** "Verder waar je was" als brede kaart met balk (versie D/E). */
export function ResumeCard({ entry, status }: { entry: Entry; status: Status }) {
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_resume_card"
      className="no-underline flex items-center gap-4 rounded-2xl border p-4 bg-white dark:bg-card transition-colors hover:border-teal-400"
      style={{ borderColor: 'rgba(13,148,136,0.30)' }}
    >
      <span className="min-w-0 flex-1">
        <span
          className="block text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: TEAL }}
        >
          Verder waar je was
        </span>
        <span className="mt-0.5 block text-sm font-semibold text-foreground truncate">
          {entry.study.title}
        </span>
        <span className="block text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
          Les {status.resumeDay ?? status.done + 1} van {status.total} · {status.pct}% klaar
        </span>
        <span className="mt-1.5 block h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
          <span
            className="block h-full rounded-full"
            style={{ width: `${status.pct}%`, backgroundColor: TEAL }}
          />
        </span>
      </span>
      <ArrowRight size={16} className="flex-none" style={{ color: TEAL }} />
    </Link>
  )
}
