// Emails listed in ADMIN_EMAILS (comma-separated) are treated as admin
// regardless of the User.isAdmin flag in MongoDB. This bootstraps admin
// access on environments where no DB user has isAdmin=true yet.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return false;
  const target = email.trim().toLowerCase();
  return raw
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}
