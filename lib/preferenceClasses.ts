import type { CSSProperties } from 'react';
import { ReadingPreferences } from '../hooks/useReadingPreferences';

export function getPreferenceClasses(preferences?: Partial<ReadingPreferences> | null): string {
  const fontSize = {
    sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl',
  }[(preferences?.fontSize ?? 'base')] ?? 'text-base';

  const fontFamily = {
    sans: 'font-sans', serif: 'font-serif', mono: 'font-mono',
  }[(preferences?.fontFamily ?? 'sans')] ?? 'font-sans';

  const letterSpacing = {
    tight: 'tracking-tight', normal: 'tracking-normal', wide: 'tracking-wide',
  }[(preferences?.letterSpacing ?? 'normal')] ?? 'tracking-normal';

  return `${fontSize} ${fontFamily} ${letterSpacing}`;
}

export function getPreferenceStyles(preferences?: Partial<ReadingPreferences> | null): CSSProperties {
  const lineHeight = {
    normal: 1.5, relaxed: 1.75, loose: 2.25,
  }[(preferences?.lineHeight ?? 'relaxed')] ?? 1.75;
  return { lineHeight };
}
