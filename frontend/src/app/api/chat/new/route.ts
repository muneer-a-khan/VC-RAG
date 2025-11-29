import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// POST /api/chat/new - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, project_id } = body

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        title: title || "New Chat",
        userId: session.user.id,
        projectId: project_id || null,
      },
    })

    return NextResponse.json({
      chat_id: chat.id,
      title: chat.title,
      project_id: chat.projectId,
      created_at: chat.createdAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Create chat error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to create chat" },
      { status: 500 }
    )
  }
}

