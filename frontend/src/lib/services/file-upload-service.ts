import { prisma } from "@/lib/prisma"
import { supabase, STORAGE_BUCKET } from "@/lib/supabase"
import { indexDocument } from "@/lib/services/rag-service"
import { extractTextContent } from "@/lib/services/text-extraction"

export interface UploadedFileResult {
  id: string
  filename: string
  file_type: string
  file_size: number
  status: "completed" | "failed"
  chunks_created?: number
  text_length?: number
}

export interface FileUploadResult {
  uploadedFiles: UploadedFileResult[]
  errors: string[]
}

/**
 * Processes a batch of uploaded files: stores them in Supabase, creates document
 * records, extracts text, and indexes for RAG search.
 *
 * Shared between `/api/chat/upload` and `/api/projects/[projectId]/files`.
 */
export async function processFileUploads(
  files: File[],
  userId: string,
  projectId: string
): Promise<FileUploadResult> {
  const uploadedFiles: UploadedFileResult[] = []
  const errors: string[] = []

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileSize = buffer.length
      const timestamp = Date.now()
      const storagePath = `${userId}/${projectId}/${timestamp}-${file.name}`

      // Non-blocking storage upload
      supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        })
        .catch((err) => console.warn("Storage upload warning:", err))

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

      // Extract text content
      const textContent = await extractTextContent(file.name, file.type, buffer)

      if (textContent && textContent.trim().length > 50) {
        const chunksCreated = await indexDocument(
          textContent,
          file.name,
          userId,
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
          text_length: textContent.length,
        })
      } else {
        await prisma.document.update({
          where: { id: document.id },
          data: { status: "failed" },
        })
        errors.push(
          `Could not extract readable text from ${file.name}. The file might be image-based or encrypted.`
        )
      }
    } catch (fileError: unknown) {
      const message =
        fileError instanceof Error ? fileError.message : "Unknown error"
      console.error(`Error processing file ${file.name}:`, fileError)
      errors.push(`Failed to process ${file.name}: ${message}`)
    }
  }

  return { uploadedFiles, errors }
}

/**
 * Get or create the default "Chat Uploads" project for a user.
 */
export async function getOrCreateUploadsProject(userId: string) {
  let project = await prisma.project.findFirst({
    where: { userId, name: "Chat Uploads" },
  })

  if (!project) {
    project = await prisma.project.create({
      data: {
        userId,
        name: "Chat Uploads",
        description: "Files uploaded via chat interface",
        type: "uploads",
      },
    })
  }

  return project
}
