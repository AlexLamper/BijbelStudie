import React from 'react';

import type { Palette } from '../../../../lib/levensboom/palette';
import { placeCss } from './place';

/**
 * Lets one study's palette tint the page it opened.
 *
 * A scoped `<style>` rather than inline styles, because the things worth
 * tinting are hover, focus and rules - states a `style` attribute cannot
 * express. Everything it sets is a custom property on one element id, so two
 * tinted regions on one page can never bleed into each other.
 *
 * Server-safe on purpose: the tint has to be in the first HTML, or the page
 * repaints its accents a frame after it appears.
 */
export default function PlaceTint({ scopeId, palette }: { scopeId: string; palette: Palette }) {
  return <style>{placeCss(scopeId, palette)}</style>;
}
