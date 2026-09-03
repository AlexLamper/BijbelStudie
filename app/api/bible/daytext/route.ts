import { NextResponse } from "next/server"
import { CANONICAL_NL } from "../../../../lib/book-mapping"
import { DAY_TEXT_CACHE_CONTROL } from "../../../../lib/httpCache"
import { recordDayText } from "../../../../lib/mobileDayText"

export async function GET() {
  try {
    const res = await fetch("https://bijbelapi.com/api/daytext?version=sv", {
      next: { revalidate: 86400 }, // cache 24 hours - one verse per day
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Externe API niet bereikbaar" }, { status: 502 })
    }

    const data = await res.json()

    // BijbelAPI returns English book names ("Ecclesiastes"); the app is Dutch-only,
    // and the Statenvertaling data is keyed on the canonical Dutch names.
    const book = CANONICAL_NL[data.book] ?? data.book

    // Files the day in the shared archive that backs "Voorgaande dagen". Best
    // effort inside its own helper, so a database hiccup cannot cost the
    // reader today's verse.
    await recordDayText({
      text:      data.text,
      reference: `${book} ${data.chapter}:${data.verse}`,
      version:   "Statenvertaling",
      book,
      chapter:   Number(data.chapter),
      verse:     Number(data.verse),
    })

    return NextResponse.json(
      {
        text:      data.text,
        reference: `${book} ${data.chapter}:${data.verse}`,
        version:   "Statenvertaling",
        book,
        chapter:   Number(data.chapter),
        verse:     Number(data.verse),
      },
      // Everyone gets the same verse today, so one shared copy serves them all.
      { headers: { "Cache-Control": DAY_TEXT_CACHE_CONTROL } },
    )
  } catch {
    return NextResponse.json({ error: "Verbindingsfout" }, { status: 500 })
  }
}
