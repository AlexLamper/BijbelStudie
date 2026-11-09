import type { NextRequest } from 'next/server';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { requireUser } from '../../../../lib/apiAuth';
import { personalLimitReason, type ProFeature } from '../../../../lib/entitlements';
import { allowanceKey, claimAllowance, recordTrialUsage } from '../../../../lib/reverseTrial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/allowance `{ kind, key }` - "I am about to open this".
 *
 * For the Pro things the server never sees being used, because they are
 * served as static files: the website's grondtekst and cross-references, the
 * app's background music and offline download. One call, three jobs:
 *
 *  - Pro: always allowed; during the reverse trial the use is counted toward
 *    its feature (study or audio).
 *  - Personal limit on that feature: takes one of today's slots
 *    (TINY_STUDY_CHAPTERS_PER_DAY / TINY_AUDIO_PER_DAY) for `key`, atomically,
 *    for website and app together. Reopening the same chapter or track the
 *    same day is free.
 *  - Otherwise: `mode: "free"` - the normal free rule applies, which the
 *    client already knows (a one-verse grondtekst preview, two
 *    cross-references, music and offline Pro only).
 *
 * `kind` and the shape of `key` are closed sets; a key is at most 120 chars.
 */
const KINDS: Record<string, ProFeature> = {
  grondtekst: 'study',
  crossrefs: 'study',
  music: 'audio',
  offline: 'audio',
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const kind = typeof body?.kind === 'string' ? body.kind : '';
    const feature = KINDS[kind];
    if (!feature) return errorV1('UNKNOWN_KIND', 400, 'Onbekend soort.');

    if (user.isPro) {
      void recordTrialUsage(user.id, feature as 'study' | 'audio', user.reverseTrial);
      return jsonV1({ allowed: true, mode: 'pro', feature });
    }

    // No daily slot behind these: cross-references are limited per verse in
    // the list itself, and offline download is Pro for every free account.
    if (kind === 'crossrefs') return jsonV1({ allowed: true, mode: 'free', feature });
    if (kind === 'offline') return jsonV1({ allowed: false, mode: 'free', feature });

    const cap = feature === 'study' ? user.limits.studyChaptersPerDay : user.limits.audioPerDay;
    if (cap === null || cap <= 0) return jsonV1({ allowed: false, mode: 'free', feature });

    const rawKey = typeof body?.key === 'string' ? body.key : '';
    if (!rawKey.trim()) return errorV1('MISSING_KEY', 400, 'key ontbreekt.');
    // The commentary routes key a chapter as "book:chapter" (lib/studyAllowance);
    // the grondtekst sends the same, so one chapter is one slot whichever of
    // the two was opened first.
    const slot = kind === 'grondtekst' ? allowanceKey(...rawKey.split(':').slice(0, 2)) : allowanceKey('music', rawKey);
    const claim = await claimAllowance(user.id, feature as 'study' | 'audio', slot, cap);
    return jsonV1({
      allowed: claim.allowed,
      mode: 'allowance',
      feature,
      used: claim.used,
      cap: claim.cap,
      ...(claim.allowed ? {} : { message: personalLimitReason(feature) }),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
