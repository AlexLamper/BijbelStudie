import React from 'react';

import type { Palette } from '../../../../lib/levensboom/palette';
import { tintCss } from './studyHorizon';

/**
 * Lets one study's palette tint the page under its window.
 *
 * A scoped `<style>` rather than inline styles, because the things worth
 * tinting are hover, focus and rules - states you cannot express in a `style`
 * attribute. Everything it sets is a custom property on one element id, so two
 * tinted regions on one page can never bleed into each other, and the brand
 * teal keeps the primary action either way.
 *
 * Server-safe on purpose: the tint has to be in the first HTML, or the page
 * repaints its accents a frame after it appears.
 */
export default function StudyTint({ scopeId, palette }: { scopeId: string; palette: Palette }) {
  return <style>{tintCss(scopeId, palette)}</style>;
}
