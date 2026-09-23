import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/authOptions";
import connectMongoDB from "../../../../lib/mongodb";
import Note from "../../../../models/Note";
import User from "../../../../models/User";
import { canCreateAnotherNote, limitedNotesFilter, NOTE_LIMIT_MESSAGE } from "../../../../lib/noteXp";
import { resolveIsPro } from "../../../../lib/mobilePremium";
import { isAdminEmail } from "../../../../lib/adminEmails";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const note = await Note.findOne({ 
      _id: resolvedParams.id, 
      userId: user._id 
    }).lean();

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);

  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      verseReference,
      book,
      chapter,
      verse,
      verseText,
      translation,
      noteText,
      highlightColor,
      tags,
      isPrivate,
      type
    } = body;

    // Adding text to a highlight turns it into a note, which is where the free
    // limit applies - otherwise "highlight, then edit" would walk around it.
    if (type && type !== "highlight") {
      const existing = await Note.findOne({ _id: resolvedParams.id, userId: user._id })
        .select("type")
        .lean<{ type?: string }>();
      const isPro = resolveIsPro(user, isAdminEmail(session.user.email));
      if (existing?.type === "highlight" && !isPro) {
        const noteCount = await Note.countDocuments(limitedNotesFilter(user._id));
        if (!canCreateAnotherNote(noteCount, isPro)) {
          return NextResponse.json(
            { error: NOTE_LIMIT_MESSAGE, code: "NOTE_LIMIT_REACHED" },
            { status: 403 }
          );
        }
      }
    }

    const updatedNote = await Note.findOneAndUpdate(
      { _id: resolvedParams.id, userId: user._id },
      {
        $set: {
          verseReference,
          book,
          chapter,
          verse,
          verseText,
          translation,
          noteText,
          highlightColor,
          tags,
          isPrivate,
          type
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(updatedNote);

  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deletedNote = await Note.findOneAndDelete({ 
      _id: resolvedParams.id, 
      userId: user._id 
    });

    if (!deletedNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Note deleted successfully" });

  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
