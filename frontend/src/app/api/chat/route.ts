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
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: message,
      },
    })

    // TODO: Implement actual RAG/LLM response
    // For now, return a placeholder response
    const assistantResponse = `Thank you for your message. This is a placeholder response. 

In the full implementation, this would:
1. Search relevant documents using vector embeddings
2. Pass context to an LLM (GPT-4, Claude, etc.)
3. Return an intelligent, context-aware response

Your message was: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: assistantResponse,
      },
    })

    return NextResponse.json({
      chat_id: chatId,
      response: assistantResponse,
      message_id: assistantMessage.id,
    })
  } catch (error: any) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to process message" },
      { status: 500 }
    )
  }
}

