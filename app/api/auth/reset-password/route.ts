import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { hashResetToken, isWellFormedResetToken } from "../../../../lib/resetToken";

/**
 * Finishes a password reset.
 *
 * The counterpart to `/api/auth/forgot-password`; `/wachtwoord-herstellen` has
 * been POSTing here to a route that did not exist.
 *
 * Unlike the request step, this one does report failure - the person is
 * holding a link and needs to know whether it still works. That leaks nothing:
 * the answer is about a 32-byte random token, not about an address.
 *
 * The token is looked up by hash and cleared in the same conditional update,
 * so it is single-use even if the link is opened twice at once.
 */

/** Matches the register route, which is the other place a password is set. */
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    let token: unknown;
    let password: unknown;
    try {
      ({ token, password } = await request.json());
    } catch {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }

    if (!isWellFormedResetToken(token)) {
      return NextResponse.json(
        { error: "Deze link is niet geldig. Vraag een nieuwe aan." },
        { status: 400 },
      );
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Kies een wachtwoord van minstens ${MIN_PASSWORD_LENGTH} tekens.` },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // One atomic step: match an unexpired token and swap the password in the
    // same operation. Reading first and writing second would let two
    // simultaneous submissions of the same link both succeed.
    //
    // `updateOne` on explicit paths, not `save()` - see the note in
    // `models/User.js` about full-document saves on this collection.
    const result = await User.updateOne(
      {
        resetToken: hashResetToken(token),
        resetTokenExpires: { $gt: new Date() },
      },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpires: "" },
      },
    );

    if (result.matchedCount === 0) {
      // Expired, already used, or never real - all the same answer, because
      // the only useful next step is identical for each.
      return NextResponse.json(
        { error: "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Je wachtwoord is aangepast. Je kunt nu inloggen." },
      { status: 200 },
    );
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer het opnieuw." },
      { status: 500 },
    );
  }
}
