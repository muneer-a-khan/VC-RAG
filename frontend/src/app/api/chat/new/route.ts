import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// POST /api/chat/new - Create a new chat session
export const POST = withAuth(async ({ session, request }) => {
  const body = await request.json()
  const { title, project_id } = body

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
}, "Create chat")
