import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./authOptions";
import connectMongoDB from "./mongodb";
import User from "../models/User";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Niet geauthenticeerd" }, { status: 401 }),
    };
  }
  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email })
    .select("isAdmin")
    .lean<{ isAdmin?: boolean }>();
  if (!user?.isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Geen toegang" }, { status: 403 }),
    };
  }
  return { ok: true as const, email: session.user.email };
}
