import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateProjectInsights } from "@/lib/services/rag-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/projects/[projectId]/intelligence - Get project intelligence/knowledge graph
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project ownership and get related data
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
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
      },
    })

    if (!project) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 })
    }

    // Calculate statistics
    const documentsByType: Record<string, number> = {}
    for (const doc of project.documents) {
      const type = doc.fileType || "unknown"
      documentsByType[type] = (documentsByType[type] || 0) + 1
    }

    const vectorChunksBySource: Record<string, number> = {}
    for (const chunk of project.vectorDocuments) {
      const source = chunk.sourceType || "unknown"
      vectorChunksBySource[source] = (vectorChunksBySource[source] || 0) + 1
    }

    // Check if we should generate insights (only if there are documents)
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get("refresh") === "true"

    let insights: any[] = []
    let entities: any[] = []
    let knowledgeGraph = { nodes: [] as any[], edges: [] as any[] }

    if (project.vectorDocuments.length > 0) {
      // Group chunks by source document and take representative samples
      const docChunks: Record<string, string[]> = {}
      for (const chunk of project.vectorDocuments) {
        const meta = typeof chunk.metadata === "string"
          ? JSON.parse(chunk.metadata)
          : chunk.metadata as any
        const source = meta?.source || meta?.title || "Document"
        if (!docChunks[source]) docChunks[source] = []
        docChunks[source].push(chunk.content)
      }

      // Prepare document summaries for analysis (take first few chunks per document)
      const docsForAnalysis = Object.entries(docChunks).map(([source, chunks]) => ({
        source,
        content: chunks.slice(0, 3).join("\n\n"),
      }))

      // Check for cached insights
      const projectMeta = project.metadata as any || {}
      const cachedInsights = projectMeta?._intelligence
      const cacheAge = cachedInsights?.generatedAt
        ? Date.now() - new Date(cachedInsights.generatedAt).getTime()
        : Infinity

      // Use cache if less than 1 hour old and not refreshing
      if (cachedInsights && cacheAge < 3600000 && !refresh) {
        insights = cachedInsights.insights || []
        entities = cachedInsights.entities || []
        knowledgeGraph = cachedInsights.knowledge_graph || { nodes: [], edges: [] }
      } else if (docsForAnalysis.length > 0) {
        // Generate fresh insights using LLM
        const result = await generateProjectInsights(projectId, docsForAnalysis)
        insights = result.insights
        entities = result.entities
        knowledgeGraph = result.knowledge_graph

        // Cache the results in project metadata
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
        } catch (cacheError) {
          console.warn("Failed to cache intelligence results for project", projectId, cacheError)
        }
      }
    }

    return NextResponse.json({
      project_id: projectId,
      project_name: project.name,
      statistics: {
        total_documents: project.documents.length,
        total_vector_chunks: project.vectorDocuments.length,
        documents_by_type: documentsByType,
        chunks_by_source: vectorChunksBySource,
        processing_status: {
          completed: project.documents.filter((d: { status: string }) => d.status === "completed").length,
          processing: project.documents.filter((d: { status: string }) => d.status === "processing").length,
          failed: project.documents.filter((d: { status: string }) => d.status === "failed").length,
        },
      },
      documents: project.documents.map((doc: { id: string; filename: string; fileType: string; status: string; metadata: any; createdAt: Date }) => ({
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
  } catch (error: any) {
    console.error("Get intelligence error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get intelligence" },
      { status: 500 }
    )
  }
}
