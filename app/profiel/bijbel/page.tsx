import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/pageMetadata';
import BibleProgressView from '../../../components/profile/BibleProgressView';

export const metadata: Metadata = generatePageMetadata('profileBible');

/**
 * "Bijbel gelezen": every book with the chapters read, opened from the
 * Bijbelboeken card on the dashboard. A page rather than a dialog so the link
 * survives a reload and the browser's back button returns from the reader to
 * the book that was open. The session and guest gate come from
 * app/profiel/layout.tsx.
 */
export default function BibleProgressPage() {
  return <BibleProgressView />;
}
