'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Switch } from '../ui/switch';
import { useLevensboom } from '../../hooks/useLevensboom';

const TEAL = '#0D9488';

/**
 * The Levensboom controls, mirroring the app's Instellingen section.
 *
 * Turning the tree off is purely visual: XP, levels and badges keep accruing,
 * which is what the copy has to say out loud or the toggle reads as "stop
 * counting my progress". The public profile is opt-in and says exactly what
 * it shows, because the default is that nobody sees anything.
 */
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
    <div className="space-y-4">
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
      {prefs?.publicProfile && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-foreground dark:bg-secondary">
            /gebruiker/{prefs.seed}
          </code>
          <button type="button" onClick={() => void share()} className="font-semibold" style={{ color: TEAL }}>
            {copied ? 'Gekopieerd' : 'Kopieer link'}
          </button>
        </div>
      )}
      <Link href="/profiel/boom" className="inline-block text-xs font-semibold no-underline" style={{ color: TEAL }}>
        Naar je boom →
      </Link>
    </div>
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
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
