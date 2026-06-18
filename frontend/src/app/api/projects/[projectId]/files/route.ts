import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { supabase, STORAGE_BUCKET } from "@/lib/supabase"
import { indexDocument } from "@/lib/services/rag-service"
import { extractTextContent } from "@/lib/services/text-extraction"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".txt", ".csv", ".md", ".html", ".json", ".docx", ".xlsx",
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

function isAllowedFile(name: string, type: string): boolean {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."))
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(type)
}

// GET /api/projects/[projectId]/files - List project files
export async function GET(
  _request: NextRequest,
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
    })

    if (!project) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 })
    }

    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      project_id: projectId,
      files: documents.map((doc: any) => ({
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
  } catch (error: unknown) {
    console.error("Get files error:", error)
    return NextResponse.json(
      { detail: "Failed to get files" },
      { status: 500 }
    )
  }
}

// POST /api/projects/[projectId]/files - Upload files to project with storage + RAG indexing
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

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as unknown as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ detail: "No files provided" }, { status: 400 })
    }

    const uploadedFiles: any[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        if (!isAllowedFile(file.name, file.type)) {
          errors.push(`File type not allowed: ${file.name}`)
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push(`File too large (max 50 MB): ${file.name}`)
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const fileSize = buffer.length
        const timestamp = Date.now()
        const storagePath = `${session.user.id}/${projectId}/${timestamp}-${file.name}`

        // Upload to Supabase Storage
        supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          })
          .catch((err: any) => console.warn("Storage upload warning:", err))

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

        // Extract text and index for RAG
        const textContent = await extractTextContent(file.name, file.type, buffer)

        if (textContent && textContent.trim().length > 50) {
          const chunksCreated = await indexDocument(
            textContent,
            file.name,
            session.user.id,
            projectId
          )

          await prisma.document.update({
            where: { id: document.id },
            data: {
              status: "completed",
              metadata: {
                chunks_created: chunksCreated,
                text_length: textContent.length,
              },
            },
          })

          uploadedFiles.push({
            id: document.id,
            filename: file.name,
            file_type: file.type,
            file_size: fileSize,
            status: "completed",
            chunks_created: chunksCreated,
          })
        } else {
          await prisma.document.update({
            where: { id: document.id },
            data: { status: "failed" },
          })
          errors.push(`Could not extract readable text from ${file.name}.`)
        }
      } catch (fileError: any) {
        console.error(`Error processing file ${file.name}:`, fileError)
        errors.push(`Failed to process ${file.name}: ${fileError.message}`)
      }
    }

    return NextResponse.json({
      project_id: projectId,
      files_uploaded: uploadedFiles.length,
      status: uploadedFiles.length > 0 ? "completed" : "failed",
      documents: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: unknown) {
    console.error("Upload files error:", error)
    return NextResponse.json(
      { detail: "Failed to upload files" },
      { status: 500 }
    )
  }
}
