import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { supabase, STORAGE_BUCKET } from "@/lib/supabase"
import { indexDocument } from "@/lib/services/rag-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'text/markdown', 
  'text/csv',
  'application/json',
  'text/html',
  'text/xml',
  'application/xml',
]

const SUPPORTED_DOC_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.html', '.xml']

function getFileExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase()
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use unpdf which is designed for serverless environments
    const { extractText, getDocumentProxy } = await import('unpdf')
    
    // Convert buffer to ArrayBuffer
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
    
    // Get the PDF document
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
    
    // Extract text from all pages
    const { text } = await extractText(pdf, { mergePages: true })
    
    if (text && text.trim().length > 50) {
      return text.trim()
    }
    
    return ''
  } catch (error) {
    console.error("PDF extraction error:", error)
    return ''
  }
}

async function extractTextContent(file: File, buffer: Buffer): Promise<string> {
  const extension = getFileExtension(file.name)
  
  // Handle PDF files
  if (file.type === 'application/pdf' || extension === '.pdf') {
    console.log(`Extracting text from PDF: ${file.name}`)
    const text = await extractTextFromPDF(buffer)
    console.log(`Extracted ${text.length} characters from PDF`)
    if (text.length > 50) {
      return text
    }
    console.warn(`PDF extraction returned insufficient text (${text.length} chars)`)
    return ''
  }
  
  // Handle text-based files
  if (SUPPORTED_TEXT_TYPES.includes(file.type) || SUPPORTED_DOC_EXTENSIONS.includes(extension)) {
    return buffer.toString('utf-8')
  }
  
  // Default: try to read as text
  const text = buffer.toString('utf-8')
  return text.replace(/[^\x20-\x7E\n\r\t]/g, '').trim()
}

// POST /api/chat/upload
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ detail: "No files provided" }, { status: 400 })
    }

    const uploadedFiles: any[] = []
    const errors: string[] = []

    // Get or create default project once
    let uploadProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: "Chat Uploads",
      },
    })

    if (!uploadProject) {
      uploadProject = await prisma.project.create({
        data: {
          userId: session.user.id,
          name: "Chat Uploads",
          description: "Files uploaded via chat interface",
          type: "uploads",
        },
      })
    }

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)
        
        const buffer = Buffer.from(await file.arrayBuffer())
        const fileSize = buffer.length
        
        const timestamp = Date.now()
        const uniqueFilename = `${session.user.id}/${timestamp}-${file.name}`
        
        // Non-blocking storage upload
        supabase.storage
          .from(STORAGE_BUCKET)
          .upload(uniqueFilename, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          })
          .catch(err => console.warn("Storage upload warning:", err))

        // Create document record
        const document = await prisma.document.create({
          data: {
            projectId: uploadProject.id,
            filename: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize,
            storagePath: uniqueFilename,
            status: "processing",
          },
        })

        // Extract text content
        const textContent = await extractTextContent(file, buffer)
        
        if (textContent && textContent.trim().length > 50) {
          // Index for RAG
          const chunksCreated = await indexDocument(
            textContent,
            file.name,
            session.user.id,
            uploadProject.id
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
          errors.push(`Could not extract readable text from ${file.name}. The PDF might be image-based or encrypted.`)
        }
      } catch (fileError: any) {
        console.error(`Error processing file ${file.name}:`, fileError)
        errors.push(`Failed to process ${file.name}: ${fileError.message}`)
      }
    }

    return NextResponse.json({
      success: uploadedFiles.length > 0,
      files_uploaded: uploadedFiles.length,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to upload files" },
      { status: 500 }
    )
  }
}

// GET /api/chat/upload
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const uploadProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: "Chat Uploads",
      },
    })

    if (!uploadProject) {
      return NextResponse.json({ files: [], total: 0 })
    }

    const documents = await prisma.document.findMany({
      where: { projectId: uploadProject.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      files: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        file_type: doc.fileType,
        file_size: doc.fileSize,
        status: doc.status,
        created_at: doc.createdAt.toISOString(),
      })),
      total: documents.length,
    })
  } catch (error: any) {
    console.error("Get uploads error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get uploads" },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/upload
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("id")

    if (!documentId) {
      return NextResponse.json({ detail: "Document ID required" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId },
      include: { project: true },
    })

    if (!document || document.project.userId !== session.user.id) {
      return NextResponse.json({ detail: "Document not found" }, { status: 404 })
    }

    if (document.storagePath) {
      supabase.storage
        .from(STORAGE_BUCKET)
        .remove([document.storagePath])
        .catch(err => console.warn("Storage delete warning:", err))
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

    await prisma.document.delete({
      where: { id: documentId },
    })

    return NextResponse.json({ success: true, deleted: documentId })
  } catch (error: any) {
    console.error("Delete upload error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}
