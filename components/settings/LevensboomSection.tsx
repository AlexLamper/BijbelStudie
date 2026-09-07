'use client';

import Link from 'next/link';
import { Switch } from '../ui/switch';
import { useLevensboom } from '../../hooks/useLevensboom';

const TEAL = '#0D9488';

/**
 * The two Levensboom controls, mirroring the app's Instellingen section.
 *
 * Turning the tree off is purely visual: XP, levels and badges keep accruing,
 * which is what the copy has to say out loud or the toggle reads as "stop
 * counting my progress".
 */
export default function LevensboomSection() {
  const { data, loading, setPrefs } = useLevensboom();
  const prefs = data?.levensboom;

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
      <Link href="/profiel/boom" className="inline-block text-xs font-semibold no-underline" style={{ color: TEAL }}>
        Bekijk je boom →
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
