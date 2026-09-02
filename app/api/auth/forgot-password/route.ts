import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { findUserByEmail } from "../../../../lib/userLookup";
import { createResetToken } from "../../../../lib/resetToken";
import { sendEmail, SITE_ORIGIN } from "../../../../lib/channels/email";
import { renderPasswordResetEmail } from "../../../../lib/emailTemplates/passwordReset";

/**
 * Starts a password reset.
 *
 * `/wachtwoord-vergeten` has been POSTing here since the page was written, but
 * the route did not exist - the request 404'd, the page showed its generic
 * error, and `lib/content/helpFaq.ts` promised the mail was on its way. Anyone
 * who forgot their password and had no OAuth provider on the account was
 * locked out permanently.
 *
 * THE ANSWER IS ALWAYS THE SAME. Whether or not the address belongs to an
 * account, whether or not that account has a password, and whether or not the
 * mail actually left, this returns 200 with one message. Any difference -
 * wording, status, or response time - turns the endpoint into a way to ask
 * "does this person have an account here", which for a religious site is
 * information worth protecting rather than a mere convenience.
 *
 * That also means a mail failure is invisible to the caller by design; it is
 * logged instead. See `lib/channels/email.ts`.
 */

/** Said back for every outcome. */
const NEUTRAL_MESSAGE =
  "Als er een account bij dit e-mailadres hoort, is er een link verstuurd om je wachtwoord opnieuw in te stellen. Controleer ook je spamfolder.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Per-address throttle, so one address cannot be used to send someone a
 * hundred reset mails. In-memory: this is a best-effort courtesy to the
 * recipient and to our sending reputation, not a security control, and it is
 * per serverless instance. The security property that matters - a token being
 * unguessable and short-lived - does not depend on it.
 */
const MIN_INTERVAL_MS = 60 * 1000;
const lastRequestAt = new Map<string, number>();

function throttled(key: string): boolean {
  const now = Date.now();
  const previous = lastRequestAt.get(key);
  if (previous !== undefined && now - previous < MIN_INTERVAL_MS) return true;

  lastRequestAt.set(key, now);
  // Bound the map: an instance that has been warm for a long time should not
  // accumulate every address it has ever seen.
  if (lastRequestAt.size > 500) {
    for (const [k, t] of lastRequestAt) {
      if (now - t >= MIN_INTERVAL_MS) lastRequestAt.delete(k);
    }
  }
  return false;
}

function neutral() {
  return NextResponse.json({ message: NEUTRAL_MESSAGE }, { status: 200 });
}

export async function POST(request: NextRequest) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return neutral();
  }

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    // Even a malformed address gets the neutral answer. The page validates the
    // format itself, so anything arriving here malformed is not a real user
    // making a typo.
    return neutral();
  }

  const address = email.trim();
  if (throttled(address.toLowerCase())) return neutral();

  try {
    await connectMongoDB();
    const user = await findUserByEmail(address);

    // No account, or an OAuth-only account with no password to reset. Sending
    // a reset link to a Google-only account would walk them into a form that
    // sets a credentials password they never asked for.
    if (!user || !user.password) return neutral();

    const { token, tokenHash, expiresAt } = createResetToken();

    // `updateOne` on the two fields rather than `user.save()`. A full save
    // validates and rewrites the whole document, which is what put a `$*` key
    // into `readChapters` and then made every later save of that user throw -
    // see the note in `models/User.js`.
    await User.updateOne(
      { _id: user._id },
      { $set: { resetToken: tokenHash, resetTokenExpires: expiresAt } },
    );

    const resetUrl = `${SITE_ORIGIN}/wachtwoord-herstellen?token=${token}`;
    const mail = renderPasswordResetEmail({ name: user.name ?? "", resetUrl });

    const result = await sendEmail({
      to: user.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      preheader: mail.preheader,
    });

    if (result.status === "failed") {
      console.error(`[forgot-password] Mail niet verzonden: ${result.error}`);
    }
  } catch (err) {
    // Still 200. A database or provider outage must not become a signal about
    // whether the address exists.
    console.error("[forgot-password]", err);
  }

  return neutral();
}
