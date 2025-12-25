/**
 * RAG (Retrieval Augmented Generation) Service
 * Handles embeddings, similarity search, and LLM response generation using DeepSeek
 */
import { prisma } from "@/lib/prisma"

// Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
const DEEPSEEK_CHAT_MODEL = process.env.DEEPSEEK_CHAT_MODEL || "deepseek-chat"
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "1000")
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "200")
const TOP_K_RESULTS = parseInt(process.env.TOP_K_RESULTS || "5")

// Simple embedding using text similarity (for when we don't have OpenAI)
function simpleTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  return intersection.size / union.size
}

export interface DocumentChunk {
  id: string
  content: string
  metadata: {
    source?: string
    title?: string
    [key: string]: any
  }
  similarity?: number
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

/**
 * Generate a simple hash-based embedding for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embedding: number[] = new Array(768).fill(0)
  const normalized = text.toLowerCase()
  for (let i = 0; i < normalized.length && i < 768; i++) {
    embedding[i] = normalized.charCodeAt(i) / 255
  }
  return embedding
}

/**
 * Perform similarity search in vector database
 */
export async function similaritySearch(
  query: string,
  projectId?: string,
  topK: number = TOP_K_RESULTS
): Promise<DocumentChunk[]> {
  const whereClause: any = {}
  if (projectId) {
    whereClause.projectId = projectId
  }

  const vectorDocs = await prisma.vectorDocument.findMany({
    where: whereClause,
    take: 100,
  })

  const results: DocumentChunk[] = []
  for (const doc of vectorDocs) {
    const metadata = typeof doc.metadata === 'string' 
      ? JSON.parse(doc.metadata) 
      : doc.metadata as any

    const similarity = simpleTextSimilarity(query, doc.content)
    
    results.push({
      id: doc.id,
      content: doc.content,
      metadata: {
        source: metadata?.source || metadata?.title || 'Document',
        title: metadata?.title,
        ...metadata,
      },
      similarity,
    })
  }

  results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
  return results.slice(0, topK)
}

/**
 * Generate response using DeepSeek LLM with context
 */
export async function generateResponse(
  query: string,
  context: DocumentChunk[],
  chatHistory?: ChatMessage[]
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return generateFallbackResponse(query, context)
  }

  const systemPrompt = buildSystemPrompt()
  const contextText = formatContext(context)

  const messages: any[] = [
    { role: "system", content: systemPrompt },
  ]

  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory.slice(-10))
  }

  const userMessage = `Context:
${contextText}

User Query: ${query}

Please provide a detailed, accurate response based on the context provided. If you reference specific information, cite the source.`

  messages.push({ role: "user", content: userMessage })

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_CHAT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0].message.content || ""
    } else if (response.status === 402) {
      console.warn("DeepSeek API: Insufficient balance - using fallback")
      return generateFallbackResponse(query, context)
    } else {
      console.error("DeepSeek API error:", response.status)
      return generateFallbackResponse(query, context)
    }
  } catch (error) {
    console.error("DeepSeek API exception:", error)
    return generateFallbackResponse(query, context)
  }
}

function generateFallbackResponse(query: string, context: DocumentChunk[]): string {
  if (context.length === 0) {
    return `I don't have any relevant documents to answer your question: **"${query}"**

Please upload some files first, and I'll be able to help you find information from them.`
  }

  let response = `## Relevant Information Found

Based on the available documents, here are the most relevant excerpts for your query:\n\n`

  context.slice(0, 3).forEach((doc, i) => {
    const source = doc.metadata?.source || doc.metadata?.title || 'Document'
    response += `### Source ${i + 1}: ${source}\n`
    response += `${doc.content.substring(0, 500)}${doc.content.length > 500 ? '...' : ''}\n\n`
  })

  return response
}

function buildSystemPrompt(): string {
  return `You are an AI assistant that helps users understand and analyze their uploaded documents. Your role is to:

1. Provide accurate, helpful responses based on the document context provided
2. Reference specific sources when citing information
3. Be concise but thorough in your analysis
4. If you don't have enough information to answer confidently, say so
5. When citing specific data points, mention which source they come from

Format your responses using proper markdown for better readability:
- Use headings (##, ###) for organizing your response
- Use **bold** for emphasis and key terms
- Use bullet points or numbered lists when appropriate
- Use proper paragraph breaks
- Keep technical terms and source names in appropriate formatting

Always base your responses on the provided context. If the context doesn't contain relevant information, clearly state that.`
}

function formatContext(context: DocumentChunk[]): string {
  if (!context || context.length === 0) {
    return "No relevant context found in uploaded documents."
  }

  const formatted = context.map((doc, i) => {
    const source = doc.metadata?.source || doc.metadata?.title || "Document"
    const similarity = doc.similarity ? ` | Relevance: ${(doc.similarity * 100).toFixed(1)}%` : ''
    return `[Source ${i + 1}: ${source}${similarity}]\n${doc.content}\n`
  })

  return formatted.join("\n---\n")
}

/**
 * Split text into chunks for embedding
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = start + CHUNK_SIZE
    const chunk = text.slice(start, end)
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim())
    }
    start = end - CHUNK_OVERLAP
    if (start + CHUNK_OVERLAP >= text.length) {
      break
    }
  }

  return chunks.filter(c => c.length > 10)
}

/**
 * Index a document by chunking and storing - BATCH VERSION (faster)
 */
export async function indexDocument(
  content: string,
  filename: string,
  userId: string,
  projectId?: string
): Promise<number> {
  const chunks = chunkText(content)
  
  if (chunks.length === 0) {
    return 0
  }
  
  // If no project specified, create a default one for the user
  let targetProjectId = projectId
  if (!targetProjectId) {
    let defaultProject = await prisma.project.findFirst({
      where: {
        userId,
        name: "Chat Uploads",
      },
    })

    if (!defaultProject) {
      defaultProject = await prisma.project.create({
        data: {
          userId,
          name: "Chat Uploads",
          description: "Files uploaded via chat interface",
          type: "uploads",
        },
      })
    }
    targetProjectId = defaultProject.id
  }

  // BATCH INSERT - much faster than individual inserts
  const timestamp = Date.now()
  const batchData = chunks.map((chunk, i) => ({
    id: `${timestamp}-${i}-${Math.random().toString(36).substr(2, 6)}`,
    projectId: targetProjectId!,
    content: chunk,
    sourceType: "file",
    chunkIndex: i,
    metadata: JSON.stringify({
      title: filename,
      source: filename,
      chunk_index: i,
      total_chunks: chunks.length,
    }),
  }))

  // Use createMany for batch insert
  await prisma.vectorDocument.createMany({
    data: batchData,
  })

  return chunks.length
}
