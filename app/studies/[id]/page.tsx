import { redirect } from 'next/navigation';

/**
 * The plan detail page used to live here, under the `/studies` segment, while
 * `/studies` itself lists curated studies — so nothing ever linked to it and
 * every real link pointed at `/leesplannen/:id`, which did not exist. The page is now
 * at `/leesplannen/:id`; this route stays only to keep old links and bookmarks alive.
 */
export default async function LegacyPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/leesplannen/${id}`);
}
