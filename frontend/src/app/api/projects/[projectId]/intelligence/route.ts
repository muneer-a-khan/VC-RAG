import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
            sourceType: true,
            chunkIndex: true,
            createdAt: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 })
    }

    // Calculate insights and statistics
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

    return NextResponse.json({
      project_id: projectId,
      project_name: project.name,
      statistics: {
        total_documents: project.documents.length,
        total_vector_chunks: project.vectorDocuments.length,
        documents_by_type: documentsByType,
        chunks_by_source: vectorChunksBySource,
        processing_status: {
          completed: project.documents.filter((d) => d.status === "completed").length,
          processing: project.documents.filter((d) => d.status === "processing").length,
          failed: project.documents.filter((d) => d.status === "failed").length,
        },
      },
      documents: project.documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        file_type: doc.fileType,
        status: doc.status,
        metadata: doc.metadata,
        created_at: doc.createdAt.toISOString(),
      })),
      // TODO: Add actual insights from LLM analysis
      insights: [],
      // TODO: Add knowledge graph data
      knowledge_graph: {
        nodes: [],
        edges: [],
      },
    })
  } catch (error: any) {
    console.error("Get intelligence error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get intelligence" },
      { status: 500 }
    )
  }
}

