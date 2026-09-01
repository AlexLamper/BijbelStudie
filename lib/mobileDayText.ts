/**
 * The verse of the day, shared by the website's `/api/bible/daytext` shape and
 * the mobile `/api/v1/daytext` route.
 *
 * Upstream is a third-party service, so every caller treats a failure as "no
 * verse today" rather than an error - the dashboard must still render.
 */

export type DayText = {
  text: string;
  reference: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
};

export async function fetchDayText(): Promise<DayText | null> {
  const res = await fetch('https://bijbelapi.com/api/daytext?version=sv', {
    next: { revalidate: 86400 }, // one verse per day
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.text) return null;

  return {
    text: data.text,
    reference: `${data.book} ${data.chapter}:${data.verse}`,
    version: 'Statenvertaling',
    book: data.book,
    chapter: Number(data.chapter),
    verse: Number(data.verse),
  };
}
