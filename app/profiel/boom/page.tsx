import type { Metadata } from 'next';
import { generatePageMetadata } from '../../../lib/pageMetadata';
import LevensboomDetail from '../../../components/levensboom/LevensboomDetail';

export const metadata: Metadata = generatePageMetadata('profileTree');

export default function LevensboomPage() {
  return <LevensboomDetail />;
}
