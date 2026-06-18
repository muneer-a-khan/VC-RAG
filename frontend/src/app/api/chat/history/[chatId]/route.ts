import { NextResponse } from "next/server"
import { withAuth, notFound } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/chat/history/[chatId] - Get chat history
export const GET = withAuth(async ({ session, params }) => {
  const { chatId } = params

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  if (!chat) {
    return notFound("Chat not found")
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
}, "Get chat history")
