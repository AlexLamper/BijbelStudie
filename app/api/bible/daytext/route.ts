import { NextResponse } from "next/server"
import { CANONICAL_NL } from "../../../../lib/book-mapping"
import { DAY_TEXT_CACHE_CONTROL } from "../../../../lib/httpCache"
import { dayTextInVersion, recordDayText } from "../../../../lib/mobileDayText"

/**
 * GET /api/bible/daytext[?version=<translation id>]
 *
 * Without `version` the answer is exactly what it always was: the
 * Statenvertaling. With it, the same verse comes back in that translation
 * (plus `versionId` and, for NBG51, its required `attribution`), or in the
 * Statenvertaling when the translation is not licensed for it or lacks the
 * verse. The query string is part of the URL, so each translation has its own
 * shared CDN copy.
 */
export async function GET(request: Request) {
  try {
    const requested = new URL(request.url).searchParams.get("version")

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
    const base = {
      text:      data.text,
      reference: `${book} ${data.chapter}:${data.verse}`,
      version:   "Statenvertaling",
      book,
      chapter:   Number(data.chapter),
      verse:     Number(data.verse),
    }

    // Files the day in the shared archive that backs "Voorgaande dagen". Best
    // effort inside its own helper, so a database hiccup cannot cost the
    // reader today's verse. The archive stays in the Statenvertaling.
    await recordDayText(base)

    return NextResponse.json(
      await dayTextInVersion(base, requested),
      // Everyone asking for the same translation gets the same verse today, so
      // one shared copy per translation serves them all.
      { headers: { "Cache-Control": DAY_TEXT_CACHE_CONTROL } },
    )
  } catch {
    return NextResponse.json({ error: "Verbindingsfout" }, { status: 500 })
  }
}
