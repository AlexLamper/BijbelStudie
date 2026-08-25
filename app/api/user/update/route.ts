import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { authOptions } from "../../../../lib/authOptions";

/**
 * Updates the caller's own display name and bio.
 *
 * Two things this route used to get wrong:
 *
 * 1. It echoed the whole Mongoose document back to the browser. That document
 *    carries `password`, `resetToken`, `resetTokenExpires` and `stripeCustomerId`
 *    - so a routine profile save handed the client the account's own credential
 *    material. The response is now an explicit whitelist.
 * 2. `name` and `bio` went into the update unvalidated and untyped. The display
 *    name is rendered in group member lists and discussions, so it is other
 *    people's screens, not just the owner's.
 */

const MAX_NAME_LENGTH = 60;
const MAX_BIO_LENGTH = 500;

/** Strips control characters (including the bidi overrides used to spoof names). */
function sanitizeLine(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Ongeldige aanvraag" }, { status: 400 });
    }

    const { name, bio } = body as { name?: unknown; bio?: unknown };
    const update: { name?: string; bio?: string; updatedAt: Date } = { updatedAt: new Date() };

    if (name !== undefined) {
      if (typeof name !== "string") {
        return NextResponse.json({ message: "Naam is ongeldig" }, { status: 400 });
      }
      const clean = sanitizeLine(name);
      if (clean.length === 0) {
        return NextResponse.json({ message: "Naam mag niet leeg zijn" }, { status: 400 });
      }
      if (clean.length > MAX_NAME_LENGTH) {
        return NextResponse.json(
          { message: `Naam mag maximaal ${MAX_NAME_LENGTH} tekens bevatten` },
          { status: 400 }
        );
      }
      update.name = clean;
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return NextResponse.json({ message: "Bio is ongeldig" }, { status: 400 });
      }
      // Newlines are meaningful in a bio, so only control characters go.
        const clean = bio.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
      if (clean.length > MAX_BIO_LENGTH) {
        return NextResponse.json(
          { message: `Bio mag maximaal ${MAX_BIO_LENGTH} tekens bevatten` },
          { status: 400 }
        );
      }
      update.bio = clean;
    }

    await connectMongoDB();

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      update,
      { new: true }
    )
      .select("name bio")
      .lean<{ name?: string; bio?: string }>();

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: { name: updatedUser.name ?? "", bio: updatedUser.bio ?? "" },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ message: "Error updating user" }, { status: 500 });
  }
}
