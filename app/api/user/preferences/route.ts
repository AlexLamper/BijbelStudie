import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { authOptions } from "../../../../lib/authOptions";
import { emailMatchFilters } from "../../../../lib/userLookup";

/**
 * Accepted values for `preferences.studyStyle`, checked here rather than passed
 * through like the other strings.
 *
 * This one drives the order of the sidebar's navigation, and an unrecognised
 * value degrades silently to the guided order everywhere it is read. Rejecting
 * it at the door is what keeps a typo from becoming an invisible bug that only
 * shows up as a menu that never reorders.
 */
const STUDY_STYLES: readonly string[] = ["guided", "self"];

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
      studyStyle,
      onboardingCompleted,
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
    if (STUDY_STYLES.includes(studyStyle)) updateData["preferences.studyStyle"] = studyStyle;
    if (onboardingCompleted !== undefined) updateData["preferences.onboardingCompleted"] = onboardingCompleted;

    // Reading preferences
    if (fontSize) updateData["preferences.fontSize"] = fontSize;
    if (fontFamily) updateData["preferences.fontFamily"] = fontFamily;
    if (lineHeight) updateData["preferences.lineHeight"] = lineHeight;
    if (letterSpacing) updateData["preferences.letterSpacing"] = letterSpacing;
    if (highContrast !== undefined) updateData["preferences.highContrast"] = highContrast;
    if (showVerseNumbers !== undefined) updateData["preferences.showVerseNumbers"] = showVerseNumbers;
    if (ttsVoice) updateData["preferences.ttsVoice"] = ttsVoice;

    // Case-insensitive, like every other read of an account by address: a
    // plain `{ email: session.user.email }` matches nothing for an account
    // whose stored address was written before emails were normalised, and
    // `findOneAndUpdate` then returns null rather than erroring. Reading
    // `.preferences` off that null threw a 500, which meant
    // `onboardingCompleted: true` was never written - so the first-run flow
    // asked the same account again on every single page load.
    const [exactFilter, insensitiveFilter] = emailMatchFilters(session.user.email);
    const updatedUser =
      (await User.findOneAndUpdate(exactFilter, { $set: updateData }, { new: true })) ??
      (await User.findOneAndUpdate(insensitiveFilter, { $set: updateData }, { new: true }));

    if (!updatedUser) {
      // The session names an account that is not there. Say so, rather than
      // reporting a save that did not happen.
      return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
    }

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
    
    const [exactFilter, insensitiveFilter] = emailMatchFilters(session.user.email);
    const user =
      (await User.findOne(exactFilter)) ?? (await User.findOne(insensitiveFilter));

    // "No such account" and "this account has answered nothing yet" are
    // different answers, and the onboarding gate acts on the difference: it
    // only asks the questions on a definite `onboardingCompleted: false`.
    // Collapsing the two into `false` here would re-open the flow for an
    // account this route simply failed to find.
    if (!user) {
      return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
    }

    if (!user.preferences) {
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
