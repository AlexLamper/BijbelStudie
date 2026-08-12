'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { toast } from '../../../hooks/use-toast';
import type { PlanDTO, PlanDayDTO } from '../../../lib/planTypes';

const TEAL = '#0D9488';

/**
 * Plan detail.
 *
 * Each day can be closed off two ways, and the difference is the point of the
 * feature: "gelezen" is worth 10 XP, "bestudeerd" 30 and it writes a
 * StudyProgress row. A day already marked read can still be upgraded to
 * studied later, which earns the difference.
 */
export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { status } = useSession();
  const router = useRouter();

  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/plans/${id}`);
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Plan niet gevonden',
          description: data.message || data.error,
          variant: 'destructive',
        });
        router.push('/plans');
        return;
      }
      setPlan(data.plan);
    } catch {
      toast({ title: 'Laden mislukt', description: 'Geen verbinding', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  const enrol = async () => {
    const response = await fetch('/api/v1/plans/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: id }),
    });
    const data = await response.json();

    if (response.ok) {
      toast({ title: 'Je doet mee!', description: 'Het plan staat klaar op dag 1.' });
      load();
    } else {
      toast({
        title: 'Inschrijven mislukt',
        description: data.message || data.error,
        variant: 'destructive',
      });
    }
  };

  const setDay = async (day: number, mode: 'read' | 'studied' | null) => {
    if (pending !== null) return;
    setPending(day);
    try {
      const response =
        mode === null
          ? await fetch(`/api/v1/plans/progress?planId=${id}&day=${day}`, { method: 'DELETE' })
          : await fetch('/api/v1/plans/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId: id, day, mode }),
            });
      const data = await response.json();

      if (!response.ok) {
        toast({ title: 'Bijwerken mislukt', description: data.message || data.error, variant: 'destructive' });
        return;
      }

      if (data.xp?.awarded) {
        toast({
          title: `+${data.xp.awarded} XP`,
          description: data.xp.levelledUp
            ? `Level ${data.xp.level} bereikt!`
            : mode === 'studied'
              ? 'Bestudeerd telt zwaarder dan gelezen.'
              : undefined,
        });
      }
      for (const badge of data.xp?.newBadges ?? []) {
        toast({ title: 'Nieuwe badge', description: badge });
      }
      if (data.planCompleted) {
        toast({ title: 'Leesplan voltooid!', description: 'Sterk gedaan — +150 XP.' });
      }

      await load();
    } catch {
      toast({ title: 'Bijwerken mislukt', description: 'Geen verbinding', variant: 'destructive' });
    } finally {
      setPending(null);
    }
  };

  const openReading = (day: PlanDayDTO) => {
    const reading = day.readings[0];
    if (!reading) return;
    const query = new URLSearchParams({
      book: reading.book,
      chapter: String(reading.chapter),
      version: 'statenvertaling',
      plan: id,
      day: String(day.day),
    });
    router.push(`/studie?${query.toString()}`);
  };

  if (status === 'loading' || loading) return <LoadingSpinner fullHeight message="Plan laden…" />;
  if (status !== 'authenticated') {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <p className="text-gray-500 dark:text-muted-foreground">Log in om dit leesplan te bekijken.</p>
      </div>
    );
  }
  if (!plan) return null;

  const behind =
    plan.isEnrolled && plan.scheduledDay && plan.currentDay
      ? plan.scheduledDay - plan.currentDay
      : 0;

  return (
    <div className="max-w-3xl mx-auto px-5 py-7">
      <Link
        href="/plans"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 dark:text-muted-foreground no-underline hover:text-gray-900 dark:hover:text-foreground mb-4"
      >
        <ArrowLeft size={14} /> Alle leesplannen
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-foreground tracking-tight">
            {plan.title}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-muted-foreground mt-1.5 leading-relaxed">
            {plan.description}
          </p>
          <p className="text-[11.5px] text-gray-400 dark:text-muted-foreground mt-2">
            {plan.categoryLabel} · {plan.duration} dagen ·{' '}
            {plan.isOwner ? 'jouw plan' : `gemaakt door ${plan.author ?? 'onbekend'}`}
          </p>
        </div>
        {plan.status === 'completed' && (
          <span
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            <Trophy size={12} /> Voltooid
          </span>
        )}
      </div>

      {plan.isEnrolled ? (
        <div className="mt-5 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-5">
          <div className="flex items-center justify-between text-[12px] mb-2">
            <span className="text-gray-500 dark:text-muted-foreground tabular-nums">
              {plan.completedDays.length} van {plan.duration} dagen ·{' '}
              <span style={{ color: TEAL }}>{plan.studiedDays.length} bestudeerd</span>
            </span>
            <span className="font-semibold tabular-nums" style={{ color: TEAL }}>
              {plan.progressPercentage}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${plan.progressPercentage}%`, backgroundColor: TEAL }}
            />
          </div>
          {behind > 0 && (
            <p className="text-[11.5px] text-gray-400 dark:text-muted-foreground mt-2">
              Je loopt {behind} {behind === 1 ? 'dag' : 'dagen'} achter op het schema. Dat geeft niet —
              pak gewoon dag {plan.currentDay} op.
            </p>
          )}
        </div>
      ) : (
        <div
          className="mt-5 rounded-xl p-5 border"
          style={{ borderColor: 'rgba(13,148,136,0.22)', backgroundColor: 'rgba(13,148,136,0.04)' }}
        >
          <p className="text-[13px] text-gray-700 dark:text-foreground">
            Schrijf je in om je voortgang bij te houden en dagelijkse herinneringen te krijgen.
          </p>
          <button
            onClick={enrol}
            className="mt-3 h-9 px-4 rounded-lg text-[13px] font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            Start dit plan
          </button>
        </div>
      )}

      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mt-7 mb-2.5">
        Dagen
      </h2>

      <div className="space-y-2">
        {plan.days.map((day) => {
          const isCurrent = day.day === plan.currentDay;
          const busy = pending === day.day;

          return (
            <div
              key={day.day}
              className="bg-white dark:bg-card border rounded-xl p-4 transition-colors"
              style={{
                borderColor: day.completed
                  ? 'rgba(13,148,136,0.35)'
                  : isCurrent
                    ? 'rgba(13,148,136,0.22)'
                    : undefined,
                backgroundColor: isCurrent && !day.completed ? 'rgba(13,148,136,0.04)' : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground tabular-nums">
                      Dag {day.day}
                    </span>
                    {day.mode === 'studied' && (
                      <span
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold"
                        style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: '#0F766E' }}
                      >
                        <Sparkles size={9} /> BESTUDEERD
                      </span>
                    )}
                    {day.mode === 'read' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-gray-100 dark:bg-secondary text-gray-500 dark:text-muted-foreground">
                        GELEZEN
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-foreground mt-0.5">
                    {day.title ?? day.readings.map((r) => `${r.book} ${r.chapter}`).join(' · ')}
                  </p>
                </div>

                {day.completed ? (
                  <CheckCircle2 size={18} style={{ color: TEAL }} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle size={18} className="flex-shrink-0 mt-0.5 text-gray-300 dark:text-muted-foreground" />
                )}
              </div>

              {plan.isEnrolled && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => openReading(day)}
                    className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white flex items-center gap-1.5"
                    style={{ backgroundColor: TEAL }}
                  >
                    <BookOpen size={13} /> Open
                  </button>

                  {!day.completed && (
                    <button
                      onClick={() => setDay(day.day, 'read')}
                      disabled={busy}
                      className="h-8 px-3 rounded-lg text-[12.5px] border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Gelezen
                    </button>
                  )}

                  {day.mode !== 'studied' && (
                    <button
                      onClick={() => setDay(day.day, 'studied')}
                      disabled={busy}
                      className="h-8 px-3 rounded-lg text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-60 border"
                      style={{ borderColor: TEAL, color: '#0F766E' }}
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      Bestudeerd
                    </button>
                  )}

                  {day.completed && (
                    <button
                      onClick={() => setDay(day.day, null)}
                      disabled={busy}
                      className="h-8 px-3 rounded-lg text-[12.5px] text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground disabled:opacity-60"
                    >
                      Ongedaan maken
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
