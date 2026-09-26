'use client'

import { useId, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import type {
  BibleYearCatalogueEntry,
  BibleYearPlanKey,
  BibleYearStartBody,
  BibleYearTrackEntry,
  BibleYearTrackKey,
} from '../../lib/bibleYear/types'
import {
  addDays,
  browserTimeZone,
  DEFAULT_CATALOGUE,
  DEFAULT_PLAN,
  DEFAULT_TRACK,
  DEFAULT_TRACKS,
  formatDutchDate,
  MAX_START_DAYS_AHEAD,
  planEndDate,
  startDateError,
  startDateOptions,
  todayInTimeZone,
  trackLabel,
  type StartDateChoice,
} from '../../lib/bibleYear/display'
import { Card } from '../kit/primitives'
import { ERROR_TEXT, PrimaryButton, SecondaryButton, TEAL } from './parts'

export type BibleYearStartProps = {
  /** From GET /api/v1/bible-year; falls back to the built-in two plans when empty. */
  catalogue?: BibleYearCatalogueEntry[]
  tracks?: BibleYearTrackEntry[]
  onSubmit: (body: BibleYearStartBody) => void | Promise<unknown>
  pending?: boolean
  error?: string | null
  initialPlan?: BibleYearPlanKey
  /** Card heading. */
  heading?: string
  /** Label of the final button. */
  submitLabel?: string
  /** Shows "Annuleren" on the first step. */
  onCancel?: () => void
}

const STEPS = ['Duur', 'Volgorde', 'Startdatum', 'Bevestigen'] as const

/**
 * The start flow: duur -> volgorde -> startdatum -> bevestigen. The body it
 * submits carries the browser's time zone, so "vandaag" and every later day
 * are the reader's own days.
 */
export default function BibleYearStart({
  catalogue,
  tracks,
  onSubmit,
  pending = false,
  error,
  initialPlan = DEFAULT_PLAN,
  heading = 'Begin met Bijbel in een jaar',
  submitLabel = 'Begin met lezen',
  onCancel,
}: BibleYearStartProps) {
  const plans = catalogue && catalogue.length > 0 ? catalogue : DEFAULT_CATALOGUE
  const orders = tracks && tracks.length > 0 ? tracks : DEFAULT_TRACKS

  const timeZone = useMemo(() => browserTimeZone(), [])
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone])
  const dateOptions = useMemo(() => startDateOptions(today), [today])

  const [step, setStep] = useState(0)
  const groupId = useId()
  const [planKey, setPlanKey] = useState<BibleYearPlanKey>(
    plans.some(p => p.planKey === initialPlan) ? initialPlan : plans[0].planKey,
  )
  const [track, setTrack] = useState<BibleYearTrackKey>(
    orders.some(t => t.track === DEFAULT_TRACK) ? DEFAULT_TRACK : orders[0].track,
  )
  const [dateChoice, setDateChoice] = useState<StartDateChoice>('vandaag')
  const [customDate, setCustomDate] = useState(today)

  const plan = plans.find(p => p.planKey === planKey) ?? plans[0]
  const startDate =
    dateChoice === 'kies' ? customDate : dateOptions.find(o => o.id === dateChoice)?.date ?? today
  const dateError = startDateError(startDate, today)
  const endDate = dateError ? null : planEndDate(startDate, plan.totalDays)

  const last = step === STEPS.length - 1
  const canContinue = step !== 2 || !dateError

  return (
    <Card className="px-[21px] py-[19px] max-md:px-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal-dark dark:text-teal-400">
        Stap {step + 1} van {STEPS.length} &middot; {STEPS[step]}
      </p>
      <h2 className="mt-1 text-[20px] font-bold tracking-[-0.3px] text-ink">{heading}</h2>

      <div className="mt-4">
        {step === 0 && (
          <Options label="Hoe lang wil je erover doen?">
            {plans.map(entry => (
              <Option
                key={entry.planKey}
                name={`${groupId}-duur`}
                value={entry.planKey}
                selected={planKey === entry.planKey}
                onSelect={() => setPlanKey(entry.planKey)}
                title={entry.label}
                detail={`${entry.totalDays} dagen, ongeveer ${entry.minutesPerDay} minuten per dag`}
              />
            ))}
          </Options>
        )}

        {step === 1 && (
          <Options label="In welke volgorde wil je lezen?">
            {orders.map(entry => (
              <Option
                key={entry.track}
                name={`${groupId}-volgorde`}
                value={entry.track}
                selected={track === entry.track}
                onSelect={() => setTrack(entry.track)}
                title={entry.track === DEFAULT_TRACK ? `${entry.label} (aanbevolen)` : entry.label}
                detail={entry.description}
              />
            ))}
          </Options>
        )}

        {step === 2 && (
          <>
            <Options label="Wanneer wil je beginnen?">
              {dateOptions.map(option => (
                <Option
                  key={option.id}
                  name={`${groupId}-start`}
                  value={option.id}
                  selected={dateChoice === option.id}
                  onSelect={() => setDateChoice(option.id)}
                  title={option.label}
                  detail={option.date ? formatDutchDate(option.date, { weekday: true, year: true }) : 'Vandaag of later'}
                />
              ))}
            </Options>
            {dateChoice === 'kies' && (
              <div className="mt-3">
                <label htmlFor="bijbel-jaar-startdatum" className="text-[13px] font-semibold text-ink">
                  Startdatum
                </label>
                <input
                  id="bijbel-jaar-startdatum"
                  type="date"
                  value={customDate}
                  min={today}
                  max={addDays(today, MAX_START_DAYS_AHEAD)}
                  onChange={event => setCustomDate(event.target.value)}
                  aria-invalid={Boolean(dateError)}
                  aria-describedby={dateError ? 'bijbel-jaar-startdatum-fout' : undefined}
                  className="mt-1.5 block h-11 w-full max-w-[240px] rounded-btn border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                />
                {dateError && (
                  <p id="bijbel-jaar-startdatum-fout" className={`mt-1.5 text-[12.5px] ${ERROR_TEXT}`}>
                    {dateError}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[14px]">
            <dt className="text-ink-muted">Duur</dt>
            <dd className="font-semibold text-ink">
              {plan.label} &middot; ongeveer {plan.minutesPerDay} min per dag
            </dd>
            <dt className="text-ink-muted">Volgorde</dt>
            <dd className="font-semibold text-ink">{trackLabel(track, orders)}</dd>
            <dt className="text-ink-muted">Begint</dt>
            <dd className="font-semibold text-ink">{formatDutchDate(startDate, { weekday: true, year: true })}</dd>
            {endDate && (
              <>
                <dt className="text-ink-muted">Klaar op</dt>
                <dd className="font-semibold text-ink">{formatDutchDate(endDate)}</dd>
              </>
            )}
          </dl>
        )}
      </div>

      {step === 3 && (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          Hoofdstukken die je in de Bijbel leest, worden vanzelf afgevinkt. Loop je achter, dan kun je bijlezen of
          je schema opschuiven. Er is geen deadline.
        </p>
      )}

      {error && (
        <p role="alert" className={`mt-3 text-[13px] ${ERROR_TEXT}`}>
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {step > 0 ? (
          <SecondaryButton onClick={() => setStep(s => s - 1)} disabled={pending}>
            Terug
          </SecondaryButton>
        ) : onCancel ? (
          <SecondaryButton onClick={onCancel} disabled={pending}>
            Annuleren
          </SecondaryButton>
        ) : null}
        {last ? (
          <PrimaryButton
            onClick={() => {
              if (dateError) return
              void onSubmit({ planKey, track, startDate, timeZone })
            }}
            disabled={pending || Boolean(dateError)}
          >
            {pending ? 'Bezig…' : submitLabel}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => setStep(s => s + 1)} disabled={!canContinue}>
            Verder
          </PrimaryButton>
        )}
      </div>
    </Card>
  )
}

/**
 * A native radio group: a fieldset of real `<input type="radio">`s sharing one
 * name, so Tab enters the group once and the arrow keys move the choice - the
 * browser's own behaviour, no roving tabindex to maintain. The inputs are
 * visually hidden; the card around each one is the visible control.
 */
function Options({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-[14px] font-semibold text-ink">{label}</legend>
      <div className="flex flex-col gap-2">{children}</div>
    </fieldset>
  )
}

function Option({
  name,
  value,
  selected,
  onSelect,
  title,
  detail,
}: {
  name: string
  value: string
  selected: boolean
  onSelect: () => void
  title: string
  detail: string
}) {
  return (
    <label
      className="relative flex w-full cursor-pointer items-start gap-3 rounded-[12px] border bg-surface px-[14px] py-3 text-left transition-colors hover:bg-line-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0D9488]"
      style={{ borderColor: selected ? TEAL : 'var(--line)' }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden
        className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border"
        style={selected ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' } : { borderColor: 'var(--line-strong)' }}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">{detail}</span>
      </span>
    </label>
  )
}
