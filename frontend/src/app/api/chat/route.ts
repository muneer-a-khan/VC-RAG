import { NextResponse } from "next/server"
import { withAuth, badRequest, notFound } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import {
  executeRAGPipeline,
  executeRAGPipelineStreaming,
  generateResponse,
  type RAGPipelineOptions,
} from "@/lib/services/rag-service"

export const dynamic = "force-dynamic"

/**
 * POST /api/chat - Send a message (supports both streaming and non-streaming)
 *
 * Body:
 *  - message: string (required)
 *  - chat_id?: string
 *  - project_id?: string
 *  - stream?: boolean (default: true)
 *  - mode?: "fast" | "deep" (default: "fast")
 */
export const POST = withAuth(async ({ session, request }) => {
  const body = await request.json()
  const {
    message,
    chat_id,
    project_id,
    stream: shouldStream = true,
    mode = "fast",
    history_enabled: historyEnabled = true,
  } = body

  if (!message) {
    return badRequest("Message is required")
  }

  // In secure mode (history off): skip all DB persistence and chat history
  let chatId = chat_id
  let formattedHistory: { role: "user" | "assistant"; content: string }[] = []

  if (historyEnabled) {
    if (!chatId) {
      const chat = await prisma.chat.create({
        data: {
          title:
            message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          userId: session.user.id,
          projectId: project_id || null,
        },
      })
      chatId = chat.id
    } else {
      const existingChat = await prisma.chat.findFirst({
        where: { id: chatId, userId: session.user.id },
      })
      if (!existingChat) {
        return notFound("Chat not found")
      }
    }

    await prisma.message.create({
      data: { chatId, role: "user", content: message },
    })

    const chatHistory = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 12,
    })

    formattedHistory = chatHistory.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
  }

  // Determine search scope
  let searchProjectId = project_id
  if (!searchProjectId && chatId) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId },
      select: { projectId: true },
    })
    searchProjectId = chat?.projectId || undefined
  }

  const pipelineOptions: RAGPipelineOptions = {
    mode: mode as "fast" | "deep",
    projectId: searchProjectId || undefined,
  }

  // STREAMING RESPONSE
  if (shouldStream) {
    try {
      const { stream, sources } = await executeRAGPipelineStreaming(
        message,
        formattedHistory,
        pipelineOptions
      )

      const formattedSources = sources.map((doc, i) => ({
        id: i + 1,
        source: doc.metadata?.source || doc.metadata?.title || "Document",
        content: doc.content?.substring(0, 200) + "...",
        similarity: doc.similarity,
        rerankScore: doc.rerankScore,
      }))

      let fullResponse = ""
      const encoder = new TextEncoder()

      const responseStream = new ReadableStream({
        async start(controller) {
          const sendEvent = (payload: Record<string, any>) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            )
          }

          sendEvent({
            type: "metadata",
            chat_id: chatId,
            sources: formattedSources,
          })

          try {
            for await (const chunk of stream.textStream) {
              fullResponse += chunk
              sendEvent({ type: "text", content: chunk })
            }
          } catch (streamErr) {
            console.error("LLM stream error, falling back to non-streaming:", streamErr)

            try {
              const fallbackText = await generateResponse(
                message,
                sources,
                formattedHistory
              )
              fullResponse = fallbackText
              sendEvent({ type: "text", content: fallbackText })
            } catch (fallbackErr) {
              console.error("Fallback generation also failed:", fallbackErr)
              fullResponse =
                "I encountered an error generating a response. Please try again."
              sendEvent({ type: "text", content: fullResponse })
            }
          }

          if (!fullResponse.trim()) {
            try {
              const fallbackText = await generateResponse(
                message,
                sources,
                formattedHistory
              )
              fullResponse = fallbackText
              sendEvent({ type: "text", content: fallbackText })
            } catch {
              fullResponse =
                "I couldn't generate a response. Please try again or upload some documents first."
              sendEvent({ type: "text", content: fullResponse })
            }
          }

          let messageId = null
          if (historyEnabled && chatId) {
            const assistantMessage = await prisma.message.create({
              data: {
                chatId,
                role: "assistant",
                content: fullResponse,
                sources: formattedSources,
              },
            })
            messageId = assistantMessage.id
          }

          sendEvent({ type: "done", message_id: messageId })
          controller.close()
        },
      })

      return new Response(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (streamError) {
      console.error("Streaming setup error:", streamError)
      // Fall through to non-streaming
    }
  }

  // NON-STREAMING RESPONSE (fallback or explicit)
  let assistantResponse: string
  let sources: any[] = []

  try {
    const result = await executeRAGPipeline(
      message,
      formattedHistory,
      pipelineOptions
    )

    assistantResponse = result.response
    sources = result.sources.map((doc, i) => ({
      id: i + 1,
      source: doc.metadata?.source || doc.metadata?.title || "Document",
      content: doc.content?.substring(0, 200) + "...",
      similarity: doc.similarity,
      rerankScore: doc.rerankScore,
    }))
  } catch (ragError) {
    console.error("RAG pipeline error:", ragError)
    assistantResponse =
      "I apologize, but I encountered an error processing your request. Please try again.\n\nIf you've uploaded files, make sure they contain readable text content."
  }

  let messageId = null
  if (historyEnabled && chatId) {
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: assistantResponse,
        sources,
      },
    })
    messageId = assistantMessage.id
  }

  return NextResponse.json({
    chat_id: chatId || null,
    response: assistantResponse,
    message_id: messageId,
    sources,
  })
}, "Chat")

// GET /api/chat - List user's chats
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
}, "List chats")
