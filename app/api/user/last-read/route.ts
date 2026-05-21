import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { authOptions } from "../../../../lib/authOptions"

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

    const { book, chapter, version, commentary } = await request.json()

    if (!book || !chapter || !version) {
      return NextResponse.json({ 
        message: "Missing required fields: book, chapter, version" 
      }, { status: 400 })
    }

    await connectMongoDB()

    const updateData: Record<string, string | Date> = {
      'lastReadChapter.book': book,
      'lastReadChapter.chapter': chapter,
      'lastReadChapter.version': version,
      'lastReadChapter.updatedAt': new Date()
    };

    if (commentary) {
      updateData['lastReadChapter.commentary'] = commentary;
    }

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

    return NextResponse.json({ 
      message: "Last read chapter updated successfully",
      lastReadChapter: user.lastReadChapter
    }, { status: 200 })
  } catch (error) {
    console.error("Error updating last read chapter:", error)
    return NextResponse.json({ message: "Error updating last read chapter" }, { status: 500 })
  }
}
