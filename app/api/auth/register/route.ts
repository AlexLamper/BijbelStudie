import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { findUserByEmail, normaliseEmail } from "../../../../lib/userLookup";

export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();

    const { name, email, password } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists (case-insensitive, so this can't be
    // bypassed by re-registering the same address with different casing)
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      name,
      email: normaliseEmail(email),
      password: hashedPassword,
      provider: "credentials",
      emailVerified: false,
      createdAt: new Date(),
    });

    await newUser.save();

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
