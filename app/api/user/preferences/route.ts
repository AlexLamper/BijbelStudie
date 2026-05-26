import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { authOptions } from "../../../../lib/authOptions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const {
      language,
      translation,
      commentary,
      intent,
      onboardingCompleted,
      tourCompleted,
      fontSize,
      fontFamily,
      lineHeight,
      letterSpacing,
      highContrast,
      showVerseNumbers,
      ttsVoice,
    } = await request.json();

    const updateData: Record<string, string | boolean | Date> = {
      "preferences.updatedAt": new Date()
    };

    if (language) updateData["preferences.language"] = language;
    if (translation) updateData["preferences.translation"] = translation;
    if (commentary) updateData["preferences.commentary"] = commentary;
    if (intent) updateData["preferences.intent"] = intent;
    if (onboardingCompleted !== undefined) updateData["preferences.onboardingCompleted"] = onboardingCompleted;
    if (tourCompleted !== undefined) updateData["preferences.tourCompleted"] = tourCompleted;

    // Reading preferences
    if (fontSize) updateData["preferences.fontSize"] = fontSize;
    if (fontFamily) updateData["preferences.fontFamily"] = fontFamily;
    if (lineHeight) updateData["preferences.lineHeight"] = lineHeight;
    if (letterSpacing) updateData["preferences.letterSpacing"] = letterSpacing;
    if (highContrast !== undefined) updateData["preferences.highContrast"] = highContrast;
    if (showVerseNumbers !== undefined) updateData["preferences.showVerseNumbers"] = showVerseNumbers;
    if (ttsVoice) updateData["preferences.ttsVoice"] = ttsVoice;

    // Update user preferences
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({
      message: "Preferences saved successfully",
      preferences: updatedUser.preferences
    });

  } catch (error) {
    console.error("Error saving user preferences:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const user = await User.findOne({ email: session.user.email });
    
    if (!user || !user.preferences) {
      return NextResponse.json({
        preferences: null,
        onboardingCompleted: false
      });
    }

    return NextResponse.json({
      preferences: user.preferences,
      onboardingCompleted: user.preferences.onboardingCompleted || false
    });

  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}
