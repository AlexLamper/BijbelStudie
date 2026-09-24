import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TreeLab from '../../../components/levensboom/dev/TreeLab';

/**
 * /dev/boom - the tree lab for the growth v2 design pass
 * (LEVENSBOOM_GROWTH_PLAN.md §10.2). Development only: a production build
 * answers 404, and it is in no sitemap or navigation.
 */

export const metadata: Metadata = {
  title: 'Boomlab (dev)',
  robots: { index: false, follow: false },
};

export default function DevBoomPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <TreeLab />;
}
