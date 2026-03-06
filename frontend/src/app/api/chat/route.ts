import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
<<<<<<< HEAD
import { similaritySearch, generateResponse } from "@/lib/services/rag-service"

export const dynamic = 'force-dynamic'

// POST /api/chat - Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

=======
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
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
>>>>>>> d914165 (Initial local Coreflow project)
    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
<<<<<<< HEAD
    const { message, chat_id, project_id } = body

    if (!message) {
      return NextResponse.json({ detail: "Message is required" }, { status: 400 })
    }

    // Create or get chat
=======
    const {
      message,
      chat_id,
      project_id,
      stream: shouldStream = true,
      mode = "fast",
    } = body

    if (!message) {
      return NextResponse.json(
        { detail: "Message is required" },
        { status: 400 }
      )
    }

    // Create or verify chat
>>>>>>> d914165 (Initial local Coreflow project)
    let chatId = chat_id
    if (!chatId) {
      const chat = await prisma.chat.create({
        data: {
<<<<<<< HEAD
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
=======
          title:
            message.substring(0, 50) + (message.length > 50 ? "..." : ""),
>>>>>>> d914165 (Initial local Coreflow project)
          userId: session.user.id,
          projectId: project_id || null,
        },
      })
      chatId = chat.id
    } else {
<<<<<<< HEAD
      // Verify chat ownership
      const existingChat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: session.user.id,
        },
=======
      const existingChat = await prisma.chat.findFirst({
        where: { id: chatId, userId: session.user.id },
>>>>>>> d914165 (Initial local Coreflow project)
      })
      if (!existingChat) {
        return NextResponse.json({ detail: "Chat not found" }, { status: 404 })
      }
    }

    // Save user message
    await prisma.message.create({
<<<<<<< HEAD
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

=======
      data: { chatId, role: "user", content: message },
    })

    // Get chat history
    const chatHistory = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 12,
    })

    const formattedHistory = chatHistory.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    // Determine search scope
    let searchProjectId = project_id
    if (!searchProjectId) {
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

    // ============================================================
    // STREAMING RESPONSE
    // ============================================================
    if (shouldStream) {
      try {
        const { stream, sources } = await executeRAGPipelineStreaming(
          message,
          formattedHistory,
          pipelineOptions
        )

        // Format sources for the response
        const formattedSources = sources.map((doc, i) => ({
          id: i + 1,
          source: doc.metadata?.source || doc.metadata?.title || "Document",
          content: doc.content?.substring(0, 200) + "...",
          similarity: doc.similarity,
          rerankScore: doc.rerankScore,
        }))

        // Create a custom stream that collects the full response for DB storage
        let fullResponse = ""
        const encoder = new TextEncoder()

        const responseStream = new ReadableStream({
          async start(controller) {
            // Helper to send an SSE event
            const sendEvent = (payload: Record<string, any>) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
              )
            }

            // First, send metadata (chat_id, sources) as a JSON line
            sendEvent({
              type: "metadata",
              chat_id: chatId,
              sources: formattedSources,
            })

            try {
              // Stream text chunks from the LLM
              for await (const chunk of stream.textStream) {
                fullResponse += chunk
                sendEvent({ type: "text", content: chunk })
              }
            } catch (streamErr) {
              console.error("LLM stream error, falling back to non-streaming:", streamErr)

              // Fallback: generate a complete response without streaming
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

            // If the stream produced nothing (empty response), use fallback
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

            // Save the complete assistant response to DB
            const assistantMessage = await prisma.message.create({
              data: {
                chatId,
                role: "assistant",
                content: fullResponse,
                sources: formattedSources,
              },
            })

            // Send completion event
            sendEvent({ type: "done", message_id: assistantMessage.id })
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

    // ============================================================
    // NON-STREAMING RESPONSE (fallback or explicit)
    // ============================================================
>>>>>>> d914165 (Initial local Coreflow project)
    let assistantResponse: string
    let sources: any[] = []

    try {
<<<<<<< HEAD
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
=======
      const result = await executeRAGPipeline(
        message,
        formattedHistory,
        pipelineOptions
      )

      assistantResponse = result.response
      sources = result.sources.map((doc, i) => ({
>>>>>>> d914165 (Initial local Coreflow project)
        id: i + 1,
        source: doc.metadata?.source || doc.metadata?.title || "Document",
        content: doc.content?.substring(0, 200) + "...",
        similarity: doc.similarity,
<<<<<<< HEAD
      }))
    } catch (ragError) {
      console.error("RAG error:", ragError)
      assistantResponse = `I apologize, but I encountered an error processing your request. Please try again.

If you've uploaded files, make sure they contain readable text content.`
=======
        rerankScore: doc.rerankScore,
      }))
    } catch (ragError) {
      console.error("RAG pipeline error:", ragError)
      assistantResponse =
        "I apologize, but I encountered an error processing your request. Please try again.\n\nIf you've uploaded files, make sure they contain readable text content."
>>>>>>> d914165 (Initial local Coreflow project)
    }

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: assistantResponse,
<<<<<<< HEAD
        sources: sources,
=======
        sources,
>>>>>>> d914165 (Initial local Coreflow project)
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
<<<<<<< HEAD

=======
>>>>>>> d914165 (Initial local Coreflow project)
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
<<<<<<< HEAD
        _count: {
          select: { messages: true },
        },
        project: {
          select: { id: true, name: true },
        },
=======
        _count: { select: { messages: true } },
        project: { select: { id: true, name: true } },
>>>>>>> d914165 (Initial local Coreflow project)
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
