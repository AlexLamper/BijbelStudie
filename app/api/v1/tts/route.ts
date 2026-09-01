import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1, V1_CORS_HEADERS } from '../../../../lib/apiV1';
import { CLOUD_VOICES, getCloudVoice } from '../../../../lib/cloudVoices';
import connectMongoDB from '../../../../lib/mongodb';
import TtsUsage from '../../../../models/TtsUsage';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

// Same limits as `/api/tts` on the website - one Google quota, two clients.
const MAX_CHARS_PER_REQUEST = 4500;
const MONTHLY_CAP = 800_000;
const DEFAULT_VOICE = 'diana';

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Available voices plus this month's usage, so the app can hide the button. */
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const configured = !!process.env.GOOGLE_TTS_API_KEY;

    let used = 0;
    if (configured) {
      try {
        await connectMongoDB();
        const doc = await TtsUsage.findOne({ month: currentMonth() }).lean<{ charsUsed: number }>();
        used = doc?.charsUsed ?? 0;
      } catch {
        // usage is advisory only
      }
    }

    return jsonV1({
      configured,
      voices: configured ? CLOUD_VOICES : [],
      usage: configured ? { used, cap: MONTHLY_CAP } : null,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Synthesises a passage and returns `audio/mpeg`.
 *
 * The app plays the bytes directly rather than being handed a signed URL,
 * which keeps the Google key server-side - the same reason the website
 * proxies it.
 */
export async function POST(req: Request) {
  try {
    await requireUser(req);

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) return errorV1('TTS_NOT_CONFIGURED', 503, 'TTS niet geconfigureerd');

    const body = await req.json().catch(() => null);
    if (!body || typeof body.text !== 'string' || body.text.length === 0) {
      return errorV1('MISSING_TEXT', 400, 'Tekst ontbreekt');
    }

    const text: string = body.text;
    if (text.length > MAX_CHARS_PER_REQUEST) {
      return errorV1(
        'TEXT_TOO_LONG',
        413,
        `Tekst te lang (max ${MAX_CHARS_PER_REQUEST} tekens, ontvangen ${text.length})`,
      );
    }

    const voice = getCloudVoice(typeof body.voice === 'string' ? body.voice : DEFAULT_VOICE);
    if (!voice) return errorV1('UNKNOWN_VOICE', 400, 'Onbekende stem');

    const rate = typeof body.rate === 'number' && body.rate >= 0.5 && body.rate <= 2 ? body.rate : 1;

    await connectMongoDB();
    const month = currentMonth();
    const updated = await TtsUsage.findOneAndUpdate(
      { month },
      { $inc: { charsUsed: text.length }, $set: { lastUpdated: new Date() } },
      { upsert: true, new: true },
    ).lean<{ charsUsed: number }>();

    const refund = () => TtsUsage.updateOne({ month }, { $inc: { charsUsed: -text.length } });

    const newTotal = updated?.charsUsed ?? text.length;
    if (newTotal > MONTHLY_CAP) {
      await refund();
      return jsonV1(
        {
          error: 'TTS_MONTHLY_CAP',
          message: 'Maandelijkse voorleeslimiet bereikt. Probeer het volgende maand opnieuw.',
          monthlyCap: MONTHLY_CAP,
          used: newTotal - text.length,
        },
        { status: 429 },
      );
    }

    let googleResponse: Response;
    try {
      googleResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: 'nl-NL', name: voice.googleId },
            audioConfig: { audioEncoding: 'MP3', speakingRate: rate, sampleRateHertz: 24000 },
          }),
        },
      );
    } catch (fetchErr) {
      await refund();
      throw fetchErr;
    }

    if (!googleResponse.ok) {
      await refund();
      console.error('[api/v1/tts] Google TTS error:', googleResponse.status);
      return errorV1('TTS_CALL_FAILED', 502, 'TTS-aanroep mislukt');
    }

    const data = (await googleResponse.json()) as { audioContent?: string };
    if (!data.audioContent) {
      await refund();
      return errorV1('TTS_EMPTY', 502, 'Geen audio teruggekregen');
    }

    const audioBuffer = Buffer.from(data.audioContent, 'base64');
    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        ...V1_CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(audioBuffer.length),
      },
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
