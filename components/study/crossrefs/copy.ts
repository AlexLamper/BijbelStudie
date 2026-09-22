'use client';

import { useMemo } from 'react';

import { useTranslation } from '../../../app/i18n/client';

/**
 * Every Dutch string the cross-reference surfaces say, in one place.
 *
 * The copy itself lives in `app/i18n/locales/nl/study.json` (`cross_references`
 * and `tabs.crossrefs`, CROSS_LINKS_PLAN.md §4.4) and is read through i18next
 * like the rest of the reader. This table maps the short name each component
 * asks for onto that key, and carries a `defaultValue` so a key that has not
 * landed yet renders the sentence rather than its own name - the feature is
 * free for everyone including guests, and a raw `cross_references.empty` on
 * screen is worse than a duplicated string in this file.
 *
 * Interpolation never uses the variable name `count`: i18next reads that one as
 * a plural selector and would go looking for `_one` / `_other` keys that do not
 * exist, taking the default value down with it. The JSON uses `{{n}}` and
 * `{{ref}}`.
 */
const COPY = {
  /** Materials-pane tab label. Short on purpose - the row is 446 px wide. */
  tab: ['tabs.crossrefs', 'Verwijzingen'],
  panel_title: ['cross_references.panel_title', 'Kruisverwijzingen · {{ref}}'],
  sort_hint: ['cross_references.sort_hint', 'Meest relevante eerst'],
  show_all: ['cross_references.expand', 'Toon alle {{n}}'],
  show_less: ['cross_references.collapse', 'Minder tonen'],
  go_to_text: ['cross_references.navigate', 'Ga naar tekst'],
  back_to: ['cross_references.back', 'Terug naar {{ref}}'],
  empty: ['cross_references.empty', 'Geen kruisverwijzingen bij dit vers.'],
  error: ['cross_references.error', 'Kruisverwijzingen konden niet worden geladen.'],
  numbering_fallback: [
    'cross_references.numbering_fallback',
    'Versnummering kan in deze vertaling afwijken.',
  ],
  missing_verse: ['cross_references.missing_target', 'Dit vers ontbreekt in deze vertaling.'],
  open_in_lezen: ['cross_references.open_in_lezen', 'Openen in Lezen'],
  button_label: ['cross_references.aria.toggle', 'Kruisverwijzingen bij vers {{n}}'],
  panel_label: ['cross_references.aria.toggle', 'Kruisverwijzingen bij vers {{n}}'],
  verse_actions_label: ['cross_references.aria.verse_actions', 'Acties bij vers {{n}}'],

  // Keys the web reader needs that the shared §4.4 table does not list. They
  // are namespaced into the same block, so they land beside the rest when they
  // are added to study.json.
  tab_intro: [
    'cross_references.tab_intro',
    'Andere bijbelteksten die over hetzelfde spreken.',
  ],
  chapter_empty: [
    'cross_references.chapter_empty',
    'Geen kruisverwijzingen in dit hoofdstuk.',
  ],
  /**
   * The study flow's panel is cut down to the lesson's verse range, so it
   * cannot say "in dit hoofdstuk" - the chapter around the gedeelte usually
   * does have references, and claiming otherwise would read as a bug.
   */
  passage_empty: [
    'cross_references.passage_empty',
    'Geen kruisverwijzingen in dit gedeelte.',
  ],
  verse_heading: ['cross_references.verse_heading', 'Vers {{n}}'],
  loading: ['cross_references.loading', 'Kruisverwijzingen laden…'],
  expand_row: ['cross_references.aria.expand_row', 'Toon de tekst van {{ref}}'],
  collapse_row: ['cross_references.aria.collapse_row', 'Verberg de tekst van {{ref}}'],
  jump_to_verse: ['cross_references.aria.jump_to_verse', 'Spring naar vers {{n}} in de tekst'],
} as const;

export type CrossRefCopyKey = keyof typeof COPY;

/** `c('show_all', { n: 23 })` → "Toon alle 23". */
export type CrossRefCopy = (
  key: CrossRefCopyKey,
  vars?: Record<string, string | number>,
) => string;

export function useCrossRefCopy(): CrossRefCopy {
  const { t } = useTranslation('study');
  return useMemo<CrossRefCopy>(
    () => (key, vars) => {
      const [path, fallback] = COPY[key];
      return String(t(path, { defaultValue: fallback, ...(vars ?? {}) }));
    },
    [t],
  );
}
