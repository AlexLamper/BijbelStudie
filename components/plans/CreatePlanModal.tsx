'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { PLAN_BOOKS } from '../../lib/planCanon';
import { PACE_CHAPTERS_PER_DAY, PACE_LABELS, recommendedDuration, type Pace } from '../../lib/planGenerator';

const TEAL = '#0D9488';
const PACES: Pace[] = ['rustig', 'gestaag', 'stevig'];

/**
 * The self-assembled plan: pick books, pick how hard you want to go, the
 * server does the day-by-day split.
 *
 * Duration is a suggestion the user can override rather than a fixed menu —
 * the brief's "de gebruiker bepaalt zelf hoe dedicated hij/zij wil zijn".
 */
export default function CreatePlanModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (planId: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pace, setPace] = useState<Pace>('gestaag');
  const [days, setDays] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const totalChapters = useMemo(
    () =>
      selected.reduce((sum, nl) => sum + (PLAN_BOOKS.find((b) => b.nl === nl)?.chapters ?? 0), 0),
    [selected],
  );

  const suggestedDays = totalChapters > 0 ? recommendedDuration(totalChapters, pace) : 0;
  const effectiveDays = days === '' ? suggestedDays : Number(days);
  const perDay = effectiveDays > 0 ? (totalChapters / effectiveDays).toFixed(1) : '0';

  const books = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return PLAN_BOOKS.filter((b) => b.chapters > 0 && (!needle || b.nl.toLowerCase().includes(needle)));
  }, [filter]);

  if (!open) return null;

  const toggle = (nl: string) =>
    setSelected((current) =>
      current.includes(nl) ? current.filter((b) => b !== nl) : [...current, nl],
    );

  const submit = async () => {
    if (selected.length === 0 || effectiveDays < 1 || busy) return;

    setBusy(true);
    try {
      const derivedTitle =
        title.trim() ||
        `${selected.length === 1 ? selected[0] : `${selected.length} boeken`} in ${effectiveDays} dagen`;

      const response = await fetch('/api/v1/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: derivedTitle,
          description: `Zelf samengesteld plan: ${selected.join(', ')} — ${totalChapters} hoofdstukken in ${effectiveDays} dagen.`,
          bookNames: selected,
          durationDays: effectiveDays,
          pace,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Plan maken mislukt',
          description: data.message || data.error || 'Er is een fout opgetreden',
          variant: 'destructive',
        });
        return;
      }

      for (const warning of data.warnings ?? []) {
        toast({ title: 'Let op', description: warning });
      }
      toast({ title: 'Plan aangemaakt', description: derivedTitle });
      onCreated(data.plan.id);
    } catch {
      toast({ title: 'Plan maken mislukt', description: 'Geen verbinding', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-foreground">
              Stel je eigen leesplan samen
            </h2>
            <p className="text-[12px] text-gray-500 dark:text-muted-foreground mt-0.5">
              Kies de boeken en het tempo. Wij verdelen de hoofdstukken over de dagen.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Books */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-2">
              Bijbelboeken
            </label>
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Zoek een boek…"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-[13px] text-gray-900 dark:text-foreground mb-2 outline-none focus:border-teal-500"
            />
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-0.5">
              {books.map((book) => {
                const active = selected.includes(book.nl);
                return (
                  <button
                    key={book.en}
                    onClick={() => toggle(book.nl)}
                    className="px-2.5 py-1 rounded-full text-[12px] border transition-colors"
                    style={
                      active
                        ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' }
                        : { borderColor: 'rgba(0,0,0,0.10)' }
                    }
                  >
                    {book.nl}
                    <span className={active ? 'opacity-70 ml-1' : 'opacity-40 ml-1'}>{book.chapters}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pace */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-2">
              Tempo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PACES.map((option) => {
                const active = pace === option;
                return (
                  <button
                    key={option}
                    onClick={() => {
                      setPace(option);
                      setDays('');
                    }}
                    className="text-left px-3 py-2.5 rounded-lg border transition-colors"
                    style={
                      active
                        ? { borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.06)' }
                        : { borderColor: 'rgba(0,0,0,0.10)' }
                    }
                  >
                    <span
                      className="block text-[12.5px] font-semibold capitalize"
                      style={{ color: active ? '#0F766E' : undefined }}
                    >
                      {option}
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-muted-foreground mt-0.5">
                      {PACE_CHAPTERS_PER_DAY[option]} hoofdstuk
                      {PACE_CHAPTERS_PER_DAY[option] > 1 ? 'ken' : ''} per dag
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-muted-foreground mt-1.5">
              {PACE_LABELS[pace]}
            </p>
          </div>

          {/* Duration + title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-2">
                Aantal dagen
              </label>
              <input
                type="number"
                min={1}
                value={days}
                onChange={(event) => setDays(event.target.value === '' ? '' : Number(event.target.value))}
                placeholder={suggestedDays > 0 ? String(suggestedDays) : '30'}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-[13px] text-gray-900 dark:text-foreground outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground mb-2">
                Titel (optioneel)
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={selected.length === 1 ? `${selected[0]} in ${effectiveDays || 30} dagen` : 'Mijn leesplan'}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-[13px] text-gray-900 dark:text-foreground outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {selected.length > 0 && (
            <div
              className="rounded-lg p-3 text-[12px]"
              style={{ backgroundColor: 'rgba(13,148,136,0.06)', color: '#0F766E' }}
            >
              {selected.length} boek{selected.length > 1 ? 'en' : ''} · {totalChapters} hoofdstukken ·{' '}
              {effectiveDays} dagen · gemiddeld <strong className="tabular-nums">{perDay}</strong> hoofdstuk
              per dag.
              {effectiveDays > totalChapters && (
                <span className="block mt-1 opacity-80">
                  Er zijn minder hoofdstukken dan dagen, dus het plan wordt {totalChapters} dagen lang.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-border">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-[13px] border border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary"
          >
            Annuleren
          </button>
          <button
            onClick={submit}
            disabled={selected.length === 0 || busy}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Plan aanmaken
          </button>
        </div>
      </div>
    </div>
  );
}
