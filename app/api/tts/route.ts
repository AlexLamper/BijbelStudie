import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { CLOUD_VOICES, getCloudVoice } from "../../../lib/cloudVoices";
import connectMongoDB from "../../../lib/mongodb";
import TtsUsage from "../../../models/TtsUsage";

const MAX_CHARS_PER_REQUEST = 4500;
const MONTHLY_CAP = 800_000; // hard cap (Google free tier = 1,000,000 chars/maand Wavenet)
const DEFAULT_VOICE = "diana";

/**
 * Google’s `error.details[0].reason` → a Dutch line the reader can act on.
 *
 * These are all beheerder-side configuration faults, not something the reader
 * did wrong, so each one says plainly that voorlezen is off right now rather
 * than pretending it was a hiccup. BILLING_DISABLED is the common one: Cloud
 * Text-to-Speech has a free monthly tier but still refuses every call until a
 * billing account is attached to the project.
 */
const GOOGLE_ERROR_HINTS: Record<string, string> = {
  BILLING_DISABLED:
    "Voorlezen staat uit: er is nog geen facturering gekoppeld aan het Google Cloud-project. " +
    "Cloud Text-to-Speech weigert elke aanroep zonder facturatie-account, ook binnen de gratis maandlimiet. " +
    "Gebruik zolang een browser-stem.",
  API_KEY_HTTP_REFERRER_BLOCKED:
    "De API key heeft HTTP referrer-restricties. Server-side aanroepen sturen geen Referer header. " +
    "Zet Application restrictions op 'None' in Google Cloud Console.",
  API_KEY_SERVICE_BLOCKED:
    "De API key is niet toegestaan voor Cloud Text-to-Speech. Schakel de Text-to-Speech API in onder API restrictions.",
  SERVICE_DISABLED:
    "De Cloud Text-to-Speech API staat uit voor dit project. Schakel hem in via APIs & Services → Library.",
  RATE_LIMIT_EXCEEDED:
    "De limiet van Google is even bereikt. Probeer het over een paar minuten opnieuw, of gebruik een browser-stem.",
};

const GENERIC_GOOGLE_HINT =
  "De voorleesdienst weigerde de aanvraag. Probeer het later opnieuw of gebruik een browser-stem.";

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet geauthenticeerd" }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "TTS niet geconfigureerd" }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.text !== "string") {
      return NextResponse.json({ error: "Tekst ontbreekt" }, { status: 400 });
    }

    const text: string = body.text;
    if (text.length === 0) {
      return NextResponse.json({ error: "Lege tekst" }, { status: 400 });
    }
    if (text.length > MAX_CHARS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Tekst te lang (max ${MAX_CHARS_PER_REQUEST} tekens, ontvangen ${text.length})` },
        { status: 413 },
      );
    }

    const voiceId: string = typeof body.voice === "string" ? body.voice : DEFAULT_VOICE;
    const voice = getCloudVoice(voiceId);
    if (!voice) {
      return NextResponse.json({ error: "Onbekende stem" }, { status: 400 });
    }

    const rate = typeof body.rate === "number" && body.rate >= 0.5 && body.rate <= 2 ? body.rate : 1;

    // ── Hard cap check ─────────────────────────────────────────────
    await connectMongoDB();
    const month = currentMonth();

    const updated = await TtsUsage.findOneAndUpdate(
      { month },
      { $inc: { charsUsed: text.length }, $set: { lastUpdated: new Date() } },
      { upsert: true, new: true },
    ).lean<{ charsUsed: number }>();

    const newTotal = updated?.charsUsed ?? text.length;
    if (newTotal > MONTHLY_CAP) {
      // Refund: we already incremented, but we won't call Google. Refund the increment.
      await TtsUsage.updateOne(
        { month },
        { $inc: { charsUsed: -text.length } },
      );
      const used = newTotal - text.length;
      return NextResponse.json(
        {
          error: "Maandelijkse TTS-limiet bereikt",
          hint: `Deze maand is het veilige limiet van ${MONTHLY_CAP.toLocaleString("nl-NL")} tekens bereikt (huidig: ${used.toLocaleString("nl-NL")}). De limiet reset op de eerste van de volgende maand. Gebruik tot dan een browser-stem.`,
          monthlyCap: MONTHLY_CAP,
          used,
        },
        { status: 429 },
      );
    }

    // ── Google TTS call ─────────────────────────────────────────────
    let googleResponse: Response;
    try {
      googleResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: "nl-NL", name: voice.googleId },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: rate,
              sampleRateHertz: 24000,
            },
          }),
        },
      );
    } catch (fetchErr) {
      // Network error - refund the increment.
      await TtsUsage.updateOne({ month }, { $inc: { charsUsed: -text.length } });
      throw fetchErr;
    }

    if (!googleResponse.ok) {
      // Google rejected - refund.
      await TtsUsage.updateOne({ month }, { $inc: { charsUsed: -text.length } });
      const errText = await googleResponse.text();
      console.error("[tts] Google TTS error:", googleResponse.status, errText);
      let reason: string | undefined;
      let message: string | undefined;
      try {
        const parsed = JSON.parse(errText);
        message = parsed?.error?.message;
        reason = parsed?.error?.details?.[0]?.reason;
      } catch { /* ignore */ }
      // The client shows `hint` verbatim to the reader, so every branch here has
      // to be Dutch and readable. Falling through to Google's own `message`
      // meant a wall of English ("This API method requires billing...") ended up
      // in the UI, which is why there is always a generic Dutch fallback now.
      const hint = GOOGLE_ERROR_HINTS[reason ?? ""] ?? GENERIC_GOOGLE_HINT;
      return NextResponse.json(
        { error: "TTS-aanroep mislukt", status: googleResponse.status, reason, message, hint },
        { status: 502 },
      );
    }

    const data = (await googleResponse.json()) as { audioContent?: string };
    if (!data.audioContent) {
      await TtsUsage.updateOne({ month }, { $inc: { charsUsed: -text.length } });
      return NextResponse.json({ error: "Geen audio teruggekregen" }, { status: 502 });
    }

    const audioBuffer = Buffer.from(data.audioContent, "base64");
    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(audioBuffer.length),
      },
    });
  } catch (err) {
    console.error("[tts] Server error:", err);
    return NextResponse.json({ error: "Server fout" }, { status: 500 });
  }
}

export async function GET() {
  const configured = !!process.env.GOOGLE_TTS_API_KEY;
  let used = 0;
  if (configured) {
    try {
      await connectMongoDB();
      const doc = await TtsUsage.findOne({ month: currentMonth() }).lean<{ charsUsed: number }>();
      used = doc?.charsUsed ?? 0;
    } catch { /* ignore */ }
  }
  return NextResponse.json({
    configured,
    voices: configured ? CLOUD_VOICES : [],
    usage: configured ? { used, cap: MONTHLY_CAP } : null,
  });
}
