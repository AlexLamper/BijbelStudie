import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectMongoDB from "../../../../../lib/mongodb";
import User from "../../../../../models/User";
import Note from "../../../../../models/Note";
import { requireAdmin } from "../../../../../lib/adminGuard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_FIELDS = ["isAdmin", "subscribed"] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function PATCH(req: Request, { params }: RouteContext) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const update: Partial<Record<AllowedField, boolean>> = {};
  for (const key of ALLOWED_FIELDS) {
    if (typeof body[key] === "boolean") update[key] = body[key] as boolean;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Geen geldige velden om bij te werken" }, { status: 400 });
  }

  await connectMongoDB();

  const target = await User.findById(id).select("email isAdmin");
  if (!target) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  if (target.email === guard.email && update.isAdmin === false) {
    return NextResponse.json(
      { error: "Je kunt je eigen admin-rechten niet intrekken" },
      { status: 400 }
    );
  }

  Object.assign(target, update);
  await target.save();

  return NextResponse.json({
    user: {
      _id: String(target._id),
      isAdmin: !!target.isAdmin,
      subscribed: !!target.subscribed,
    },
  });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });
  }

  await connectMongoDB();

  const target = await User.findById(id).select("email");
  if (!target) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  if (target.email === guard.email) {
    return NextResponse.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });
  }

  await Promise.all([Note.deleteMany({ userId: target._id }), User.deleteOne({ _id: target._id })]);

  return NextResponse.json({ ok: true });
}
