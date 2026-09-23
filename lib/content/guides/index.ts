import type { Guide } from "./types";
import { GUIDE_HUB } from "./hub";
import { GUIDE_METHODS } from "./methoden";
import { GUIDE_START } from "./beginnen";
import { GUIDE_ONLINE } from "./online";
import { GUIDE_FREE } from "./gratis";
import { GUIDE_EXPLAINED } from "./bijbel-met-uitleg";
import { GUIDE_QUESTIONS } from "./vragen-en-antwoorden";

export type { Guide, GuideSection } from "./types";

export { GUIDE_HUB };

/** The sub-guides, in the order they are listed on the hub. */
export const GUIDE_PAGES: Guide[] = [
  GUIDE_METHODS,
  GUIDE_START,
  GUIDE_ONLINE,
  GUIDE_FREE,
  GUIDE_EXPLAINED,
  GUIDE_QUESTIONS,
];

/** Hub plus sub-guides. Used for the sitemap and the link tests. */
export const GUIDES: Guide[] = [GUIDE_HUB, ...GUIDE_PAGES];

const BY_SLUG = new Map(GUIDES.map(g => [g.slug, g]));

/**
 * Look up a guide by its last URL segment. The hub answers to "", which is
 * what generateStaticParams would produce for /bijbelstudie itself.
 */
export function getGuide(slug: string): Guide | undefined {
  return BY_SLUG.get(slug);
}
