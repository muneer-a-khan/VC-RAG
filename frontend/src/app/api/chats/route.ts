import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/chats - List user's chats
export const GET = withAuth(async ({ session, request }) => {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("project_id")
  const limit = parseInt(searchParams.get("limit") || "20")

  const whereClause: Record<string, unknown> = { userId: session.user.id }
  if (projectId) {
    whereClause.projectId = projectId
  }

  const chats = await prisma.chat.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      _count: { select: { messages: true } },
      project: { select: { id: true, name: true } },
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
}, "List chats")
