import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { rotateRefreshToken } from '../../../../../lib/mobileTokens';
import { signAccessToken } from '../../../../../lib/mobileJwt';
import { serialiseUser } from '../../../../../lib/mobileAuthFlow';
import { toAuthUser } from '../../../../../lib/apiAuth';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken || typeof refreshToken !== 'string') {
      return errorV1('MISSING_FIELDS', 400, 'refreshToken is verplicht.');
    }

    await connectMongoDB();
    const result = await rotateRefreshToken(refreshToken);

    if (!result.ok) {
      // A replay means the whole family has just been revoked. The client must
      // treat this as "signed out everywhere" and send the user to login —
      // retrying with a stored token will only fail again.
      if (result.reason === 'replayed') {
        return errorV1(
          'REFRESH_TOKEN_REPLAYED',
          401,
          'Sessie ingetrokken uit veiligheidsoverwegingen. Log opnieuw in.',
        );
      }
      return errorV1('INVALID_REFRESH_TOKEN', 401, 'Sessie verlopen. Log opnieuw in.');
    }

    const doc = await User.findById(result.userId);
    if (!doc) return errorV1('INVALID_REFRESH_TOKEN', 401);

    const user = toAuthUser(doc);
    const { accessToken, expiresIn } = await signAccessToken({
      userId: user.id,
      email: user.email,
      isPro: user.isPro,
    });

    return jsonV1({
      accessToken,
      refreshToken: result.refreshToken,
      expiresIn,
      user: serialiseUser(user),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
