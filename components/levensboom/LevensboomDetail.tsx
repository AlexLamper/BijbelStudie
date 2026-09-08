'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TreeCanvas from './TreeCanvas';
import LevelUpDialog from './LevelUpDialog';
import { useLevensboom } from '../../hooks/useLevensboom';
import { allFruits, FRUIT_REFERENCE, TRAIT_LABELS, TRAIT_LEVELS, type TreeTrait } from '../../lib/levensboom/traits';
import { SkeletonPage } from '../ui/skeletons';

const TEAL = '#0D9488';

const TRAIT_ORDER: TreeTrait[] = ['blossom', 'fruit', 'twin', 'seasons'];

/**
 * /profiel/boom - the tree, what it is made of, and what makes it grow.
 *
 * The mirror of the app's `levensboom_screen.dart`, down to the Psalm 1:3
 * header and the XP table, which is read from the server rather than written
 * out here so the two lists cannot drift from what is actually awarded.
 */
export default function LevensboomDetail() {
  const { data, loading, celebrate, dismissCelebration, setPrefs } = useLevensboom();

  if (loading) return <SkeletonPage fullHeight />;
  if (!data?.levensboom) {
    return (
      <div className="px-6 py-10 xl:px-10">
        <p className="text-sm text-muted-foreground">Je voortgang kon niet worden geladen.</p>
      </div>
    );
  }

  const { levensboom } = data;
  const frac = data.xpForNextLevel > 0 ? data.xpIntoLevel / data.xpForNextLevel : 0;
  const remaining = Math.max(0, data.xpForNextLevel - data.xpIntoLevel);
  const fruits = allFruits();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-background px-6 pb-5 pt-7 xl:px-10">
        <Link
          href="/profiel"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground no-underline hover:bg-gray-100 dark:hover:bg-secondary"
          aria-label="Terug naar profiel"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Mijn boom</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Groeit mee met wat je leest en bestudeert
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 xl:px-10">
          {levensboom.disabled ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-border dark:bg-card">
              <p className="text-sm font-bold text-foreground">Je boom staat uit</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Je XP, niveau en badges lopen gewoon door — alleen de boom wordt niet getoond.
              </p>
              <button
                onClick={() => void setPrefs({ disabled: false })}
                className="mt-4 rounded-lg px-3 py-2 text-xs font-semibold text-white"
                style={{ backgroundColor: TEAL }}
              >
                Boom weer tonen
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-border">
              <div className="h-72 sm:h-96">
                <TreeCanvas
                  seed={levensboom.seed}
                  level={data.level}
                  frac={frac}
                  health={levensboom.health}
                  reducedMotion={levensboom.reducedMotion}
                  className="block h-full w-full"
                />
              </div>
            </div>
          )}

          {/* Psalm 1:3 - the header of the screen, and the reason the metaphor
              is a tree and not a score. */}
          <p className="mt-5 text-sm italic leading-relaxed text-muted-foreground">
            &ldquo;Want hij zal zijn als een boom, geplant aan waterbeken, die zijn vrucht geeft op
            zijn tijd.&rdquo;
            <span className="not-italic"> — Psalm 1:3</span>
          </p>

          {/* Level + XP */}
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-bold text-foreground">Niveau {data.level}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                nog {remaining} XP tot niveau {data.level + 1}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${data.progressPercentage}%`, backgroundColor: TEAL }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">{data.xp} XP totaal</p>

            {levensboom.wilting && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                Je boom hangt er wat slap bij — je hebt {levensboom.daysSinceActive} dagen niet
                gelezen. Eén sessie en hij staat er weer fris bij.
              </p>
            )}
          </div>

          {/* Vruchten van de Geest */}
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card">
            <p className="text-sm font-bold text-foreground">Vruchten van de Geest</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{FRUIT_REFERENCE}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-3">
              {fruits.map((fruit) => {
                const unlocked = data.level >= fruit.level;
                return (
                  <div
                    key={fruit.name}
                    className="rounded-xl border p-3 text-center"
                    style={{
                      borderColor: unlocked ? 'rgba(13,148,136,0.35)' : undefined,
                      backgroundColor: unlocked ? 'rgba(13,148,136,0.06)' : undefined,
                    }}
                  >
                    <p
                      className={`text-xs font-semibold ${unlocked ? '' : 'text-muted-foreground'}`}
                      style={unlocked ? { color: TEAL } : undefined}
                    >
                      {fruit.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                      {unlocked ? 'Behaald' : `Niveau ${fruit.level}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wat je boom nog krijgt */}
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card">
            <p className="text-sm font-bold text-foreground">Hoe je boom groeit</p>
            <ul className="mt-3 space-y-2">
              {TRAIT_ORDER.map((trait) => {
                const unlocked = data.level >= TRAIT_LEVELS[trait];
                return (
                  <li key={trait} className="flex items-start justify-between gap-3 text-xs">
                    <span className={unlocked ? 'text-foreground' : 'text-muted-foreground'}>
                      {TRAIT_LABELS[trait]}
                    </span>
                    <span
                      className="flex-shrink-0 font-semibold tabular-nums"
                      style={{ color: unlocked ? TEAL : undefined }}
                    >
                      {unlocked ? 'Behaald' : `Niveau ${TRAIT_LEVELS[trait]}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* XP table, served rather than hardcoded. */}
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card">
            <p className="text-sm font-bold text-foreground">Wat levert XP op?</p>
            <ul className="mt-3 space-y-1.5">
              {data.xpTable.map((row) => (
                <li key={row.event} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums" style={{ color: TEAL }}>
                    +{row.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Je boom heeft de vorm die bij jouw account hoort en groeit door lezen, studeren,
              aantekeningen maken en dagelijks terugkomen. Blijf je een tijd weg, dan hangt hij er
              slap bij — hij gaat nooit dood en herstelt na één sessie.
            </p>
          </div>

          {/* Controls */}
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card">
            <p className="text-sm font-bold text-foreground">Instellingen</p>
            <label className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Minder beweging</span>
              <input
                type="checkbox"
                checked={levensboom.reducedMotion}
                onChange={(event) => void setPrefs({ reducedMotion: event.target.checked })}
                className="h-4 w-4 accent-[#0D9488]"
              />
            </label>
            <label className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Boom tonen</span>
              <input
                type="checkbox"
                checked={!levensboom.disabled}
                onChange={(event) => void setPrefs({ disabled: !event.target.checked })}
                className="h-4 w-4 accent-[#0D9488]"
              />
            </label>
          </div>

          <div className="h-8" />
        </div>
      </div>

      {celebrate !== null && (
        <LevelUpDialog
          seed={levensboom.seed}
          level={celebrate}
          reducedMotion={levensboom.reducedMotion}
          onClose={() => void dismissCelebration()}
        />
      )}
    </div>
  );
}
