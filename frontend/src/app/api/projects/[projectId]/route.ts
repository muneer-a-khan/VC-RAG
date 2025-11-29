import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/projects/[projectId] - Get a specific project
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

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { documents: true, chats: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      metadata: project.metadata,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
      document_count: project._count.documents,
      chat_count: project._count.chats,
    })
  } catch (error: any) {
    console.error("Get project error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get project" },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[projectId] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const body = await request.json()
    const { name, description, type, metadata } = body

    // Verify project ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!existingProject) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 })
    }

    // Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(metadata && { metadata }),
      },
    })

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      metadata: project.metadata,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Update project error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to update project" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 })
    }

    // Delete project (documents, chats, and vector_documents will cascade delete)
    await prisma.project.delete({
      where: { id: projectId },
    })

    return NextResponse.json({
      status: "deleted",
      project_id: projectId,
    })
  } catch (error: any) {
    console.error("Delete project error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to delete project" },
      { status: 500 }
    )
  }
}

