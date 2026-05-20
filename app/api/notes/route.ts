import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import connectMongoDB from "../../../lib/mongodb";
import Note from "../../../models/Note";
import User from "../../../models/User";

interface NotesQuery {
  userId: string;
  book?: string;
  chapter?: number;
  tags?: { $in: string[] };
  type?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const book = searchParams.get("book");
    const chapter = searchParams.get("chapter");
    const tag = searchParams.get("tag");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    // Build query
    const query: NotesQuery = { userId: user._id.toString() };
    
    if (book) query.book = book;
    if (chapter) query.chapter = parseInt(chapter);
    if (tag) query.tags = { $in: [tag] };
    if (type) query.type = type;

    // Get notes with pagination
    const skip = (page - 1) * limit;
    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const totalCount = await Note.countDocuments(query);

    return NextResponse.json({
      notes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check note limit for free users
    if (!user.subscribed) {
      const noteCount = await Note.countDocuments({ userId: user._id });
      if (noteCount >= 25) {
        return NextResponse.json(
          { error: "Free limit reached. Upgrade to Pro to create unlimited notes.", code: "NOTE_LIMIT_REACHED" },
          { status: 403 }
        );
      }
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
      type,
      language,
      groupId,
    } = body;

    // Validate required fields
    if (!verseReference || !book || !chapter || !verseText || !noteText) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newNote = new Note({
      userId: user._id,
      verseReference,
      book,
      chapter,
      verse,
      verseText,
      translation: translation || "ASV",
      noteText,
      highlightColor: highlightColor || "yellow",
      tags: tags || [],
      isPrivate: isPrivate !== undefined ? isPrivate : true,
      type: type || "note",
      language: language || "en",
      groupId: groupId || null,
    });

    const savedNote = await newNote.save();

    return NextResponse.json(savedNote, { status: 201 });

  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
