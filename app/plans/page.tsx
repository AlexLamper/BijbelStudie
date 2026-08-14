'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import PlanCard from '../../components/plans/PlanCard';
import CreatePlanModal from '../../components/plans/CreatePlanModal';
import { SkeletonList, SkeletonPage } from '../../components/ui/skeletons';
import { toast } from '../../hooks/use-toast';
import type { PlanDTO } from '../../lib/planTypes';

const TEAL = '#0D9488';

type Suggestion = {
  key: string;
  title: string;
  description: string;
  reason: string;
  bookNames: string[];
  totalChapters: number;
  recommendedDays: number;
};

const FILTERS = [
  { label: 'Mijn plannen', value: 'enrolled' },
  { label: 'Ontdek', value: 'all' },
  { label: 'Zelf gemaakt', value: 'my' },
] as const;

/**
 * The page every `/plans/:id` link in the app has been 404-ing into since the
 * links were written.
 */
export default function PlansPage() {
  const { status } = useSession();
  const router = useRouter();

  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('enrolled');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansResponse, suggestionsResponse] = await Promise.all([
        fetch(`/api/v1/plans?type=${filter}`),
        fetch('/api/v1/plans/suggestions'),
      ]);

      if (plansResponse.ok) setPlans((await plansResponse.json()).plans ?? []);
      if (suggestionsResponse.ok) setSuggestions((await suggestionsResponse.json()).suggestions ?? []);
    } catch {
      toast({ title: 'Laden mislukt', description: 'Geen verbinding', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  /** One tap: the server rebuilds the plan from the suggestion key and enrols. */
  const startSuggestion = async (suggestion: Suggestion) => {
    if (starting) return;
    setStarting(suggestion.key);
    try {
      const response = await fetch('/api/v1/plans/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: suggestion.key }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Starten mislukt',
          description: data.message || data.error || 'Er is een fout opgetreden',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Plan gestart', description: data.plan.title });
      router.push(`/plans/${data.plan.id}`);
    } catch {
      toast({ title: 'Starten mislukt', description: 'Geen verbinding', variant: 'destructive' });
    } finally {
      setStarting(null);
    }
  };

  if (status === 'loading') return <SkeletonPage fullHeight />;
  if (status !== 'authenticated') {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <p className="text-gray-500 dark:text-muted-foreground">Log in om leesplannen te bekijken.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-7">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-foreground tracking-tight">
            Leesplannen
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-muted-foreground mt-1">
            Een klein gedeelte goed begrijpen telt zwaarder dan veel lezen. Markeer een dag als
            <span className="font-medium"> bestudeerd</span> wanneer je hem echt doorgewerkt hebt.
          </p>
        </div>
        <button
          onClick={() => setBuilderOpen(true)}
          className="flex-shrink-0 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5"
          style={{ backgroundColor: TEAL }}
        >
          <Plus size={15} />
          Eigen plan
        </button>
      </div>

      {suggestions.length > 0 && (
        <section className="mb-7">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-2.5">
            <Sparkles size={12} style={{ color: TEAL }} />
            Voorgesteld voor jou
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.key}
                className="rounded-xl p-4 border"
                style={{ borderColor: 'rgba(13,148,136,0.22)', backgroundColor: 'rgba(13,148,136,0.04)' }}
              >
                <p className="text-[11px] font-medium mb-1.5" style={{ color: '#0F766E' }}>
                  {suggestion.reason}
                </p>
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-foreground">
                  {suggestion.title}
                </h3>
                <p className="text-[12px] text-gray-500 dark:text-muted-foreground mt-1 leading-relaxed">
                  {suggestion.totalChapters} hoofdstukken · {suggestion.recommendedDays} dagen
                </p>
                <button
                  onClick={() => startSuggestion(suggestion)}
                  disabled={starting !== null}
                  className="mt-3 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-60"
                  style={{ backgroundColor: TEAL }}
                >
                  {starting === suggestion.key && <Loader2 size={13} className="animate-spin" />}
                  Start dit plan
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-1.5 mb-4">
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className="px-3 py-1.5 rounded-full text-[12.5px] transition-colors border"
              style={
                active
                  ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff', fontWeight: 600 }
                  : { borderColor: 'rgba(0,0,0,0.10)' }
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonList
          count={6}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 space-y-0"
          itemClassName="p-5"
        />
      ) : plans.length === 0 ? (
        <div className="border border-dashed border-gray-200 dark:border-border rounded-xl py-14 text-center">
          <p className="text-[13.5px] text-gray-500 dark:text-muted-foreground">
            {filter === 'enrolled'
              ? 'Je volgt nog geen leesplan. Kies een suggestie hierboven of stel er zelf een samen.'
              : 'Geen leesplannen gevonden.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onChange={load} />
          ))}
        </div>
      )}

      <CreatePlanModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={(planId) => {
          setBuilderOpen(false);
          router.push(`/plans/${planId}`);
        }}
      />
    </div>
  );
}
