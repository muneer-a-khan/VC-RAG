import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/chat/[chatId] - Get a specific chat
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!chat) {
      return NextResponse.json({ detail: "Chat not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: chat.id,
      title: chat.title,
      project_id: chat.projectId,
      project: chat.project,
      messages: chat.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        created_at: m.createdAt.toISOString(),
      })),
      created_at: chat.createdAt.toISOString(),
      updated_at: chat.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Get chat error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get chat" },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/[chatId] - Delete a chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { chatId } = await params

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id,
      },
    })

    if (!chat) {
      return NextResponse.json({ detail: "Chat not found" }, { status: 404 })
    }

    // Delete chat (messages will cascade delete)
    await prisma.chat.delete({
      where: { id: chatId },
    })

    return NextResponse.json({
      status: "deleted",
      chat_id: chatId,
    })
  } catch (error: any) {
    console.error("Delete chat error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to delete chat" },
      { status: 500 }
    )
  }
}

