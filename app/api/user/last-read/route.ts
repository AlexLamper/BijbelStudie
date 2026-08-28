import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { authOptions } from "../../../../lib/authOptions"
import { grantXp } from "../../../../lib/gamification"
import { isSafeBookKey, isSafeChapter } from "../../../../lib/readingProgress"

// GET - Fetch user's last read chapter
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectMongoDB()

    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      lastReadChapter: user.lastReadChapter || null 
    }, { status: 200 })
  } catch (error) {
    console.error("Error fetching last read chapter:", error)
    return NextResponse.json({ message: "Error fetching last read chapter" }, { status: 500 })
  }
}

// POST - Update user's last read chapter
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { book, chapter, version, commentary } = body

    if (!book || !chapter || !version) {
      return NextResponse.json({ 
        message: "Missing required fields: book, chapter, version" 
      }, { status: 400 })
    }

    // `book` is interpolated into a Mongo update path below, so the caller picks
    // the key it writes. See lib/readingProgress: an unchecked key here is what
    // put a `$*` entry into readChapters, and that made every full save of the
    // affected user document throw - Pro entitlement included.
    if (!isSafeBookKey(book) || !isSafeChapter(chapter)) {
      return NextResponse.json({ message: "Invalid book or chapter" }, { status: 400 })
    }

    await connectMongoDB()

    // `chapter` is a number, which this type used to exclude - it only compiled
    // because the value came off an untyped `request.json()`. Matches the v1 route.
    const updateData: Record<string, string | number | Date> = {
      'lastReadChapter.book': book,
      'lastReadChapter.chapter': chapter,
      'lastReadChapter.version': version,
      'lastReadChapter.updatedAt': new Date()
    };

    if (commentary) {
      updateData['lastReadChapter.commentary'] = commentary;
    }

    // Read before the write, so a chapter only ever earns XP the first time.
    const alreadyRead = await User.exists({
      email: session.user.email,
      [`readChapters.${book}`]: chapter,
    })

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $set: updateData,
        $addToSet: { [`readChapters.${book}`]: chapter },
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // `awardXp: false` is for callers that already pay for the same reading.
    // The guided study flow grants `study_lesson` on completion; letting it also
    // collect `chapter_read` would pay twice for one passage, and replaying a
    // lesson would farm the difference.
    const xp =
      alreadyRead || body?.awardXp === false
        ? null
        : await grantXp(String(user._id), "chapter_read", { isPro: Boolean(user.subscribed) })

    return NextResponse.json({
      message: "Last read chapter updated successfully",
      lastReadChapter: user.lastReadChapter,
      xp
    }, { status: 200 })
  } catch (error) {
    console.error("Error updating last read chapter:", error)
    return NextResponse.json({ message: "Error updating last read chapter" }, { status: 500 })
  }
}
