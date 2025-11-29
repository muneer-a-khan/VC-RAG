import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Check if OpenAI is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        // Import RAG service dynamically to avoid issues when OpenAI is not configured
        const { generateResponse, similaritySearch, generateEmbedding } = await import("@/lib/services/rag-service")
        
        // If project is specified, try to get relevant context
        let context: any[] = []
        if (project_id) {
          try {
            const queryEmbedding = await generateEmbedding(message)
            context = await similaritySearch(queryEmbedding, project_id)
          } catch (e) {
            console.warn("Vector search failed, continuing without context:", e)
          }
        }

        // Format chat history for the RAG service
        const formattedHistory = chatHistory.slice(-8).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))

        // Generate response using RAG
        assistantResponse = await generateResponse(message, context, formattedHistory)
        
        // Format sources for response
        sources = context.map((doc, i) => ({
          id: i + 1,
          source: doc.metadata?.source || "Document",
          content: doc.content?.substring(0, 200) + "...",
        }))
      } catch (ragError) {
        console.error("RAG error:", ragError)
        // Fallback to placeholder
        assistantResponse = generatePlaceholderResponse(message)
      }
    } else {
      // No OpenAI configured - use placeholder
      assistantResponse = generatePlaceholderResponse(message)
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

function generatePlaceholderResponse(message: string): string {
  return `Thank you for your message. This is a placeholder response.

In the full implementation with OpenAI configured, this would:
1. Search relevant documents using vector embeddings
2. Pass context to an LLM (GPT-4, Claude, etc.)
3. Return an intelligent, context-aware response

Your message was: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

To enable AI responses, set the OPENAI_API_KEY environment variable.`
}
