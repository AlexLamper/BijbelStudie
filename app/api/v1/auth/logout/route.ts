import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import connectMongoDB from '../../../../../lib/mongodb';
import { corsPreflight, handleV1Error, V1_CORS_HEADERS } from '../../../../../lib/apiV1';
import { revokeRefreshToken } from '../../../../../lib/mobileTokens';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken = (body as { refreshToken?: unknown }).refreshToken;

    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      await connectMongoDB();
      await revokeRefreshToken(refreshToken);
    }

    // 204 whether or not the token existed. Logout must never fail - a client
    // that cannot log out would keep a live token on the device.
    return new NextResponse(null, { status: 204, headers: V1_CORS_HEADERS });
  } catch (error) {
    return handleV1Error(error);
  }
}
