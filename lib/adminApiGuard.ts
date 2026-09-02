import { resolveUser } from "./apiAuth";
import { errorV1 } from "./apiV1";

/**
 * The admin test for the mobile app's `/api/v1/admin/*` surface.
 *
 * `requireAdmin` (lib/adminGuard) reads the website's NextAuth cookie, which a
 * native client never sends. This one resolves the caller through
 * `resolveUser`, so `Authorization: Bearer <access jwt>` works - and the admin
 * decision is still a server-side read of the account (`User.isAdmin`, or
 * ADMIN_EMAILS, both applied by `toAuthUser`), never anything the client
 * claims. The mobile access token deliberately carries no admin claim: hiding
 * the screen in the app is a convenience, this check is the boundary.
 *
 * Kept out of lib/adminGuard so the website's admin routes do not start
 * importing the mobile licensing/JWT modules that lib/apiV1 pulls in.
 */
export async function requireAdminApi(req: Request) {
  const user = await resolveUser(req);
  if (!user) {
    return { ok: false as const, response: errorV1("UNAUTHORIZED", 401) };
  }
  if (!user.isAdmin) {
    return {
      ok: false as const,
      response: errorV1("FORBIDDEN", 403, "Dit account heeft geen beheerdersrechten."),
    };
  }
  return { ok: true as const, user };
}
