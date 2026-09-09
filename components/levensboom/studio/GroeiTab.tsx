'use client';

import { STAGES } from '../../../lib/levensboom/stages';
import { allFruits, TRAIT_LABELS, TRAIT_LEVELS } from '../../../lib/levensboom/traits';
import { CATALOG, unlockLabel } from '../../../lib/levensboom/catalog';
import { PANEL_DEEP, TEAL_DEEP, TEAL_ON_DARK } from '../../scene/tokens';

/**
 * The Groei tab: where the tree is on its way, and what each stage brings.
 *
 * A timeline rather than a table of cards - the stages are the story, the
 * fruit and traits hang off the stage they arrive in, and the level-gated
 * catalog items sit at their level so "nog 340 XP" has a face.
 *
 * Drawn for the landscape: literal whites, the accent teal for what is already
 * behind the reader, and TEAL_DEEP under the one chip that carries white type.
 *
 * The whole tab is one PANEL_DEEP, which is what that surface is for: this is a
 * long block of copy, and it sits on the reader's own tree, whose sky runs to
 * #DFF3F7 in the afternoon - the muted greys in a timeline do not survive a
 * lighter ground than this. It is also why the XP list inside it lost its own
 * panel: a panel inside a panel is a box in a box, and there is a picture
 * behind both of them.
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
    <div className={`${PANEL_DEEP} space-y-6 p-5`}>
      <ol className="relative m-0 list-none space-y-0 border-l border-white/20 p-0 pl-5">
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
                className="absolute -left-[27px] top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 bg-[#0B1220]"
                style={{
                  borderColor: reached ? TEAL_ON_DARK : 'rgba(255,255,255,0.3)',
                  backgroundColor: current ? TEAL_ON_DARK : undefined,
                }}
                aria-hidden
              />
              <div className="flex items-baseline justify-between gap-3">
                <p className={`text-sm font-semibold ${reached ? 'text-white' : 'text-white/55'}`}>
                  {stage.name}
                  {current && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: TEAL_DEEP }}>
                      Nu
                    </span>
                  )}
                </p>
                <p className="text-xs tabular-nums text-white/60">
                  {to === null ? `niveau ${from}+` : from === to ? `niveau ${from}` : `niveau ${from}–${to}`}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-white/70">{stage.blurb}</p>

              {(bandFruits.length > 0 || bandTraits.length > 0 || bandItems.length > 0) && (
                <ul className="m-0 mt-2 list-none space-y-1 p-0">
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

      <details className="border-t border-white/15 pt-4">
        <summary className="cursor-pointer rounded-md text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white">
          Wat levert XP op?
        </summary>
        <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
          {xpTable.map((row) => (
            <li key={row.event} className="flex items-center justify-between text-xs">
              <span className="text-white/70">{row.label}</span>
              <span className="font-semibold tabular-nums" style={{ color: TEAL_ON_DARK }}>
                +{row.value}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-white/65">
          {xp} XP totaal. Blijf je een tijd weg, dan hangt je boom er slap bij — hij gaat nooit dood en
          herstelt na één sessie.
        </p>
      </details>

      <p className="text-xs italic leading-relaxed text-white/70">
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
      <span className={done ? 'text-white/90' : 'text-white/55'}>{label}</span>
      <span
        className={`flex-shrink-0 font-semibold tabular-nums ${done ? '' : 'text-white/50'}`}
        style={{ color: done ? TEAL_ON_DARK : undefined }}
      >
        {done ? 'Behaald' : `Niveau ${at}`}
      </span>
    </li>
  );
}
