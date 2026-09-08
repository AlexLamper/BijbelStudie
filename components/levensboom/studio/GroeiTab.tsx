'use client';

import { STAGES } from '../../../lib/levensboom/stages';
import { allFruits, TRAIT_LABELS, TRAIT_LEVELS } from '../../../lib/levensboom/traits';
import { CATALOG, unlockLabel } from '../../../lib/levensboom/catalog';

const TEAL = '#0D9488';

/**
 * The Groei tab: where the tree is on its way, and what each stage brings.
 *
 * A timeline rather than a table of cards - the stages are the story, the
 * fruit and traits hang off the stage they arrive in, and the level-gated
 * catalog items sit at their level so "nog 340 XP" has a face.
 */
export default function GroeiTab({
  level,
  xp,
  xpTable,
}: {
  level: number;
  xp: number;
  xpTable: { event: string; value: number; label: string }[];
}) {
  const fruits = allFruits();
  const gated = CATALOG.filter((item) => item.unlock.kind === 'level');

  return (
    <div className="space-y-6">
      <ol className="relative space-y-0 border-l border-gray-200 pl-5 dark:border-border">
        {STAGES.map((stage, index) => {
          const next = STAGES[index + 1];
          const from = stage.from;
          const to = next ? next.from - 1 : null;
          const reached = level >= from;
          const current = reached && (to === null || level <= to);
          const inBand = (at: number) => at >= from && (to === null || at <= to);
          const bandFruits = fruits.filter((f) => inBand(f.level));
          const bandTraits = (Object.keys(TRAIT_LEVELS) as (keyof typeof TRAIT_LEVELS)[]).filter(
            (t) => t !== 'fruit' && inBand(TRAIT_LEVELS[t]),
          );
          const bandItems = gated.filter((item) => inBand((item.unlock as { level: number }).level));

          return (
            <li key={stage.id} className="relative pb-6 last:pb-0">
              <span
                className="absolute -left-[27px] top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white dark:bg-card"
                style={{ borderColor: reached ? TEAL : 'rgba(0,0,0,0.15)', backgroundColor: current ? TEAL : undefined }}
                aria-hidden
              />
              <div className="flex items-baseline justify-between gap-3">
                <p className={`text-sm font-bold ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {stage.name}
                  {current && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: TEAL }}>
                      Nu
                    </span>
                  )}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {to === null ? `niveau ${from}+` : from === to ? `niveau ${from}` : `niveau ${from}–${to}`}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{stage.blurb}</p>

              {(bandFruits.length > 0 || bandTraits.length > 0 || bandItems.length > 0) && (
                <ul className="mt-2 space-y-1">
                  {bandTraits.map((trait) => (
                    <Row key={trait} at={TRAIT_LEVELS[trait]} level={level} label={TRAIT_LABELS[trait]} />
                  ))}
                  {bandFruits.map((fruit) => (
                    <Row key={fruit.name} at={fruit.level} level={level} label={`Vrucht: ${fruit.name.toLowerCase()}`} />
                  ))}
                  {bandItems.map((item) => (
                    <Row
                      key={`${item.kind}:${item.id}`}
                      at={(item.unlock as { level: number }).level}
                      level={level}
                      label={`${item.name} (${unlockLabel(item.unlock).toLowerCase()})`}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <details className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-border dark:bg-card">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Wat levert XP op?</summary>
        <ul className="mt-3 space-y-1.5">
          {xpTable.map((row) => (
            <li key={row.event} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums" style={{ color: TEAL }}>
                +{row.value}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {xp} XP totaal. Blijf je een tijd weg, dan hangt je boom er slap bij — hij gaat nooit dood en
          herstelt na één sessie.
        </p>
      </details>

      <p className="text-xs italic leading-relaxed text-muted-foreground">
        &ldquo;Want hij zal zijn als een boom, geplant aan waterbeken, die zijn vrucht geeft op zijn
        tijd.&rdquo;
        <span className="not-italic"> — Psalm 1:3</span>
      </p>
    </div>
  );
}

function Row({ at, level, label }: { at: number; level: number; label: string }) {
  const done = level >= at;
  return (
    <li className="flex items-baseline justify-between gap-3 text-xs">
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      <span className="flex-shrink-0 font-semibold tabular-nums" style={{ color: done ? TEAL : undefined }}>
        {done ? 'Behaald' : `Niveau ${at}`}
      </span>
    </li>
  );
}
