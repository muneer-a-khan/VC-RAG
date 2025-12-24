import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { similaritySearch, generateResponse } from "@/lib/services/rag-service"

export const dynamic = 'force-dynamic'

// POST /api/chat - Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { message, chat_id, project_id } = body

    if (!message) {
      return NextResponse.json({ detail: "Message is required" }, { status: 400 })
    }

    // Create or get chat
    let chatId = chat_id
    if (!chatId) {
      const chat = await prisma.chat.create({
        data: {
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          userId: session.user.id,
          projectId: project_id || null,
        },
      })
      chatId = chat.id
    } else {
      // Verify chat ownership
      const existingChat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: session.user.id,
        },
      })
      if (!existingChat) {
        return NextResponse.json({ detail: "Chat not found" }, { status: 404 })
      }
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: message,
      },
    })

    // Get chat history for context
    const chatHistory = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 10,
    })

    let assistantResponse: string
    let sources: any[] = []

    try {
      // Find user's upload project for searching
      const uploadProject = await prisma.project.findFirst({
        where: {
          userId: session.user.id,
          name: "Chat Uploads",
        },
      })

      // Search in uploaded documents
      let context: any[] = []
      
      // Search in specific project if provided, otherwise search in uploads
      const searchProjectId = project_id || uploadProject?.id
      
      if (searchProjectId) {
        context = await similaritySearch(message, searchProjectId)
      } else {
        // Search across all user's projects
        const userProjects = await prisma.project.findMany({
          where: { userId: session.user.id },
          select: { id: true },
        })
        
        // Search in each project and combine results
        for (const project of userProjects) {
          const projectResults = await similaritySearch(message, project.id, 3)
          context.push(...projectResults)
        }
        
        // Sort combined results by similarity
        context.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        context = context.slice(0, 5)
      }

      // Format chat history for the RAG service
      const formattedHistory = chatHistory.slice(-8).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))

      // Generate response using DeepSeek via RAG service
      assistantResponse = await generateResponse(message, context, formattedHistory)
      
      // Format sources for response
      sources = context.map((doc, i) => ({
        id: i + 1,
        source: doc.metadata?.source || doc.metadata?.title || "Document",
        content: doc.content?.substring(0, 200) + "...",
        similarity: doc.similarity,
      }))
    } catch (ragError) {
      console.error("RAG error:", ragError)
      assistantResponse = `I apologize, but I encountered an error processing your request. Please try again.

If you've uploaded files, make sure they contain readable text content.`
    }

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: assistantResponse,
        sources: sources,
      },
    })

    return NextResponse.json({
      chat_id: chatId,
      response: assistantResponse,
      message_id: assistantMessage.id,
      sources,
    })
  } catch (error: any) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to process message" },
      { status: 500 }
    )
  }
}

// GET /api/chat - List user's chats
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
      },
    })

    return NextResponse.json(
      chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        project_id: chat.projectId,
        project: chat.project,
        message_count: chat._count.messages,
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
