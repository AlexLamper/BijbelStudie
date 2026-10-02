import { errorV1, handleV1Error } from '../../../../lib/apiV1';
import { FriendsError } from '../../../../lib/friends/service';

/**
 * One place that turns a `FriendsError` into a response, so every friends
 * handler stays a plain try/catch over `handleV1Error` - which already covers
 * UNAUTHORIZED, bad JSON and the 500 error id.
 */
export function handleFriendsError(error: unknown) {
  if (error instanceof FriendsError) return errorV1(error.code, error.status, error.message);
  return handleV1Error(error);
}

/** Private by nature: a kring must never be cached by a proxy or the browser. */
export const PRIVATE = { headers: { 'Cache-Control': 'private, no-store' } };

/** A body that is absent or not JSON is an empty object, not a 500. */
export async function readBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
