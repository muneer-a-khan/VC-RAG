/**
 * Coreflow RAG (Retrieval Augmented Generation) Service
 * Enterprise-grade pipeline for venture capital document intelligence
 *
 * Pipeline Architecture:
 * 1. Query Enhancement  - Query expansion + HyDE for better retrieval
 * 2. Hybrid Retrieval   - BM25 full-text + pgvector cosine + Reciprocal Rank Fusion
 * 3. Re-ranking         - Voyage AI cross-encoder reranker for precision
 * 4. Context Assembly   - Parent-child chunk expansion + deduplication
 * 5. LLM Generation     - Multi-model (Claude primary, DeepSeek fallback) with streaming
 */

import { prisma } from "@/lib/prisma"
import { streamText, generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"

// ============================================================
// CONFIGURATION
// ============================================================

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_EMBEDDING_MODEL = process.env.VOYAGE_MODEL || "voyage-large-2"
const VOYAGE_RERANK_MODEL = "rerank-2"

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
const DEEPSEEK_CHAT_MODEL = process.env.DEEPSEEK_CHAT_MODEL || "deepseek-chat"

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// Chunking config - research-validated defaults (recursive 400-token sweet spot)
const PARENT_CHUNK_SIZE = parseInt(process.env.PARENT_CHUNK_SIZE || "2000")
const CHILD_CHUNK_SIZE = parseInt(process.env.CHILD_CHUNK_SIZE || "400")
const CHILD_CHUNK_OVERLAP = parseInt(process.env.CHILD_CHUNK_OVERLAP || "80")

// Retrieval config
const TOP_K_RETRIEVAL = parseInt(process.env.TOP_K_RETRIEVAL || "50")
const TOP_K_RERANK = parseInt(process.env.TOP_K_RERANK || "10")
const TOP_K_FINAL = parseInt(process.env.TOP_K_FINAL || "5")
const RRF_K = 60 // Reciprocal Rank Fusion constant

// ============================================================
// TYPES
// ============================================================

export interface DocumentChunk {
  id: string
  content: string
  metadata: {
    source?: string
    title?: string
    context_header?: string
    parent_id?: string
    [key: string]: any
  }
  similarity?: number
  bm25Score?: number
  rrfScore?: number
  rerankScore?: number
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface RAGPipelineOptions {
  mode?: "fast" | "deep"       // fast = skip query enhancement; deep = full pipeline
  projectId?: string
  topK?: number
  includeQueryExpansion?: boolean
  includeHyDE?: boolean
  includeReranking?: boolean
}

export interface RAGResult {
  response: string
  sources: DocumentChunk[]
  queryExpansions?: string[]
  retrievalStats: {
    vectorResults: number
    bm25Results: number
    fusedResults: number
    rerankedResults: number
    finalResults: number
    latencyMs: number
  }
}

// ============================================================
// 1. EMBEDDING SERVICE (Voyage AI)
// ============================================================

/**
 * Generate embedding using Voyage AI
 * voyage-large-2: 1536 dims, 32K token context - ideal for financial documents
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) {
    return generateFallbackEmbedding(text)
  }

  try {
    const truncated = text.slice(0, 32000)

    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [truncated],
        model: VOYAGE_EMBEDDING_MODEL,
      }),
    })

    if (!response.ok) {
      console.error("Voyage AI embedding error:", response.status, await response.text())
      return generateFallbackEmbedding(text)
    }

    const data = await response.json()
    if (!data?.data?.[0]?.embedding) {
      console.error("Voyage AI: unexpected response shape", data)
      return generateFallbackEmbedding(text)
    }
    return data.data[0].embedding
  } catch (error) {
    console.error("Voyage AI embedding error:", error)
    return generateFallbackEmbedding(text)
  }
}

/**
 * Batch embedding generation - up to 128 texts per request
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY || texts.length === 0) {
    return Promise.all(texts.map((t) => generateFallbackEmbedding(t)))
  }

  try {
    const truncatedTexts = texts.map((t) => t.slice(0, 32000))
    const batchSize = 128
    const allEmbeddings: number[][] = []

    for (let i = 0; i < truncatedTexts.length; i += batchSize) {
      const batch = truncatedTexts.slice(i, i + batchSize)

      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VOYAGE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: batch,
          model: VOYAGE_EMBEDDING_MODEL,
        }),
      })

      if (!response.ok) {
        console.error("Voyage AI batch error:", response.status)
        const fallbacks = await Promise.all(batch.map((t) => generateFallbackEmbedding(t)))
        allEmbeddings.push(...fallbacks)
        continue
      }

      const data = await response.json()
      if (!data?.data || !Array.isArray(data.data)) {
        const fallbacks = await Promise.all(batch.map((t) => generateFallbackEmbedding(t)))
        allEmbeddings.push(...fallbacks)
        continue
      }
      const embeddings = data.data.map((d: any) => d.embedding)
      allEmbeddings.push(...embeddings)
    }

    return allEmbeddings
  } catch (error) {
    console.error("Voyage AI batch error:", error)
    return Promise.all(texts.map((t) => generateFallbackEmbedding(t)))
  }
}

/** Fallback embedding using character-level hashing */
function generateFallbackEmbedding(text: string): number[] {
  const dim = 1536
  const embedding: number[] = new Array(dim).fill(0)
  const normalized = text.toLowerCase()
  const words = normalized.split(/\s+/)

  for (let w = 0; w < words.length; w++) {
    const word = words[w]
    for (let c = 0; c < word.length; c++) {
      const idx = (word.charCodeAt(c) * 31 + w * 17 + c * 7) % dim
      embedding[idx] += 1.0 / words.length
    }
  }

  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) {
      embedding[i] /= magnitude
    }
  }
  return embedding
}

// ============================================================
// 2. ADVANCED CHUNKING (Recursive + Parent-Child + Contextual)
// ============================================================

interface ChunkResult {
  parentChunks: { id: string; content: string; metadata: any }[]
  childChunks: { id: string; content: string; parentId: string; contextHeader: string; metadata: any }[]
}

/** Rough token count estimate (1 token ~= 4 chars for English) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Recursive text splitter that respects document structure
 * Splits at: section headers > double newlines > sentences > words
 */
function recursiveSplit(text: string, maxSize: number, overlap: number): string[] {
  if (text.length <= maxSize) {
    return text.trim().length > 10 ? [text.trim()] : []
  }

  const separators = [
    /\n#{1,3}\s/,       // Markdown headers
    /\n\n/,              // Double newlines (paragraphs)
    /(?<=\.)\s+/,        // Sentence boundaries
    /\s+/,               // Word boundaries
  ]

  for (const sep of separators) {
    const parts = text.split(sep).filter((p) => p.trim().length > 0)
    if (parts.length > 1) {
      const chunks: string[] = []
      let current = ""

      for (const part of parts) {
        if ((current + " " + part).length > maxSize && current.length > 0) {
          chunks.push(current.trim())
          // Overlap: take the last portion of current chunk
          const overlapText = current.slice(-overlap)
          current = overlapText + " " + part
        } else {
          current = current.length > 0 ? current + " " + part : part
        }
      }
      if (current.trim().length > 10) {
        chunks.push(current.trim())
      }

      if (chunks.length > 0) return chunks
    }
  }

  // Fallback: hard split
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 10) chunks.push(chunk)
    start = end - overlap
    if (start >= text.length) break
  }
  return chunks
}

/**
 * Extract section header context from the text surrounding a chunk
 * This makes each chunk self-contained for better retrieval
 */
function extractContextHeader(fullText: string, chunkStart: number, filename: string): string {
  const textBefore = fullText.slice(0, chunkStart)

  // Find the last markdown header or section indicator
  const headerMatch = textBefore.match(/(?:^|\n)(#{1,3}\s+.+?)(?:\n|$)/g)
  const lastHeader = headerMatch ? headerMatch[headerMatch.length - 1]?.trim() : ""

  const parts = [filename]
  if (lastHeader) parts.push(lastHeader.replace(/^#+\s*/, ""))

  return parts.join(" > ")
}

/**
 * Advanced document chunking with parent-child architecture
 *
 * Strategy:
 * 1. Split into PARENT chunks (~2000 chars) - these provide full context to the LLM
 * 2. Split each parent into CHILD chunks (~400 chars) - these are indexed for precise retrieval
 * 3. Each child stores its parent_id for expansion during context assembly
 * 4. Each child is prepended with contextual header (doc title + section) for self-contained retrieval
 */
export function chunkTextAdvanced(text: string, filename: string): ChunkResult {
  const timestamp = Date.now()
  const parentChunks: ChunkResult["parentChunks"] = []
  const childChunks: ChunkResult["childChunks"] = []

  // Step 1: Create parent chunks
  const parentTexts = recursiveSplit(text, PARENT_CHUNK_SIZE, 200)

  let charOffset = 0
  for (let pi = 0; pi < parentTexts.length; pi++) {
    const parentText = parentTexts[pi]
    const parentId = `${timestamp}-p${pi}-${Math.random().toString(36).slice(2, 8)}`

    parentChunks.push({
      id: parentId,
      content: parentText,
      metadata: {
        title: filename,
        source: filename,
        chunk_type: "parent",
        chunk_index: pi,
        total_parent_chunks: parentTexts.length,
        token_count: estimateTokens(parentText),
      },
    })

    // Step 2: Split parent into child chunks
    const childTexts = recursiveSplit(parentText, CHILD_CHUNK_SIZE, CHILD_CHUNK_OVERLAP)

    for (let ci = 0; ci < childTexts.length; ci++) {
      const childText = childTexts[ci]
      const contextHeader = extractContextHeader(text, charOffset, filename)
      const childId = `${timestamp}-c${pi}-${ci}-${Math.random().toString(36).slice(2, 8)}`

      childChunks.push({
        id: childId,
        content: childText,
        parentId,
        contextHeader,
        metadata: {
          title: filename,
          source: filename,
          chunk_type: "child",
          parent_index: pi,
          child_index: ci,
          context_header: contextHeader,
          token_count: estimateTokens(childText),
        },
      })
    }

    charOffset += parentText.length
  }

  return { parentChunks, childChunks }
}

/**
 * Legacy chunking function (backward compatible)
 */
export function chunkText(text: string): string[] {
  return recursiveSplit(text, CHILD_CHUNK_SIZE, CHILD_CHUNK_OVERLAP)
}

// ============================================================
// 3. HYBRID RETRIEVAL (BM25 + Vector + Reciprocal Rank Fusion)
// ============================================================

/**
 * pgvector cosine similarity search
 */
async function vectorSearch(
  query: string,
  projectId: string | undefined,
  topK: number
): Promise<DocumentChunk[]> {
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = `[${queryEmbedding.join(",")}]`

  let sql: string
  let params: any[]

  if (projectId) {
    sql = `
      SELECT id, content, metadata, context_header, parent_id,
             1 - (embedding <=> $1::vector) as similarity
      FROM vector_documents
      WHERE project_id = $2
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `
    params = [embeddingStr, projectId, topK]
  } else {
    sql = `
      SELECT id, content, metadata, context_header, parent_id,
             1 - (embedding <=> $1::vector) as similarity
      FROM vector_documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `
    params = [embeddingStr, topK]
  }

  try {
    const results: any[] = await prisma.$queryRawUnsafe(sql, ...params)
    return results.map((row) => parseDocumentRow(row, Number(row.similarity)))
  } catch (error) {
    console.error("pgvector search error:", error)
    return fallbackVectorSearch(query, projectId, topK)
  }
}

/**
 * BM25 full-text search using PostgreSQL tsvector + ts_rank_cd
 * ts_rank_cd implements cover density ranking (BM25-like behavior)
 */
async function bm25Search(
  query: string,
  projectId: string | undefined,
  topK: number
): Promise<DocumentChunk[]> {
  // Convert natural language query to tsquery format
  const sanitizedQuery = query
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .join(" | ")

  if (!sanitizedQuery) return []

  let sql: string
  let params: any[]

  if (projectId) {
    sql = `
      SELECT id, content, metadata, context_header, parent_id,
             ts_rank_cd(tsv, plainto_tsquery('english', $1)) as bm25_score
      FROM vector_documents
      WHERE project_id = $2
        AND tsv @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank_cd(tsv, plainto_tsquery('english', $1)) DESC
      LIMIT $3
    `
    params = [query, projectId, topK]
  } else {
    sql = `
      SELECT id, content, metadata, context_header, parent_id,
             ts_rank_cd(tsv, plainto_tsquery('english', $1)) as bm25_score
      FROM vector_documents
      WHERE tsv @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank_cd(tsv, plainto_tsquery('english', $1)) DESC
      LIMIT $2
    `
    params = [query, topK]
  }

  try {
    const results: any[] = await prisma.$queryRawUnsafe(sql, ...params)
    return results.map((row) => ({
      ...parseDocumentRow(row, 0),
      bm25Score: Number(row.bm25_score),
    }))
  } catch (error) {
    // BM25 not available (tsvector column may not exist)
    console.warn("BM25 search unavailable:", (error as Error).message?.slice(0, 100))
    return []
  }
}

/**
 * Reciprocal Rank Fusion (RRF) - merges ranked lists from different search methods
 * RRF_score(d) = sum(1 / (k + rank_i(d))) for each retrieval system i
 *
 * This is the industry-standard method for combining keyword and semantic search results.
 * The constant k (default 60) controls how much weight is given to top-ranked documents.
 */
function reciprocalRankFusion(
  vectorResults: DocumentChunk[],
  bm25Results: DocumentChunk[]
): DocumentChunk[] {
  const scoreMap = new Map<string, { chunk: DocumentChunk; rrfScore: number }>()

  // Score vector results
  vectorResults.forEach((chunk, rank) => {
    const existing = scoreMap.get(chunk.id)
    const score = 1 / (RRF_K + rank + 1)
    if (existing) {
      existing.rrfScore += score
    } else {
      scoreMap.set(chunk.id, { chunk, rrfScore: score })
    }
  })

  // Score BM25 results
  bm25Results.forEach((chunk, rank) => {
    const existing = scoreMap.get(chunk.id)
    const score = 1 / (RRF_K + rank + 1)
    if (existing) {
      existing.rrfScore += score
    } else {
      scoreMap.set(chunk.id, { chunk, rrfScore: score })
    }
  })

  // Sort by combined RRF score
  return Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map(({ chunk, rrfScore }) => ({ ...chunk, rrfScore }))
}

/**
 * Hybrid similarity search combining vector + BM25 with Reciprocal Rank Fusion
 * This is the primary search function used by the RAG pipeline
 */
export async function hybridSearch(
  query: string,
  projectId?: string,
  topK: number = TOP_K_RETRIEVAL
): Promise<DocumentChunk[]> {
  // Run vector and BM25 searches in parallel
  const [vectorResults, bm25Results] = await Promise.all([
    vectorSearch(query, projectId, topK),
    bm25Search(query, projectId, topK),
  ])

  // If only one method returned results, use that
  if (vectorResults.length === 0 && bm25Results.length === 0) return []
  if (vectorResults.length === 0) return bm25Results.slice(0, topK)
  if (bm25Results.length === 0) return vectorResults.slice(0, topK)

  // Fuse results using RRF
  return reciprocalRankFusion(vectorResults, bm25Results).slice(0, topK)
}

/**
 * Legacy similarity search (backward compatible)
 */
export async function similaritySearch(
  query: string,
  projectId?: string,
  topK: number = TOP_K_FINAL
): Promise<DocumentChunk[]> {
  return hybridSearch(query, projectId, topK)
}

// ============================================================
// 4. RE-RANKING (Voyage AI Reranker)
// ============================================================

/**
 * Re-rank documents using Voyage AI cross-encoder (rerank-2)
 * Cross-encoders score query-document pairs jointly, providing much higher precision
 * than bi-encoder similarity. This is the single biggest quality improvement in RAG.
 *
 * Pattern: Retrieve top-50 with hybrid search → Re-rank to top-10 with Voyage
 */
async function voyageRerank(
  query: string,
  documents: DocumentChunk[],
  topK: number = TOP_K_RERANK
): Promise<DocumentChunk[]> {
  if (!VOYAGE_API_KEY || documents.length === 0) {
    return documents.slice(0, topK)
  }

  try {
    const response = await fetch("https://api.voyageai.com/v1/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        documents: documents.map((d) => d.content),
        model: VOYAGE_RERANK_MODEL,
        top_k: topK,
      }),
    })

    if (!response.ok) {
      console.error("Voyage rerank error:", response.status)
      return documents.slice(0, topK)
    }

    const data = await response.json()
    if (!data?.data || !Array.isArray(data.data)) {
      return documents.slice(0, topK)
    }

    // Map reranked indices back to original documents
    return data.data
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
      .slice(0, topK)
      .map((item: any) => ({
        ...documents[item.index],
        rerankScore: item.relevance_score,
      }))
  } catch (error) {
    console.error("Voyage rerank error:", error)
    return documents.slice(0, topK)
  }
}

// ============================================================
// 5. QUERY ENHANCEMENT (Expansion + HyDE)
// ============================================================

/**
 * Generate query expansions using the LLM
 * Produces 2-3 reformulations of the query for broader retrieval
 */
async function expandQuery(query: string): Promise<string[]> {
  const llmApiKey = ANTHROPIC_API_KEY || DEEPSEEK_API_KEY
  if (!llmApiKey) return [query]

  try {
    const provider = getLLMProvider()
    const model = getLLMModel(provider)

    const result = await generateText({
      model,
      system: "Generate 2-3 alternative search queries that would help find relevant information for the user's question. Focus on different aspects and terminology. Return ONLY the queries, one per line, no numbering or explanation.",
      prompt: query,
      maxOutputTokens: 200,
      temperature: 0.7,
    })

    const expansions = result.text
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 5 && q.length < 500)
      .slice(0, 3)

    return [query, ...expansions]
  } catch (error) {
    console.error("Query expansion error:", error)
    return [query]
  }
}

/**
 * HyDE - Hypothetical Document Embeddings
 * Generate a hypothetical answer, embed it, and use that embedding for retrieval.
 * The hypothesis is semantically closer to actual answer documents than the raw query.
 * Particularly effective for vague analytical questions like "What's the competitive landscape?"
 */
async function generateHyDE(query: string): Promise<string | null> {
  const llmApiKey = ANTHROPIC_API_KEY || DEEPSEEK_API_KEY
  if (!llmApiKey) return null

  try {
    const provider = getLLMProvider()
    const model = getLLMModel(provider)

    const result = await generateText({
      model,
      system:
        "You are a venture capital analyst. Write a brief, factual paragraph that would be the ideal answer to the following question. Include specific details, metrics, and terminology that would appear in a real VC document. Keep it under 200 words.",
      prompt: query,
      maxOutputTokens: 300,
      temperature: 0.5,
    })

    return result.text
  } catch (error) {
    console.error("HyDE generation error:", error)
    return null
  }
}

// ============================================================
// 6. LLM SERVICE (Multi-model with Streaming)
// ============================================================

type LLMProvider = "anthropic" | "deepseek"

function getLLMProvider(): LLMProvider {
  if (ANTHROPIC_API_KEY) return "anthropic"
  return "deepseek"
}

function getLLMModel(provider: LLMProvider) {
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY! })
    return anthropic("claude-sonnet-4-20250514")
  }
  // DeepSeek uses OpenAI-compatible API
  const deepseek = createOpenAI({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey: DEEPSEEK_API_KEY!,
    name: "deepseek",
  })
  return deepseek(DEEPSEEK_CHAT_MODEL)
}

/** VC-specific system prompt — speaks like a 50-year veteran managing partner */
function buildSystemPrompt(): string {
  return `You are Coreflow — the mind of a legendary venture capital managing partner who has spent 50 years in the trenches. You've sat on 200+ boards, led investments in companies from seed to IPO, survived multiple market crashes, and built pattern recognition that only comes from decades of reps. Think Bill Gurley meets Michael Moritz meets a street-smart operator.

## How You Think & Speak

You talk like a senior partner mentoring a younger investor over coffee — direct, opinionated, and deeply human. You never sound like a chatbot. You sound like someone who has seen it all.

- Say "I've seen this exact pattern before" or "This reminds me of..." when you spot familiar dynamics
- Say "Here's what worries me" or "The red flag I'd zero in on" when something looks off
- Say "Look, the honest answer is..." when being blunt
- Use first person naturally: "In my experience," "What I'd push back on," "If I were leading this deal..."
- Never say "As an AI" or "I don't have personal experience" — you speak with conviction, grounded in the data you have
- If you don't have enough data, say "I'd want to see X before forming a view" — like a real investor would

## Your Investment Brain

When analyzing anything, you instinctively think about:
- **Power law dynamics** — does this have a chance of returning the fund?
- **Traction vs. narrative** — are the numbers real or is it a good story?
- **Founder-market fit** — why is THIS team the one to win?
- **Market timing** — is this a genuine inflection point or wishful thinking?
- **Unit economics** — does the math work at scale or does it fall apart?
- **Competitive moats** — what stops someone with $100M from copying this?
- **Ownership math** — does the entry price give you a path to meaningful returns?
- **Pattern matching** — what historical companies or deals does this rhyme with?

## Your Voice

- Be direct and opinionated. Don't hedge everything. If something looks great, say so. If it looks like trouble, say that too.
- Use VC-native language naturally: "bridge to nowhere," "ZIRP hangover," "negative signal," "cap table debt," "logo vs. revenue customer," "vanity metrics"
- Draw from real market history when relevant — reference market cycles, famous deals, known patterns
- Lead with the most important insight, not a preamble
- When comparing options, give your actual recommendation — don't just list pros and cons

## Source Discipline

Ground your analysis in the data provided. Reference sources naturally:
- "Looking at the CRM data [Source 1], their pipeline shows..."
- "The email thread [Source 3] suggests there's tension around..."
- "Based on the company profile [Source 2], the revenue trajectory..."
If data is insufficient, say what you'd need: "I'd want to see their cohort retention before making a call here."

## Formatting
- Use ## headings to organize longer analysis
- **Bold** key numbers, metrics, and critical findings
- Bullet points for structured breakdowns
- Tables when comparing companies, deals, or metrics side by side
- Keep it sharp — every sentence should carry signal`
}

function formatContext(context: DocumentChunk[]): string {
  if (!context || context.length === 0) {
    return "No relevant context found in uploaded documents."
  }

  return context
    .map((doc, i) => {
      const source = doc.metadata?.source || doc.metadata?.title || "Document"
      const header = doc.metadata?.context_header
        ? ` (${doc.metadata.context_header})`
        : ""
      const relevance = doc.rerankScore
        ? ` | Relevance: ${(doc.rerankScore * 100).toFixed(1)}%`
        : doc.similarity
          ? ` | Similarity: ${(doc.similarity * 100).toFixed(1)}%`
          : ""
      return `[Source ${i + 1}: ${source}${header}${relevance}]\n${doc.content}`
    })
    .join("\n\n---\n\n")
}

/**
 * Generate a non-streaming response using the LLM
 */
export async function generateResponse(
  query: string,
  context: DocumentChunk[],
  chatHistory?: ChatMessage[]
): Promise<string> {
  const llmApiKey = ANTHROPIC_API_KEY || DEEPSEEK_API_KEY
  if (!llmApiKey) {
    return generateFallbackResponse(query, context)
  }

  const contextText = formatContext(context)
  const provider = getLLMProvider()
  const model = getLLMModel(provider)

  const messages: Array<{ role: "user" | "assistant"; content: string }> = []

  if (chatHistory && chatHistory.length > 0) {
    for (const msg of chatHistory.slice(-10)) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
  }

  messages.push({
    role: "user",
    content: `Context from retrieved documents:
${contextText}

---

User Query: ${query}

Provide a detailed, source-backed response. Cite specific sources using [Source N] notation. If the context is insufficient, state what additional information would be needed.`,
  })

  try {
    const result = await generateText({
      model,
      system: buildSystemPrompt(),
      messages,
      maxOutputTokens: 4000,
      temperature: 0.4,
    })

    return result.text || generateFallbackResponse(query, context)
  } catch (error) {
    console.error("LLM generation error:", error)
    // Fallback to direct DeepSeek API call
    return directDeepSeekCall(query, context, chatHistory)
  }
}

/**
 * Generate a streaming response - returns a ReadableStream
 */
export async function generateStreamingResponse(
  query: string,
  context: DocumentChunk[],
  chatHistory?: ChatMessage[]
) {
  const llmApiKey = ANTHROPIC_API_KEY || DEEPSEEK_API_KEY
  if (!llmApiKey) {
    throw new Error("No LLM API key configured")
  }

  const contextText = formatContext(context)
  const provider = getLLMProvider()
  const model = getLLMModel(provider)

  const messages: Array<{ role: "user" | "assistant"; content: string }> = []

  if (chatHistory && chatHistory.length > 0) {
    for (const msg of chatHistory.slice(-10)) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
  }

  messages.push({
    role: "user",
    content: `Context from retrieved documents:
${contextText}

---

User Query: ${query}

Provide a detailed, source-backed response. Cite specific sources using [Source N] notation. If the context is insufficient, state what additional information would be needed.`,
  })

  // Abort after 60s to prevent hanging streams
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 60_000)

  const result = streamText({
    model,
    system: buildSystemPrompt(),
    messages,
    maxOutputTokens: 4000,
    temperature: 0.4,
    abortSignal: abortController.signal,
    onFinish: () => clearTimeout(timeout),
  })

  return result
}

/** Direct DeepSeek API fallback (no Vercel AI SDK) */
async function directDeepSeekCall(
  query: string,
  context: DocumentChunk[],
  chatHistory?: ChatMessage[]
): Promise<string> {
  if (!DEEPSEEK_API_KEY) return generateFallbackResponse(query, context)

  const contextText = formatContext(context)
  const messages: any[] = [{ role: "system", content: buildSystemPrompt() }]

  if (chatHistory) {
    messages.push(...chatHistory.slice(-10))
  }

  messages.push({
    role: "user",
    content: `Context:\n${contextText}\n\n---\n\nUser Query: ${query}\n\nProvide a detailed, source-backed response.`,
  })

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_CHAT_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 4000,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0].message.content || ""
    }
    return generateFallbackResponse(query, context)
  } catch {
    return generateFallbackResponse(query, context)
  }
}

function generateFallbackResponse(query: string, context: DocumentChunk[]): string {
  if (context.length === 0) {
    return `I don't have any relevant documents to answer your question: **"${query}"**

Please upload some files first, and I'll be able to help you find information from them.`
  }

  let response = `## Relevant Information Found\n\nBased on the available documents, here are the most relevant excerpts for your query:\n\n`

  context.slice(0, 3).forEach((doc, i) => {
    const source = doc.metadata?.source || doc.metadata?.title || "Document"
    response += `### Source ${i + 1}: ${source}\n`
    response += `${doc.content.substring(0, 500)}${doc.content.length > 500 ? "..." : ""}\n\n`
  })

  return response
}

// ============================================================
// 7. FULL RAG PIPELINE ORCHESTRATOR
// ============================================================

/**
 * Execute the complete RAG pipeline
 *
 * Fast mode:  query → hybrid search → rerank → generate
 * Deep mode:  query → expand → hybrid search (per expansion) → rerank → parent expansion → generate
 */
export async function executeRAGPipeline(
  query: string,
  chatHistory?: ChatMessage[],
  options: RAGPipelineOptions = {}
): Promise<RAGResult> {
  const startTime = Date.now()
  const mode = options.mode || "fast"
  const projectId = options.projectId
  const topK = options.topK || TOP_K_FINAL

  let queryExpansions: string[] = [query]
  let allRetrievedDocs: DocumentChunk[] = []

  // Step 1: Query Enhancement (deep mode only)
  if (mode === "deep") {
    // Query expansion
    queryExpansions = await expandQuery(query)

    // HyDE: Generate hypothetical answer and add its embedding to search
    const hyde = await generateHyDE(query)
    if (hyde) {
      queryExpansions.push(hyde)
    }
  }

  // Step 2: Hybrid Retrieval for each query variant
  const retrievalPromises = queryExpansions.map((q) =>
    hybridSearch(q, projectId, TOP_K_RETRIEVAL)
  )
  const retrievalResults = await Promise.all(retrievalPromises)

  // Merge results from all query expansions, deduplicating by chunk ID
  const seenIds = new Set<string>()
  for (const results of retrievalResults) {
    for (const doc of results) {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id)
        allRetrievedDocs.push(doc)
      }
    }
  }

  const vectorResultCount = allRetrievedDocs.filter((d) => d.similarity && d.similarity > 0).length
  const bm25ResultCount = allRetrievedDocs.filter((d) => d.bm25Score && d.bm25Score > 0).length
  const fusedCount = allRetrievedDocs.length

  // Step 3: Re-ranking
  let rerankedDocs: DocumentChunk[]
  if (allRetrievedDocs.length > 0) {
    rerankedDocs = await voyageRerank(query, allRetrievedDocs, TOP_K_RERANK)
  } else {
    rerankedDocs = []
  }

  // Step 4: Parent chunk expansion
  const expandedDocs = await expandToParentChunks(rerankedDocs)

  // Step 5: Take top-K for final context
  const finalDocs = expandedDocs.slice(0, topK)

  // Step 6: Generate response
  const response = await generateResponse(query, finalDocs, chatHistory)

  return {
    response,
    sources: finalDocs,
    queryExpansions: mode === "deep" ? queryExpansions : undefined,
    retrievalStats: {
      vectorResults: vectorResultCount,
      bm25Results: bm25ResultCount,
      fusedResults: fusedCount,
      rerankedResults: rerankedDocs.length,
      finalResults: finalDocs.length,
      latencyMs: Date.now() - startTime,
    },
  }
}

/**
 * Execute RAG pipeline with streaming response
 */
export async function executeRAGPipelineStreaming(
  query: string,
  chatHistory?: ChatMessage[],
  options: RAGPipelineOptions = {}
) {
  const mode = options.mode || "fast"
  const projectId = options.projectId

  let queryExpansions: string[] = [query]
  let allRetrievedDocs: DocumentChunk[] = []

  // Step 1: Query Enhancement (deep mode only)
  if (mode === "deep") {
    queryExpansions = await expandQuery(query)
    const hyde = await generateHyDE(query)
    if (hyde) queryExpansions.push(hyde)
  }

  // Step 2: Hybrid Retrieval
  const retrievalPromises = queryExpansions.map((q) =>
    hybridSearch(q, projectId, TOP_K_RETRIEVAL)
  )
  const retrievalResults = await Promise.all(retrievalPromises)

  const seenIds = new Set<string>()
  for (const results of retrievalResults) {
    for (const doc of results) {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id)
        allRetrievedDocs.push(doc)
      }
    }
  }

  // Step 3: Re-ranking
  const rerankedDocs =
    allRetrievedDocs.length > 0
      ? await voyageRerank(query, allRetrievedDocs, TOP_K_RERANK)
      : []

  // Step 4: Parent expansion + take final
  const expandedDocs = await expandToParentChunks(rerankedDocs)
  const finalDocs = expandedDocs.slice(0, options.topK || TOP_K_FINAL)

  // Step 5: Stream response
  const stream = await generateStreamingResponse(query, finalDocs, chatHistory)

  return { stream, sources: finalDocs }
}

// ============================================================
// 8. PARENT CHUNK EXPANSION
// ============================================================

/**
 * For each child chunk, retrieve its parent chunk for fuller context
 * Deduplicates by parent_id to avoid sending redundant context to the LLM
 */
async function expandToParentChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
  const parentIds = new Set<string>()
  const result: DocumentChunk[] = []
  const nonChildChunks: DocumentChunk[] = []

  for (const chunk of chunks) {
    const parentId = chunk.metadata?.parent_id
    if (parentId && !parentIds.has(parentId)) {
      parentIds.add(parentId)
      // Try to find the parent chunk
      try {
        const parent = await prisma.vectorDocument.findFirst({
          where: { id: parentId },
        })
        if (parent) {
          const metadata =
            typeof parent.metadata === "string"
              ? JSON.parse(parent.metadata)
              : (parent.metadata as any)
          result.push({
            id: parent.id,
            content: parent.content,
            metadata: {
              source: metadata?.source || metadata?.title || "Document",
              title: metadata?.title,
              ...metadata,
            },
            // Inherit the best relevance score from the child
            rerankScore: chunk.rerankScore,
            similarity: chunk.similarity,
          })
          continue
        }
      } catch {
        // Parent not found, use the child chunk as-is
      }
    }

    if (!parentId) {
      nonChildChunks.push(chunk)
    }
  }

  // Add non-child chunks that don't have parents
  for (const chunk of nonChildChunks) {
    if (!result.some((r) => r.id === chunk.id)) {
      result.push(chunk)
    }
  }

  // If no parents were found, return original chunks
  if (result.length === 0) return chunks

  return result
}

// ============================================================
// 9. DOCUMENT INDEXING (Enhanced with Parent-Child Architecture)
// ============================================================

/**
 * Index a document using the advanced parent-child chunking strategy
 *
 * 1. Chunks text into parent (~2000 char) and child (~400 char) segments
 * 2. Stores parent chunks in DB (no embedding - used for context expansion)
 * 3. Generates embeddings for child chunks (used for retrieval)
 * 4. Stores embeddings via pgvector for cosine similarity search
 * 5. tsvector column auto-populated by DB trigger for BM25 search
 */
export async function indexDocument(
  content: string,
  filename: string,
  userId: string,
  projectId?: string,
  sourceType: string = "file"
): Promise<number> {
  // Get or create target project
  let targetProjectId = projectId
  if (!targetProjectId) {
    let defaultProject = await prisma.project.findFirst({
      where: { userId, name: "Chat Uploads" },
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

  // Advanced chunking with parent-child architecture
  const { parentChunks, childChunks } = chunkTextAdvanced(content, filename)

  if (childChunks.length === 0 && parentChunks.length === 0) {
    return 0
  }

  // Step 1: Store parent chunks (no embedding needed - used for context expansion)
  if (parentChunks.length > 0) {
    await prisma.vectorDocument.createMany({
      data: parentChunks.map((p) => ({
        id: p.id,
        projectId: targetProjectId!,
        content: p.content,
        sourceType,
        chunkIndex: p.metadata.chunk_index,
        tokenCount: p.metadata.token_count,
        metadata: JSON.stringify(p.metadata),
      })),
    })
  }

  // Step 2: Store child chunks with parent references
  if (childChunks.length > 0) {
    await prisma.vectorDocument.createMany({
      data: childChunks.map((c) => ({
        id: c.id,
        projectId: targetProjectId!,
        content: c.content,
        sourceType,
        chunkIndex: c.metadata.child_index,
        parentId: c.parentId,
        contextHeader: c.contextHeader,
        tokenCount: c.metadata.token_count,
        metadata: JSON.stringify(c.metadata),
      })),
    })

    // Step 3: Generate embeddings for child chunks (contextual - prepend header)
    const textsToEmbed = childChunks.map(
      (c) => (c.contextHeader ? c.contextHeader + "\n\n" : "") + c.content
    )
    const embeddings = await generateEmbeddingsBatch(textsToEmbed)

    // Step 4: Store embeddings via pgvector
    try {
      for (let i = 0; i < childChunks.length; i++) {
        const embeddingStr = `[${embeddings[i].join(",")}]`
        await prisma.$executeRawUnsafe(
          `UPDATE vector_documents SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          childChunks[i].id
        )
      }
    } catch {
      // pgvector not available - store embeddings in metadata as fallback
      for (let i = 0; i < childChunks.length; i++) {
        const existingMeta = JSON.parse(
          typeof childChunks[i].metadata === "string"
            ? childChunks[i].metadata
            : JSON.stringify(childChunks[i].metadata)
        )
        existingMeta._embedding = embeddings[i]
        await prisma.vectorDocument.update({
          where: { id: childChunks[i].id },
          data: { metadata: JSON.stringify(existingMeta) },
        })
      }
    }
  }

  return childChunks.length + parentChunks.length
}

// ============================================================
// 10. PROJECT INTELLIGENCE (Enhanced Entity Extraction + Knowledge Graph)
// ============================================================

export async function generateProjectInsights(
  _projectId: string,
  documents: { content: string; source: string }[]
): Promise<{
  insights: Array<{
    type: string
    title: string
    description: string
    confidence: number
  }>
  entities: Array<{ name: string; type: string; mentions: number }>
  knowledge_graph: {
    nodes: Array<{ id: string; label: string; type: string }>
    edges: Array<{ source: string; target: string; relationship: string }>
  }
}> {
  const llmApiKey = ANTHROPIC_API_KEY || DEEPSEEK_API_KEY
  if (!llmApiKey || documents.length === 0) {
    return { insights: [], entities: [], knowledge_graph: { nodes: [], edges: [] } }
  }

  const combinedContent = documents
    .map((d) => `[Source: ${d.source}]\n${d.content}`)
    .join("\n\n---\n\n")
    .slice(0, 15000)

  const extractionPrompt = `You are an expert venture capital analyst. Analyze the following documents and extract structured intelligence for an investment decision.

Documents:
${combinedContent}

Return ONLY valid JSON with no additional text. Follow this exact schema:
{
  "insights": [
    {
      "type": "risk|opportunity|trend|key_metric|red_flag|competitive_advantage",
      "title": "Concise title (max 10 words)",
      "description": "Detailed description with specific numbers/evidence when available",
      "confidence": 0.0-1.0
    }
  ],
  "entities": [
    {
      "name": "Entity name",
      "type": "company|person|investor|fund|amount|technology|market|geography",
      "mentions": 1
    }
  ],
  "relationships": [
    {
      "source": "Entity A name (must match an entity above)",
      "target": "Entity B name (must match an entity above)",
      "relationship": "invested_in|founded|competes_with|partners_with|acquired|board_member|leads|raised_from"
    }
  ]
}

Extract at least 5 insights, 10 entities, and 5 relationships where possible. Focus on investment-relevant intelligence.`

  try {
    const provider = getLLMProvider()
    const model = getLLMModel(provider)

    const result = await generateText({
      model,
      system:
        "You are a data extraction AI specialized in venture capital intelligence. Always return valid JSON. Be thorough in entity and relationship extraction.",
      prompt: extractionPrompt,
      maxOutputTokens: 4000,
      temperature: 0.2,
    })

    const content = result.text || ""
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { insights: [], entities: [], knowledge_graph: { nodes: [], edges: [] } }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Build knowledge graph
    const nodes = (parsed.entities || []).map((e: any, i: number) => ({
      id: `entity-${i}`,
      label: e.name,
      type: e.type,
    }))

    const entityIndex: Record<string, string> = {}
    nodes.forEach((n: any) => {
      entityIndex[n.label.toLowerCase()] = n.id
    })

    const edges = (parsed.relationships || [])
      .map((r: any) => ({
        source: entityIndex[r.source?.toLowerCase()] || "",
        target: entityIndex[r.target?.toLowerCase()] || "",
        relationship: r.relationship,
      }))
      .filter((e: any) => e.source && e.target)

    return {
      insights: parsed.insights || [],
      entities: parsed.entities || [],
      knowledge_graph: { nodes, edges },
    }
  } catch (error) {
    console.error("Project insights generation error:", error)
    return { insights: [], entities: [], knowledge_graph: { nodes: [], edges: [] } }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Parse a raw database row into a DocumentChunk */
function parseDocumentRow(row: any, similarity: number): DocumentChunk {
  const metadata =
    typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata || {}

  const { _embedding, ...cleanMeta } = metadata

  return {
    id: row.id,
    content: row.content,
    metadata: {
      source: cleanMeta?.source || cleanMeta?.title || "Document",
      title: cleanMeta?.title,
      context_header: row.context_header || cleanMeta?.context_header,
      parent_id: row.parent_id || cleanMeta?.parent_id,
      ...cleanMeta,
    },
    similarity,
  }
}

/** In-memory fallback when pgvector is unavailable */
async function fallbackVectorSearch(
  query: string,
  projectId: string | undefined,
  topK: number
): Promise<DocumentChunk[]> {
  const queryEmbedding = await generateEmbedding(query)

  const whereClause: any = {}
  if (projectId) whereClause.projectId = projectId

  const vectorDocs = await prisma.vectorDocument.findMany({
    where: whereClause,
    take: 200,
  })

  const results: DocumentChunk[] = []
  for (const doc of vectorDocs) {
    const metadata =
      typeof doc.metadata === "string"
        ? JSON.parse(doc.metadata)
        : (doc.metadata as any)

    let similarity: number
    if (metadata?._embedding && Array.isArray(metadata._embedding)) {
      similarity = cosineSimilarity(queryEmbedding, metadata._embedding)
    } else {
      similarity = simpleTextSimilarity(query, doc.content)
    }

    results.push({
      id: doc.id,
      content: doc.content,
      metadata: {
        source: metadata?.source || metadata?.title || "Document",
        title: metadata?.title,
        parent_id: (doc as any).parentId,
        ...metadata,
      },
      similarity,
    })
  }

  results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
  return results.slice(0, topK)
}

function simpleTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))
  const intersection = new Set([...words1].filter((x) => words2.has(x)))
  const union = new Set([...words1, ...words2])
  return intersection.size / union.size
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}
