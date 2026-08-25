import { redirect } from 'next/navigation';

/**
 * Legacy route. The plan detail page briefly lived here, then moved to
 * `/leesplannen/:id`, and leesplannen has since been removed from the website
 * altogether. Old links and bookmarks land on the studies overview rather than
 * a 404 - and rather than the redirect loop this file pointed at once its
 * target was deleted.
 */
export default async function LegacyStudyDetailPage() {
  redirect('/studies');
}
