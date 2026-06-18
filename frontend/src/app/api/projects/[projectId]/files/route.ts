import { NextResponse } from "next/server"
import { withAuth, requireProjectAccess, badRequest } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { processFileUploads } from "@/lib/services/file-upload-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/projects/[projectId]/files - List project files
export const GET = withAuth(async ({ session, params }) => {
  const { projectId } = params

  const { error } = await requireProjectAccess(projectId, session.user.id)
  if (error) return error

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
}, "Get files")

// POST /api/projects/[projectId]/files - Upload files to project
export const POST = withAuth(async ({ session, params, request }) => {
  const { projectId } = params

  const { error } = await requireProjectAccess(projectId, session.user.id)
  if (error) return error

  const formData = await request.formData()
  const files = formData.getAll("files") as unknown as File[]

  if (!files || files.length === 0) {
    return badRequest("No files provided")
  }

  const { uploadedFiles, errors } = await processFileUploads(
    files,
    session.user.id,
    projectId
  )

  return NextResponse.json({
    project_id: projectId,
    files_uploaded: uploadedFiles.length,
    status: uploadedFiles.length > 0 ? "completed" : "failed",
    documents: uploadedFiles,
    errors: errors.length > 0 ? errors : undefined,
  })
}, "Upload files")
