import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/chats - List user's chats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("project_id")
    const limit = parseInt(searchParams.get("limit") || "20")

    const whereClause: any = { userId: session.user.id }
    if (projectId) {
      whereClause.projectId = projectId
    }

    const chats = await prisma.chat.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        _count: {
          select: { messages: true },
        },
        project: {
          select: { id: true, name: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    return NextResponse.json(
      chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        project_id: chat.projectId,
        project: chat.project,
        message_count: chat._count.messages,
        last_message: chat.messages[0]?.content?.substring(0, 100) || null,
        created_at: chat.createdAt.toISOString(),
        updated_at: chat.updatedAt.toISOString(),
      }))
    )
  } catch (error: any) {
    console.error("List chats error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to list chats" },
      { status: 500 }
    )
  }
}

