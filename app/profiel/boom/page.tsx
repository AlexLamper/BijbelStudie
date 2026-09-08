import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/pageMetadata';
import LevensboomStudio from '../../../components/levensboom/studio/LevensboomStudio';

export const metadata: Metadata = generatePageMetadata('profileTree');

export default function LevensboomPage() {
  return <LevensboomStudio />;
}
