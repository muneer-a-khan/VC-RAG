import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/chat/search - Search conversations and messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const projectId = searchParams.get("project_id")

    if (!query) {
      return NextResponse.json({ detail: "Query is required" }, { status: 400 })
    }

    // Build where clause for chats
    const chatWhere: any = { userId: session.user.id }
    if (projectId) {
      chatWhere.projectId = projectId
    }

    // Search in messages
    const messages = await prisma.message.findMany({
      where: {
        chat: {
          ...chatWhere,
        },
        content: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        chat: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      results: messages.map((m) => ({
        id: m.id,
        chat_id: m.chat.id,
        chat_title: m.chat.title,
        project_id: m.chat.projectId,
        role: m.role,
        content: m.content,
        created_at: m.createdAt.toISOString(),
      })),
      total: messages.length,
    })
  } catch (error: any) {
    console.error("Search error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to search" },
      { status: 500 }
    )
  }
}

