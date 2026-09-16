/**
 * The password rules for a signed-in password change (app/api/user/password).
 * They mirror the two other places a password is set - app/api/auth/register
 * and app/api/auth/reset-password: at least 8 characters, bcrypt at cost 12.
 * Change all three together.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const BCRYPT_ROUNDS = 12;

/** A Dutch error for an unacceptable new password, or null when it is fine. */
export function newPasswordError(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Kies een wachtwoord van minstens ${MIN_PASSWORD_LENGTH} tekens.`;
  }
  return null;
}
