import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/projects/[projectId]/files - List project files
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

    // Get project documents
    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      project_id: projectId,
      files: documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        file_type: doc.fileType,
        file_size: doc.fileSize,
        status: doc.status,
        metadata: doc.metadata,
        created_at: doc.createdAt.toISOString(),
        updated_at: doc.updatedAt.toISOString(),
      })),
      total: documents.length,
    })
  } catch (error: any) {
    console.error("Get files error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get files" },
      { status: 500 }
    )
  }
}

// POST /api/projects/[projectId]/files - Upload files to project
export async function POST(
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

    // Parse multipart form data
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ detail: "No files provided" }, { status: 400 })
    }

    const uploadedFiles = []

    for (const file of files) {
      // Get file content
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileSize = buffer.length

      // TODO: Actually store the file (e.g., to S3 or local storage)
      // For now, we'll just record the metadata
      const storagePath = `/uploads/${projectId}/${file.name}`

      // Create document record
      const document = await prisma.document.create({
        data: {
          projectId,
          filename: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize,
          storagePath,
          status: "processing",
        },
      })

      uploadedFiles.push({
        id: document.id,
        filename: document.filename,
        file_type: document.fileType,
        file_size: document.fileSize,
        status: document.status,
      })

      // TODO: Trigger async processing pipeline
      // 1. Extract text content
      // 2. Chunk the content
      // 3. Generate embeddings
      // 4. Store in vector database
    }

    return NextResponse.json({
      project_id: projectId,
      files_uploaded: uploadedFiles.length,
      status: "processing",
      documents: uploadedFiles,
    })
  } catch (error: any) {
    console.error("Upload files error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to upload files" },
      { status: 500 }
    )
  }
}

