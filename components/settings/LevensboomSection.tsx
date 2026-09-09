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

/** The shared Switch, dressed for a dark panel; its own defaults are tokens
 *  that go near-black in dark mode and disappear here. */
const SCENE_SWITCH =
  'data-[state=unchecked]:bg-white/25 data-[state=checked]:bg-[#0D9488] focus-visible:ring-white focus-visible:ring-offset-transparent [&>span]:bg-white';

/** Accent type on a dark ground: #0D9488 is far too dark to read here. */
const TEAL_ON_DARK = '#2DD4BF';

/** One row of the settings page, repeated here so the columns line up. */
const ROW =
  'flex flex-col gap-2.5 py-4 first:pt-5 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8';

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
      <div className="divide-y divide-white/10">
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
              <p className="text-sm font-medium text-white">Je openbare adres</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                Alleen wie deze link heeft, vindt de pagina.
              </p>
            </div>
            <div className="flex min-w-0 flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-end">
              <code className="truncate rounded bg-white/10 px-2 py-1 text-[11px] text-white ring-1 ring-white/15">
                /gebruiker/{prefs.seed}
              </code>
              <button
                type="button"
                onClick={() => void share()}
                className="rounded-md text-xs font-semibold underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-white"
                style={{ color: TEAL_ON_DARK }}
              >
                {copied ? 'Gekopieerd' : 'Kopieer link'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <Link
          href="/profiel/boom"
          className="inline-block rounded-md text-xs font-semibold no-underline underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-white"
          style={{ color: TEAL_ON_DARK }}
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
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">{hint}</p>
      </div>
      <div className="flex flex-shrink-0 items-center sm:justify-end">
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-label={label}
          className={SCENE_SWITCH}
        />
      </div>
    </div>
  );
}
