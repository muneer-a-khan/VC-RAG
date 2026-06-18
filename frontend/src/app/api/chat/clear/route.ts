import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

async function clearUserData(userId: string) {
  const uploadProject = await prisma.project.findFirst({
    where: { userId, name: "Chat Uploads" },
  })

  let vectorsDeleted = 0
  let documentsDeleted = 0

  if (uploadProject) {
    const vectorResult = await prisma.vectorDocument.deleteMany({
      where: { projectId: uploadProject.id },
    })
    vectorsDeleted = vectorResult.count

    const docResult = await prisma.document.deleteMany({
      where: { projectId: uploadProject.id },
    })
    documentsDeleted = docResult.count
  }

  return { vectorsDeleted, documentsDeleted }
}

// GET /api/chat/clear - Clear via GET for easy browser access
export const GET = withAuth(async ({ session }) => {
  const { vectorsDeleted, documentsDeleted } = await clearUserData(session.user.id)

  return NextResponse.json({
    success: true,
    vectors_deleted: vectorsDeleted,
    documents_deleted: documentsDeleted,
    message: "All uploaded files and their data have been cleared. You can now upload new files.",
  })
}, "Clear data")

// DELETE /api/chat/clear - Clear ALL uploaded documents and vector data for user
export const DELETE = withAuth(async ({ session }) => {
  const { vectorsDeleted, documentsDeleted } = await clearUserData(session.user.id)

  return NextResponse.json({
    success: true,
    vectors_deleted: vectorsDeleted,
    documents_deleted: documentsDeleted,
    message: "All uploaded files and their data have been cleared.",
  })
}, "Clear data")
