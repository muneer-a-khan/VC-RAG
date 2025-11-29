import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/chat/history/[chatId] - Get chat history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { chatId } = await params

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!chat) {
      return NextResponse.json({ detail: "Chat not found" }, { status: 404 })
    }

    return NextResponse.json({
      chat_id: chat.id,
      title: chat.title,
      project_id: chat.projectId,
      messages: chat.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        created_at: m.createdAt.toISOString(),
      })),
      created_at: chat.createdAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Get chat history error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get chat history" },
      { status: 500 }
    )
  }
}

