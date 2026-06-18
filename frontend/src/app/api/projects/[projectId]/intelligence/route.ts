import { NextResponse } from "next/server"
import { withAuth, requireProjectAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { generateProjectInsights } from "@/lib/services/rag-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/projects/[projectId]/intelligence - Get project intelligence/knowledge graph
export const GET = withAuth(async ({ session, params, request }) => {
  const { projectId } = params

  const { project, error } = await requireProjectAccess(projectId, session.user.id, {
    documents: {
      select: {
        id: true,
        filename: true,
        fileType: true,
        status: true,
        metadata: true,
        createdAt: true,
      },
    },
    vectorDocuments: {
      select: {
        id: true,
        content: true,
        sourceType: true,
        chunkIndex: true,
        metadata: true,
        createdAt: true,
      },
    },
  })
  if (error) return error

  // Calculate statistics
  const documentsByType: Record<string, number> = {}
  for (const doc of (project as any).documents) {
    const type = doc.fileType || "unknown"
    documentsByType[type] = (documentsByType[type] || 0) + 1
  }

  const vectorChunksBySource: Record<string, number> = {}
  for (const chunk of (project as any).vectorDocuments) {
    const source = chunk.sourceType || "unknown"
    vectorChunksBySource[source] = (vectorChunksBySource[source] || 0) + 1
  }

  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get("refresh") === "true"

  let insights: any[] = []
  let entities: any[] = []
  let knowledgeGraph = { nodes: [] as any[], edges: [] as any[] }

  if ((project as any).vectorDocuments.length > 0) {
    const docChunks: Record<string, string[]> = {}
    for (const chunk of (project as any).vectorDocuments) {
      const meta = typeof chunk.metadata === "string"
        ? JSON.parse(chunk.metadata)
        : chunk.metadata as any
      const source = meta?.source || meta?.title || "Document"
      if (!docChunks[source]) docChunks[source] = []
      docChunks[source].push(chunk.content)
    }

    const docsForAnalysis = Object.entries(docChunks).map(([source, chunks]) => ({
      source,
      content: chunks.slice(0, 3).join("\n\n"),
    }))

    const projectMeta = project.metadata as any || {}
    const cachedInsights = projectMeta?._intelligence
    const cacheAge = cachedInsights?.generatedAt
      ? Date.now() - new Date(cachedInsights.generatedAt).getTime()
      : Infinity

    if (cachedInsights && cacheAge < 3600000 && !refresh) {
      insights = cachedInsights.insights || []
      entities = cachedInsights.entities || []
      knowledgeGraph = cachedInsights.knowledge_graph || { nodes: [], edges: [] }
    } else if (docsForAnalysis.length > 0) {
      const result = await generateProjectInsights(projectId, docsForAnalysis)
      insights = result.insights
      entities = result.entities
      knowledgeGraph = result.knowledge_graph

      try {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            metadata: {
              ...(typeof project.metadata === "object" ? project.metadata as object : {}),
              _intelligence: {
                insights,
                entities,
                knowledge_graph: knowledgeGraph,
                generatedAt: new Date().toISOString(),
              },
            },
          },
        })
      } catch {
        // Non-critical - caching failure shouldn't break the response
      }
    }
  }

  return NextResponse.json({
    project_id: projectId,
    project_name: project.name,
    statistics: {
      total_documents: (project as any).documents.length,
      total_vector_chunks: (project as any).vectorDocuments.length,
      documents_by_type: documentsByType,
      chunks_by_source: vectorChunksBySource,
      processing_status: {
        completed: (project as any).documents.filter((d: { status: string }) => d.status === "completed").length,
        processing: (project as any).documents.filter((d: { status: string }) => d.status === "processing").length,
        failed: (project as any).documents.filter((d: { status: string }) => d.status === "failed").length,
      },
    },
    documents: (project as any).documents.map((doc: { id: string; filename: string; fileType: string; status: string; metadata: any; createdAt: Date }) => ({
      id: doc.id,
      filename: doc.filename,
      file_type: doc.fileType,
      status: doc.status,
      metadata: doc.metadata,
      created_at: doc.createdAt.toISOString(),
    })),
    insights,
    entities,
    knowledge_graph: knowledgeGraph,
  })
}, "Get intelligence")
