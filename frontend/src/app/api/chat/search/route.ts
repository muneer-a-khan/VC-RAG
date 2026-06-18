import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/chat/search - Search conversations and messages
export const GET = withAuth(async ({ session, request }) => {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const projectId = searchParams.get("project_id")

  const chatWhere: Record<string, unknown> = { userId: session.user.id }
  if (projectId) {
    chatWhere.projectId = projectId
  }

  // If no query, return recent chats directly
  if (!query) {
    const chats = await prisma.chat.findMany({
      where: chatWhere,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({
      results: chats.map((c) => ({
        id: c.messages[0]?.id || c.id,
        chat_id: c.id,
        chat_title: c.title || "Untitled Chat",
        project_id: c.projectId,
        role: c.messages[0]?.role || "user",
        content: c.messages[0]?.content || "",
        created_at: c.updatedAt.toISOString(),
      })),
      total: chats.length,
    })
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
        select: { id: true, title: true, projectId: true },
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
}, "Search")
