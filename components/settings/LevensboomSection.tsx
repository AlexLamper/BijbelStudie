'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Switch } from '../ui/switch';
import { useLevensboom } from '../../hooks/useLevensboom';

/**
 * The Voortgang controls, mirroring the app's Instellingen section.
 *
 * Turning the tree off is purely visual: XP, levels and badges keep accruing,
 * which is what the copy has to say out loud or the toggle reads as "stop
 * counting my progress". The public profile is opt-in and says exactly what
 * it shows, because the default is that nobody sees anything.
 *
 * Drawn for the scene panel it sits on (app/instellingen/page.tsx), so every
 * colour here is a literal white - a theme token would flip with the reader's
 * light/dark setting while the landscape behind the panel does not.
 *
 * The row shape is that page's row shape, deliberately: label and hint on the
 * left, control flush to the right edge of the panel, one hairline between
 * rows. It used to be its own thing, which left this panel's switches sitting
 * at a different x from every other control on the page.
 */

/**
 * The design's toggle: a 46 x 27 track with a 21 px knob, teal when on and
 * `line-strong` when off (design_handoff_web/PAGES.md §8). The shared Switch is
 * 44 x 24 with a 20 px knob and its own theme tokens, so the size and both
 * states are set here; the travel follows from the box (46 - 6 - 21 = 19).
 */
const TOGGLE =
  'h-[27px] w-[46px] border-0 px-[3px] data-[state=checked]:bg-teal data-[state=unchecked]:bg-line-strong focus-visible:ring-teal focus-visible:ring-offset-0 [&>span]:h-[21px] [&>span]:w-[21px] [&>span]:bg-white [&>span]:shadow-none [&>span[data-state=checked]]:translate-x-[19px]';

/** One row of the settings page, repeated here so the columns line up. */
const ROW =
  'flex flex-col gap-2.5 py-[14px] first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8';

export default function LevensboomSection() {
  const { data, loading, setPrefs, setPublicProfile } = useLevensboom();
  const prefs = data?.levensboom;
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (!prefs) return;
    const url = `${window.location.origin}/gebruiker/${prefs.seed}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link is visible below either way */
    }
  };

  return (
    <>
      <div className="divide-y divide-line-soft">
        <Row
          label="Boom tonen"
          hint="Je XP, niveau en badges lopen door als je hem verbergt"
          checked={!prefs?.disabled}
          disabled={loading || !prefs}
          onChange={(value) => void setPrefs({ disabled: !value })}
        />
        <Row
          label="Minder beweging"
          hint="Geen wiegen, deeltjes of groei-animatie"
          checked={Boolean(prefs?.reducedMotion)}
          disabled={loading || !prefs}
          onChange={(value) => void setPrefs({ reducedMotion: value })}
        />
        <Row
          label="Openbaar profiel"
          hint="Een pagina met je boom, je voornaam, je niveau en je badges. Nooit je e-mail, reeks of leesgeschiedenis."
          checked={Boolean(prefs?.publicProfile)}
          disabled={loading || !prefs}
          onChange={(value) => void setPublicProfile(value)}
        />

        {/* The address of that page, in a row of its own rather than loose
            under the switch, so it lines up with everything else. */}
        {prefs?.publicProfile && (
          <div className={ROW}>
            <div className="min-w-0 sm:max-w-[26rem]">
              <p className="text-[14.5px] text-ink">Je openbare adres</p>
              <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">
                Alleen wie deze link heeft, vindt de pagina.
              </p>
            </div>
            <div className="flex min-w-0 flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-end">
              <code className="truncate rounded border border-line bg-line-soft px-2 py-1 text-[11px] text-ink-body">
                /gebruiker/{prefs.seed}
              </code>
              <button
                type="button"
                onClick={() => void share()}
                className="text-[12.5px] font-semibold text-teal underline-offset-4 transition-colors hover:underline"
              >
                {copied ? 'Gekopieerd' : 'Kopieer link'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-line-soft pt-4">
        <Link
          href="/profiel/boom"
          className="inline-block text-[13px] font-semibold text-teal no-underline underline-offset-4 transition-colors hover:underline"
        >
          Naar je boom →
        </Link>
      </div>
    </>
  );
}

function Row({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={ROW}>
      <div className="min-w-0 sm:max-w-[26rem]">
        <p className="text-[14.5px] text-ink">{label}</p>
        <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">{hint}</p>
      </div>
      <div className="flex flex-shrink-0 items-center sm:justify-end">
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-label={label}
          className={TOGGLE}
        />
      </div>
    </div>
  );
}
