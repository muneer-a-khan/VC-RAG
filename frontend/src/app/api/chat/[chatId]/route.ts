import { NextResponse } from "next/server"
import { withAuth, notFound } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/chat/[chatId] - Get a specific chat
export const GET = withAuth(async ({ session, params }) => {
  const { chatId } = params

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      project: { select: { id: true, name: true } },
    },
  })

  if (!chat) {
    return notFound("Chat not found")
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
}, "Get chat")

// DELETE /api/chat/[chatId] - Delete a chat
export const DELETE = withAuth(async ({ session, params }) => {
  const { chatId } = params

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
  })

  if (!chat) {
    return notFound("Chat not found")
  }

  await prisma.chat.delete({ where: { id: chatId } })

  return NextResponse.json({ status: "deleted", chat_id: chatId })
}, "Delete chat")
