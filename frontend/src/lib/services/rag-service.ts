/**
 * RAG (Retrieval Augmented Generation) Service
 * Handles embeddings, similarity search, and LLM response generation
 */
import OpenAI from "openai"

// Configuration
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small"
const LLM_MODEL = process.env.DEFAULT_LLM_MODEL || "gpt-4-turbo-preview"
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "1000")
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "200")
const TOP_K_RESULTS = parseInt(process.env.TOP_K_RESULTS || "5")

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface DocumentChunk {
  content: string
  metadata: {
    source?: string
    [key: string]: any
  }
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

/**
 * Generate embedding vector for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  return response.data[0].embedding
}

/**
 * Perform similarity search in vector database
 * TODO: Implement actual pgvector search
 */
export async function similaritySearch(
  queryEmbedding: number[],
  projectId: string,
  topK: number = TOP_K_RESULTS
): Promise<DocumentChunk[]> {
  // TODO: Implement vector similarity search using pgvector
  // Example SQL query:
  // SELECT * FROM vector_documents
  // WHERE project_id = ?
  // ORDER BY embedding <-> ?
  // LIMIT ?
  return []
}

/**
 * Generate response using LLM with context
 */
export async function generateResponse(
  query: string,
  context: DocumentChunk[],
  chatHistory?: ChatMessage[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt()
  const contextText = formatContext(context)

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ]

  // Add chat history if available (last 10 messages)
  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory.slice(-10))
  }

  // Add context and user query
  const userMessage = `Context:
${contextText}

User Query: ${query}

Please provide a detailed, accurate response based on the context provided. If you reference specific information, cite the source.`

  messages.push({ role: "user", content: userMessage })

  const response = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0].message.content || ""
}

/**
 * Build system prompt for VC-specific reasoning
 */
function buildSystemPrompt(): string {
  return `You are an AI assistant for venture capital professionals. Your role is to:

1. Provide accurate, data-driven insights for due diligence and portfolio analysis
2. Reference specific sources when citing information
3. Understand VC-specific terminology and frameworks
4. Be concise but thorough in your analysis
5. Highlight key metrics, risks, and opportunities
6. Maintain confidentiality and professionalism

Always base your responses on the provided context. If you don't have enough information to answer confidently, say so.`
}

/**
 * Format retrieved context for prompt
 */
function formatContext(context: DocumentChunk[]): string {
  if (!context || context.length === 0) {
    return "No relevant context found."
  }

  const formatted = context.map((doc, i) => {
    const source = doc.metadata?.source || "Unknown"
    return `[Source ${i + 1}: ${source}]\n${doc.content}\n`
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
    chunks.push(chunk)
    start = end - CHUNK_OVERLAP
  }

  return chunks
}

/**
 * Process and embed a document
 */
export async function processDocument(
  content: string,
  metadata: Record<string, any>
): Promise<{ chunks: string[]; embeddings: number[][] }> {
  const chunks = chunkText(content)
  const embeddings: number[][] = []

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk)
    embeddings.push(embedding)
  }

  return { chunks, embeddings }
}

