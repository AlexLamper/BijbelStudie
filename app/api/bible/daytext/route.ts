import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch("https://bijbelapi.com/api/daytext?version=sv", {
      next: { revalidate: 86400 }, // cache 24 hours — one verse per day
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Externe API niet bereikbaar" }, { status: 502 })
    }

    const data = await res.json()

    return NextResponse.json({
      text:      data.text,
      reference: `${data.book} ${data.chapter}:${data.verse}`,
      version:   "Statenvertaling",
      book:      data.book,
      chapter:   Number(data.chapter),
      verse:     Number(data.verse),
    })
  } catch {
    return NextResponse.json({ error: "Verbindingsfout" }, { status: 500 })
  }
}
