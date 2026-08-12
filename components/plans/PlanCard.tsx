'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import type { PlanDTO } from '../../lib/planTypes';

const TEAL = '#0D9488';

/**
 * One plan in the list. Everything it needs is already on the DTO, so it never
 * has to fetch the plan again to work out where "lees verder" should go — the
 * server computes `currentDay`.
 */
export default function PlanCard({
  plan,
  onChange,
}: {
  plan: PlanDTO;
  onChange?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const today = plan.days.find((d) => d.day === plan.currentDay);

  const enrol = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/v1/plans/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await response.json();

      if (response.ok) {
        toast({ title: 'Je doet mee!', description: `"${plan.title}" staat klaar op dag 1.` });
        onChange?.();
      } else {
        toast({
          title: 'Inschrijven mislukt',
          description: data.message || data.error || 'Er is een fout opgetreden',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Inschrijven mislukt', description: 'Geen verbinding', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/plans/enrollment?planId=${plan.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: 'Uitgeschreven', description: `Je volgt "${plan.title}" niet meer.` });
        onChange?.();
      } else {
        toast({ title: 'Uitschrijven mislukt', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Uitschrijven mislukt', description: 'Geen verbinding', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const readToday = () => {
    const reading = today?.readings[0];
    if (!reading) {
      router.push(`/plans/${plan.id}`);
      return;
    }
    const params = new URLSearchParams({
      book: reading.book,
      chapter: String(reading.chapter),
      version: 'statenvertaling',
      plan: plan.id,
      day: String(today?.day ?? 1),
    });
    router.push(`/studie?${params.toString()}`);
  };

  return (
    <div className="h-full bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/plans/${plan.id}`} className="no-underline">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-foreground leading-snug">
              {plan.title}
            </h3>
          </Link>
          <span
            className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: 'rgba(13,148,136,0.10)', color: '#0F766E' }}
          >
            {plan.categoryLabel}
          </span>
        </div>

        <p className="text-[13px] text-gray-500 dark:text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
          {plan.description}
        </p>

        <div className="flex items-center gap-3 mt-3 text-[11.5px] text-gray-400 dark:text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen size={12} /> {plan.duration} dagen
          </span>
          {plan.studiedDays.length > 0 && (
            <span className="flex items-center gap-1" style={{ color: TEAL }}>
              <Sparkles size={12} /> {plan.studiedDays.length} bestudeerd
            </span>
          )}
        </div>

        {plan.isEnrolled && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11.5px] mb-1.5">
              <span className="text-gray-500 dark:text-muted-foreground tabular-nums">
                Dag {plan.completedDays.length} van {plan.duration}
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
            {today && (
              <p className="mt-2 text-[11.5px] text-gray-500 dark:text-muted-foreground">
                Vandaag: <span className="font-medium text-gray-700 dark:text-foreground">{today.title}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-border">
          {plan.isEnrolled ? (
            <>
              <button
                onClick={readToday}
                disabled={busy}
                className="flex-1 h-9 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {plan.currentDay ? 'Lees verder' : 'Plan voltooid'}
              </button>
              <button
                onClick={leave}
                disabled={busy}
                className="h-9 px-3 rounded-lg text-[13px] border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary disabled:opacity-60"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : 'Stoppen'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={enrol}
                disabled={busy}
                className="flex-1 h-9 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Start dit plan
              </button>
              <Link
                href={`/plans/${plan.id}`}
                className="h-9 px-3 rounded-lg text-[13px] border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary no-underline flex items-center"
              >
                Bekijk
              </Link>
            </>
          )}
        </div>

        <p className="mt-3 text-[10.5px] text-gray-400 dark:text-muted-foreground">
          {plan.isOwner ? 'Jouw plan' : `Gemaakt door ${plan.author ?? 'onbekend'}`}
        </p>
      </div>
    </div>
  );
}
