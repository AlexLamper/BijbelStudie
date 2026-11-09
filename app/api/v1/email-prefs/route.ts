import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { readEmailPrefs, writeEmailPrefs } from '../../../../lib/emailPrefs';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/v1/email-prefs -> { winback, all }
 *
 * The engagement-mail switches (lib/emailPrefs.ts). Both default to on.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    return jsonV1(await readEmailPrefs(auth.id), { headers: NO_STORE });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * PATCH /api/v1/email-prefs  { winback?: boolean, all?: boolean }
 *
 * Unknown keys and non-boolean values are ignored, so an older client can
 * never switch something off by accident. Turning `winback` on also turns
 * `all` back on: the reader is asking for mail.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const patch: { winback?: boolean; all?: boolean } = {};
    if (typeof body?.winback === 'boolean') patch.winback = body.winback;
    if (typeof body?.all === 'boolean') patch.all = body.all;
    return jsonV1(await writeEmailPrefs(auth.id, patch), { headers: NO_STORE });
  } catch (error) {
    return handleV1Error(error);
  }
}
