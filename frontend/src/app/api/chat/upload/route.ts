import { NextResponse } from "next/server"
import { withAuth, badRequest, notFound } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { supabase, STORAGE_BUCKET } from "@/lib/supabase"
import {
  processFileUploads,
  getOrCreateUploadsProject,
} from "@/lib/services/file-upload-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/chat/upload
export const POST = withAuth(async ({ session, request }) => {
  const formData = await request.formData()
  const files = formData.getAll("files") as unknown as File[]

  if (!files || files.length === 0) {
    return badRequest("No files provided")
  }

  const uploadProject = await getOrCreateUploadsProject(session.user.id)
  const { uploadedFiles, errors } = await processFileUploads(
    files,
    session.user.id,
    uploadProject.id
  )

  return NextResponse.json({
    success: uploadedFiles.length > 0,
    files_uploaded: uploadedFiles.length,
    files: uploadedFiles,
    errors: errors.length > 0 ? errors : undefined,
  })
}, "Upload")

// GET /api/chat/upload
export const GET = withAuth(async ({ session }) => {
  const uploadProject = await prisma.project.findFirst({
    where: { userId: session.user.id, name: "Chat Uploads" },
  })

  if (!uploadProject) {
    return NextResponse.json({ files: [], total: 0 })
  }

  const documents = await prisma.document.findMany({
    where: { projectId: uploadProject.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    files: documents.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      file_type: doc.fileType,
      file_size: doc.fileSize,
      status: doc.status,
      created_at: doc.createdAt.toISOString(),
    })),
    total: documents.length,
  })
}, "Get uploads")

// DELETE /api/chat/upload
export const DELETE = withAuth(async ({ session, request }) => {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get("id")

  if (!documentId) {
    return badRequest("Document ID required")
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId },
    include: { project: true },
  })

  if (!document || document.project.userId !== session.user.id) {
    return notFound("Document not found")
  }

  if (document.storagePath) {
    supabase.storage
      .from(STORAGE_BUCKET)
      .remove([document.storagePath])
      .catch((err) => console.warn("Storage delete warning:", err))
  }

  await prisma.vectorDocument.deleteMany({
    where: {
      projectId: document.projectId,
      metadata: {
        path: ['source'],
        equals: document.filename,
      },
    },
  })

  await prisma.document.delete({ where: { id: documentId } })

  return NextResponse.json({ success: true, deleted: documentId })
}, "Delete upload")
