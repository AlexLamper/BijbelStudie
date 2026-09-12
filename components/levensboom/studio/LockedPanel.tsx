'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { xpForLevel } from '../../../lib/levensboom/client';
import { unlockLabel, type CatalogItem } from '../../../lib/levensboom/catalog';

/**
 * What a locked tile says when the reader taps it.
 *
 * The old answer was one line of 11px type in the reading column ("Amandelboom:
 * Niveau 12 nodig.") that vanished after five seconds - a whisper, on a page
 * whose whole point is that the reader can see what is coming. This is the
 * loud version: the item's name, the rule it hangs on, how far the reader is
 * from it, a bar where there is a number to draw, and one warm line that gets
 * warmer the closer they are.
 *
 * Everything about the rule comes from the catalog item's `unlock` and the
 * account figures the studio already holds (level, XP, longest streak, badges).
 * Nothing here decides whether an item is locked - the served `unlocked` list
 * did that - it only explains the rule. The lines vary by distance and by
 * nothing else: no randomness, seeded or otherwise.
 *
 * Since the redesign it is a card over the scene rather than a panel wedged
 * under the grid, so it wears what everything else that floats on that picture
 * wears: `--panel-card` behind a `--panel-border` hairline at `rounded-panel`,
 * the same surface as the level card and the notices beside it. It also closes
 * itself after a few seconds - LevensboomStudio owns that timer - so everything
 * here has to land in one read.
 *
 * White type on brand teal is 3.7:1, so every fill here that carries a label is
 * `teal-dark` (5.5:1) and the Pro chip is gold plate with gold ink - never white
 * on gold, per the token file.
 */
export default function LockedPanel({
  item,
  level,
  xp,
  longestStreak,
  onClose,
  className,
}: {
  item: CatalogItem;
  level: number;
  xp: number;
  longestStreak: number;
  onClose: () => void;
  className?: string;
}) {
  const detail = describe(item, { level, xp, longestStreak });
  const pro = item.unlock.kind === 'pro';

  return (
    <section
      role="status"
      aria-label={`${item.name} is vergrendeld`}
      className={`rounded-panel p-4 ${className ?? ''}`}
      style={{ backgroundColor: 'var(--panel-card)', border: '1px solid var(--panel-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[1.1px] text-teal-bright">Nog vergrendeld</p>
          <p className="mt-1 flex items-center gap-2 text-[17px] font-bold leading-tight text-white">
            {/* The lock identifies the state of the thing named next to it. */}
            <Lock size={15} aria-hidden className="flex-none text-white/70" />
            <span className="truncate">{item.name}</span>
          </p>
        </div>
        {/* The requirement, in the colour that names it everywhere else on this
            page: gold is Pro, teal is a rule you can read your way towards. */}
        <span
          className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-bold ${
            pro ? 'bg-gold text-gold-ink' : 'bg-teal-dark text-white'
          }`}
        >
          {unlockLabel(item.unlock)}
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-snug text-white">{detail.rule}</p>
      {detail.standing && <p className="mt-1 text-[12.5px] leading-snug text-white/70">{detail.standing}</p>}

      {detail.progress && (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={detail.progress.max}
            aria-valuenow={detail.progress.value}
            aria-valuetext={detail.progress.text}
            className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.14]"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-teal transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${detail.progress.pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-white/60">{detail.progress.text}</p>
        </div>
      )}

      <p className="mt-3 text-[12.5px] font-semibold leading-snug text-teal-bright">{detail.cheer}</p>
      <p className="mt-1 text-[11.5px] text-white/60">Je ziet hem alvast op de achtergrond.</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {pro ? (
          <Link
            href="/abonnement?bron=levensboom"
            className="inline-flex h-9 items-center rounded-btn bg-teal-dark px-4 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
          >
            Bekijk Pro
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-btn px-3 text-[13px] font-semibold text-white/75 transition-colors hover:text-white"
        >
          Sluiten
        </button>
      </div>
    </section>
  );
}

type Standing = { level: number; xp: number; longestStreak: number };

type Detail = {
  /** The rule, as a sentence. */
  rule: string;
  /** Where the reader stands against it, where a figure exists. */
  standing: string | null;
  /** A bar, where the rule is a number the account is climbing towards. */
  progress: { value: number; max: number; pct: number; text: string } | null;
  /** One warm line, chosen by distance alone. */
  cheer: string;
};

const pctOf = (value: number, max: number) => (max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0);

function describe(item: CatalogItem, me: Standing): Detail {
  const rule = item.unlock;
  switch (rule.kind) {
    case 'level': {
      const gap = rule.level - me.level;
      const need = xpForLevel(rule.level);
      const xpLeft = Math.max(0, need - me.xp);
      return {
        rule: `${item.name} gaat open op niveau ${rule.level}.`,
        standing: gap > 0 ? `Je bent niveau ${me.level} - nog ${gap === 1 ? 'één niveau' : `${gap} niveaus`}.` : `Je bent niveau ${me.level}.`,
        progress: { value: Math.min(me.xp, need), max: need, pct: pctOf(me.xp, need), text: `Nog ${xpLeft} XP tot niveau ${rule.level}` },
        cheer:
          gap <= 1
            ? 'Bijna! Eén niveau en hij is van jou.'
            : gap <= 3
              ? 'Bijna! Een paar sessies en je staat er.'
              : gap <= 7
                ? 'Blijf lezen - elke sessie brengt je dichterbij.'
                : 'Een mooie weg te gaan. Je boom groeit met elke stap mee.',
      };
    }
    case 'streak': {
      const left = Math.max(0, rule.days - me.longestStreak);
      return {
        rule: `${item.name} gaat open bij een leesreeks van ${rule.days} dagen.`,
        standing:
          me.longestStreak > 0
            ? `Je langste reeks is ${me.longestStreak} ${me.longestStreak === 1 ? 'dag' : 'dagen'} - nog ${left === 1 ? 'één dag' : `${left} dagen`}.`
            : 'Je hebt nog geen reeks staan.',
        progress: {
          value: Math.min(me.longestStreak, rule.days),
          max: rule.days,
          pct: pctOf(me.longestStreak, rule.days),
          text: `${Math.min(me.longestStreak, rule.days)} van ${rule.days} dagen`,
        },
        cheer:
          left <= 3
            ? `Bijna! Nog ${left === 1 ? 'één dag' : `${left} dagen`} op rij.`
            : left <= 10
              ? 'Lees elke dag even - dan sta je er zo.'
              : 'Een reeks groeit dag voor dag. Vandaag is een goede eerste.',
      };
    }
    case 'badge':
      return {
        rule: `${item.name} gaat open met de badge ‘${rule.label}’.`,
        standing: 'Die heb je nog niet.',
        progress: null,
        cheer: 'Rond een studie af en je bent onderweg.',
      };
    case 'pro':
      return {
        rule: `${item.name} is een extra voor Pro-leden.`,
        standing: null,
        progress: null,
        cheer: 'Met Pro krijg je dit, en meer.',
      };
    case 'free':
      return { rule: `${item.name} is gratis.`, standing: null, progress: null, cheer: 'Kies hem gerust.' };
  }
}
